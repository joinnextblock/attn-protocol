/**
 * Hook type definitions for the ATTN Framework.
 *
 * This module defines all context types passed to hook handlers during
 * event processing. Each hook receives typed context data that implementations
 * can use to react to ATTN Protocol events.
 *
 * @module
 */

import type { Event } from 'nostr-tools';
import type { BlockHeight, Pubkey, EventId } from '@attn-protocol/core';

export type { BlockHeight, Pubkey, EventId };

/**
 * Base hook context passed to all hook handlers.
 *
 * All specific context types extend this interface.
 */
export interface HookContext {
  /** Unix timestamp when the hook was triggered */
  timestamp?: number;
  /** Additional context data */
  [key: string]: unknown;
}

/**
 * Hook handler function signature.
 *
 * Handlers can be sync or async. Errors are caught and logged
 * without stopping other handlers.
 *
 * @typeParam T - The specific context type for this hook
 *
 * @example
 * ```ts
 * const handler: HookHandler<PromotionEventContext> = async (ctx) => {
 *   console.log('Received promotion:', ctx.event_id);
 * };
 * ```
 */
export type HookHandler<T extends HookContext = HookContext> = (context: T) => Promise<void> | void;

/**
 * Handler for before_* lifecycle hooks.
 * Called before the main event processing.
 */
export type BeforeHookHandler<T extends HookContext = HookContext> = HookHandler<T>;

/**
 * Handler for after_* lifecycle hooks.
 * Called after the main event processing completes.
 */
export type AfterHookHandler<T extends HookContext = HookContext> = HookHandler<T>;

/**
 * Handle returned when registering a hook handler.
 *
 * Use the `unregister` method to remove the handler.
 *
 * @example
 * ```ts
 * const handle = attn.on_promotion_event(handler);
 * // Later, to remove the handler:
 * handle.unregister();
 * ```
 */
export interface HookHandle {
  /** Remove this handler from the hook */
  unregister: () => void;
}

/**
 * Context for relay connection events.
 *
 * Emitted when a WebSocket connection to a relay is established.
 */
export interface RelayConnectContext extends HookContext {
  /** WebSocket URL of the connected relay */
  relay_url: string;
}

/**
 * Context for relay disconnection events.
 *
 * Emitted when a WebSocket connection to a relay is closed.
 */
export interface RelayDisconnectContext extends HookContext {
  /** WebSocket URL of the disconnected relay */
  relay_url: string;
  /** Human-readable reason for disconnection */
  reason?: string;
  /** Error that caused the disconnection, if any */
  error?: Error;
}

/**
 * Context for subscription events.
 *
 * Emitted when subscriptions are created or confirmed (EOSE received).
 */
export interface SubscriptionContext extends HookContext {
  /** WebSocket URL of the relay */
  relay_url: string;
  /** Unique subscription identifier */
  subscription_id: string;
  /** Nostr filter used for this subscription */
  filter: {
    /** Event kinds to subscribe to */
    kinds: number[];
    /** Optional author pubkeys to filter by */
    authors?: string[];
    /** Additional filter parameters */
    [key: string]: unknown;
  };
  /**
   * Subscription status:
   * - 'subscribed': REQ message sent to relay
   * - 'confirmed': EOSE (End of Stored Events) received
   */
  status: 'subscribed' | 'confirmed';
}

/**
 * Context for marketplace events (kind 38188).
 *
 * Contains parsed marketplace configuration and the raw Nostr event.
 */
export interface MarketplaceEventContext extends HookContext {
  /** Unique event ID */
  event_id: EventId;
  /** Marketplace operator's public key */
  pubkey: Pubkey;
  /** Parsed marketplace configuration from event content */
  marketplace_data: unknown;
  /** Raw Nostr event */
  event: Event;
}

/**
 * Context for billboard events (kind 38288).
 *
 * Contains parsed billboard data and the raw Nostr event.
 */
export interface BillboardEventContext extends HookContext {
  /** Unique event ID */
  event_id: EventId;
  /** Billboard owner's public key */
  pubkey: Pubkey;
  /** Parsed billboard data from event content */
  billboard_data: unknown;
  /** Raw Nostr event */
  event: Event;
}

