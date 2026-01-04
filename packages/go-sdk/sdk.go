// Package sdk provides event builders for ATTN Protocol on Nostr.
//
// The SDK makes it easy to create properly formatted ATTN Protocol events
// and publish them to Nostr relays.
//
// Example usage:
//
//	sdk := attn.NewSdk(attn.SdkConfig{
//	    PrivateKey: privateKeyHex,
//	})
//
//	event := sdk.CreatePromotion(attn.PromotionParams{
//	    Duration:             30000,
//	    Bid:                  1000,
//	    MarketplaceCoordinate: "38188:pubkey:my-marketplace",
//	    BlockHeight:          870000,
//	})
//
//	result, err := sdk.PublishToRelay(ctx, event, "wss://relay.example.com")
package sdk

import (
	"encoding/hex"
	"time"

	"github.com/nbd-wtf/go-nostr"
)

// SdkConfig holds configuration for the SDK.
type SdkConfig struct {
	// PrivateKey is the hex-encoded private key for signing events.
	PrivateKey string
}

// Sdk provides methods for creating and publishing ATTN Protocol events.
type Sdk struct {
	config     SdkConfig
	privateKey string
	publicKey  string
}

// NewSdk creates a new SDK instance.
func NewSdk(config SdkConfig) (*Sdk, error) {
	// Decode private key
	sk_bytes, err := hex.DecodeString(config.PrivateKey)
	if err != nil {
		return nil, err
	}

	// Get public key
	pk, err := nostr.GetPublicKey(hex.EncodeToString(sk_bytes))
	if err != nil {
		return nil, err
	}

	return &Sdk{
		config:     config,
		privateKey: config.PrivateKey,
		publicKey:  pk,
	}, nil
}

// GetPublicKey returns the SDK's public key.
func (s *Sdk) GetPublicKey() string {
	return s.publicKey
}

// signEvent signs an event with the SDK's private key.
func (s *Sdk) signEvent(event *nostr.Event) error {
	return event.Sign(s.privateKey)
}

// createBaseEvent creates a base event with common fields.
func (s *Sdk) createBaseEvent(kind int, content string, tags nostr.Tags) *nostr.Event {
	return &nostr.Event{
		PubKey:    s.publicKey,
		CreatedAt: nostr.Timestamp(time.Now().Unix()),
		Kind:      kind,
		Tags:      tags,
		Content:   content,
	}
}

// addBlockHeightTag adds a block height tag to tags.
func addBlockHeightTag(tags nostr.Tags, block_height int64) nostr.Tags {
	return append(tags, nostr.Tag{"t", formatInt64(block_height)})
}

// addDTag adds a d-tag for addressable events.
func addDTag(tags nostr.Tags, d_tag string) nostr.Tags {
	return append(tags, nostr.Tag{"d", d_tag})
}

// addCoordinateTag adds an 'a' tag for event coordinate references.
func addCoordinateTag(tags nostr.Tags, coordinate string) nostr.Tags {
	return append(tags, nostr.Tag{"a", coordinate})
}

// addPubkeyTag adds a 'p' tag for pubkey references.
func addPubkeyTag(tags nostr.Tags, pubkey string) nostr.Tags {
	return append(tags, nostr.Tag{"p", pubkey})
}

// addEventTag adds an 'e' tag for event references.
func addEventTag(tags nostr.Tags, event_id string) nostr.Tags {
	return append(tags, nostr.Tag{"e", event_id})
}

// formatInt64 formats an int64 as a string.
func formatInt64(n int64) string {
	return nostr.Timestamp(n).Time().Format("20060102150405")[:14]
}
