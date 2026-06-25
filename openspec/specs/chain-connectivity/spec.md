# chain-connectivity Specification

## Purpose

Defines how the server discovers, validates, and connects to supported Alchemy-backed EVM networks, including the network registry, per-call network selection, and provider resolution.

## Requirements

### Requirement: Supported network registry

The system SHALL maintain a registry of supported Alchemy-backed EVM networks, including at minimum Ethereum, Base, Arbitrum, Optimism, and Polygon, each mapping to its chain ID, native currency symbol, and Alchemy RPC endpoint template.

#### Scenario: Registry exposes supported networks

- **WHEN** the server initializes
- **THEN** each supported network resolves to a chain ID, native symbol, and an Alchemy RPC endpoint built from the configured API key

### Requirement: Per-call network selection

The system SHALL accept an optional network identifier on chain-touching tool calls and SHALL validate it against the supported network registry.

#### Scenario: Valid network selected

- **WHEN** a tool call specifies a supported network identifier
- **THEN** the operation executes against that network

#### Scenario: Unsupported network rejected

- **WHEN** a tool call specifies a network identifier not in the registry
- **THEN** the call fails with an error listing the supported networks, and no RPC request is made

### Requirement: Alchemy provider resolution

The system SHALL resolve and reuse an Alchemy RPC provider per network, constructing it from the network's endpoint template and the configured Alchemy API key.

#### Scenario: Provider created and cached per network

- **WHEN** a network is used for the first time
- **THEN** a provider is constructed for that network and reused for subsequent calls to the same network

#### Scenario: Provider reaches the correct chain

- **WHEN** a read or write executes against a selected network
- **THEN** the request is sent to that network's Alchemy endpoint and the response reflects the corresponding chain ID
