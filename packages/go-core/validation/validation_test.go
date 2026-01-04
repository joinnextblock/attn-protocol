package validation

import (
	"strings"
	"testing"

	"github.com/nbd-wtf/go-nostr"
)

func TestValidateEvent_ValidPromotion(t *testing.T) {
	pubkey := generateTestPubkey()
	event := createTestPromotionEvent(pubkey, 870500, pubkey, pubkey, pubkey)

	result := ValidateEvent(event)
	if !result.Valid {
		t.Errorf("Expected valid promotion event, got: %s", result.Message)
	}
}

func TestValidateEvent_ValidAttention(t *testing.T) {
	pubkey := generateTestPubkey()
	event := createTestAttentionEvent(pubkey, 870500, pubkey)

	result := ValidateEvent(event)
	if !result.Valid {
		t.Errorf("Expected valid attention event, got: %s", result.Message)
	}
}

func TestValidateEvent_MissingBlockHeight(t *testing.T) {
	pubkey := generateTestPubkey()
	event := createTestPromotionEvent(pubkey, 870500, pubkey, pubkey, pubkey)
	// Remove t tag
	event.Tags = event.Tags[:len(event.Tags)-1]

	result := ValidateEvent(event)
	if result.Valid {
		t.Error("Expected invalid event (missing block height), got valid")
	}
}

func TestValidateEvent_InvalidBlockHeight(t *testing.T) {
	pubkey := generateTestPubkey()
	event := createTestPromotionEvent(pubkey, 870500, pubkey, pubkey, pubkey)
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
	pubkey := generateTestPubkey()
	event := createTestPromotionEvent(pubkey, 870500, pubkey, pubkey, pubkey)
	// Remove d tag
	var new_tags nostr.Tags
	for _, tag := range event.Tags {
		if tag[0] != "d" {
			new_tags = append(new_tags, tag)
		}
	}
	event.Tags = new_tags

	result := ValidateEvent(event)
	if result.Valid {
		t.Error("Expected invalid event (missing d tag), got valid")
	}
}

func TestValidateEvent_MissingMarketplaceCoordinate(t *testing.T) {
	pubkey := generateTestPubkey()
	event := createTestPromotionEvent(pubkey, 870500, pubkey, pubkey, pubkey)
	// Remove marketplace coordinate a tag
	var new_tags nostr.Tags
	for _, tag := range event.Tags {
		if tag[0] != "a" || !strings.HasPrefix(tag[1], "38188:") {
			new_tags = append(new_tags, tag)
		}
	}
	event.Tags = new_tags

	result := ValidateEvent(event)
	if result.Valid {
		t.Error("Expected invalid event (missing marketplace coordinate), got valid")
	}
}

func TestValidateEvent_InvalidJSONContent(t *testing.T) {
	pubkey := generateTestPubkey()
	event := createTestPromotionEvent(pubkey, 870500, pubkey, pubkey, pubkey)
	event.Content = "invalid json"

	result := ValidateEvent(event)
	if result.Valid {
		t.Error("Expected invalid event (invalid JSON content), got valid")
	}
}

func TestValidatePromotionEvent_Valid(t *testing.T) {
	pubkey := generateTestPubkey()
	event := createTestPromotionEvent(pubkey, 870500, pubkey, pubkey, pubkey)

	result := ValidatePromotionEvent(event)
	if !result.Valid {
		t.Errorf("Expected valid promotion event, got: %s", result.Message)
	}
}

func TestValidateAttentionEvent_Valid(t *testing.T) {
	pubkey := generateTestPubkey()
	event := createTestAttentionEvent(pubkey, 870500, pubkey)

	result := ValidateAttentionEvent(event)
	if !result.Valid {
		t.Errorf("Expected valid attention event, got: %s", result.Message)
	}
}

func TestValidateMarketplaceEvent_Valid(t *testing.T) {
	pubkey := generateTestPubkey()
	event := createTestMarketplaceEvent(pubkey, 870500)

	result := ValidateMarketplaceEvent(event)
	if !result.Valid {
		t.Errorf("Expected valid marketplace event, got: %s", result.Message)
	}
}

