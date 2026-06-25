/**
 * Chain context: lazy, cached JSON-RPC providers per network and a signing
 * wallet derived from the configured key material. The same account is usable
 * across every supported network by binding the wallet to a per-network
 * provider on demand.
 */

import {
  JsonRpcProvider,
  Wallet,
  HDNodeWallet,
  Mnemonic,
  type Provider,
} from "ethers";
import {
  alchemyUrl,
  getNetwork,
  type NetworkId,
} from "./networks.js";
import { ConfigError, type AppConfig } from "../config/config.js";

export class ChainContext {
  private readonly apiKey: string;
  private readonly baseWallet: HDNodeWallet | Wallet;
  private readonly providers = new Map<NetworkId, JsonRpcProvider>();
  private readonly signers = new Map<NetworkId, Wallet | HDNodeWallet>();

  readonly address: string;
  readonly defaultNetwork: NetworkId;

  constructor(config: AppConfig) {
    this.apiKey = config.alchemyApiKey;
    this.defaultNetwork = config.defaultNetwork;
    this.baseWallet = deriveWallet(config);
    this.address = this.baseWallet.address;
  }

  /** Resolve (and cache) a provider for a network. */
  getProvider(network: NetworkId): JsonRpcProvider {
    let provider = this.providers.get(network);
    if (!provider) {
      const info = getNetwork(network);
      provider = new JsonRpcProvider(alchemyUrl(network, this.apiKey), {
        chainId: info.chainId,
        name: info.id,
      });
      this.providers.set(network, provider);
    }
    return provider;
  }

  /** Resolve (and cache) a signer connected to a network's provider. */
  getSigner(network: NetworkId): Wallet | HDNodeWallet {
    let signer = this.signers.get(network);
    if (!signer) {
      signer = this.baseWallet.connect(this.getProvider(network));
      this.signers.set(network, signer);
    }
    return signer;
  }
}

/** Derive a signing wallet from config (private key precedence over mnemonic). */
export function deriveWallet(config: AppConfig): HDNodeWallet | Wallet {
  try {
    if (config.privateKey) {
      return new Wallet(config.privateKey);
    }
    if (config.mnemonic) {
      const mnemonic = Mnemonic.fromPhrase(config.mnemonic);
      const path = config.derivationPath;
      return path
        ? HDNodeWallet.fromMnemonic(mnemonic, path)
        : HDNodeWallet.fromMnemonic(mnemonic);
    }
  } catch {
    // Never echo the key material in the error.
    throw new ConfigError(
      "Failed to derive wallet: the configured key material is malformed.",
    );
  }
  // Should be unreachable given config validation, but fail closed.
  throw new ConfigError("No key material configured.");
}

export type { Provider };
