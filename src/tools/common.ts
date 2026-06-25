/**
 * Shared helpers for tool definitions: the network input shape, network
 * resolution against the registry, and a helper to wrap structured results in
 * the MCP content format.
 */

import { z } from "zod";
import { NETWORK_IDS, isSupportedNetwork, type NetworkId } from "../chain/networks.js";
import type { ChainContext } from "../chain/context.js";

/** Optional `network` field reused across tool schemas. */
export const networkField = {
  network: z
    .enum(NETWORK_IDS as [NetworkId, ...NetworkId[]])
    .optional()
    .describe(
      `Target network. One of: ${NETWORK_IDS.join(", ")}. Defaults to the server's configured default network.`,
    ),
};

/** Resolve a network argument to a concrete NetworkId, applying the default. */
export function resolveNetwork(
  ctx: ChainContext,
  network: string | undefined,
): NetworkId {
  if (network === undefined) {
    return ctx.defaultNetwork;
  }
  if (!isSupportedNetwork(network)) {
    throw new Error(
      `Unsupported network "${network}". Supported networks: ${NETWORK_IDS.join(", ")}.`,
    );
  }
  return network;
}

/** MCP tool result type (structured JSON serialized into a text content block). */
export interface ToolResult {
  [key: string]: unknown;
  content: { type: "text"; text: string }[];
  isError?: boolean;
}

/** Serialize a structured object into an MCP text result. */
export function jsonResult(data: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, bigIntReplacer, 2) }],
  };
}

/** JSON replacer that renders bigint as a decimal string. */
export function bigIntReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}
