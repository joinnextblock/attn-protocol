package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/nbd-wtf/go-nostr"
	"github.com/nbd-wtf/go-nostr/nip11"
	"github.com/pippellia-btc/rely"

	"github.com/joinnextblock/attn-protocol/relay/internal/config"
	"github.com/joinnextblock/attn-protocol/relay/internal/logger"
	"github.com/joinnextblock/attn-protocol/relay/internal/plugin"
	"github.com/joinnextblock/attn-protocol/relay/internal/ratelimit"
	"github.com/joinnextblock/attn-protocol/relay/internal/storage"
	"github.com/joinnextblock/attn-protocol/relay/internal/validation"
)

func main() {
	// Initialize logger with default INFO level
	logger.Init("INFO")

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		logger.Fatal().Err(err).Msg("Failed to load configuration")
	}

	// Re-initialize logger with configured log level
	logger.Init(cfg.LogLevel)

	logger.Info().
		Str("relay_name", cfg.RelayName).
		Int("port", cfg.RelayPort).
		Str("log_level", cfg.LogLevel).
		Str("storage_type", cfg.StorageType).
		Str("auth_plugin", cfg.AuthPlugin).
		Msg("Starting ATTN Protocol Relay")

	// Initialize storage
	var eventStorage storage.Storage
	switch cfg.StorageType {
	case "sqlite":
		eventStorage, err = storage.NewSQLiteStorage(cfg.SQLiteDBPath)
		if err != nil {
			logger.Fatal().Err(err).Msg("Failed to initialize SQLite storage")
		}
		logger.Info().
			Str("db_path", cfg.SQLiteDBPath).
			Msg("SQLite storage initialized")
	default:
		logger.Fatal().
			Str("storage_type", cfg.StorageType).
			Msg("Unsupported storage type - implement custom storage or use 'sqlite'")
	}

	// Initialize plugins
	authHooks := getAuthPlugin(cfg.AuthPlugin)
	attnHooks := &plugin.NoATTNHooks{} // Default no-op hooks

	// Initialize rate limiter
	rateLimiter := ratelimit.NewRateLimiter(cfg.RateLimitWindow, cfg.RateLimiterCleanupInterval)

	// Start cleanup routine for rate limiter
	ctx, cancel := context.WithCancel(context.Background())
	defer func() {
		cancel()
		logger.Info().Msg("Rate limiter cleanup routine stopped")
	}()

	rateLimiter.StartCleanupRoutine(ctx)
	logger.Debug().Msg("Rate limiter cleanup routine started")

	// Create relay info for NIP-11
	relayInfo := nip11.RelayInformationDocument{
		Name:          cfg.RelayName,
		Description:   cfg.RelayDescription,
		PubKey:        cfg.RelayPubkey,
		Contact:       cfg.RelayContact,
		SupportedNIPs: []any{1, 16, 20, 42, 65},
	}

	logger.Info().
		Str("name", cfg.RelayName).
		Str("description", cfg.RelayDescription).
		Str("pubkey", cfg.RelayPubkey).
		Str("contact", cfg.RelayContact).
		Msg("Relay metadata configured")

	// Initialize rely relay
	domain := cfg.RelayDomain
	if domain == "" {
		domain = "localhost"
		logger.Warn().Msg("RELAY_DOMAIN not set, using 'localhost' for NIP-42 validation")
	}

	relay := rely.NewRelay(
		rely.WithDomain(domain),
		rely.WithInfo(relayInfo),
	)

	logger.Info().
		Str("domain", domain).
		Msg("Relay initialized")

	// Set up hooks
	setupHooks(relay, eventStorage, authHooks, attnHooks, rateLimiter)

	// Start the relay server
	address := fmt.Sprintf(":%d", cfg.RelayPort)
	logger.Info().
		Int("port", cfg.RelayPort).
		Msg("Starting ATTN Protocol Relay server")

	// Start relay in a goroutine
	errChan := make(chan error, 1)
	go func() {
		if err := relay.StartAndServe(ctx, address); err != nil {
			errChan <- err
		}
	}()

	// Wait for interrupt signal or error
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	select {
	case <-quit:
		logger.Info().Msg("Shutdown signal received, shutting down server...")
	case err := <-errChan:
		logger.Error().Err(err).Msg("Server error")
		logger.Fatal().Err(err).Msg("Server error")
	}

	// Graceful shutdown
	logger.Info().Msg("Server exited gracefully")
}

