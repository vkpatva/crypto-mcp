# crypto-mcp-server

A [Model Context Protocol](https://modelcontextprotocol.io) server that lets any
MCP client (Claude Desktop, Cursor, etc.) perform EVM blockchain operations —
reading balances, reading/writing contracts, simulating and sending
transactions, and signing messages — through **Alchemy RPC**, using a wallet
derived from a mnemonic or private key.

## Features

- **Multi-chain** across Alchemy-backed networks. The target network is
  selectable per tool call (defaults to the configured `DEFAULT_NETWORK`).
  - Mainnets: `ethereum`, `base`, `arbitrum`, `optimism`, `polygon`
  - Testnets: `sepolia`, `base-sepolia`, `arbitrum-sepolia`,
    `optimism-sepolia`, `polygon-amoy`
- **Both transports**: stdio (default, for local clients) and Streamable HTTP
  (for remote/hosted use).
- **Tools**:
  - Reads: `get_native_balance`, `get_token_balance`, `get_gas_price`,
    `get_block`, `get_transaction`, `resolve_ens`, `read_contract`
  - Writes: `send_native`, `send_token`, `write_contract`
  - Pre-flight: `simulate_transaction` (dry-run, never broadcasts)
  - Signing: `sign_message` (EIP-191), `sign_typed_data` (EIP-712)

## Prerequisites

- Node.js ≥ 18
- An [Alchemy](https://alchemy.com) API key
- A wallet **mnemonic** *or* **private key**

## Setup

```bash
npm install
cp .env.example .env   # then fill in the values
npm run build
```

### Environment variables

| Variable          | Required | Description                                                        |
| ----------------- | -------- | ------------------------------------------------------------------ |
| `ALCHEMY_API_KEY` | yes      | Your Alchemy API key. Used to build RPC endpoints for all chains.  |
| `MNEMONIC`        | one of   | BIP-39 mnemonic phrase. Provide **exactly one** of this / key.     |
| `PRIVATE_KEY`     | one of   | `0x`-prefixed hex private key. Provide **exactly one**.            |
| `DERIVATION_PATH` | no       | HD path used with `MNEMONIC` (defaults to ethers' default path).   |
| `DEFAULT_NETWORK` | no       | Default chain when a call omits `network` (mainnet or testnet, e.g. `polygon-amoy`, `sepolia`). Default: `ethereum`. |
| `TRANSPORT`       | no       | `stdio` (default) or `http`.                                       |
| `PORT`            | no       | Port for the HTTP transport. Default: `3000`.                      |

The server **fails to start** (non-zero exit) if `ALCHEMY_API_KEY` is missing,
if neither key is provided, or if both keys are provided.

## Running

**stdio** (default — most MCP clients launch the server this way):

```bash
npm run start
# or for development with reload:
npm run dev
```

**Streamable HTTP**:

```bash
TRANSPORT=http PORT=3000 npm run start
# MCP endpoint: http://localhost:3000/mcp
```

## Using with an MCP client (stdio)

Add to your client's MCP config (e.g. Claude Desktop's
`claude_desktop_config.json`, or `.cursor/mcp.json`). See
[`examples/mcp-client-config.json`](./examples/mcp-client-config.json).

```json
{
  "mcpServers": {
    "crypto": {
      "command": "node",
      "args": ["/absolute/path/to/crypto-mcp-server/dist/index.js"],
      "env": {
        "ALCHEMY_API_KEY": "your-alchemy-key",
        "PRIVATE_KEY": "0xyour-private-key",
        "DEFAULT_NETWORK": "ethereum"
      }
    }
  }
}
```

## Security

> **This server can spend funds.** It holds a mnemonic or private key in
> process memory and can sign and broadcast transactions.

- Secrets are read only from environment variables and are **never logged,
  echoed, or returned** in tool outputs or error messages.
- Prefer `simulate_transaction` before any `send_*` / `write_contract` call to
  preview gas and catch reverts.
- **The HTTP transport exposes spend operations over the network.** It performs
  no authentication of its own — run it only behind a trusted network and/or an
  authenticating proxy. For local single-user use, prefer `stdio`.
- Use a dedicated, low-value wallet. Never point this at a key holding
  significant funds without your own additional controls.

## Development

```bash
npm run lint   # type-check only (tsc --noEmit)
npm run test   # vitest
npm run build  # compile to dist/
```
