// Package ratelimit provides per-user, per-event-kind rate limiting for the NextBlock ATTN Relay.
// It enforces configurable limits per event type, automatically cleans up expired entries,
// and supports custom limits for specific event kinds.
package ratelimit

import (
	"context"
	"sync"
	"time"

	"github.com/joinnextblock/attn-protocol/relay/pkg/logger"
)

// RateLimiter handles rate limiting per user and event kind.
// It tracks request timestamps and enforces configurable limits per event type.
// Automatically cleans up expired entries to prevent memory leaks.
type RateLimiter struct {
	limits            map[int]int // kind -> events per window
	users             map[string]map[int][]time.Time // user -> kind -> timestamps
	mutex             sync.RWMutex
	rateLimitWindow   time.Duration // Time window for rate limiting (default: 1 minute)
	cleanupInterval   time.Duration // Interval for cleanup routine (default: 5 minutes)
}

// NewRateLimiter creates a new rate limiter with default limits.
//
// Parameters:
//   - rateLimitWindow: Time window for rate limiting (e.g., 1 minute)
//   - cleanupInterval: Interval for cleanup routine (e.g., 5 minutes)
//
// Returns a new RateLimiter instance ready for use.
func NewRateLimiter(rateLimitWindow time.Duration, cleanupInterval time.Duration) *RateLimiter {
	rl := &RateLimiter{
		limits:          make(map[int]int),
		users:           make(map[string]map[int][]time.Time),
		rateLimitWindow: rateLimitWindow,
		cleanupInterval: cleanupInterval,
	}

	// Set default rate limits per event kind (ATTN-01)
	rl.limits[38488] = 10  // Attention: 10/min
	rl.limits[38188] = 5   // Marketplace: 5/min
	rl.limits[38288] = 20  // Billboard: 20/min
	rl.limits[38388] = 50  // Promotion: 50/min
	rl.limits[38888] = 1000 // Match: 1000/min
	rl.limits[38088] = 10  // Block events: 10/min
	rl.limits[30023] = 20  // Long-form content: 20/min (cityscape scenes)
	rl.limits[1] = 100     // Comments: 100/min
	rl.limits[6] = 50      // Reposts: 50/min
	rl.limits[10002] = 10  // Relay list: 10/min
	rl.limits[9734] = 100  // Zap requests: 100/min
	rl.limits[9735] = 100  // Zap receipts: 100/min
	rl.limits[0] = 20      // Default: 20/min

	return rl
}

// Allow checks if a user can publish an event of the given kind within rate limits.
// Uses a sliding window algorithm to track requests within the configured time window.
// Automatically cleans up expired timestamps before checking the limit.
//
// Parameters:
//   - ctx: Context (currently unused but reserved for future cancellation support)
//   - user: User identifier (typically pubkey)
//   - kind: Event kind number
//
// Returns true if the user is within the rate limit and the request is allowed,
// false if the rate limit has been exceeded.
//
// The rate limit is enforced per user and per event kind. If no specific limit
// is configured for the kind, the default limit (20/min) is used.
func (rl *RateLimiter) Allow(ctx context.Context, user string, kind int) bool {
	rl.mutex.Lock()
	defer rl.mutex.Unlock()

	// Get rate limit for this kind
	limit, exists := rl.limits[kind]
	if !exists {
		limit = rl.limits[0] // Use default limit
	}

	logger.Debug().
		Str("user", user).
		Int("kind", kind).
		Int("limit", limit).
		Msg("Checking rate limit")

	// Initialize user's kind tracking if needed
	if rl.users[user] == nil {
		rl.users[user] = make(map[int][]time.Time)
	}

	// Clean up old timestamps (older than rate limit window)
	now := time.Now()
	var validTimestamps []time.Time
	for _, timestamp := range rl.users[user][kind] {
		if now.Sub(timestamp) < rl.rateLimitWindow {
			validTimestamps = append(validTimestamps, timestamp)
		}
	}
	rl.users[user][kind] = validTimestamps

	// Check if user is within limit
	if len(rl.users[user][kind]) >= limit {
		logger.Warn().
			Str("user", user).
			Int("kind", kind).
			Int("limit", limit).
			Int("current", len(rl.users[user][kind])).
			Msg("Rate limit exceeded")
		return false
	}

	// Add current timestamp
	rl.users[user][kind] = append(rl.users[user][kind], now)

	logger.Debug().
		Str("user", user).
		Int("kind", kind).
		Int("limit", limit).
		Int("remaining", limit-len(rl.users[user][kind])).
		Msg("Rate limit check passed")

	return true
}

