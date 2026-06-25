## Context

This is a greenfield TypeScript project. The goal is a Model Context Protocol (MCP) server that lets MCP clients perform EVM blockchain operations through Alchemy RPC, using a wallet derived from a mnemonic or private key. The server must support both local (stdio) and remote (Streamable HTTP) usage, span multiple Alchemy-backed EVM networks, and expose read, write, simulation, and signing capabilities. Because the server holds spendable key material, security and fail-closed behavior are first-order concerns.

Constraints:
- MCP protocol must be implemented via the official `@modelcontextprotocol/sdk`.
- Blockchain access is exclusively through Alchemy RPC endpoints (a user-supplied Alchemy API key).
- Secrets (mnemonic / private key / Alchemy key) come only from environment variables.

## Goals / Non-Goals

**Goals:**
- A runnable MCP server exposing tools for reads, contract reads/writes, transfers, transaction simulation, and message signing.
- Multi-chain support with per-call network selection across a fixed registry of Alchemy-backed networks.
- Both stdio and Streamable HTTP transports, chosen at startup via config.
- Strong, typed tool inputs (Zod) and structured, decoded tool outputs.
- Fail-closed startup validation and strict secret hygiene (never log/echo key material).

**Non-Goals:**
- A web UI, dashboard, or user-facing frontend.
- Key management beyond a single configured wallet (no HD account selection UI, no KMS/HSM integration, no multi-wallet).
- Non-EVM chains, and EVM chains not offered by Alchemy.
- Persistent storage, transaction history database, or indexing.
- Authentication/authorization for the HTTP transport beyond what MCP/the deployment layer provides (documented as a deployment responsibility).

## Decisions

### Language, runtime, and module system
TypeScript on Node.js (LTS, ≥18) compiled to ESM. **Why:** the MCP SDK and `ethers` v6 are first-class in this ecosystem; ESM matches the SDK's distribution. Alternative considered: a Python server with `web3.py` — rejected because the user requested TypeScript and the richest MCP tooling is in TS.

### Blockchain library: `ethers` v6
Use `ethers` v6 for providers, `Wallet`/`HDNodeWallet`, ABI encoding/decoding, and EIP-191/712 signing. **Why:** mature, single dependency covering provider, wallet, ABI, and signing; `JsonRpcProvider` points directly at Alchemy HTTP endpoints. Alternative: `viem` — excellent and tree-shakeable, but `ethers` keeps mnemonic/private-key derivation and signing in one cohesive API and is widely known; either would work, `ethers` chosen for cohesion.

### Provider construction (Alchemy)
Per supported network, build the Alchemy HTTPS RPC URL from a base template + the configured API key and wrap it in a `JsonRpcProvider`. Providers are created lazily and cached per network. **Why:** avoids opening connections for unused chains; one Alchemy key works across all supported networks. Alternative: the `alchemy-sdk` package — adds Alchemy-specific niceties (enhanced APIs, `simulateAssetChanges`) but a heavier dependency; we use plain `JsonRpcProvider` for core RPC and may reach for Alchemy enhanced endpoints (e.g. simulation) via direct JSON-RPC calls where they add value.

### Network registry
A static registry maps a network identifier (e.g. `ethereum`, `base`, `arbitrum`, `optimism`, `polygon`) to `{ chainId, alchemyUrlTemplate, nativeSymbol }`. Every tool that touches the chain accepts an optional `network` argument; if omitted, a configured default network is used. Inputs are validated against the registry (Zod enum). **Why:** explicit allow-list prevents typo'd/unsupported chains and makes per-call selection safe and discoverable.

### Wallet derivation
At startup, if `PRIVATE_KEY` is set use `new Wallet(pk)`; else if `MNEMONIC` is set derive via `HDNodeWallet.fromPhrase(mnemonic)` (default derivation path, optionally overridable by config). Exactly one of the two must be present. The signer is bound to a provider per network at call time. **Why:** supports both requested key formats with a clear precedence; the same account is usable on every supported chain.

### Transport: stdio + Streamable HTTP, selected by config
A single server core registers all tools once; a thin transport layer selects `StdioServerTransport` or the Streamable HTTP transport based on a `TRANSPORT` env var (`stdio` default). **Why:** keeps tool logic transport-agnostic and satisfies the "both" requirement without duplicating registration. Alternative: two separate entrypoints — rejected to avoid divergence.

### Tool surface and input validation
Each capability maps to one or more MCP tools with Zod input schemas. Read tools are side-effect-free. Write/transfer tools are clearly named and documented as state-changing. A `simulate_transaction` tool dry-runs via `eth_call`/estimateGas (and decodes revert reasons) and is offered as a pre-flight for writes. **Why:** typed inputs give clients good ergonomics and guardrails; separating simulate from send lets agents preview effects.

### Output shape
Tool results return structured JSON (amounts as decimal strings + raw wei, tx hashes, decoded return values, gas estimates, and an echo of `network`/`from`/`to`/`value`). **Why:** avoids float precision loss, makes results auditable, and lets the client confirm intent.

### Secret handling
Secrets are read once from env at startup and never written to logs, error messages, or tool outputs. Errors are sanitized before surfacing. Startup fails closed if required secrets are missing or malformed. **Why:** the server can spend funds; leaking key material is catastrophic.

## Risks / Trade-offs

- **Spendable key material in a process** → Mitigate: env-only secrets, no logging/echo, fail-closed validation, simulate-before-send, explicit intent echo in responses; document HTTP transport as requiring network-level protection.
- **HTTP transport exposes spend operations to the network** → Mitigate: default to stdio; document that Streamable HTTP must run behind authentication/locked-down networking and is opt-in.
- **Unsupported / wrong network selection** → Mitigate: Zod enum validated against the static registry; default network configured explicitly.
- **`ethers` v6 vs v5 API drift in examples** → Mitigate: pin v6 and follow its API (e.g. `formatEther`, `HDNodeWallet`) consistently.
- **Alchemy rate limits / transient RPC failures** → Mitigate: surface clear errors; keep providers cached; (future) add retry/backoff — out of scope for v1.
- **Gas estimation / nonce races on rapid sends** → Mitigate: rely on provider-managed nonce per call for v1; document that concurrent sends from one key are not coordinated.
- **Big-number/decimal handling** → Mitigate: never use JS floats for amounts; use wei strings + decimal formatting via `ethers`.
