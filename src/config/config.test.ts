import { describe, it, expect, beforeEach } from "vitest";
import { buildConfig, ConfigError } from "./config.js";
import { _resetSecrets } from "./secrets.js";

const VALID_PK =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const VALID_MNEMONIC =
  "test test test test test test test test test test test junk";

beforeEach(() => _resetSecrets());

describe("buildConfig", () => {
  it("accepts a private key + alchemy key", () => {
    const cfg = buildConfig({ ALCHEMY_API_KEY: "abc", PRIVATE_KEY: VALID_PK });
    expect(cfg.privateKey).toBe(VALID_PK);
    expect(cfg.defaultNetwork).toBe("ethereum");
    expect(cfg.transport).toBe("stdio");
  });

  it("accepts a mnemonic + alchemy key", () => {
    const cfg = buildConfig({ ALCHEMY_API_KEY: "abc", MNEMONIC: VALID_MNEMONIC });
    expect(cfg.mnemonic).toBe(VALID_MNEMONIC);
  });

  it("fails when neither key is provided", () => {
    expect(() => buildConfig({ ALCHEMY_API_KEY: "abc" })).toThrow(ConfigError);
    expect(() => buildConfig({ ALCHEMY_API_KEY: "abc" })).toThrow(/Key material/);
  });

  it("treats an empty-string MNEMONIC as not provided", () => {
    const cfg = buildConfig({
      ALCHEMY_API_KEY: "abc",
      PRIVATE_KEY: VALID_PK,
      MNEMONIC: "   ",
    });
    expect(cfg.privateKey).toBe(VALID_PK);
    expect(cfg.mnemonic).toBeUndefined();
  });

  it("fails when both keys are provided", () => {
    expect(() =>
      buildConfig({
        ALCHEMY_API_KEY: "abc",
        PRIVATE_KEY: VALID_PK,
        MNEMONIC: VALID_MNEMONIC,
      }),
    ).toThrow(/not both/);
  });

  it("fails when the alchemy key is missing", () => {
    expect(() => buildConfig({ PRIVATE_KEY: VALID_PK })).toThrow(/ALCHEMY_API_KEY/);
  });

  it("falls back to the default network when unspecified", () => {
    const cfg = buildConfig({ ALCHEMY_API_KEY: "abc", PRIVATE_KEY: VALID_PK });
    expect(cfg.defaultNetwork).toBe("ethereum");
  });

  it("honours a valid DEFAULT_NETWORK", () => {
    const cfg = buildConfig({
      ALCHEMY_API_KEY: "abc",
      PRIVATE_KEY: VALID_PK,
      DEFAULT_NETWORK: "base",
    });
    expect(cfg.defaultNetwork).toBe("base");
  });

  it("rejects an unsupported DEFAULT_NETWORK", () => {
    expect(() =>
      buildConfig({
        ALCHEMY_API_KEY: "abc",
        PRIVATE_KEY: VALID_PK,
        DEFAULT_NETWORK: "solana",
      }),
    ).toThrow(/not supported/);
  });

  it("rejects an invalid transport and port", () => {
    expect(() =>
      buildConfig({ ALCHEMY_API_KEY: "abc", PRIVATE_KEY: VALID_PK, TRANSPORT: "ws" }),
    ).toThrow(/TRANSPORT/);
    expect(() =>
      buildConfig({ ALCHEMY_API_KEY: "abc", PRIVATE_KEY: VALID_PK, PORT: "0" }),
    ).toThrow(/PORT/);
  });
});
