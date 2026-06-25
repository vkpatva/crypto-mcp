/**
 * State-changing chain tools (chain-write capability): native and ERC-20
 * transfers, generic contract writes, transaction simulation (dry-run, never
 * broadcasts), and EIP-191/EIP-712 message signing. All broadcasting tools use
 * the configured signing wallet bound to the selected network.
 */

import { z } from "zod";
import {
  Contract,
  Interface,
  isAddress,
  parseEther,
  parseUnits,
  type TransactionRequest,
} from "ethers";
import { defineTool } from "./types.js";
import { networkField, resolveNetwork, jsonResult } from "./common.js";
import { getNetwork, type NetworkId } from "../chain/networks.js";
import type { ChainContext } from "../chain/context.js";

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

const addressField = z
  .string()
  .refine((v) => isAddress(v), { message: "Invalid EVM address" });

/** Build a raw transaction request for the various simulate/send shapes. */
async function buildTxRequest(
  ctx: ChainContext,
  network: NetworkId,
  spec: {
    kind: "native" | "erc20" | "contract";
    to?: string;
    amount?: string;
    token?: string;
    abi?: string[];
    method?: string;
    args?: unknown[];
    value?: string;
  },
): Promise<TransactionRequest> {
  const from = ctx.address;
  if (spec.kind === "native") {
    if (!spec.to || !isAddress(spec.to)) throw new Error("Invalid recipient address.");
    return { from, to: spec.to, value: parseEther(spec.amount ?? "0") };
  }
  if (spec.kind === "erc20") {
    if (!spec.token || !isAddress(spec.token)) throw new Error("Invalid token address.");
    if (!spec.to || !isAddress(spec.to)) throw new Error("Invalid recipient address.");
    const provider = ctx.getProvider(network);
    const token = new Contract(spec.token, ERC20_ABI, provider);
    const decimals = Number(await token.decimals());
    const amount = parseUnits(spec.amount ?? "0", decimals);
    const data = token.interface.encodeFunctionData("transfer", [spec.to, amount]);
    return { from, to: spec.token, data };
  }
  // contract
  if (!spec.to || !isAddress(spec.to)) throw new Error("Invalid contract address.");
  if (!spec.abi || !spec.method) throw new Error("ABI and method are required.");
  let iface: Interface;
  try {
    iface = new Interface(spec.abi);
  } catch (e) {
    throw new Error(`Invalid ABI fragment(s): ${(e as Error).message}`);
  }
  if (!iface.getFunction(spec.method)) {
    throw new Error(`Method "${spec.method}" not found in the provided ABI.`);
  }
  const data = iface.encodeFunctionData(spec.method, spec.args ?? []);
  return {
    from,
    to: spec.to,
    data,
    value: spec.value ? parseEther(spec.value) : undefined,
  };
}

export const sendNative = defineTool({
  name: "send_native",
  description:
    "Sign and broadcast a native currency transfer from the configured wallet. STATE-CHANGING: spends funds.",
  inputShape: {
    to: addressField.describe("Recipient address."),
    amount: z.string().describe("Amount in native units (e.g. '0.01')."),
    ...networkField,
  },
  async handler(args, ctx) {
    if (!isAddress(args.to)) throw new Error("Invalid recipient address.");
    const network = resolveNetwork(ctx, args.network);
    const info = getNetwork(network);
    const signer = ctx.getSigner(network);
    const tx = await signer.sendTransaction({
      to: args.to,
      value: parseEther(args.amount),
    });
    return jsonResult({
      network,
      hash: tx.hash,
      from: ctx.address,
      to: args.to,
      amount: args.amount,
      symbol: info.nativeSymbol,
    });
  },
});

export const sendToken = defineTool({
  name: "send_token",
  description:
    "Sign and broadcast an ERC-20 transfer from the configured wallet, converting the amount using the token's decimals. STATE-CHANGING.",
  inputShape: {
    token: addressField.describe("ERC-20 token contract address."),
    to: addressField.describe("Recipient address."),
    amount: z.string().describe("Amount in token units (e.g. '100.5')."),
    ...networkField,
  },
  async handler(args, ctx) {
    if (!isAddress(args.token)) throw new Error("Invalid token address.");
    if (!isAddress(args.to)) throw new Error("Invalid recipient address.");
    const network = resolveNetwork(ctx, args.network);
    const signer = ctx.getSigner(network);
    const token = new Contract(args.token, ERC20_ABI, signer);
    const decimals = Number(await token.decimals());
    const value = parseUnits(args.amount, decimals);
    const tx = await token.transfer(args.to, value);
    return jsonResult({
      network,
      hash: tx.hash,
      token: args.token,
      from: ctx.address,
      to: args.to,
      amount: args.amount,
    });
  },
});

