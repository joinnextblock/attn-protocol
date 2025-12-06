package validation

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/nbd-wtf/go-nostr"
)

// generateTestPubkey generates a random test pubkey (64 hex characters)
func generateTestPubkey() string {
	bytes := make([]byte, 32)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// generateTestSignature generates a random test signature (128 hex characters)
func generateTestSignature() string {
	bytes := make([]byte, 64)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// createTestEvent creates a test Nostr event with default values
func createTestEvent(kind int, pubkey string, content string) *nostr.Event {
	if pubkey == "" {
		pubkey = generateTestPubkey()
	}
	if content == "" {
		content = "{}"
	}

	event := &nostr.Event{
		Kind:      kind,
		PubKey:    pubkey,
		CreatedAt: nostr.Timestamp(time.Now().Unix()),
		Content:   content,
		Tags:      nostr.Tags{},
		Sig:       generateTestSignature(),
	}

	// Calculate event ID
	event.ID = event.GetID()

	return event
}

// createTestPromotionEvent creates a test PROMOTION event (kind 38388)
func createTestPromotionEvent(pubkey string, blockHeight int, marketplace string, billboard string, video string) *nostr.Event {
	content := fmt.Sprintf(`{
		"duration": 30000,
		"bid": 5000,
		"event_id": "test-video-id",
		"call_to_action": "Watch Now",
		"call_to_action_url": "https://example.com/watch",
		"escrow_id_list": ["strike_tx_abc123"],
		"ref_promotion_pubkey": "%s",
		"ref_promotion_id": "test-promotion",
		"ref_marketplace_pubkey": "%s",
		"ref_marketplace_id": "test-marketplace",
		"ref_billboard_pubkey": "%s",
		"ref_billboard_id": "test-billboard"
	}`, pubkey, pubkey, pubkey)

	event := createTestEvent(38388, pubkey, content)
	event.Tags = append(event.Tags,
		nostr.Tag{"d", "org.attnprotocol:promotion:test-promotion"},
		nostr.Tag{"t", fmt.Sprintf("%d", blockHeight)},
		nostr.Tag{"a", fmt.Sprintf("38188:%s:org.attnprotocol:marketplace:test-marketplace", pubkey)},
		nostr.Tag{"a", fmt.Sprintf("38288:%s:org.attnprotocol:billboard:test-billboard", pubkey)},
		nostr.Tag{"a", fmt.Sprintf("34236:%s:test-video", pubkey)},
		nostr.Tag{"p", pubkey},
		nostr.Tag{"p", pubkey},
		nostr.Tag{"p", pubkey},
		nostr.Tag{"r", "wss://relay.nextblock.city"},
		nostr.Tag{"k", "34236"},
		nostr.Tag{"u", "https://example.com/promotion"},
	)

	event.ID = event.GetID()
	return event
}

// createTestAttentionEvent creates a test ATTENTION event (kind 38488)
func createTestAttentionEvent(pubkey string, blockHeight int, marketplace string) *nostr.Event {
	content := fmt.Sprintf(`{
		"ask": 3000,
		"min_duration": 15000,
		"max_duration": 60000,
		"ref_attention_pubkey": "%s",
		"ref_attention_id": "test-attention",
		"ref_marketplace_pubkey": "%s",
		"ref_marketplace_id": "test-marketplace",
		"blocked_promotions_id": "org.attnprotocol:promotion:blocked",
		"blocked_promoters_id": "org.attnprotocol:promoter:blocked"
	}`, pubkey, pubkey)

	event := createTestEvent(38488, pubkey, content)
	event.Tags = append(event.Tags,
		nostr.Tag{"d", "org.attnprotocol:attention:test-attention"},
		nostr.Tag{"t", fmt.Sprintf("%d", blockHeight)},
		nostr.Tag{"a", fmt.Sprintf("38188:%s:org.attnprotocol:marketplace:test-marketplace", pubkey)},
		nostr.Tag{"a", fmt.Sprintf("30000:%s:org.attnprotocol:promotion:blocked", pubkey)},
		nostr.Tag{"a", fmt.Sprintf("30000:%s:org.attnprotocol:promoter:blocked", pubkey)},
		nostr.Tag{"p", pubkey},
		nostr.Tag{"p", pubkey},
		nostr.Tag{"r", "wss://relay.nextblock.city"},
		nostr.Tag{"k", "34236"},
	)

	event.ID = event.GetID()
	return event
}

// createTestMarketplaceEvent creates a test MARKETPLACE event (kind 38188)
func createTestMarketplaceEvent(pubkey string, blockHeight int) *nostr.Event {
	nodePubkey := generateTestPubkey()
	blockHash := "00000000000000000001a7c"
	content := fmt.Sprintf(`{
		"name": "Test Marketplace",
		"description": "Test marketplace description",
		"admin_pubkey": "%s",
		"min_duration": 15000,
		"max_duration": 60000,
		"match_fee_sats": 0,
		"confirmation_fee_sats": 0,
		"ref_marketplace_pubkey": "%s",
		"ref_marketplace_id": "test-marketplace",
		"ref_node_pubkey": "%s",
		"ref_block_id": "org.attnprotocol:block:%d:%s"
	}`, pubkey, pubkey, nodePubkey, blockHeight, blockHash)

	event := createTestEvent(38188, pubkey, content)
	event.Tags = append(event.Tags,
		nostr.Tag{"d", "org.attnprotocol:marketplace:test-marketplace"},
		nostr.Tag{"t", fmt.Sprintf("%d", blockHeight)},
		nostr.Tag{"a", fmt.Sprintf("38088:%s:org.attnprotocol:block:%d:%s", nodePubkey, blockHeight, blockHash)},
		nostr.Tag{"k", "34236"},
		nostr.Tag{"p", pubkey},
		nostr.Tag{"p", nodePubkey},
		nostr.Tag{"r", "wss://relay.nextblock.city"},
	)

	event.ID = event.GetID()
	return event
}

