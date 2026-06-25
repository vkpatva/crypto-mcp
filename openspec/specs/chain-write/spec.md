# chain-write Specification

## Purpose

Defines the state-changing blockchain tools: native and ERC-20 transfers, generic contract writes, transaction simulation, and message/typed-data signing with the configured wallet.

## Requirements

### Requirement: Send native transfer

The system SHALL provide a tool to send a native currency transfer from the configured wallet to a recipient on a selected network, signing and broadcasting the transaction and returning its hash.

#### Scenario: Send native value

- **WHEN** a client requests a native transfer to a recipient with a specified amount on a supported network
- **THEN** the server signs and broadcasts the transaction and returns the transaction hash along with an echo of the network, sender, recipient, and amount

#### Scenario: Reject malformed recipient

- **WHEN** the recipient address is invalid
- **THEN** the call fails with a validation error and broadcasts nothing

### Requirement: Send ERC-20 transfer

The system SHALL provide a tool to transfer an ERC-20 token from the configured wallet to a recipient, converting the human amount using the token's decimals, signing, and broadcasting.

#### Scenario: Transfer ERC-20 tokens

- **WHEN** a client requests an ERC-20 transfer specifying token contract, recipient, and amount on a supported network
- **THEN** the server signs and broadcasts the transfer and returns the transaction hash

### Requirement: Generic contract write

The system SHALL provide a tool to invoke a non-view contract method given a contract address, ABI fragment, method name, arguments, and optional native value, signing and broadcasting the transaction.

#### Scenario: Invoke a state-changing method

- **WHEN** a client provides a contract address, ABI fragment, method name, and arguments for a state-changing method on a supported network
- **THEN** the server signs and broadcasts the transaction and returns the transaction hash

#### Scenario: Reject read-only method as write

- **WHEN** the targeted method does not exist or the arguments do not match the ABI fragment
- **THEN** the call fails with a descriptive error and broadcasts nothing

### Requirement: Simulate transaction before sending

The system SHALL provide a tool to dry-run a transaction (native transfer, ERC-20 transfer, or contract write) without broadcasting, returning the expected outcome, a gas estimate, and a decoded revert reason when the transaction would fail.

#### Scenario: Simulate a successful transaction

- **WHEN** a client simulates a transaction that would succeed on a supported network
- **THEN** the result indicates success and includes a gas estimate, and no transaction is broadcast

#### Scenario: Simulate a reverting transaction

- **WHEN** a client simulates a transaction that would revert
- **THEN** the result indicates failure and includes a decoded revert reason where available, and no transaction is broadcast

### Requirement: Sign messages and typed data

The system SHALL provide tools to sign an arbitrary message (EIP-191) and structured typed data (EIP-712) with the configured wallet, returning the signature.

#### Scenario: Sign a plain message

- **WHEN** a client requests signing of a text message
- **THEN** the server returns an EIP-191 signature produced by the configured wallet

#### Scenario: Sign typed data

- **WHEN** a client requests signing of EIP-712 typed data with domain, types, and value
- **THEN** the server returns the typed-data signature, or fails with a descriptive error if the typed data is malformed
