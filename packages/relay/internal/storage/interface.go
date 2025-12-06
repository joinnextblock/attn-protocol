// Package storage defines the Storage interface for pluggable storage backends.
// Implementations can provide SQLite, DynamoDB, PostgreSQL, or any other storage solution.
package storage

import (
	"context"

	"github.com/nbd-wtf/go-nostr"
)

// Storage defines the interface for event storage backends.
// Implementations must provide methods for storing, querying, and deleting events.
type Storage interface {
	// StoreEvent stores a Nostr event in the storage backend.
	// Returns an error if the event cannot be stored.
	StoreEvent(ctx context.Context, event *nostr.Event) error

	// QueryEvents queries events matching the provided filter.
	// Returns a slice of matching events, or an error if the query fails.
	QueryEvents(ctx context.Context, filter *nostr.Filter) ([]*nostr.Event, error)

	// DeleteEvent deletes an event by its ID.
	// Returns an error if the event cannot be deleted.
	DeleteEvent(ctx context.Context, eventID string) error
}

