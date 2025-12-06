// Package plugin provides plugin interfaces for extending relay functionality.
// Plugins allow implementations to customize authentication, authorization, and event processing.
package plugin

import (
	"net/http"

	"github.com/nbd-wtf/go-nostr"
	"github.com/pippellia-btc/rely"
)

// AuthHooks defines the interface for authentication and authorization plugins.
// Implementations can provide custom authentication logic, access control, and authorization checks.
type AuthHooks interface {
	// OnConnection is called when a new WebSocket connection is established.
	// Return an error to reject the connection.
	OnConnection(stats rely.Stats, req *http.Request) error

	// OnConnect is called after a connection is established.
	// Can be used to send AUTH challenges or perform setup operations.
	OnConnect(client rely.Client)

	// OnAuth is called when a client authenticates via NIP-42.
	// Return an error to reject the authentication (client will be disconnected).
	OnAuth(client rely.Client) error

	// RejectReq is called before processing a query request.
	// Return an error to reject the query.
	RejectReq(client rely.Client, filters nostr.Filters) error

	// RejectEvent is called before accepting an event for storage.
	// Return an error to reject the event.
	RejectEvent(client rely.Client, event *nostr.Event) error

	// IsAuthorized checks if a pubkey is an authorized service.
	// Used for rate limit bypass and special permissions.
	IsAuthorized(pubkey string) bool
}

