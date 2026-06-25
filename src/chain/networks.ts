/**
 * Static registry of supported Alchemy-backed EVM networks.
 *
 * Each network maps to its chain ID, native currency symbol, and the Alchemy
 * RPC host used to build the JSON-RPC endpoint. The endpoint is constructed as
 * `https://<host>/v2/<ALCHEMY_API_KEY>`.
 */

export interface NetworkInfo {
  /** Canonical identifier used by tool callers. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** EVM chain ID. */
  chainId: number;
  /** Native currency symbol (e.g. ETH, MATIC). */
  nativeSymbol: string;
  /** Alchemy RPC host for this network. */
  alchemyHost: string;
  /** True for testnets (e.g. Sepolia, Amoy). Absent/false for mainnets. */
  testnet?: boolean;
}

export const NETWORKS = {
  ethereum: {
    id: "ethereum",
    name: "Ethereum Mainnet",
    chainId: 1,
    nativeSymbol: "ETH",
    alchemyHost: "eth-mainnet.g.alchemy.com",
  },
  base: {
    id: "base",
    name: "Base Mainnet",
    chainId: 8453,
    nativeSymbol: "ETH",
    alchemyHost: "base-mainnet.g.alchemy.com",
  },
  arbitrum: {
    id: "arbitrum",
    name: "Arbitrum One",
    chainId: 42161,
    nativeSymbol: "ETH",
    alchemyHost: "arb-mainnet.g.alchemy.com",
  },
  optimism: {
    id: "optimism",
    name: "OP Mainnet",
    chainId: 10,
    nativeSymbol: "ETH",
    alchemyHost: "opt-mainnet.g.alchemy.com",
  },
  polygon: {
    id: "polygon",
    name: "Polygon PoS",
    chainId: 137,
    nativeSymbol: "POL",
    alchemyHost: "polygon-mainnet.g.alchemy.com",
  },

  // ---- Testnets ----
  sepolia: {
    id: "sepolia",
    name: "Ethereum Sepolia",
    chainId: 11155111,
    nativeSymbol: "ETH",
    alchemyHost: "eth-sepolia.g.alchemy.com",
    testnet: true,
  },
  "base-sepolia": {
    id: "base-sepolia",
    name: "Base Sepolia",
    chainId: 84532,
    nativeSymbol: "ETH",
    alchemyHost: "base-sepolia.g.alchemy.com",
    testnet: true,
  },
  "arbitrum-sepolia": {
    id: "arbitrum-sepolia",
    name: "Arbitrum Sepolia",
    chainId: 421614,
    nativeSymbol: "ETH",
    alchemyHost: "arb-sepolia.g.alchemy.com",
    testnet: true,
  },
  "optimism-sepolia": {
    id: "optimism-sepolia",
    name: "Optimism Sepolia",
    chainId: 11155420,
    nativeSymbol: "ETH",
    alchemyHost: "opt-sepolia.g.alchemy.com",
    testnet: true,
  },
  "polygon-amoy": {
    id: "polygon-amoy",
    name: "Polygon Amoy",
    chainId: 80002,
    nativeSymbol: "POL",
    alchemyHost: "polygon-amoy.g.alchemy.com",
    testnet: true,
  },
} as const satisfies Record<string, NetworkInfo>;

export type NetworkId = keyof typeof NETWORKS;

/** All supported network identifiers, e.g. for building enums and error messages. */
export const NETWORK_IDS = Object.keys(NETWORKS) as NetworkId[];

export function isSupportedNetwork(id: string): id is NetworkId {
  return id in NETWORKS;
}

export function getNetwork(id: NetworkId): NetworkInfo {
  return NETWORKS[id];
}

/** Build the Alchemy JSON-RPC URL for a network from an API key. */
export function alchemyUrl(id: NetworkId, apiKey: string): string {
  return `https://${NETWORKS[id].alchemyHost}/v2/${apiKey}`;
}
