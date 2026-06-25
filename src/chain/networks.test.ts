import { describe, it, expect } from "vitest";
import {
  NETWORKS,
  NETWORK_IDS,
  isSupportedNetwork,
  getNetwork,
  alchemyUrl,
} from "./networks.js";

describe("network registry", () => {
  it("includes the required networks with chain ids", () => {
    expect(NETWORK_IDS).toEqual(
      expect.arrayContaining([
        "ethereum",
        "base",
        "arbitrum",
        "optimism",
        "polygon",
      ]),
    );
    expect(getNetwork("ethereum").chainId).toBe(1);
    expect(getNetwork("base").chainId).toBe(8453);
    expect(getNetwork("arbitrum").chainId).toBe(42161);
    expect(getNetwork("optimism").chainId).toBe(10);
    expect(getNetwork("polygon").chainId).toBe(137);
  });

  it("recognizes supported and rejects unsupported networks", () => {
    expect(isSupportedNetwork("ethereum")).toBe(true);
    expect(isSupportedNetwork("solana")).toBe(false);
  });

  it("builds the alchemy url from a key", () => {
    const url = alchemyUrl("ethereum", "MYKEY");
    expect(url).toBe("https://eth-mainnet.g.alchemy.com/v2/MYKEY");
    expect(NETWORKS.ethereum.nativeSymbol).toBe("ETH");
  });

  it("includes testnets with the correct chain ids and testnet flag", () => {
    expect(isSupportedNetwork("polygon-amoy")).toBe(true);
    expect(isSupportedNetwork("sepolia")).toBe(true);
    expect(getNetwork("polygon-amoy").chainId).toBe(80002);
    expect(getNetwork("sepolia").chainId).toBe(11155111);
    expect(getNetwork("base-sepolia").chainId).toBe(84532);
    expect(getNetwork("arbitrum-sepolia").chainId).toBe(421614);
    expect(getNetwork("optimism-sepolia").chainId).toBe(11155420);
    expect(getNetwork("polygon-amoy").testnet).toBe(true);
    // Mainnets are not flagged as testnets.
    expect(getNetwork("ethereum").testnet).toBeUndefined();
    expect(alchemyUrl("polygon-amoy", "K")).toBe(
      "https://polygon-amoy.g.alchemy.com/v2/K",
    );
  });
});
