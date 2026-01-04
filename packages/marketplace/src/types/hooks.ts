/**
 * Hook context and result types for the ATTN Marketplace.
 *
 * These types define the data structures passed to hook handlers
 * for storing events, querying data, and managing the matching lifecycle.
 *
 * @module
 */

import type { Event } from 'nostr-tools';
import type {
  BlockHeight,
  Pubkey,
  EventId,
  PromotionData,
  AttentionData,
  BillboardData,
  MatchData,
  MarketplaceData,
  BillboardConfirmationData,
  AttentionConfirmationData,
  MarketplaceConfirmationData,
  AttentionPaymentConfirmationData,
} from '@attn/ts-core';

/**
 * Generic context for storing ATTN Protocol events.
 *
 * @typeParam T - The parsed event content type
 */
export interface StoreEventContext<T> {
  /** The raw Nostr event */
  event: Event;
  /** Parsed event content */
  data: T;
  /** Bitcoin block height from t tag */
  block_height: BlockHeight;
  /** Event identifier from d tag */
  d_tag: string;
  /** Full event coordinate (kind:pubkey:d_tag) */
  coordinate: string;
}

// ═══════════════════════════════════════════════════════════════
// STORAGE HOOK CONTEXTS
// ═══════════════════════════════════════════════════════════════

/** Context for storing billboard events (kind 38288) */
export type StoreBillboardContext = StoreEventContext<BillboardData>;

/** Context for storing promotion events (kind 38388) */
export type StorePromotionContext = StoreEventContext<PromotionData>;

/** Context for storing attention events (kind 38488) */
export type StoreAttentionContext = StoreEventContext<AttentionData>;

/** Context for storing match events (kind 38888) */
export type StoreMatchContext = StoreEventContext<MatchData>;

/** Context for storing marketplace events (kind 38188) */
export type StoreMarketplaceContext = StoreEventContext<MarketplaceData>;

/** Context for storing billboard confirmation events (kind 38588) */
export type StoreBillboardConfirmationContext = StoreEventContext<BillboardConfirmationData>;

/** Context for storing attention confirmation events (kind 38688) */
export type StoreAttentionConfirmationContext = StoreEventContext<AttentionConfirmationData>;

/** Context for storing marketplace confirmation events (kind 38788) */
export type StoreMarketplaceConfirmationContext = StoreEventContext<MarketplaceConfirmationData>;

/** Context for storing attention payment confirmation events (kind 38988) */
export type StoreAttentionPaymentConfirmationContext = StoreEventContext<AttentionPaymentConfirmationData>;

// ═══════════════════════════════════════════════════════════════
// QUERY HOOK CONTEXTS
// ═══════════════════════════════════════════════════════════════

/**
 * Context for querying active promotions.
 *
 * Used by the `query_promotions` hook to find promotions
 * that could match with an incoming attention offer.
 */
export interface QueryPromotionsContext {
  /** Marketplace coordinate to filter by */
  marketplace_coordinate: string;
  /** Minimum bid in satoshis (attention's ask price) */
  min_bid?: number;
  /** Minimum duration in milliseconds */
  min_duration?: number;
  /** Maximum duration in milliseconds */
  max_duration?: number;
  /** Pubkeys to exclude (e.g., blocked promoters) */
  exclude_pubkeys?: Pubkey[];
  /** Current block height */
  block_height: BlockHeight;
}

/**
 * Result from querying promotions.
 */
export interface QueryPromotionsResult {
  /** Array of matching promotions */
  promotions: Array<{
    /** Raw Nostr event */
    event: Event;
    /** Parsed promotion data */
    data: PromotionData;
    /** Event coordinate */
    coordinate: string;
  }>;
}

/**
 * Context for querying active attention offers.
 *
 * Used by the `query_attention` hook to find attention offers
 * that could match with an incoming promotion.
 */
export interface QueryAttentionContext {
  /** Marketplace coordinate to filter by */
  marketplace_coordinate: string;
  /** Maximum ask price in satoshis (promotion's bid) */
  max_ask?: number;
  /** Duration to match */
  duration?: number;
  /** Current block height */
  block_height: BlockHeight;
}

/**
 * Result from querying attention offers.
 */
export interface QueryAttentionResult {
  /** Array of matching attention offers */
  attention: Array<{
    /** Raw Nostr event */
    event: Event;
    /** Parsed attention data */
    data: AttentionData;
    /** Event coordinate */
    coordinate: string;
  }>;
}

// ═══════════════════════════════════════════════════════════════
// EXISTS HOOK CONTEXTS
// ═══════════════════════════════════════════════════════════════

/**
 * Context for checking if an event has been processed.
 *
 * Used by the `exists` hook for deduplication.
 */
