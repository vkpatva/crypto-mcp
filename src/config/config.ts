/**
 * Configuration loading and validation.
 *
 * Reads all settings from environment variables, validates them with Zod, and
 * fails closed (throwing a secret-free error) when required values are missing
 * or malformed. Exactly one of MNEMONIC / PRIVATE_KEY must be present, and an
 * Alchemy API key is always required.
 */

import { z } from "zod";
import { NETWORK_IDS, type NetworkId } from "../chain/networks.js";
import { registerSecret } from "./secrets.js";

export type TransportKind = "stdio" | "http";

export interface AppConfig {
  alchemyApiKey: string;
  mnemonic?: string;
  privateKey?: string;
  derivationPath?: string;
  defaultNetwork: NetworkId;
  transport: TransportKind;
  port: number;
}

/**
 * Treat empty / whitespace-only env vars as "not provided" rather than as a
 * malformed value. This lets a config that sets PRIVATE_KEY while leaving
 * MNEMONIC= blank behave the same as omitting MNEMONIC entirely.
 */
const optionalEnv = z.preprocess((v) => {
  if (typeof v === "string") {
    const trimmed = v.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }
  return v;
}, z.string().min(1).optional());

const RawEnvSchema = z.object({
  ALCHEMY_API_KEY: optionalEnv,
  MNEMONIC: optionalEnv,
  PRIVATE_KEY: optionalEnv,
  DERIVATION_PATH: optionalEnv,
  DEFAULT_NETWORK: optionalEnv,
  TRANSPORT: optionalEnv,
  PORT: optionalEnv,
});

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/**
 * Validate a raw environment-variable map into an AppConfig.
 * Exported separately from process.env loading so it is unit-testable.
 */
export function buildConfig(env: NodeJS.ProcessEnv): AppConfig {
  const parsed = RawEnvSchema.safeParse(env);
  if (!parsed.success) {
    throw new ConfigError(
      `Invalid configuration: ${parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }
  const e = parsed.data;

  // Alchemy key is always required.
  if (!e.ALCHEMY_API_KEY) {
    throw new ConfigError("ALCHEMY_API_KEY is required but was not provided.");
  }

  // Exactly one of mnemonic / private key.
  const hasMnemonic = Boolean(e.MNEMONIC);
  const hasPrivateKey = Boolean(e.PRIVATE_KEY);
  if (!hasMnemonic && !hasPrivateKey) {
    throw new ConfigError(
      "Key material is required: provide exactly one of MNEMONIC or PRIVATE_KEY.",
    );
  }
  if (hasMnemonic && hasPrivateKey) {
    throw new ConfigError(
      "Provide exactly one of MNEMONIC or PRIVATE_KEY, not both.",
    );
  }

  // Default network.
  const defaultNetwork = (e.DEFAULT_NETWORK ?? "ethereum") as string;
  if (!NETWORK_IDS.includes(defaultNetwork as NetworkId)) {
    throw new ConfigError(
      `DEFAULT_NETWORK "${defaultNetwork}" is not supported. Supported networks: ${NETWORK_IDS.join(", ")}.`,
    );
  }

  // Transport.
  const transportRaw = (e.TRANSPORT ?? "stdio").toLowerCase();
  if (transportRaw !== "stdio" && transportRaw !== "http") {
    throw new ConfigError(
      `TRANSPORT "${transportRaw}" is invalid. Use "stdio" or "http".`,
    );
  }
  const transport = transportRaw as TransportKind;

  // Port.
  let port = 3000;
  if (e.PORT) {
    const n = Number(e.PORT);
    if (!Number.isInteger(n) || n <= 0 || n > 65535) {
      throw new ConfigError(`PORT "${e.PORT}" is not a valid TCP port.`);
    }
    port = n;
  }

  // Register secrets so they are redacted from any later output.
  registerSecret(e.ALCHEMY_API_KEY);
  registerSecret(e.MNEMONIC);
  registerSecret(e.PRIVATE_KEY);

  return {
    alchemyApiKey: e.ALCHEMY_API_KEY,
    mnemonic: e.MNEMONIC,
    privateKey: e.PRIVATE_KEY,
    derivationPath: e.DERIVATION_PATH,
    defaultNetwork: defaultNetwork as NetworkId,
    transport,
    port,
  };
}

/** Load and validate configuration from process.env. */
export function loadConfig(): AppConfig {
  return buildConfig(process.env);
}
