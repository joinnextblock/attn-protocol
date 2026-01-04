package events

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/joinnextblock/attn-protocol/go-core"
	"github.com/nbd-wtf/go-nostr"
)

// MatchParams holds parameters for creating a match event.
type MatchParams struct {
	// MatchID is the unique match ID for the d-tag.
	MatchID string

	// BlockHeight is the Bitcoin block height.
	BlockHeight int64

	// MarketplaceCoordinate is the marketplace coordinate.
	MarketplaceCoordinate string

	// BillboardCoordinate is the billboard coordinate.
	BillboardCoordinate string

	// PromotionCoordinate is the promotion coordinate.
	PromotionCoordinate string

	// AttentionCoordinate is the attention coordinate.
	AttentionCoordinate string

	// Reference pubkeys
	MarketplacePubkey string
	BillboardPubkey   string
	PromotionPubkey   string
	AttentionPubkey   string

	// Reference IDs
	MarketplaceID string
	BillboardID   string
	PromotionID   string
	AttentionID   string
}

// CreateMatch creates a MATCH event (kind 38888).
func CreateMatch(private_key string, params MatchParams) (*nostr.Event, error) {
	// Build content (only ref_* fields per ATTN-01)
	content := core.MatchData{
		RefMatchID:           params.MatchID,
		RefMarketplaceID:     params.MarketplaceID,
		RefBillboardID:       params.BillboardID,
		RefPromotionID:       params.PromotionID,
		RefAttentionID:       params.AttentionID,
		RefMarketplacePubkey: params.MarketplacePubkey,
		RefBillboardPubkey:   params.BillboardPubkey,
		RefPromotionPubkey:   params.PromotionPubkey,
		RefAttentionPubkey:   params.AttentionPubkey,
	}

	content_json, err := json.Marshal(content)
	if err != nil {
		return nil, err
	}

	// Build tags
	tags := nostr.Tags{}

	// Add d-tag
	d_tag := params.MatchID
	if d_tag == "" {
		d_tag = fmt.Sprintf("org.attnprotocol:match:%d", time.Now().UnixNano())
	}
	tags = append(tags, nostr.Tag{"d", d_tag})

	// Add block height tag
	tags = append(tags, nostr.Tag{"t", fmt.Sprintf("%d", params.BlockHeight)})

	// Add coordinate tags
	if params.MarketplaceCoordinate != "" {
		tags = append(tags, nostr.Tag{"a", params.MarketplaceCoordinate})
	}
	if params.BillboardCoordinate != "" {
		tags = append(tags, nostr.Tag{"a", params.BillboardCoordinate})
	}
	if params.PromotionCoordinate != "" {
		tags = append(tags, nostr.Tag{"a", params.PromotionCoordinate})
	}
	if params.AttentionCoordinate != "" {
		tags = append(tags, nostr.Tag{"a", params.AttentionCoordinate})
	}

	// Add pubkey tags
	if params.MarketplacePubkey != "" {
		tags = append(tags, nostr.Tag{"p", params.MarketplacePubkey})
	}
	if params.BillboardPubkey != "" {
		tags = append(tags, nostr.Tag{"p", params.BillboardPubkey})
	}
	if params.PromotionPubkey != "" {
		tags = append(tags, nostr.Tag{"p", params.PromotionPubkey})
	}
	if params.AttentionPubkey != "" {
		tags = append(tags, nostr.Tag{"p", params.AttentionPubkey})
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
		Kind:      core.KindMatch,
		Tags:      tags,
		Content:   string(content_json),
	}

	// Sign event
	if err := event.Sign(private_key); err != nil {
		return nil, err
	}

	return event, nil
}
