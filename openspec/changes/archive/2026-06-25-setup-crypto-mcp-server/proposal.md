## Why

AI assistants and agents have no first-class way to interact with EVM blockchains — checking balances, reading contracts, simulating and sending transactions, or signing messages — without bespoke, per-client scripting. Exposing these operations through the Model Context Protocol (MCP) lets any MCP-capable client (Claude Desktop, Cursor, etc.) drive on-chain activity through a single, auditable, well-typed interface. This change establishes the foundational TypeScript MCP server that connects to EVM chains via Alchemy RPC using a wallet derived from a mnemonic or private key.

## What Changes

- Introduce a TypeScript MCP server (project scaffold, build, lint, dev/run scripts) that speaks MCP over **both stdio and Streamable HTTP** transports, selectable via configuration.
- Add configuration and a signing wallet loaded from **either a mnemonic or a private key**, plus a required **Alchemy API key**, sourced from environment variables (`.env` for local dev). The server refuses to start if neither key material nor the Alchemy key is present.
- Add **multi-chain support** across Alchemy-backed EVM networks (Ethereum, Base, Arbitrum, Optimism, Polygon), with the target network selectable per tool call and validated against a supported-networks registry.
- Expose MCP **tools** covering:
  - **Read & info**: native balance, ERC-20 token balances, gas price, block and transaction lookups, ENS/address resolution.
  - **Contract reads**: generic `eth_call` of any view/pure method given address, ABI fragment, and arguments.
  - **Contract writes**: invoke any non-view contract method, signing and broadcasting with the configured wallet.
  - **Send transactions**: native value transfers and ERC-20 transfers signed by the configured wallet. **BREAKING**/sensitive — these mutate chain state and spend funds.
  - **Transaction simulation**: dry-run a transaction (via `eth_call`/Alchemy simulation) and return expected outcome, gas estimate, and decoded revert reasons before any send.
  - **Message signing**: sign arbitrary messages (EIP-191) and typed data (EIP-712) with the configured key.
- Add safety guardrails: simulation-before-send option, explicit network/value echoing in tool responses, and never returning or logging raw private key / mnemonic material.

## Capabilities

### New Capabilities
- `mcp-server`: Server lifecycle, MCP protocol handling, and dual transport (stdio + Streamable HTTP) including tool registration and error surfacing.
- `wallet-config`: Loading and validating configuration — mnemonic *or* private key, Alchemy API key, default network — and deriving the signing wallet; secret-handling rules.
- `chain-connectivity`: Multi-chain Alchemy RPC connectivity, supported-network registry, and per-call network selection/provider resolution.
- `chain-read`: Read-only on-chain queries — native/ERC-20 balances, gas price, blocks, transactions, ENS resolution, and generic contract `eth_call` reads.
- `chain-write`: State-changing operations — native and ERC-20 transfers, generic contract method writes, transaction simulation/dry-run, and message/typed-data signing.

### Modified Capabilities
<!-- None — this is a greenfield project with no existing specs. -->

## Impact

- **New codebase**: TypeScript project (`package.json`, `tsconfig.json`, source under `src/`), bootstrapped from empty repo.
- **Dependencies**: `@modelcontextprotocol/sdk` (MCP server + transports), `ethers` (wallet, providers, ABI encoding/signing), `zod` (tool input schemas), `dotenv` (local env loading); dev tooling (`typescript`, type defs, a test runner).
- **External services**: Alchemy RPC endpoints (requires a user-supplied Alchemy API key); target EVM networks.
- **Secrets/security**: Handles a mnemonic or private key and an Alchemy key via environment variables — introduces sensitive-material handling requirements (no logging, no echo, fail-closed startup validation).
- **Clients**: Consumable by any MCP client over stdio (local) or Streamable HTTP (remote/hosted).
