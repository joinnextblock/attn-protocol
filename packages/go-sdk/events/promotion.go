package events

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/joinnextblock/attn-protocol/go-core"
	"github.com/nbd-wtf/go-nostr"
)

// PromotionParams holds parameters for creating a promotion event.
type PromotionParams struct {
	// Duration is the ad duration in milliseconds.
	Duration int64

	// Bid is the bid amount in satoshis.
	Bid int64

	// EventID is the ID of the content event being promoted.
	EventID string

	// CallToAction is the call-to-action text.
	CallToAction string

	// CallToActionURL is the call-to-action URL.
	CallToActionURL string

	// EscrowIDList is the list of escrow IDs.
	EscrowIDList []string

	// MarketplaceCoordinate is the marketplace coordinate (38188:pubkey:id).
	MarketplaceCoordinate string

	// BillboardCoordinate is the billboard coordinate (38288:pubkey:id).
	BillboardCoordinate string

	// BlockHeight is the Bitcoin block height.
	BlockHeight int64

	// PromotionID is the unique promotion ID for the d-tag.
	PromotionID string

	// PromotionPubkey is the promoter's pubkey.
	PromotionPubkey string
}

// CreatePromotion creates a PROMOTION event (kind 38388).
func CreatePromotion(private_key string, params PromotionParams) (*nostr.Event, error) {
	// Build content
	content := core.PromotionData{
		Duration:           params.Duration,
		Bid:                params.Bid,
		EventID:            params.EventID,
		CallToAction:       params.CallToAction,
		CallToActionURL:    params.CallToActionURL,
		EscrowIDList:       params.EscrowIDList,
		RefPromotionPubkey: params.PromotionPubkey,
		RefPromotionID:     params.PromotionID,
	}

	content_json, err := json.Marshal(content)
	if err != nil {
		return nil, err
	}

	// Build tags
	tags := nostr.Tags{}

	// Add d-tag
	d_tag := params.PromotionID
	if d_tag == "" {
		d_tag = fmt.Sprintf("org.attnprotocol:promotion:%d", time.Now().UnixNano())
	}
	tags = append(tags, nostr.Tag{"d", d_tag})

	// Add block height tag
	tags = append(tags, nostr.Tag{"t", fmt.Sprintf("%d", params.BlockHeight)})

	// Add marketplace coordinate
	if params.MarketplaceCoordinate != "" {
		tags = append(tags, nostr.Tag{"a", params.MarketplaceCoordinate})
	}

	// Add billboard coordinate
	if params.BillboardCoordinate != "" {
		tags = append(tags, nostr.Tag{"a", params.BillboardCoordinate})
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
		Kind:      core.KindPromotion,
		Tags:      tags,
		Content:   string(content_json),
	}

	// Sign event
	if err := event.Sign(private_key); err != nil {
		return nil, err
	}

	return event, nil
}