func TestValidateEvent_AllowedSupportingKinds(t *testing.T) {
	pubkey := generateTestPubkey()

	tests := []struct {
		name string
		kind int
	}{
		// Identity & Infrastructure
		{"User metadata (kind 0)", 0},
		{"Follow list (kind 3)", 3},
		{"Deletion event (kind 5)", 5},
		{"Bookmarks simple (kind 10003)", 10003},
		{"Relay list metadata (kind 10002)", 10002},
		{"Client auth (kind 22242)", 22242},
		{"HTTP auth (kind 27235)", 27235},
		{"NIP-51 categorized list (kind 30000)", 30000},
		{"Bookmarks categorized (kind 30001)", 30001},
		{"Handler recommendation (kind 31989)", 31989},
		{"Handler information (kind 31990)", 31990},
		// Content
		{"File metadata (kind 1063)", 1063},
		{"Long-form content (kind 30023)", 30023},
		{"Live events (kind 30311)", 30311},
		{"Video event (kind 34236)", 34236},
		// Social interactions on promoted content
		{"Text note/comment (kind 1)", 1},
		{"Repost (kind 6)", 6},
		{"Generic repost (kind 16)", 16},
		{"Comment (kind 1111)", 1111},
		{"Zap request (kind 9734)", 9734},
		{"Zap (kind 9735)", 9735},
		// Moderation
		{"Report (kind 1984)", 1984},
		{"Label (kind 1985)", 1985},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event := &nostr.Event{
				Kind:    tt.kind,
				PubKey:  pubkey,
				Content: "{}",
				Tags:    nostr.Tags{},
			}

			result := ValidateEvent(event)
			if !result.Valid {
				t.Errorf("Expected %s to be valid, got: %s", tt.name, result.Message)
			}
		})
	}
}

func TestValidateEvent_RejectedKinds(t *testing.T) {
	pubkey := generateTestPubkey()

	tests := []struct {
		name string
		kind int
	}{
		{"Encrypted DM (kind 4)", 4},
		{"Reaction (kind 7)", 7},
		{"Channel message (kind 42)", 42},
		{"Badge definition (kind 30009)", 30009},
		{"Random kind", 99999},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			event := &nostr.Event{
				Kind:    tt.kind,
				PubKey:  pubkey,
				Content: "test content",
				Tags:    nostr.Tags{},
			}

			result := ValidateEvent(event)
			if result.Valid {
				t.Errorf("Expected %s (kind %d) to be rejected, got valid", tt.name, tt.kind)
			}
			if !strings.Contains(result.Message, "not supported") {
				t.Errorf("Expected rejection message to contain 'not supported', got: %s", result.Message)
			}
		})
	}
}

func TestAllowedEventKinds_ATTNProtocolKinds(t *testing.T) {
	// ATTN Protocol kinds (38188-38988), plus City Protocol block kind (38808)
	attn_kinds := []int{38808, 38188, 38288, 38388, 38488, 38588, 38688, 38788, 38888, 38988}

	for _, kind := range attn_kinds {
		if !AllowedEventKinds[kind] {
			t.Errorf("Expected ATTN/City Protocol kind %d to be allowed", kind)
		}
	}
}

func TestAllowedEventKinds_SupportingKinds(t *testing.T) {
	supporting_kinds := []int{0, 1, 3, 5, 6, 16, 1111, 9735, 10002, 22242, 30000, 34236}

	for _, kind := range supporting_kinds {
		if !AllowedEventKinds[kind] {
			t.Errorf("Expected supporting kind %d to be allowed", kind)
		}
	}
}

func TestAllowedEventKinds_TotalCount(t *testing.T) {
	// 10 ATTN Protocol kinds + 23 supporting kinds = 33 total
	expected := 33
	actual := len(AllowedEventKinds)

	if actual != expected {
		t.Errorf("Expected %d allowed event kinds, got %d", expected, actual)
	}
}

func TestIsATTNProtocolKind(t *testing.T) {
	// ATTN Protocol kinds should return true
	attn_kinds := []int{38808, 38188, 38288, 38388, 38488, 38588, 38688, 38788, 38888, 38988}
	for _, kind := range attn_kinds {
		if !IsATTNProtocolKind(kind) {
			t.Errorf("Expected IsATTNProtocolKind(%d) to return true", kind)
		}
	}

	// Non-ATTN kinds should return false
	non_attn_kinds := []int{0, 1, 5, 10002, 30000, 34236}
	for _, kind := range non_attn_kinds {
		if IsATTNProtocolKind(kind) {
			t.Errorf("Expected IsATTNProtocolKind(%d) to return false", kind)
		}
	}
}

