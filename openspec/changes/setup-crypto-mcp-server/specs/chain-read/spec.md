## ADDED Requirements

### Requirement: Query native balance

The system SHALL provide a tool to read the native currency balance of an address on a selected network, returning both the raw wei value and a human-readable decimal amount with the native symbol.

#### Scenario: Read native balance

- **WHEN** a client requests the native balance of an address on a supported network
- **THEN** the result includes the address, network, raw wei balance, and the formatted amount with the native symbol

### Requirement: Query ERC-20 token balance

The system SHALL provide a tool to read an ERC-20 token balance for an address, returning the raw balance and a decimal amount derived from the token's decimals.

#### Scenario: Read ERC-20 balance

- **WHEN** a client requests the balance of an ERC-20 token contract for an address on a supported network
- **THEN** the result includes the raw balance, the token decimals, and the formatted amount

### Requirement: Query gas price

The system SHALL provide a tool to read the current gas price / fee data for a selected network.

#### Scenario: Read gas price

- **WHEN** a client requests gas price for a supported network
- **THEN** the result includes current fee data for that network

### Requirement: Look up blocks and transactions

The system SHALL provide tools to fetch a block by number or hash and to fetch a transaction and its receipt by hash on a selected network.

#### Scenario: Fetch transaction by hash

- **WHEN** a client requests a transaction by its hash on a supported network
- **THEN** the result includes the transaction details and, if mined, its receipt status

#### Scenario: Fetch block

- **WHEN** a client requests a block by number or hash on a supported network
- **THEN** the result includes the block's core fields

### Requirement: Resolve ENS and addresses

The system SHALL provide a tool to resolve an ENS name to an address and an address to its primary ENS name where supported by the network.

#### Scenario: Resolve ENS name

- **WHEN** a client requests resolution of an ENS name on a network that supports ENS
- **THEN** the result returns the resolved address or indicates no resolution exists

### Requirement: Generic contract read

The system SHALL provide a tool to call a view or pure contract method given a contract address, an ABI fragment, the method name, and arguments, returning the decoded result.

#### Scenario: Call a view method

- **WHEN** a client provides a contract address, ABI fragment, method name, and arguments for a read-only method on a supported network
- **THEN** the result contains the decoded return value(s)

#### Scenario: Reject non-existent method

- **WHEN** the provided method name or ABI fragment does not match a callable read method
- **THEN** the call fails with a descriptive error and performs no state change
