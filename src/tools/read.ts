/**
 * Read-only chain tools (chain-read capability): native/ERC-20 balances, gas
 * price, blocks, transactions, ENS resolution, and generic contract reads.
 * None of these tools mutate chain state or use the signing wallet.
 */

import { z } from "zod";
import { Contract, formatEther, formatUnits, isAddress, Interface } from "ethers";
import { defineTool } from "./types.js";
import {
  networkField,
  resolveNetwork,
  jsonResult,
} from "./common.js";
import { getNetwork } from "../chain/networks.js";

const ERC20_BALANCE_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

const addressField = z
  .string()
  .refine((v) => isAddress(v), { message: "Invalid EVM address" });

export const getNativeBalance = defineTool({
  name: "get_native_balance",
  description:
    "Get the native currency balance (ETH/POL/etc.) of an address on a supported network.",
  inputShape: {
    address: addressField.describe("Address to query."),
    ...networkField,
  },
  async handler(args, ctx) {
    const network = resolveNetwork(ctx, args.network);
    const info = getNetwork(network);
    const provider = ctx.getProvider(network);
    const wei = await provider.getBalance(args.address);
    return jsonResult({
      network,
      address: args.address,
      wei: wei.toString(),
      formatted: formatEther(wei),
      symbol: info.nativeSymbol,
    });
  },
});

export const getTokenBalance = defineTool({
  name: "get_token_balance",
  description:
    "Get an ERC-20 token balance for an address, using the token's on-chain decimals and symbol.",
  inputShape: {
    token: addressField.describe("ERC-20 token contract address."),
    address: addressField.describe("Holder address to query."),
    ...networkField,
  },
  async handler(args, ctx) {
    const network = resolveNetwork(ctx, args.network);
    const provider = ctx.getProvider(network);
    const token = new Contract(args.token, ERC20_BALANCE_ABI, provider);
    const [raw, decimals, symbol] = await Promise.all([
      token.balanceOf(args.address) as Promise<bigint>,
      token.decimals() as Promise<bigint>,
      token.symbol().catch(() => "") as Promise<string>,
    ]);
    const dec = Number(decimals);
    return jsonResult({
      network,
      token: args.token,
      address: args.address,
      raw: raw.toString(),
      decimals: dec,
      symbol,
      formatted: formatUnits(raw, dec),
    });
  },
});

export const getGasPrice = defineTool({
  name: "get_gas_price",
  description: "Get current fee data (gas price, EIP-1559 fields) for a network.",
  inputShape: { ...networkField },
  async handler(args, ctx) {
    const network = resolveNetwork(ctx, args.network);
    const fee = await ctx.getProvider(network).getFeeData();
    return jsonResult({
      network,
      gasPrice: fee.gasPrice?.toString() ?? null,
      maxFeePerGas: fee.maxFeePerGas?.toString() ?? null,
      maxPriorityFeePerGas: fee.maxPriorityFeePerGas?.toString() ?? null,
    });
  },
});

export const getBlock = defineTool({
  name: "get_block",
  description:
    "Fetch a block by number, tag (e.g. 'latest'), or hash on a supported network.",
  inputShape: {
    block: z
      .union([z.number().int(), z.string()])
      .describe("Block number, tag ('latest'/'finalized'), or block hash."),
    ...networkField,
  },
  async handler(args, ctx) {
    const network = resolveNetwork(ctx, args.network);
    const block = await ctx.getProvider(network).getBlock(args.block as any);
    if (!block) {
      return jsonResult({ network, block: args.block, found: false });
    }
    return jsonResult({
      network,
      found: true,
      number: block.number,
      hash: block.hash,
      parentHash: block.parentHash,
      timestamp: block.timestamp,
      gasUsed: block.gasUsed.toString(),
      gasLimit: block.gasLimit.toString(),
      transactionCount: block.transactions.length,
    });
  },
});

export const getTransaction = defineTool({
  name: "get_transaction",
  description:
    "Fetch a transaction and, if mined, its receipt by hash on a supported network.",
  inputShape: {
    hash: z.string().describe("Transaction hash."),
    ...networkField,
  },
  async handler(args, ctx) {
    const network = resolveNetwork(ctx, args.network);
    const provider = ctx.getProvider(network);
    const [tx, receipt] = await Promise.all([
      provider.getTransaction(args.hash),
      provider.getTransactionReceipt(args.hash),
    ]);
    if (!tx) {
      return jsonResult({ network, hash: args.hash, found: false });
    }
    return jsonResult({
      network,
      found: true,
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value.toString(),
      nonce: tx.nonce,
      blockNumber: tx.blockNumber,
      mined: receipt !== null,
      status: receipt ? receipt.status : null,
      gasUsed: receipt ? receipt.gasUsed.toString() : null,
    });
  },
});

export const resolveEns = defineTool({
  name: "resolve_ens",
  description:
    "Resolve an ENS name to an address, or an address to its primary ENS name, where the network supports ENS.",
  inputShape: {
    query: z
      .string()
      .describe("An ENS name (e.g. vitalik.eth) or an address to reverse-resolve."),
    ...networkField,
  },
  async handler(args, ctx) {
    const network = resolveNetwork(ctx, args.network);
    const provider = ctx.getProvider(network);
    if (isAddress(args.query)) {
      const name = await provider.lookupAddress(args.query);
      return jsonResult({ network, address: args.query, name: name ?? null });
    }
    const address = await provider.resolveName(args.query);
    return jsonResult({ network, name: args.query, address: address ?? null });
  },
});

export const readContract = defineTool({
  name: "read_contract",
  description:
    "Call a read-only (view/pure) contract method. Provide the contract address, an ABI fragment array, the method name, and arguments.",
  inputShape: {
    address: addressField.describe("Contract address."),
    abi: z
      .array(z.string())
      .min(1)
      .describe(
        "ABI fragments in human-readable form, e.g. ['function totalSupply() view returns (uint256)'].",
      ),
    method: z.string().describe("Method name to call."),
    args: z
      .array(z.any())
      .optional()
      .describe("Positional arguments for the method."),
    ...networkField,
  },
  async handler(args, ctx) {
    const network = resolveNetwork(ctx, args.network);
    const provider = ctx.getProvider(network);
    let iface: Interface;
    try {
      iface = new Interface(args.abi);
    } catch (e) {
      throw new Error(`Invalid ABI fragment(s): ${(e as Error).message}`);
    }
    const fragment = iface.getFunction(args.method);
    if (!fragment) {
      throw new Error(`Method "${args.method}" not found in the provided ABI.`);
    }
    const contract = new Contract(args.address, iface, provider);
    const result = await contract[args.method](...(args.args ?? []));
    return jsonResult({
      network,
      address: args.address,
      method: args.method,
      result: normalizeResult(result),
    });
  },
});

/** Convert ethers Result/bigint values into JSON-friendly forms. */
function normalizeResult(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(normalizeResult);
  return value;
}

export const readTools = [
  getNativeBalance,
  getTokenBalance,
  getGasPrice,
  getBlock,
  getTransaction,
  resolveEns,
  readContract,
];
