## 1. Project scaffold

- [ ] 1.1 Initialize `package.json` (ESM, Node ≥18) with `name`, `bin` entry, and scripts: `build`, `dev`, `start`, `lint`, `test`
- [ ] 1.2 Add `tsconfig.json` targeting ESM with strict mode and `src` → `dist` output
- [ ] 1.3 Add dependencies: `@modelcontextprotocol/sdk`, `ethers` (v6), `zod`, `dotenv`
- [ ] 1.4 Add dev dependencies: `typescript`, `@types/node`, and a test runner (e.g. `vitest`)
- [ ] 1.5 Create `src/` directory layout (`config/`, `chain/`, `tools/`, `server/`, `index.ts`) and a `.env.example` listing required variables
- [ ] 1.6 Add `.gitignore` (node_modules, dist, `.env`) and a README stub with setup/run instructions

## 2. Configuration & wallet (wallet-config)

- [ ] 2.1 Implement config loader that reads `MNEMONIC`, `PRIVATE_KEY`, `ALCHEMY_API_KEY`, `DEFAULT_NETWORK`, `TRANSPORT`, `PORT`, optional derivation path from env via `dotenv`
- [ ] 2.2 Validate config with Zod: require Alchemy key; require exactly one of mnemonic/private key; fail closed with descriptive (secret-free) errors
- [ ] 2.3 Derive the signing wallet (`new Wallet(pk)` or `HDNodeWallet.fromPhrase(mnemonic)`); expose a function to bind the signer to a per-network provider
- [ ] 2.4 Enforce secret hygiene: a sanitizer that strips/identifies secret material from logs and error messages
- [ ] 2.5 Unit tests: missing key material, missing Alchemy key, malformed key, both keys present, default-network fallback

## 3. Chain connectivity (chain-connectivity)

- [ ] 3.1 Define the supported-network registry (ethereum, base, arbitrum, optimism, polygon) with chainId, native symbol, and Alchemy URL template
- [ ] 3.2 Implement a Zod `network` enum from the registry and a default-network resolver
- [ ] 3.3 Implement lazy, cached `JsonRpcProvider` construction per network from the Alchemy key
- [ ] 3.4 Unit tests: valid network resolves a provider, unsupported network rejected with supported list, provider caching, chainId matches registry

## 4. Read tools (chain-read)

- [ ] 4.1 `get_native_balance`: raw wei + formatted amount + native symbol
- [ ] 4.2 `get_token_balance`: ERC-20 balance using on-chain `decimals`/`symbol`, raw + formatted
- [ ] 4.3 `get_gas_price`: current fee data for a network
- [ ] 4.4 `get_block` and `get_transaction` (with receipt) by number/hash
- [ ] 4.5 `resolve_ens`: ENS name ↔ address resolution where supported
- [ ] 4.6 `read_contract`: generic view/pure call from address + ABI fragment + method + args, decoded result
- [ ] 4.7 Unit/integration tests for each read tool (mock provider), including invalid-input and unsupported-method paths

## 5. Write, simulation & signing tools (chain-write)

- [ ] 5.1 `simulate_transaction`: dry-run (eth_call + estimateGas) for native/ERC-20/contract calls; decode revert reason; never broadcast
- [ ] 5.2 `send_native`: native transfer, sign + broadcast, return tx hash with intent echo; validate recipient/amount
- [ ] 5.3 `send_token`: ERC-20 transfer using token decimals, sign + broadcast, return tx hash
- [ ] 5.4 `write_contract`: generic state-changing method call from address + ABI fragment + method + args + optional value, sign + broadcast
- [ ] 5.5 `sign_message` (EIP-191) and `sign_typed_data` (EIP-712), returning signatures
- [ ] 5.6 Tests: simulation success/revert paths, recipient validation, ERC-20 decimal conversion, signature verification, no-broadcast on validation failure

## 6. Server core & tool registration (mcp-server)

- [ ] 6.1 Create the MCP server, register all tools once with names, descriptions, and Zod input schemas
- [ ] 6.2 Standardize structured tool outputs and a central error handler that returns sanitized MCP errors
- [ ] 6.3 Wire tools to config (wallet) and connectivity (provider resolution) modules
- [ ] 6.4 Test that tool listing exposes all tools with schemas and that a failing call returns a secret-free error

## 7. Transports (mcp-server)

- [ ] 7.1 Implement stdio transport wiring (default)
- [ ] 7.2 Implement Streamable HTTP transport wiring on the configured port
- [ ] 7.3 Select transport at startup from `TRANSPORT` config, defaulting to stdio
- [ ] 7.4 Manual/integration test: connect over stdio and over HTTP and list tools on both

## 8. Documentation & verification

- [ ] 8.1 Write README: prerequisites, env vars, deriving from mnemonic vs private key, running over stdio and HTTP, security warnings (HTTP exposes spend operations; protect the network)
- [ ] 8.2 Add an example MCP client config snippet (e.g. for Claude Desktop / Cursor) using stdio
- [ ] 8.3 Run `build`, `lint`, and `test`; confirm the server starts over stdio and rejects missing/invalid config
- [ ] 8.4 Smoke test against a testnet (read native balance, simulate a transfer) using a real Alchemy key
