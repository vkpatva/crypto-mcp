/**
 * MCP server core: registers every tool once with its name, description, and
 * Zod input schema, and wires each handler to the shared ChainContext through a
 * central error handler that sanitizes secrets from any surfaced error.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { allTools } from "../tools/index.js";
import type { ChainContext } from "../chain/context.js";
import { sanitizeError } from "../config/secrets.js";
import type { ToolResult } from "../tools/common.js";

export function createServer(ctx: ChainContext): McpServer {
  const server = new McpServer({
    name: "crypto-mcp-server",
    version: "0.1.0",
  });

  for (const tool of allTools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputShape,
      },
      async (args: unknown): Promise<ToolResult> => {
        try {
          return await tool.handler(args as any, ctx);
        } catch (err) {
          return {
            content: [
              { type: "text", text: `Error: ${sanitizeError(err)}` },
            ],
            isError: true,
          };
        }
      },
    );
  }

  return server;
}

// Re-export for tests that want the registered tool count.
export { allTools };
export { z };