// GetRemainingRequests returns the number of remaining requests for a user and kind
// within the current time window (last minute).
//
// Parameters:
//   - user: User identifier (typically pubkey)
//   - kind: Event kind
//
// Returns the number of requests remaining before the rate limit is reached.
func (rl *RateLimiter) GetRemainingRequests(user string, kind int) int {
	rl.mutex.RLock()
	defer rl.mutex.RUnlock()

	limit, exists := rl.limits[kind]
	if !exists {
		limit = rl.limits[0]
	}

	if rl.users[user] == nil {
		return limit
	}

	// Count valid timestamps
	now := time.Now()
	count := 0
	for _, timestamp := range rl.users[user][kind] {
		if now.Sub(timestamp) < rl.rateLimitWindow {
			count++
		}
	}

	return limit - count
}

// GetResetTime returns when the rate limit will reset for a user and kind.
// The reset time is the rate limit window duration after the oldest request timestamp.
//
// Parameters:
//   - user: User identifier (typically pubkey)
//   - kind: Event kind
//
// Returns the time when the rate limit will reset (rate limit window after oldest request).
func (rl *RateLimiter) GetResetTime(user string, kind int) time.Time {
	rl.mutex.RLock()
	defer rl.mutex.RUnlock()

	if rl.users[user] == nil || len(rl.users[user][kind]) == 0 {
		return time.Now()
	}

	// Find the oldest timestamp
	oldest := rl.users[user][kind][0]
	for _, timestamp := range rl.users[user][kind] {
		if timestamp.Before(oldest) {
			oldest = timestamp
		}
	}

	// Reset time is rate limit window after the oldest timestamp
	return oldest.Add(rl.rateLimitWindow)
}

// Cleanup removes old entries to prevent memory leaks.
// Removes timestamps older than the rate limit window and users with no active timestamps.
// This should be called periodically via StartCleanupRoutine.
func (rl *RateLimiter) Cleanup() {
	rl.mutex.Lock()
	defer rl.mutex.Unlock()

	now := time.Now()
	for user, kinds := range rl.users {
		for kind, timestamps := range kinds {
			var validTimestamps []time.Time
			for _, timestamp := range timestamps {
				if now.Sub(timestamp) < rl.rateLimitWindow {
					validTimestamps = append(validTimestamps, timestamp)
				}
			}
			rl.users[user][kind] = validTimestamps
		}

		// Remove user if no active timestamps
		hasActive := false
		for _, timestamps := range kinds {
			if len(timestamps) > 0 {
				hasActive = true
				break
			}
		}
		if !hasActive {
			delete(rl.users, user)
		}
	}
}

// StartCleanupRoutine starts a background routine to clean up old entries.
// Runs cleanup at the configured interval until the context is cancelled.
// Should be started once during service initialization and stopped on shutdown.
//
// Parameters:
//   - ctx: Context for cancellation (should be cancelled on service shutdown)
func (rl *RateLimiter) StartCleanupRoutine(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(rl.cleanupInterval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				rl.Cleanup()
			}
		}
	}()
}

// SetLimit sets a custom rate limit for a specific event kind.
// Overrides the default limit for the specified kind.
//
// Parameters:
//   - kind: Event kind
//   - limit: Maximum number of events per minute for this kind
func (rl *RateLimiter) SetLimit(kind int, limit int) {
	rl.mutex.Lock()
	defer rl.mutex.Unlock()
	rl.limits[kind] = limit
}

// GetLimit returns the current rate limit for a specific event kind.
// Returns the default limit (20/min) if no specific limit is set for the kind.
//
// Parameters:
//   - kind: Event kind
//
// Returns the rate limit (events per minute) for the specified kind.
func (rl *RateLimiter) GetLimit(kind int) int {
	rl.mutex.RLock()
	defer rl.mutex.RUnlock()

	limit, exists := rl.limits[kind]
	if !exists {
		return rl.limits[0] // Return default limit
	}
	return limit
}