/**
 * Context for promotion events (kind 38388).
 *
 * Contains parsed promotion offer data and the raw Nostr event.
 */
export interface PromotionEventContext extends HookContext {
  /** Unique event ID */
  event_id: EventId;
  /** Promoter's public key */
  pubkey: Pubkey;
  /** Parsed promotion data (bid, duration, content, etc.) */
  promotion_data: unknown;
  /** Raw Nostr event */
  event: Event;
}

/**
 * Context for attention events (kind 38488).
 *
 * Contains parsed attention offer data and the raw Nostr event.
 */
export interface AttentionEventContext extends HookContext {
  /** Unique event ID */
  event_id: EventId;
  /** Viewer's public key */
  pubkey: Pubkey;
  /** Parsed attention data (ask, duration constraints, etc.) */
  attention_data: unknown;
  /** Raw Nostr event */
  event: Event;
}

/**
 * Context for match events (kind 38888).
 *
 * Contains parsed match data linking promotion and attention.
 */
export interface MatchEventContext extends HookContext {
  /** Unique event ID */
  event_id: EventId;
  /** Marketplace's public key (match publisher) */
  pubkey: Pubkey;
  /** Parsed match data (linked promotion, attention, terms) */
  match_data: unknown;
  /** Raw Nostr event */
  event: Event;
}

/**
 * Context for match published events.
 *
 * Emitted after a match event is successfully published.
 * Use this to track published matches and trigger downstream actions.
 */
export interface MatchPublishedContext extends HookContext {
  /** ID of the published match event */
  match_event_id: EventId;
  /** Parsed match data */
  match_data: unknown;
  /** Raw Nostr event */
  event: Event;
}

/**
 * Context for billboard confirmation events (kind 38588).
 *
 * Confirms that a billboard displayed the promoted content.
 */
export interface BillboardConfirmationEventContext extends HookContext {
  /** Unique event ID */
  event_id: EventId;
  /** Billboard's public key */
  pubkey: Pubkey;
  /** Parsed confirmation data (display proof, block, price) */
  confirmation_data: unknown;
  /** Raw Nostr event */
  event: Event;
}

/**
 * Context for attention confirmation events (kind 38688).
 *
 * Confirms that a viewer consumed the promoted content.
 */
export interface AttentionConfirmationEventContext extends HookContext {
  /** Unique event ID */
  event_id: EventId;
  /** Viewer's public key */
  pubkey: Pubkey;
  /** Parsed confirmation data (view proof, sats delivered) */
  confirmation_data: unknown;
  /** Raw Nostr event */
  event: Event;
}

/**
 * Context for marketplace confirmation events (kind 38788).
 *
 * Final settlement confirmation from the marketplace.
 */
export interface MarketplaceConfirmationEventContext extends HookContext {
  /** Unique event ID */
  event_id: EventId;
  /** Marketplace's public key */
  pubkey: Pubkey;
  /** Parsed settlement data (final price, payout breakdown) */
  settlement_data: unknown;
  /** Raw Nostr event */
  event: Event;
}

/**
 * Context for attention payment confirmation events (kind 38988).
 *
 * Confirms Lightning payment was made to the viewer.
 */
export interface AttentionPaymentConfirmationEventContext extends HookContext {
  /** Unique event ID */
  event_id: EventId;
  /** Payer's public key */
  pubkey: Pubkey;
  /** Parsed payment data (amount, payment proof) */
  payment_data: unknown;
  /** Raw Nostr event */
  event: Event;
}

/**
 * Bitcoin block data from node service.
 *
 * Contains block header information and optional statistics.
 */
export interface BlockData {
  /** Bitcoin block height */
  height: BlockHeight;
  /** Block hash (hex string) */
  hash?: string;
  /** Block timestamp (Unix seconds) */
  time?: number;
  /** Mining difficulty */
  difficulty?: string;
  /** Number of transactions in the block */
  tx_count?: number;
  /** Block size in bytes */
  size?: number;
  /** Block weight (for segwit) */
  weight?: number;
  /** Block version */
  version?: number;
  /** Merkle root hash */
  merkle_root?: string;
  /** Block nonce */
  nonce?: number;
  /** Public key of the node service that published this */
  node_pubkey?: string;
}

