package framework

import "errors"

var (
	// ErrNoRelaysConnected is returned when no relay connections were established.
	ErrNoRelaysConnected = errors.New("no relays connected")

	// ErrNotConnected is returned when an operation requires a connection but none exists.
	ErrNotConnected = errors.New("not connected to any relay")

	// ErrPrivateKeyRequired is returned when a private key is required but not provided.
	ErrPrivateKeyRequired = errors.New("private key is required")

	// ErrInvalidPrivateKey is returned when the private key is invalid.
	ErrInvalidPrivateKey = errors.New("invalid private key")

	// ErrPublishFailed is returned when event publishing fails.
	ErrPublishFailed = errors.New("failed to publish event")
)
