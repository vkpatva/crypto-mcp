import { describe, it, expect } from "vitest";
import { ChainContext, deriveWallet } from "./context.js";
import { ConfigError, type AppConfig } from "../config/config.js";

const base: AppConfig = {
  alchemyApiKey: "abc",
  defaultNetwork: "ethereum",
  transport: "stdio",
  port: 3000,
};

const VALID_PK =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const VALID_MNEMONIC =
  "test test test test test test test test test test test junk";

describe("wallet derivation", () => {
  it("derives from a private key", () => {
    const w = deriveWallet({ ...base, privateKey: VALID_PK });
    expect(w.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it("derives from a mnemonic", () => {
    const w = deriveWallet({ ...base, mnemonic: VALID_MNEMONIC });
    // Well-known first account of the hardhat/anvil test mnemonic.
    expect(w.address).toBe("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
  });

  it("throws a secret-free error on a malformed private key", () => {
    expect(() => deriveWallet({ ...base, privateKey: "0xnothex" })).toThrow(
      ConfigError,
    );
    try {
      deriveWallet({ ...base, privateKey: "0xnothex" });
    } catch (e) {
      expect((e as Error).message).not.toContain("0xnothex");
    }
  });

  it("throws on a malformed mnemonic", () => {
    expect(() => deriveWallet({ ...base, mnemonic: "not a real phrase" })).toThrow(
      ConfigError,
    );
  });
});

describe("ChainContext", () => {
  it("caches providers and signers per network", () => {
    const ctx = new ChainContext({ ...base, privateKey: VALID_PK });
    const p1 = ctx.getProvider("ethereum");
    const p2 = ctx.getProvider("ethereum");
    expect(p1).toBe(p2);
    const s1 = ctx.getSigner("base");
    const s2 = ctx.getSigner("base");
    expect(s1).toBe(s2);
    expect(ctx.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });
});
