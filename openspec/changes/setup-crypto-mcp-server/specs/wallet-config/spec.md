## ADDED Requirements

### Requirement: Load signing key from mnemonic or private key

The system SHALL load a signing wallet from environment configuration, accepting either a mnemonic phrase or a private key, and SHALL require exactly one of the two to be present.

#### Scenario: Wallet from private key

- **WHEN** a private key is configured and no mnemonic is configured
- **THEN** the server derives the signing wallet from the private key

#### Scenario: Wallet from mnemonic

- **WHEN** a mnemonic is configured and no private key is configured
- **THEN** the server derives the signing wallet from the mnemonic using the configured (or default) derivation path

#### Scenario: Neither key provided

- **WHEN** neither a mnemonic nor a private key is configured
- **THEN** the server fails to start with an error stating that key material is required

#### Scenario: Malformed key material

- **WHEN** the configured private key or mnemonic is invalid
- **THEN** the server fails to start with an error indicating the key material is malformed, without echoing the value

### Requirement: Require Alchemy API key

The system SHALL require an Alchemy API key in configuration and SHALL fail to start if it is absent.

#### Scenario: Alchemy key present

- **WHEN** an Alchemy API key is configured
- **THEN** the server uses it to construct RPC endpoints for supported networks

#### Scenario: Alchemy key missing

- **WHEN** no Alchemy API key is configured
- **THEN** the server fails to start with an error stating the Alchemy API key is required

### Requirement: Secret hygiene

The system SHALL never log, echo, or include the mnemonic, private key, or Alchemy API key in tool outputs or error messages.

#### Scenario: Secrets absent from outputs and logs

- **WHEN** the server logs activity or returns tool results and errors
- **THEN** no log line, result, or error contains the configured mnemonic, private key, or Alchemy API key

### Requirement: Default network configuration

The system SHALL allow a default network to be configured and SHALL use it for tool calls that do not specify a network.

#### Scenario: Default network applied

- **WHEN** a tool call omits the network argument
- **THEN** the operation runs against the configured default network
