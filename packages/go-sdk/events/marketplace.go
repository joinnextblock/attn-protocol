package events

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/joinnextblock/attn-protocol/go-core"
	"github.com/nbd-wtf/go-nostr"
)

// MarketplaceParams holds parameters for creating a marketplace event.
type MarketplaceParams struct {
	// Name is the marketplace display name.
	Name string

	// Description is the marketplace description.
	Description string

	// AdminPubkey is the admin's pubkey.
	AdminPubkey string

	// MinDuration is the minimum ad duration in milliseconds.
	MinDuration int64

	// MaxDuration is the maximum ad duration in milliseconds.
	MaxDuration int64

	// MatchFeeSats is the fee per match in satoshis.
	MatchFeeSats int64

	// ConfirmationFeeSats is the fee per confirmation in satoshis.
	ConfirmationFeeSats int64

	// MarketplaceID is the unique marketplace ID for the d-tag.
	MarketplaceID string

	// MarketplacePubkey is the marketplace's pubkey.
	MarketplacePubkey string

	// BlockHeight is the Bitcoin block height.
	BlockHeight int64

	// RefClockPubkey is the City Protocol clock pubkey.
	RefClockPubkey string

	// RefBlockID is the City Protocol block ID.
	RefBlockID string

	// BlockCoordinate is the block event coordinate.
	BlockCoordinate string

	// KindList is the list of supported content kinds.
	KindList []int

	// RelayList is the list of relay URLs.
	RelayList []string

	// WebsiteURL is the marketplace website URL.
	WebsiteURL string

	// Aggregate counts
	BillboardCount int64
	PromotionCount int64
	AttentionCount int64
	MatchCount     int64
}

// CreateMarketplace creates a MARKETPLACE event (kind 38188).
func CreateMarketplace(private_key string, params MarketplaceParams) (*nostr.Event, error) {
	// Build content
	content := core.MarketplaceData{
		Name:                 params.Name,
		Description:          params.Description,
		AdminPubkey:          params.AdminPubkey,
		MinDuration:          params.MinDuration,
		MaxDuration:          params.MaxDuration,
		MatchFeeSats:         params.MatchFeeSats,
		ConfirmationFeeSats:  params.ConfirmationFeeSats,
		RefMarketplacePubkey: params.MarketplacePubkey,
		RefMarketplaceID:     params.MarketplaceID,
		RefClockPubkey:       params.RefClockPubkey,
		RefBlockID:           params.RefBlockID,
		BillboardCount:       params.BillboardCount,
		PromotionCount:       params.PromotionCount,
		AttentionCount:       params.AttentionCount,
		MatchCount:           params.MatchCount,
	}

	content_json, err := json.Marshal(content)
	if err != nil {
		return nil, err
	}

	// Build tags
	tags := nostr.Tags{}

	// Add d-tag
	d_tag := params.MarketplaceID
	if d_tag == "" {
		d_tag = fmt.Sprintf("org.attnprotocol:marketplace:%d", time.Now().UnixNano())
	}
	tags = append(tags, nostr.Tag{"d", d_tag})

	// Add block height tag
	tags = append(tags, nostr.Tag{"t", fmt.Sprintf("%d", params.BlockHeight)})

	// Add block coordinate
	if params.BlockCoordinate != "" {
		tags = append(tags, nostr.Tag{"a", params.BlockCoordinate})
	}

	// Add kind list
	for _, kind := range params.KindList {
		tags = append(tags, nostr.Tag{"k", fmt.Sprintf("%d", kind)})
	}

	// Add relay list
	for _, relay := range params.RelayList {
		tags = append(tags, nostr.Tag{"r", relay})
	}

	// Get public key
	pk, err := nostr.GetPublicKey(private_key)
	if err != nil {
		return nil, err
	}

	// Create event
	event := &nostr.Event{
		PubKey:    pk,
		CreatedAt: nostr.Timestamp(time.Now().Unix()),
		Kind:      core.KindMarketplace,
		Tags:      tags,
		Content:   string(content_json),
	}

	// Sign event
	if err := event.Sign(private_key); err != nil {
		return nil, err
	}

	return event, nil
}