// getAuthPlugin returns the appropriate auth plugin based on configuration.
func getAuthPlugin(pluginName string) plugin.AuthHooks {
	switch pluginName {
	case "none", "":
		return &plugin.NoAuthHooks{}
	default:
		logger.Warn().
			Str("plugin", pluginName).
			Msg("Unknown auth plugin, using NoAuthHooks")
		return &plugin.NoAuthHooks{}
	}
}

// setupHooks configures all relay hooks using the plugin system.
func setupHooks(
	relay *rely.Relay,
	eventStorage storage.Storage,
	authHooks plugin.AuthHooks,
	attnHooks plugin.ATTNHooks,
	rateLimiter *ratelimit.RateLimiter,
) {
	logger.Debug().Msg("Setting up relay hooks")

	// RejectConnection hook
	relay.Hooks.Reject.Connection = append(relay.Hooks.Reject.Connection, func(s rely.Stats, req *http.Request) error {
		return authHooks.OnConnection(s, req)
	})

	// OnConnect hook
	relay.Hooks.On.Connect = func(client rely.Client) {
		authHooks.OnConnect(client)
	}

	// OnAuth hook
	relay.Hooks.On.Auth = func(client rely.Client) {
		if err := authHooks.OnAuth(client); err != nil {
			logger.Warn().
				Err(err).
				Msg("Authentication rejected by plugin")
			client.SendNotice(fmt.Sprintf("Authentication failed: %v", err))
			client.Disconnect()
		}
	}

	// OnDisconnect hook
	relay.Hooks.On.Disconnect = func(client rely.Client) {
		logger.Debug().
			Msg("Client disconnected")
	}

	// RejectReq hook
	relay.Hooks.Reject.Req = append(relay.Hooks.Reject.Req, func(client rely.Client, filters nostr.Filters) error {
		return authHooks.RejectReq(client, filters)
	})

	// RejectEvent hook - check authentication, rate limiting, and validation
	relay.Hooks.Reject.Event = append(relay.Hooks.Reject.Event, func(client rely.Client, event *nostr.Event) error {
		// Check plugin rejection first
		if err := authHooks.RejectEvent(client, event); err != nil {
			logger.Warn().
				Str("event_id", event.ID).
				Int("kind", event.Kind).
				Err(err).
				Msg("Event REJECTED by auth plugin")
			return err
		}

		// Check rate limiting (skip for authorized pubkeys)
		isAuthorized := authHooks.IsAuthorized(event.PubKey)
		if !isAuthorized {
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer cancel()

			if !rateLimiter.Allow(ctx, event.PubKey, event.Kind) {
				logger.Warn().
					Str("event_id", event.ID).
					Str("pubkey", event.PubKey).
					Int("kind", event.Kind).
					Int("limit", rateLimiter.GetLimit(event.Kind)).
					Msg("Event REJECTED - rate limit exceeded")
				return fmt.Errorf("rate limit exceeded for event kind %d", event.Kind)
			}
		}

		// Validate event (shared validation - not plugin-based)
		validationResult := validation.ValidateEvent(event)
		if !validationResult.Valid {
			logger.Warn().
				Str("event_id", event.ID).
				Str("pubkey", event.PubKey).
				Int("kind", event.Kind).
				Str("reason", validationResult.Message).
				Msg("Event REJECTED - validation failed")
			return fmt.Errorf("validation failed: %s", validationResult.Message)
		}

		return nil
	})

	// OnEvent hook - handle event storage and lifecycle hooks
	relay.Hooks.On.Event = func(client rely.Client, event *nostr.Event) error {
		logger.Info().
			Str("event_id", event.ID).
			Str("pubkey", event.PubKey).
			Int("kind", event.Kind).
			Int64("created_at", int64(event.CreatedAt)).
			Msg("Processing event")

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		// Handle deletion events (kind 5)
		if event.Kind == 5 {
			logger.Info().
				Str("event_id", event.ID).
				Str("pubkey", event.PubKey).
				Msg("Received event deletion request")
			err := eventStorage.DeleteEvent(ctx, event.ID)
			if err != nil {
				logger.Error().
					Str("event_id", event.ID).
					Err(err).
					Msg("Failed to delete event")
				return err
			}
			logger.Info().
				Str("event_id", event.ID).
				Msg("Event deleted successfully")
			return nil
		}

		// Call ATTN lifecycle hooks before storing
		if err := callBeforeATTNHooks(ctx, attnHooks, event); err != nil {
			logger.Warn().
				Str("event_id", event.ID).
				Int("kind", event.Kind).
				Err(err).
				Msg("Before hook rejected event")
			return err
		}

		// Store event
		if err := eventStorage.StoreEvent(ctx, event); err != nil {
			if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
				logger.Warn().
					Str("event_id", event.ID).
					Msg("Context timeout/canceled during event storage")
				return fmt.Errorf("operation timeout")
			}
			logger.Error().
				Str("event_id", event.ID).
				Err(err).
				Msg("Failed to store event")
			return err
		}

		// Call ATTN lifecycle hooks after storing
		if err := callAfterATTNHooks(ctx, attnHooks, event); err != nil {
			logger.Warn().
				Str("event_id", event.ID).
				Int("kind", event.Kind).
				Err(err).
				Msg("After hook error (event already stored)")
			// Don't fail the operation if after hook fails
		}

		logger.Info().
			Str("event_id", event.ID).
			Int("kind", event.Kind).
			Msg("Event stored successfully")

		return nil
	})

	// OnReq hook - handle queries
	relay.Hooks.On.Req = func(client rely.Client, filters nostr.Filters) {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		// Query events from storage
		events, err := eventStorage.QueryEvents(ctx, &filters[0])
		if err != nil {
			logger.Error().
				Err(err).
				Msg("Failed to query events")
			client.SendNotice("Query failed")
			return
		}

		// Send events to client
		for _, event := range events {
			client.SendEvent(event)
		}

		client.SendEOSE()
	}
}

