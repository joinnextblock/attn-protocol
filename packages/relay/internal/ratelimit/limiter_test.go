package ratelimit

import (
	"context"
	"testing"
	"time"
)

func TestNewRateLimiter(t *testing.T) {
	limiter := NewRateLimiter(1*time.Minute, 5*time.Minute)
	if limiter == nil {
		t.Fatal("Expected non-nil RateLimiter")
	}
}

func TestRateLimiter_Allow_WithinLimit(t *testing.T) {
	limiter := NewRateLimiter(1*time.Minute, 5*time.Minute)
	pubkey := "test_pubkey_12345678901234567890123456789012345678901234567890123456789012"
	kind := 1

	// Should allow requests within limit
	for i := 0; i < limiter.GetLimit(kind); i++ {
		ctx := context.Background()
		if !limiter.Allow(ctx, pubkey, kind) {
			t.Errorf("Expected request %d to be allowed", i+1)
		}
	}
}

func TestRateLimiter_Allow_ExceedsLimit(t *testing.T) {
	limiter := NewRateLimiter(1*time.Minute, 5*time.Minute)
	pubkey := "test_pubkey_12345678901234567890123456789012345678901234567890123456789012"
	kind := 1
	limit := limiter.GetLimit(kind)

	// Exhaust limit
	ctx := context.Background()
	for i := 0; i < limit; i++ {
		limiter.Allow(ctx, pubkey, kind)
	}

	// Next request should be denied
	if limiter.Allow(ctx, pubkey, kind) {
		t.Error("Expected request exceeding limit to be denied")
	}
}

func TestRateLimiter_GetLimit(t *testing.T) {
	limiter := NewRateLimiter(1*time.Minute, 5*time.Minute)

	// Test different event kinds
	tests := []struct {
		kind     int
		expected int
	}{
		{1, 100},        // Text notes
		{0, 20},         // Metadata (default limit)
		{38388, 50},     // Promotions
		{38488, 10},     // Attention
		{38888, 1000},   // Matches
		{99999, 20},     // Unknown kind (default)
	}

	for _, tt := range tests {
		limit := limiter.GetLimit(tt.kind)
		if limit != tt.expected {
			t.Errorf("Expected limit %d for kind %d, got %d", tt.expected, tt.kind, limit)
		}
	}
}

func TestRateLimiter_GetRemainingRequests(t *testing.T) {
	limiter := NewRateLimiter(1*time.Minute, 5*time.Minute)
	pubkey := "test_pubkey_12345678901234567890123456789012345678901234567890123456789012"
	kind := 1
	limit := limiter.GetLimit(kind)

	ctx := context.Background()
	// Make some requests
	for i := 0; i < 5; i++ {
		limiter.Allow(ctx, pubkey, kind)
	}

	remaining := limiter.GetRemainingRequests(pubkey, kind)
	expected := limit - 5
	if remaining != expected {
		t.Errorf("Expected %d remaining requests, got %d", expected, remaining)
	}
}

func TestRateLimiter_Cleanup(t *testing.T) {
	limiter := NewRateLimiter(1*time.Minute, 5*time.Minute)
	pubkey := "test_pubkey_12345678901234567890123456789012345678901234567890123456789012"
	kind := 1

	ctx := context.Background()
	// Make requests
	limiter.Allow(ctx, pubkey, kind)

	// Start cleanup routine
	cleanupCtx, cancel := context.WithCancel(context.Background())
	limiter.StartCleanupRoutine(cleanupCtx)

	// Wait a bit for cleanup
	time.Sleep(2 * time.Second)

	// Cancel cleanup
	cancel()

	// Cleanup should have run (we can't easily test this without exposing internals,
	// but we can verify the limiter still works)
	if !limiter.Allow(ctx, pubkey, kind) {
		t.Error("Expected limiter to still work after cleanup")
	}
}

func TestRateLimiter_DifferentPubkeys(t *testing.T) {
	limiter := NewRateLimiter(1*time.Minute, 5*time.Minute)
	pubkey1 := "test_pubkey_11111111111111111111111111111111111111111111111111111111111111"
	pubkey2 := "test_pubkey_22222222222222222222222222222222222222222222222222222222222222"
	kind := 1
	limit := limiter.GetLimit(kind)

	ctx := context.Background()
	// Exhaust limit for pubkey1
	for i := 0; i < limit; i++ {
		limiter.Allow(ctx, pubkey1, kind)
	}

	// pubkey1 should be denied
	if limiter.Allow(ctx, pubkey1, kind) {
		t.Error("Expected pubkey1 to be rate limited")
	}

	// pubkey2 should still be allowed
	if !limiter.Allow(ctx, pubkey2, kind) {
		t.Error("Expected pubkey2 to still be allowed")
	}
}

func TestRateLimiter_DifferentKinds(t *testing.T) {
	limiter := NewRateLimiter(1*time.Minute, 5*time.Minute)
	pubkey := "test_pubkey_12345678901234567890123456789012345678901234567890123456789012"
	kind1 := 1
	kind2 := 38288

	ctx := context.Background()
	limit1 := limiter.GetLimit(kind1)
	limit2 := limiter.GetLimit(kind2)

	// Exhaust limit for kind1
	for i := 0; i < limit1; i++ {
		limiter.Allow(ctx, pubkey, kind1)
	}

	// kind1 should be denied
	if limiter.Allow(ctx, pubkey, kind1) {
		t.Error("Expected kind1 to be rate limited")
	}

	// kind2 should still be allowed (different limit)
	if !limiter.Allow(ctx, pubkey, kind2) {
		t.Error("Expected kind2 to still be allowed")
	}

	// Exhaust limit for kind2
	for i := 0; i < limit2; i++ {
		limiter.Allow(ctx, pubkey, kind2)
	}

	// kind2 should now be denied
	if limiter.Allow(ctx, pubkey, kind2) {
		t.Error("Expected kind2 to be rate limited after exhausting limit")
	}
}

