package events

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/joinnextblock/attn-protocol/go-core"
	"github.com/nbd-wtf/go-nostr"
)

// AttentionParams holds parameters for creating an attention event.
type AttentionParams struct {
	// Ask is the minimum payment requested in satoshis.
	Ask int64

	// MinDuration is the minimum ad duration in milliseconds.
	MinDuration int64

	// MaxDuration is the maximum ad duration in milliseconds.
	MaxDuration int64

	// BlockedPromotionsID is the NIP-51 list ID for blocked promotions.
	BlockedPromotionsID string

	// BlockedPromotersID is the NIP-51 list ID for blocked promoters.
	BlockedPromotersID string

	// TrustedMarketplacesID is the NIP-51 list ID for trusted marketplaces.
	TrustedMarketplacesID string

	// TrustedBillboardsID is the NIP-51 list ID for trusted billboards.
	TrustedBillboardsID string

	// MarketplaceCoordinate is the marketplace coordinate (38188:pubkey:id).
	MarketplaceCoordinate string

	// BlockHeight is the Bitcoin block height.
	BlockHeight int64

	// AttentionID is the unique attention ID for the d-tag.
	AttentionID string

	// AttentionPubkey is the attention provider's pubkey.
	AttentionPubkey string
}

// CreateAttention creates an ATTENTION event (kind 38488).
func CreateAttention(private_key string, params AttentionParams) (*nostr.Event, error) {
	// Build content
	content := core.AttentionData{
		Ask:                   params.Ask,
		MinDuration:           params.MinDuration,
		MaxDuration:           params.MaxDuration,
		BlockedPromotionsID:   params.BlockedPromotionsID,
		BlockedPromotersID:    params.BlockedPromotersID,
		TrustedMarketplacesID: params.TrustedMarketplacesID,
		TrustedBillboardsID:   params.TrustedBillboardsID,
		RefAttentionPubkey:    params.AttentionPubkey,
		RefAttentionID:        params.AttentionID,
	}

	content_json, err := json.Marshal(content)
	if err != nil {
		return nil, err
	}

	// Build tags
	tags := nostr.Tags{}

	// Add d-tag
	d_tag := params.AttentionID
	if d_tag == "" {
		d_tag = fmt.Sprintf("org.attnprotocol:attention:%d", time.Now().UnixNano())
	}
	tags = append(tags, nostr.Tag{"d", d_tag})

	// Add block height tag
	tags = append(tags, nostr.Tag{"t", fmt.Sprintf("%d", params.BlockHeight)})

	// Add marketplace coordinate
	if params.MarketplaceCoordinate != "" {
		tags = append(tags, nostr.Tag{"a", params.MarketplaceCoordinate})
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
		Kind:      core.KindAttention,
		Tags:      tags,
		Content:   string(content_json),
	}

	// Sign event
	if err := event.Sign(private_key); err != nil {
		return nil, err
	}

	return event, nil
}