// callBeforeATTNHooks calls the appropriate Before hook based on event kind.
func callBeforeATTNHooks(ctx context.Context, hooks plugin.ATTNHooks, event *nostr.Event) error {
	switch event.Kind {
	case 38088:
		return hooks.BeforeBlockEvent(ctx, event)
	case 38188:
		return hooks.BeforeMarketplaceEvent(ctx, event)
	case 38288:
		return hooks.BeforeBillboardEvent(ctx, event)
	case 38388:
		return hooks.BeforePromotionEvent(ctx, event)
	case 38488:
		return hooks.BeforeAttentionEvent(ctx, event)
	case 38588:
		return hooks.BeforeBillboardConfirmationEvent(ctx, event)
	case 38688:
		return hooks.BeforeAttentionConfirmationEvent(ctx, event)
	case 38788:
		return hooks.BeforeMarketplaceConfirmationEvent(ctx, event)
	case 38888:
		return hooks.BeforeMatchEvent(ctx, event)
	case 38988:
		return hooks.BeforeAttentionPaymentConfirmationEvent(ctx, event)
	default:
		return nil // No hook for this kind
	}
}

// callAfterATTNHooks calls the appropriate After hook based on event kind.
func callAfterATTNHooks(ctx context.Context, hooks plugin.ATTNHooks, event *nostr.Event) error {
	switch event.Kind {
	case 38088:
		return hooks.AfterBlockEvent(ctx, event)
	case 38188:
		return hooks.AfterMarketplaceEvent(ctx, event)
	case 38288:
		return hooks.AfterBillboardEvent(ctx, event)
	case 38388:
		return hooks.AfterPromotionEvent(ctx, event)
	case 38488:
		return hooks.AfterAttentionEvent(ctx, event)
	case 38588:
		return hooks.AfterBillboardConfirmationEvent(ctx, event)
	case 38688:
		return hooks.AfterAttentionConfirmationEvent(ctx, event)
	case 38788:
		return hooks.AfterMarketplaceConfirmationEvent(ctx, event)
	case 38888:
		return hooks.AfterMatchEvent(ctx, event)
	case 38988:
		return hooks.AfterAttentionPaymentConfirmationEvent(ctx, event)
	default:
		return nil // No hook for this kind
	}
}