export interface ExistsContext {
  /** Event ID to check */
  event_id: EventId;
  /** Type of event */
  event_type: 'billboard' | 'promotion' | 'attention' | 'match' | 'marketplace' |
              'billboard_confirmation' | 'attention_confirmation' |
              'marketplace_confirmation' | 'attention_payment_confirmation';
}

/**
 * Result from checking if an event exists.
 */
export interface ExistsResult {
  /** Whether the event has already been processed */
  exists: boolean;
}

// ═══════════════════════════════════════════════════════════════
// MATCHING HOOK CONTEXTS
// ═══════════════════════════════════════════════════════════════

/**
 * A candidate for matching - a promotion/attention pair.
 *
 * Passed to the `find_matches` hook for the matching algorithm.
 */
export interface MatchCandidate {
  /** Promotion event */
  promotion_event: Event;
  /** Parsed promotion data */
  promotion_data: PromotionData;
  /** Promotion coordinate */
  promotion_coordinate: string;
  /** Attention event */
  attention_event: Event;
  /** Parsed attention data */
  attention_data: AttentionData;
  /** Attention coordinate */
  attention_coordinate: string;
}

/**
 * Context for the matching algorithm.
 *
 * Used by the `find_matches` hook to select which candidates to match.
 */
export interface FindMatchesContext {
  /** What triggered this matching run */
  trigger: 'attention' | 'promotion' | 'block';
  /** The attention event (if triggered by attention) */
  attention_event?: Event;
  /** Parsed attention data */
  attention_data?: AttentionData;
  /** The promotion event (if triggered by promotion) */
  promotion_event?: Event;
  /** Parsed promotion data */
  promotion_data?: PromotionData;
  /** List of candidate pairs to consider */
  candidates: MatchCandidate[];
  /** Current block height */
  block_height: BlockHeight;
}

/**
 * Result from the matching algorithm.
 */
export interface FindMatchesResult {
  /** Selected matches to create */
  matches: MatchCandidate[];
}

/**
 * Context before creating a match event.
 *
 * Used by `before_create_match` hook for validation/filtering.
 */
export interface BeforeCreateMatchContext {
  /** Promotion event */
  promotion_event: Event;
  /** Parsed promotion data */
  promotion_data: PromotionData;
  /** Attention event */
  attention_event: Event;
  /** Parsed attention data */
  attention_data: AttentionData;
  /** Current block height */
  block_height: BlockHeight;
}

/**
 * Result from before_create_match hook.
 */
export interface BeforeCreateMatchResult {
  /** Whether to proceed with creating the match */
  proceed: boolean;
  /** Reason if not proceeding */
  reason?: string;
}

/**
 * Context after a match event is created.
 *
 * Used by `after_create_match` hook for post-processing.
 */
export interface AfterCreateMatchContext {
  /** The created match event */
  match_event: Event;
  /** Parsed match data */
  match_data: MatchData;
  /** Original promotion event */
  promotion_event: Event;
  /** Original attention event */
  attention_event: Event;
  /** Current block height */
  block_height: BlockHeight;
}

// ═══════════════════════════════════════════════════════════════
// PUBLISHING HOOK CONTEXTS
// ═══════════════════════════════════════════════════════════════

/**
 * Context before publishing a match event.
 *
 * Used by `before_publish_match` to modify or cancel publishing.
 */
export interface BeforePublishMatchContext {
  /** Match event to publish */
  match_event: Event;
  /** Original promotion event */
  promotion_event: Event;
  /** Original attention event */
  attention_event: Event;
  /** Relay URLs to publish to */
  relay_urls: string[];
}

/**
 * Result from before_publish_match hook.
 */
export interface BeforePublishMatchResult {
  /** Whether to proceed with publishing */
  proceed: boolean;
  /** Optionally modified event */
  modified_event?: Event;
  /** Optionally modified relay URLs */
  relay_urls?: string[];
}

/**
 * Result of publishing to a single relay.
 */
