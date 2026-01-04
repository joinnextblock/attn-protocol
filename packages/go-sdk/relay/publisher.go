package relay

import (
	"context"
	"errors"

	"github.com/nbd-wtf/go-nostr"
)

var (
	// ErrNoRelays is returned when no relay URLs are provided.
	ErrNoRelays = errors.New("no relay URLs provided")

	// ErrPublishFailed is returned when event publishing fails on all relays.
	ErrPublishFailed = errors.New("failed to publish event to any relay")

	// ErrConnectionFailed is returned when relay connection fails.
	ErrConnectionFailed = errors.New("failed to connect to relay")
)

// PublishResult represents the result of publishing an event to a relay.
type PublishResult struct {
	RelayURL string
	Success  bool
	Error    error
}

// PublishResults represents the results of publishing to multiple relays.
type PublishResults struct {
	EventID      string
	Results      []PublishResult
	SuccessCount int
	FailureCount int
}

// PublishToRelay publishes an event to a single relay.
func PublishToRelay(ctx context.Context, event *nostr.Event, relay_url string) (*PublishResult, error) {
	relay, err := nostr.RelayConnect(ctx, relay_url)
	if err != nil {
		return &PublishResult{
			RelayURL: relay_url,
			Success:  false,
			Error:    err,
		}, err
	}
	defer relay.Close()

	err = relay.Publish(ctx, *event)
	if err != nil {
		return &PublishResult{
			RelayURL: relay_url,
			Success:  false,
			Error:    err,
		}, err
	}

	return &PublishResult{
		RelayURL: relay_url,
		Success:  true,
		Error:    nil,
	}, nil
}

// PublishToMultiple publishes an event to multiple relays.
func PublishToMultiple(ctx context.Context, event *nostr.Event, relay_urls []string) (*PublishResults, error) {
	if len(relay_urls) == 0 {
		return nil, ErrNoRelays
	}

	results := &PublishResults{
		EventID: event.ID,
		Results: make([]PublishResult, 0, len(relay_urls)),
	}

	for _, url := range relay_urls {
		result, _ := PublishToRelay(ctx, event, url)
		results.Results = append(results.Results, *result)

		if result.Success {
			results.SuccessCount++
		} else {
			results.FailureCount++
		}
	}

	if results.SuccessCount == 0 {
		return results, ErrPublishFailed
	}

	return results, nil
}

// Pool manages connections to multiple Nostr relays.
type Pool struct {
	urls   []string
	relays []*nostr.Relay
}

// NewPool creates a new relay pool with the given URLs.
func NewPool(urls []string) (*Pool, error) {
	if len(urls) == 0 {
		return nil, ErrNoRelays
	}

	return &Pool{
		urls:   urls,
		relays: make([]*nostr.Relay, 0),
	}, nil
}

// Connect connects to all relays in the pool.
func (p *Pool) Connect(ctx context.Context) error {
	for _, url := range p.urls {
		relay, err := nostr.RelayConnect(ctx, url)
		if err != nil {
			// Continue trying other relays
			continue
		}
		p.relays = append(p.relays, relay)
	}

	if len(p.relays) == 0 {
		return ErrConnectionFailed
	}

	return nil
}

// Close closes all relay connections.
func (p *Pool) Close() {
	for _, relay := range p.relays {
		relay.Close()
	}
	p.relays = nil
}

// Publish publishes an event to all connected relays.
// Returns nil if at least one relay accepts the event.
func (p *Pool) Publish(ctx context.Context, event *nostr.Event) error {
	if len(p.relays) == 0 {
		return ErrNoRelays
	}

	var success bool
	for _, relay := range p.relays {
		if err := relay.Publish(ctx, *event); err == nil {
			success = true
		}
	}

	if !success {
		return ErrPublishFailed
	}

	return nil
}

// Query queries events from all connected relays.
func (p *Pool) Query(ctx context.Context, filter nostr.Filter) ([]*nostr.Event, error) {
	if len(p.relays) == 0 {
		return nil, ErrNoRelays
	}

	var events []*nostr.Event
	seen := make(map[string]bool)

	for _, relay := range p.relays {
		relay_events, err := relay.QuerySync(ctx, filter)
		if err != nil {
			continue
		}
		for _, event := range relay_events {
			if !seen[event.ID] {
				seen[event.ID] = true
				events = append(events, event)
			}
		}
	}

	return events, nil
}

// ConnectedCount returns the number of connected relays.
func (p *Pool) ConnectedCount() int {
	return len(p.relays)
}