/**
 * Context for block events (kind 38088).
 *
 * Emitted when a new Bitcoin block is received from a trusted node.
 * Use this for Bitcoin-synchronized processing.
 */
export interface BlockEventContext extends HookContext {
  /** Bitcoin block height */
  block_height: BlockHeight;
  /** Block hash (hex string) */
  block_hash?: string;
  /** Block timestamp (Unix seconds) */
  block_time?: number;
  /** Full block data if available */
  block_data?: BlockData;
  /** Raw Nostr event if available */
  event?: Event;
  /** Relay URL that delivered this event */
  relay_url?: string;
}

/**
 * Context for block gap detection events.
 *
 * Emitted when a gap in block sequence is detected,
 * indicating possible network issues or missed blocks.
 */
export interface BlockGapDetectedContext extends HookContext {
  /** Expected next block height */
  expected_height: BlockHeight;
  /** Actual block height received */
  actual_height: BlockHeight;
  /** Number of blocks missing */
  gap_size: number;
}

/**
 * Context for rate limit events.
 *
 * Emitted when a relay enforces rate limiting.
 */
export interface RateLimitContext extends HookContext {
  /** Relay URL that is rate limiting */
  relay_url?: string;
  /** Type of rate limit (e.g., 'events', 'subscriptions') */
  limit_type: string;
  /** Seconds until rate limit resets */
  retry_after?: number;
}

/**
 * Context for health change events.
 *
 * Emitted when overall connection health status changes.
 */
export interface HealthChangeContext extends HookContext {
  /** Current health status */
  health_status: 'healthy' | 'degraded' | 'unhealthy';
  /** Previous health status */
  previous_status?: 'healthy' | 'degraded' | 'unhealthy';
  /** Reason for the status change */
  reason?: string;
}

/**
 * Result of publishing a single event to a relay.
 */
export interface PublishResult {
  /** ID of the published event */
  event_id: string;
  /** Relay URL the event was published to */
  relay_url: string;
  /** Whether the publish was successful */
  success: boolean;
  /** Error message if publish failed */
  error?: string;
}

/**
 * Context for profile published events.
 *
 * Emitted after kind 0 (profile), kind 10002 (relay list), and optionally
 * kind 3 (follow list) are published on connect.
 */
export interface ProfilePublishedContext extends HookContext {
  /** Event ID of the published profile (kind 0) */
  profile_event_id?: string;
  /** Event ID of the published relay list (kind 10002) */
  relay_list_event_id?: string;
  /** Event ID of the published follow list (kind 3), if configured */
  follow_list_event_id?: string;
  /** Individual results from each relay */
  results: PublishResult[];
  /** Number of successful publishes */
  success_count: number;
  /** Number of failed publishes */
  failure_count: number;
}

/**
 * Context for profile events (kind 0).
 *
 * Received when a user's profile metadata is updated.
 */
export interface ProfileEventContext extends HookContext {
  /** Unique event ID */
  event_id: EventId;
  /** Profile owner's public key */
  pubkey: Pubkey;
  /** Parsed profile data (name, about, picture, etc.) */
  profile_data: unknown;
  /** Raw Nostr event */
  event: Event;
}

/**
 * Context for relay list events (kind 10002, NIP-65).
 *
 * Received when a user's preferred relay list is updated.
 */
export interface RelayListEventContext extends HookContext {
  /** Unique event ID */
  event_id: EventId;
  /** User's public key */
  pubkey: Pubkey;
  /** Parsed relay list data */
  relay_list_data: unknown;
  /** Raw Nostr event */
  event: Event;
}

/**
 * Context for NIP-51 list events (kind 30000).
 *
 * Used for trusted billboards, trusted marketplaces,
 * blocked promotions, and blocked promoters lists.
 */
export interface Nip51ListEventContext extends HookContext {
  /** Unique event ID */
  event_id: EventId;
  /** List owner's public key */
  pubkey: Pubkey;
  /** Parsed list data (list type determined by d-tag) */
  list_data: unknown;
  /** Raw Nostr event */
  event: Event;
}
