package validation

import (
	"strings"
	"testing"

	"github.com/nbd-wtf/go-nostr"
	"nextblock-relay/internal/testhelpers"
)

func TestValidateEvent_ValidPromotion(t *testing.T) {
	pubkey := testhelpers.GenerateTestPubkey()
	event := testhelpers.CreateTestPromotionEvent(pubkey, 870500, pubkey, pubkey, pubkey)

	result := ValidateEvent(event)
	if !result.Valid {
		t.Errorf("Expected valid promotion event, got: %s", result.Message)
	}
}

func TestValidateEvent_ValidAttention(t *testing.T) {
	pubkey := testhelpers.GenerateTestPubkey()
	event := testhelpers.CreateTestAttentionEvent(pubkey, 870500, pubkey)

	result := ValidateEvent(event)
	if !result.Valid {
		t.Errorf("Expected valid attention event, got: %s", result.Message)
	}
}

func TestValidateEvent_MissingBlockHeight(t *testing.T) {
	pubkey := testhelpers.GenerateTestPubkey()
	event := testhelpers.CreateTestPromotionEvent(pubkey, 870500, pubkey, pubkey, pubkey)
	// Remove t tag
	event.Tags = event.Tags[:len(event.Tags)-1]

	result := ValidateEvent(event)
	if result.Valid {
		t.Error("Expected invalid event (missing block height), got valid")
	}
}

func TestValidateEvent_InvalidBlockHeight(t *testing.T) {
	pubkey := testhelpers.GenerateTestPubkey()
	event := testhelpers.CreateTestPromotionEvent(pubkey, 870500, pubkey, pubkey, pubkey)
	// Replace t tag with invalid value
	for i, tag := range event.Tags {
		if tag[0] == "t" {
			event.Tags[i] = nostr.Tag{"t", "invalid"}
			break
		}
	}

	result := ValidateEvent(event)
	if result.Valid {
		t.Error("Expected invalid event (invalid block height), got valid")
	}
}

func TestValidateEvent_MissingDTag(t *testing.T) {
	pubkey := testhelpers.GenerateTestPubkey()
	event := testhelpers.CreateTestPromotionEvent(pubkey, 870500, pubkey, pubkey, pubkey)
	// Remove d tag
	var newTags nostr.Tags
	for _, tag := range event.Tags {
		if tag[0] != "d" {
			newTags = append(newTags, tag)
		}
	}
	event.Tags = newTags

	result := ValidateEvent(event)
	if result.Valid {
		t.Error("Expected invalid event (missing d tag), got valid")
	}
}

func TestValidateEvent_MissingMarketplaceCoordinate(t *testing.T) {
	pubkey := testhelpers.GenerateTestPubkey()
	event := testhelpers.CreateTestPromotionEvent(pubkey, 870500, pubkey, pubkey, pubkey)
	// Remove marketplace coordinate a tag
	var newTags nostr.Tags
	for _, tag := range event.Tags {
		if tag[0] != "a" || !strings.HasPrefix(tag[1], "38188:") {
			newTags = append(newTags, tag)
		}
	}
	event.Tags = newTags

	result := ValidateEvent(event)
	if result.Valid {
		t.Error("Expected invalid event (missing marketplace coordinate), got valid")
	}
}

func TestValidateEvent_InvalidJSONContent(t *testing.T) {
	pubkey := testhelpers.GenerateTestPubkey()
	event := testhelpers.CreateTestPromotionEvent(pubkey, 870500, pubkey, pubkey, pubkey)
	event.Content = "invalid json"

	result := ValidateEvent(event)
	if result.Valid {
		t.Error("Expected invalid event (invalid JSON content), got valid")
	}
}

func TestValidatePromotionEvent_Valid(t *testing.T) {
	pubkey := testhelpers.GenerateTestPubkey()
	event := testhelpers.CreateTestPromotionEvent(pubkey, 870500, pubkey, pubkey, pubkey)

	result := ValidatePromotionEvent(event)
	if !result.Valid {
		t.Errorf("Expected valid promotion event, got: %s", result.Message)
	}
}

func TestValidateAttentionEvent_Valid(t *testing.T) {
	pubkey := testhelpers.GenerateTestPubkey()
	event := testhelpers.CreateTestAttentionEvent(pubkey, 870500, pubkey)

	result := ValidateAttentionEvent(event)
	if !result.Valid {
		t.Errorf("Expected valid attention event, got: %s", result.Message)
	}
}

func TestValidateMarketplaceEvent_Valid(t *testing.T) {
	pubkey := testhelpers.GenerateTestPubkey()
	event := testhelpers.CreateTestMarketplaceEvent(pubkey, 870500)

	result := ValidateMarketplaceEvent(event)
	if !result.Valid {
		t.Errorf("Expected valid marketplace event, got: %s", result.Message)
	}
}

