#!/usr/bin/env node
/**
 * Entrypoint: load config (fail-closed), build the chain context and MCP
 * server, and start the configured transport (stdio default, or Streamable
 * HTTP). All startup errors are sanitized of secret material.
 */

import "dotenv/config";
import { loadConfig } from "./config/config.js";
import { ChainContext } from "./chain/context.js";
import { createServer } from "./server/server.js";
import { startStdio, startHttp } from "./server/transport.js";
import { sanitizeError } from "./config/secrets.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const ctx = new ChainContext(config);

  if (config.transport === "http") {
    // A fresh server per HTTP session; context (wallet/providers) is shared.
    await startHttp(() => createServer(ctx), config);
  } else {
    await startStdio(createServer(ctx));
  }
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${sanitizeError(err)}\n`);
  process.exit(1);
});
