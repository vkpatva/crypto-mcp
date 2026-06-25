# mcp-server Specification

## Purpose

Defines the MCP server lifecycle, tool registration, transport selection (stdio and Streamable HTTP), and the structure of tool results and error surfacing.

## Requirements

### Requirement: MCP server lifecycle and tool registration

The system SHALL provide an MCP server that registers all blockchain tools once at startup and serves them to connected MCP clients, reporting tool metadata (name, description, input schema) via the MCP protocol.

#### Scenario: Server starts and advertises tools

- **WHEN** the server starts with valid configuration and a client connects
- **THEN** the client receives the list of registered tools, each with a name, human-readable description, and a typed input schema

#### Scenario: Server refuses to start with invalid configuration

- **WHEN** the server is started without required configuration (no key material or no Alchemy key)
- **THEN** the server exits with a non-zero status and a descriptive error, and registers no tools

### Requirement: Dual transport selection

The server SHALL support both the stdio transport and the Streamable HTTP transport, with the active transport selected at startup via configuration, defaulting to stdio when unspecified.

#### Scenario: Default stdio transport

- **WHEN** the server is started with no transport configured
- **THEN** the server communicates over stdio

#### Scenario: Streamable HTTP transport selected

- **WHEN** the server is started with the transport configured as Streamable HTTP and a port
- **THEN** the server accepts MCP connections over HTTP on the configured port

### Requirement: Structured tool results and error surfacing

The system SHALL return structured results from tools and SHALL surface errors as MCP tool errors with sanitized messages that never contain secret material.

#### Scenario: Successful tool call returns structured data

- **WHEN** a tool call succeeds
- **THEN** the result contains structured fields (such as the affected network and operation outcome) rather than only free-form text

#### Scenario: Failed tool call returns a sanitized error

- **WHEN** a tool call fails (e.g. RPC error or invalid input)
- **THEN** the client receives an error message describing the failure that does not include the mnemonic, private key, or Alchemy API key
