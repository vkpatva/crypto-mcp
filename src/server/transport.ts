/**
 * Transport wiring. Selects stdio (default) or Streamable HTTP based on config
 * and connects the already-built MCP server. Tool registration is
 * transport-agnostic — only the connection differs.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AppConfig } from "../config/config.js";

/** Connect over stdio. Resolves once the transport is connected. */
export async function startStdio(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdio servers must not write to stdout; log to stderr only.
  process.stderr.write("crypto-mcp-server listening on stdio\n");
}

/**
 * Connect over Streamable HTTP using Express. One transport per session,
 * keyed by the MCP session id header.
 */
export async function startHttp(
  serverFactory: () => McpServer,
  config: AppConfig,
): Promise<void> {
  const app = express();
  app.use(express.json());

  const transports = new Map<string, StreamableHTTPServerTransport>();

  app.post("/mcp", async (req: Request, res: Response) => {
    const sessionId = req.header("mcp-session-id");
    let transport = sessionId ? transports.get(sessionId) : undefined;

    if (!transport) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          transports.set(id, transport!);
        },
      });
      transport.onclose = () => {
        if (transport!.sessionId) transports.delete(transport!.sessionId);
      };
      const server = serverFactory();
      await server.connect(transport);
    }

    await transport.handleRequest(req, res, req.body);
  });

  // GET/DELETE for the streamable session lifecycle.
  const sessionRoute = async (req: Request, res: Response) => {
    const sessionId = req.header("mcp-session-id");
    const transport = sessionId ? transports.get(sessionId) : undefined;
    if (!transport) {
      res.status(400).send("Unknown or missing session id");
      return;
    }
    await transport.handleRequest(req, res);
  };
  app.get("/mcp", sessionRoute);
  app.delete("/mcp", sessionRoute);

  await new Promise<void>((resolve) => {
    app.listen(config.port, () => {
      process.stderr.write(
        `crypto-mcp-server listening on http://localhost:${config.port}/mcp\n`,
      );
      resolve();
    });
  });
}