export interface PublishResultItem {
  /** Relay URL */
  relay_url: string;
  /** Whether publish succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Context after publishing a match event.
 *
 * Used by `after_publish_match` for logging/notifications.
 */
export interface AfterPublishMatchContext {
  /** The published match event */
  match_event: Event;
  /** Results from each relay */
  publish_results: PublishResultItem[];
}

/**
 * Context before publishing a marketplace event.
 *
 * Used by `before_publish_marketplace` to modify or cancel publishing.
 */
export interface BeforePublishMarketplaceContext {
  /** Marketplace event to publish */
  marketplace_event: Event;
  /** Current block height */
  block_height: BlockHeight;
  /** Current aggregate counts */
  aggregates?: AggregatesResult;
}

/**
 * Result from before_publish_marketplace hook.
 */
export interface BeforePublishMarketplaceResult {
  /** Whether to proceed with publishing */
  proceed: boolean;
  /** Optionally modified event */
  modified_event?: Event;
}

/**
 * Context after publishing a marketplace event.
 *
 * Used by `after_publish_marketplace` for logging.
 */
export interface AfterPublishMarketplaceContext {
  /** The published marketplace event */
  marketplace_event: Event;
  /** Results from each relay */
  publish_results: PublishResultItem[];
}

// ═══════════════════════════════════════════════════════════════
// CONFIRMATION HOOK CONTEXTS
// ═══════════════════════════════════════════════════════════════

/**
 * Context when a billboard confirmation is received.
 *
 * Used by `on_billboard_confirmation` hook.
 */
export interface OnBillboardConfirmationContext {
  /** Confirmation event */
  event: Event;
  /** Parsed confirmation data */
  data: BillboardConfirmationData;
  /** Block height from event */
  block_height: BlockHeight;
}

/**
 * Context when an attention confirmation is received.
 *
 * Used by `on_attention_confirmation` hook.
 */
export interface OnAttentionConfirmationContext {
  /** Confirmation event */
  event: Event;
  /** Parsed confirmation data */
  data: AttentionConfirmationData;
  /** Block height from event */
  block_height: BlockHeight;
}

/**
 * Context before publishing a marketplace confirmation.
 *
 * Used by `before_publish_marketplace_confirmation` hook.
 */
export interface BeforePublishMarketplaceConfirmationContext {
  /** Billboard confirmation that triggered this */
  billboard_confirmation_event: Event;
  /** Attention confirmation that triggered this */
  attention_confirmation_event: Event;
  /** The original match event */
  match_event: Event;
  /** Current block height */
  block_height: BlockHeight;
}

/**
 * Result from before_publish_marketplace_confirmation hook.
 */
export interface BeforePublishMarketplaceConfirmationResult {
  /** Whether to proceed with publishing */
  proceed: boolean;
  /** Reason if not proceeding */
  reason?: string;
}

/**
 * Context after publishing a marketplace confirmation.
 *
 * Used by `after_publish_marketplace_confirmation` hook.
 */
export interface AfterPublishMarketplaceConfirmationContext {
  /** The published confirmation event */
  marketplace_confirmation_event: Event;
  /** Results from each relay */
  publish_results: PublishResultItem[];
}

/**
 * Context when an attention payment confirmation is received.
 *
 * Used by `on_attention_payment_confirmation` hook.
 */
export interface OnAttentionPaymentConfirmationContext {
  /** Payment confirmation event */
  event: Event;
  /** Parsed payment data */
  data: AttentionPaymentConfirmationData;
  /** Block height from event */
  block_height: BlockHeight;
}

// ═══════════════════════════════════════════════════════════════
// AGGREGATES HOOK CONTEXTS
// ═══════════════════════════════════════════════════════════════

/**
 * Context for getting aggregate counts.
 *
 * Used by `get_aggregates` hook for marketplace event publishing.
 */
export interface AggregatesContext {
  /** Current block height */
  block_height: BlockHeight;
}

/**
 * Result from get_aggregates hook.
 *
 * Provides counts for the marketplace event.
 */
export interface AggregatesResult {
  /** Number of active billboards */
  billboard_count: number;
  /** Number of active promotions */
  promotion_count: number;
  /** Number of active attention offers */
  attention_count: number;
  /** Number of matches made */
  match_count: number;
  /** Additional custom aggregates */
  [key: string]: unknown;
}

// ═══════════════════════════════════════════════════════════════
// BLOCK BOUNDARY HOOK CONTEXTS
// ═══════════════════════════════════════════════════════════════

/**
 * Context for block boundary events.
 *
 * Used by `block_boundary` hook for cleanup/maintenance.
 */
export interface BlockBoundaryContext {
  /** New block height */
  block_height: BlockHeight;
  /** Block hash if available */
  block_hash?: string;
  /** Previous block height */
  previous_block_height?: BlockHeight;
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION HOOK CONTEXTS
// ═══════════════════════════════════════════════════════════════

/**
 * Context for validating a promotion event.
 *
 * Used by `validate_promotion` hook.
 */
export interface ValidatePromotionContext {
  /** Promotion event to validate */
  event: Event;
  /** Parsed promotion data */
  data: PromotionData;
  /** Block height from event */
  block_height: BlockHeight;
}

/**
 * Context for validating an attention event.
 *
 * Used by `validate_attention` hook.
 */
export interface ValidateAttentionContext {
  /** Attention event to validate */
  event: Event;
  /** Parsed attention data */
  data: AttentionData;
  /** Block height from event */
  block_height: BlockHeight;
}

/**
 * Result from validation hooks.
 */
export interface ValidationResult {
  /** Whether the event is valid */
  valid: boolean;
  /** Reason if invalid */
  reason?: string;
}
