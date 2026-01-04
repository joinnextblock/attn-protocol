package core

import "testing"

func TestATTNEventKinds(t *testing.T) {
	tests := []struct {
		name     string
		kind     int
		expected int
	}{
		{"Marketplace", KindMarketplace, 38188},
		{"Billboard", KindBillboard, 38288},
		{"Promotion", KindPromotion, 38388},
		{"Attention", KindAttention, 38488},
		{"BillboardConfirmation", KindBillboardConfirmation, 38588},
		{"AttentionConfirmation", KindAttentionConfirmation, 38688},
		{"MarketplaceConfirmation", KindMarketplaceConfirmation, 38788},
		{"Match", KindMatch, 38888},
		{"AttentionPaymentConfirmation", KindAttentionPaymentConfirmation, 38988},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.kind != tt.expected {
				t.Errorf("expected %d, got %d", tt.expected, tt.kind)
			}
		})
	}
}

func TestCityProtocolKinds(t *testing.T) {
	if KindCityBlock != 38808 {
		t.Errorf("expected KindCityBlock to be 38808, got %d", KindCityBlock)
	}
}

func TestNIP51ListTypes(t *testing.T) {
	tests := []struct {
		name     string
		value    string
		expected string
	}{
		{"BlockedPromotions", NIP51BlockedPromotions, "org.attnprotocol:promotion:blocked"},
		{"BlockedPromoters", NIP51BlockedPromoters, "org.attnprotocol:promoter:blocked"},
		{"TrustedBillboards", NIP51TrustedBillboards, "org.attnprotocol:billboard:trusted"},
		{"TrustedMarketplaces", NIP51TrustedMarketplaces, "org.attnprotocol:marketplace:trusted"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.value != tt.expected {
				t.Errorf("expected %s, got %s", tt.expected, tt.value)
			}
		})
	}
}

func TestCityBlockIDPrefix(t *testing.T) {
	if CityBlockIDPrefix != "org.cityprotocol:block:" {
		t.Errorf("expected CityBlockIDPrefix to be 'org.cityprotocol:block:', got %s", CityBlockIDPrefix)
	}
}

func TestAllATTNKinds(t *testing.T) {
	kinds := AllATTNKinds()
	if len(kinds) != 9 {
		t.Errorf("expected 9 ATTN kinds, got %d", len(kinds))
	}

	expected := []int{38188, 38288, 38388, 38488, 38588, 38688, 38788, 38888, 38988}
	for i, kind := range kinds {
		if kind != expected[i] {
			t.Errorf("expected kinds[%d] to be %d, got %d", i, expected[i], kind)
		}
	}
}

func TestIsATTNKind(t *testing.T) {
	// Test valid ATTN kinds
	valid_kinds := []int{38188, 38288, 38388, 38488, 38588, 38688, 38788, 38888, 38988}
	for _, kind := range valid_kinds {
		if !IsATTNKind(kind) {
			t.Errorf("expected IsATTNKind(%d) to be true", kind)
		}
	}

	// Test invalid kinds
	invalid_kinds := []int{0, 1, 38808, 38187, 38189, 99999}
	for _, kind := range invalid_kinds {
		if IsATTNKind(kind) {
			t.Errorf("expected IsATTNKind(%d) to be false", kind)
		}
	}
}
