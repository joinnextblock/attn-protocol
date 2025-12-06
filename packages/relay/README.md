# ATTN Protocol Relay

Open-source Nostr relay implementation for the ATTN Protocol. This relay provides a plugin-based architecture that allows custom implementations of authentication, authorization, and event processing.

## Features

- **Plugin System**: Extensible architecture with `AuthHooks` and `ATTNHooks` interfaces
- **Pluggable Storage**: Storage interface allows any backend (SQLite, DynamoDB, PostgreSQL, etc.)
- **Shared Validation**: Identical ATTN event validation across all instances
- **Rate Limiting**: Configurable rate limiting per event kind
- **SQLite Example**: Simple SQLite storage implementation included

## Architecture

### Plugin System

The relay uses a plugin-based architecture for extensibility:

- **AuthHooks**: Customize authentication and authorization
- **ATTNHooks**: Customize event lifecycle processing (before/after hooks for each ATTN event type)

### Storage Interface

Implement the `Storage` interface to use any storage backend:

```go
type Storage interface {
    StoreEvent(ctx context.Context, event *nostr.Event) error
    QueryEvents(ctx context.Context, filter *nostr.Filter) ([]*nostr.Event, error)
    DeleteEvent(ctx context.Context, eventID string) error
}
```

An example SQLite implementation is provided in `internal/storage/sqlite.go`.

## Usage

### Running with SQLite (Public Relay)

```bash
# Set environment variables
export STORAGE_TYPE=sqlite
export SQLITE_DB_PATH=./relay.db
export AUTH_PLUGIN=none
export RELAY_PORT=8010

# Run the relay
go run ./cmd/relay
```

### Using Docker

```bash
# Build and run with docker-compose
docker-compose up -d
```

### Environment Variables

- `RELAY_NAME`: Relay name (default: "ATTN Protocol Relay")
- `RELAY_DESCRIPTION`: Relay description
- `RELAY_PORT`: Port to listen on (default: 8008)
- `RELAY_DOMAIN`: Domain for NIP-42 validation
- `STORAGE_TYPE`: Storage backend type (default: "sqlite")
- `SQLITE_DB_PATH`: Path to SQLite database file (default: "./relay.db")
- `AUTH_PLUGIN`: Auth plugin to use (default: "none")
- `LOG_LEVEL`: Log level (DEBUG, INFO, WARN, ERROR)

## Implementing Custom Storage

Create a type that implements the `Storage` interface:

```go
type MyStorage struct {
    // Your storage fields
}

func (s *MyStorage) StoreEvent(ctx context.Context, event *nostr.Event) error {
    // Implement storage logic
}

func (s *MyStorage) QueryEvents(ctx context.Context, filter *nostr.Filter) ([]*nostr.Event, error) {
    // Implement query logic
}

func (s *MyStorage) DeleteEvent(ctx context.Context, eventID string) error {
    // Implement deletion logic
}
```

Then update `cmd/relay/main.go` to use your storage implementation.

## Implementing Custom Plugins

### Auth Plugin

Implement the `AuthHooks` interface:

```go
type MyAuthHooks struct {
    // Your auth fields
}

func (h *MyAuthHooks) OnConnection(stats rely.Stats, req *http.Request) error {
    // Handle connection
}

func (h *MyAuthHooks) OnAuth(client rely.Client) error {
    // Handle authentication
}

// ... implement other methods
```

### ATTN Hooks

Implement the `ATTNHooks` interface for custom event processing:

```go
type MyATTNHooks struct {
    // Your fields
}

func (h *MyATTNHooks) BeforeBlockEvent(ctx context.Context, event *nostr.Event) error {
    // Process before storing block event
}

func (h *MyATTNHooks) AfterBlockEvent(ctx context.Context, event *nostr.Event) error {
    // Process after storing block event
}

// ... implement other lifecycle hooks
```

## Validation

All ATTN events are validated using shared validation logic from `internal/validation/`. This ensures consistent validation across all relay instances.

## License

[Add license information]