export const writeContract = defineTool({
  name: "write_contract",
  description:
    "Sign and broadcast a call to a state-changing contract method. Provide address, ABI fragments, method, args, and optional native value. STATE-CHANGING.",
  inputShape: {
    address: addressField.describe("Contract address."),
    abi: z.array(z.string()).min(1).describe("Human-readable ABI fragments."),
    method: z.string().describe("Method name to invoke."),
    args: z.array(z.any()).optional().describe("Positional arguments."),
    value: z
      .string()
      .optional()
      .describe("Optional native value to send with the call (native units)."),
    ...networkField,
  },
  async handler(args, ctx) {
    if (!isAddress(args.address)) throw new Error("Invalid contract address.");
    const network = resolveNetwork(ctx, args.network);
    const signer = ctx.getSigner(network);
    let iface: Interface;
    try {
      iface = new Interface(args.abi);
    } catch (e) {
      throw new Error(`Invalid ABI fragment(s): ${(e as Error).message}`);
    }
    if (!iface.getFunction(args.method)) {
      throw new Error(`Method "${args.method}" not found in the provided ABI.`);
    }
    const contract = new Contract(args.address, iface, signer);
    const overrides = args.value ? { value: parseEther(args.value) } : {};
    const tx = await contract[args.method](...(args.args ?? []), overrides);
    return jsonResult({
      network,
      hash: tx.hash,
      address: args.address,
      method: args.method,
      from: ctx.address,
    });
  },
});

export const simulateTransaction = defineTool({
  name: "simulate_transaction",
  description:
    "Dry-run a transaction (native/erc20/contract) WITHOUT broadcasting. Returns success/revert, gas estimate, and a decoded revert reason when it would fail.",
  inputShape: {
    kind: z
      .enum(["native", "erc20", "contract"])
      .describe("Which kind of transaction to simulate."),
    to: addressField
      .optional()
      .describe("Recipient (native/erc20) or contract address (contract)."),
    amount: z
      .string()
      .optional()
      .describe("Amount for native/erc20 transfers."),
    token: addressField.optional().describe("Token address for erc20 transfers."),
    abi: z.array(z.string()).optional().describe("ABI fragments for contract calls."),
    method: z.string().optional().describe("Method name for contract calls."),
    args: z.array(z.any()).optional().describe("Args for contract calls."),
    value: z.string().optional().describe("Native value for contract calls."),
    ...networkField,
  },
  async handler(args, ctx) {
    const network = resolveNetwork(ctx, args.network);
    const provider = ctx.getProvider(network);
    const req = await buildTxRequest(ctx, network, {
      kind: args.kind,
      to: args.kind === "contract" ? args.to : args.to,
      amount: args.amount,
      token: args.token,
      abi: args.abi,
      method: args.method,
      args: args.args,
      value: args.value,
    });

    try {
      await provider.call(req);
      const gas = await provider.estimateGas(req);
      return jsonResult({
        network,
        success: true,
        gasEstimate: gas.toString(),
        from: ctx.address,
        to: req.to ?? null,
      });
    } catch (err) {
      return jsonResult({
        network,
        success: false,
        revertReason: decodeRevert(err),
        from: ctx.address,
        to: req.to ?? null,
      });
    }
  },
});

/** Best-effort extraction of a revert reason from an ethers/provider error. */
function decodeRevert(err: unknown): string {
  const e = err as { reason?: string; shortMessage?: string; message?: string };
  return e.reason || e.shortMessage || e.message || "Transaction would revert.";
}

export const signMessage = defineTool({
  name: "sign_message",
  description:
    "Sign an arbitrary text message (EIP-191 personal_sign) with the configured wallet.",
  inputShape: {
    message: z.string().describe("The message text to sign."),
  },
  async handler(args, ctx) {
    // Signing does not depend on a network; use the default for a bound signer.
    const signer = ctx.getSigner(ctx.defaultNetwork);
    const signature = await signer.signMessage(args.message);
    return jsonResult({ address: ctx.address, message: args.message, signature });
  },
});

export const signTypedData = defineTool({
  name: "sign_typed_data",
  description:
    "Sign EIP-712 typed data with the configured wallet. Provide domain, types, and value.",
  inputShape: {
    domain: z.record(z.any()).describe("EIP-712 domain object."),
    types: z
      .record(z.array(z.object({ name: z.string(), type: z.string() })))
      .describe("EIP-712 types (excluding EIP712Domain)."),
    value: z.record(z.any()).describe("The typed data value to sign."),
  },
  async handler(args, ctx) {
    const signer = ctx.getSigner(ctx.defaultNetwork);
    let signature: string;
    try {
      signature = await signer.signTypedData(
        args.domain as any,
        args.types as any,
        args.value as any,
      );
    } catch (e) {
      throw new Error(`Malformed typed data: ${(e as Error).message}`);
    }
    return jsonResult({ address: ctx.address, signature });
  },
});

export const writeTools = [
  simulateTransaction,
  sendNative,
  sendToken,
  writeContract,
  signMessage,
  signTypedData,
];

export { buildTxRequest };
