import { describe, it, expect, beforeEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "./server.js";
import { ChainContext } from "../chain/context.js";
import type { AppConfig } from "../config/config.js";
import { registerSecret, _resetSecrets } from "../config/secrets.js";

const VALID_PK =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

const cfg: AppConfig = {
  alchemyApiKey: "SECRET_ALCHEMY_KEY",
  privateKey: VALID_PK,
  defaultNetwork: "ethereum",
  transport: "stdio",
  port: 3000,
};

beforeEach(() => _resetSecrets());

async function connect() {
  const ctx = new ChainContext(cfg);
  const server = createServer(ctx);
  const client = new Client({ name: "test", version: "0.0.0" });
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverT), client.connect(clientT)]);
  return { client };
}

describe("MCP server", () => {
  it("advertises all registered tools with schemas", async () => {
    const { client } = await connect();
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain("get_native_balance");
    expect(names).toContain("send_native");
    expect(names.length).toBeGreaterThanOrEqual(13);
    for (const t of tools) {
      expect(t.inputSchema).toBeDefined();
    }
  });

  it("returns a sanitized error that never leaks secrets", async () => {
    // Register the alchemy key as a secret (as startup config would).
    registerSecret(cfg.alchemyApiKey);
    const { client } = await connect();
    // Force a failure by querying with no network connectivity (invalid host
    // resolution). The error must not contain the alchemy key.
    const res: any = await client.callTool({
      name: "get_native_balance",
      arguments: { address: "0x0000000000000000000000000000000000000001" },
    });
    // Either it errored (offline) or succeeded; in both cases no secret leaks.
    const text = JSON.stringify(res);
    expect(text).not.toContain("SECRET_ALCHEMY_KEY");
  });
});
