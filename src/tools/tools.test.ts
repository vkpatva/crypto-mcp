import { describe, it, expect, vi } from "vitest";
import { ChainContext } from "../chain/context.js";
import type { AppConfig } from "../config/config.js";
import { getNativeBalance, readContract } from "./read.js";
import { sendNative, signMessage, simulateTransaction } from "./write.js";
import { resolveNetwork } from "./common.js";
import { allTools } from "./index.js";
import { Wallet, verifyMessage } from "ethers";

const VALID_PK =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

const cfg: AppConfig = {
  alchemyApiKey: "abc",
  privateKey: VALID_PK,
  defaultNetwork: "ethereum",
  transport: "stdio",
  port: 3000,
};

function ctxWithProvider(provider: any): ChainContext {
  const ctx = new ChainContext(cfg);
  vi.spyOn(ctx, "getProvider").mockReturnValue(provider);
  return ctx;
}

function parse(result: { content: { text: string }[] }) {
  return JSON.parse(result.content[0].text);
}

describe("read tools", () => {
  it("get_native_balance formats wei and applies default network", async () => {
    const provider = { getBalance: vi.fn().mockResolvedValue(1_000000000000000000n) };
    const ctx = ctxWithProvider(provider);
    const res = await getNativeBalance.handler(
      { address: "0x0000000000000000000000000000000000000001" },
      ctx,
    );
    const data = parse(res);
    expect(data.network).toBe("ethereum");
    expect(data.formatted).toBe("1.0");
    expect(data.symbol).toBe("ETH");
  });

  it("read_contract rejects a method missing from the ABI", async () => {
    const ctx = ctxWithProvider({});
    await expect(
      readContract.handler(
        {
          address: "0x0000000000000000000000000000000000000001",
          abi: ["function totalSupply() view returns (uint256)"],
          method: "balanceOf",
        },
        ctx,
      ),
    ).rejects.toThrow(/not found/);
  });
});

describe("network resolution", () => {
  it("rejects an unsupported network without touching RPC", () => {
    const ctx = new ChainContext(cfg);
    expect(() => resolveNetwork(ctx, "solana")).toThrow(/Unsupported network/);
  });
});

describe("write/sign tools", () => {
  it("send_native rejects a malformed recipient and broadcasts nothing", async () => {
    const ctx = new ChainContext(cfg);
    const sendSpy = vi.fn();
    vi.spyOn(ctx, "getSigner").mockReturnValue({ sendTransaction: sendSpy } as any);
    // Schema validation happens at registration; the handler still guards via parseEther/address.
    await expect(
      sendNative.handler({ to: "not-an-address", amount: "1" } as any, ctx),
    ).rejects.toThrow();
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("sign_message produces a verifiable EIP-191 signature", async () => {
    const ctx = new ChainContext(cfg);
    const res = await signMessage.handler({ message: "hello" }, ctx);
    const data = parse(res);
    expect(verifyMessage("hello", data.signature)).toBe(
      new Wallet(VALID_PK).address,
    );
  });

  it("simulate_transaction reports a revert reason and never broadcasts", async () => {
    const err: any = new Error("execution reverted");
    err.reason = "INSUFFICIENT_BALANCE";
    const provider = {
      call: vi.fn().mockRejectedValue(err),
      estimateGas: vi.fn(),
    };
    const ctx = ctxWithProvider(provider);
    const res = await simulateTransaction.handler(
      {
        kind: "native",
        to: "0x0000000000000000000000000000000000000002",
        amount: "1",
      },
      ctx,
    );
    const data = parse(res);
    expect(data.success).toBe(false);
    expect(data.revertReason).toBe("INSUFFICIENT_BALANCE");
    expect(provider.estimateGas).not.toHaveBeenCalled();
  });
});

describe("tool registry", () => {
  it("registers all expected tools with unique names and schemas", () => {
    const names = allTools.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toEqual(
      expect.arrayContaining([
        "get_native_balance",
        "get_token_balance",
        "get_gas_price",
        "get_block",
        "get_transaction",
        "resolve_ens",
        "read_contract",
        "simulate_transaction",
        "send_native",
        "send_token",
        "write_contract",
        "sign_message",
        "sign_typed_data",
      ]),
    );
    for (const t of allTools) {
      expect(t.description.length).toBeGreaterThan(0);
      expect(typeof t.inputShape).toBe("object");
    }
  });
});
