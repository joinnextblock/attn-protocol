/**
 * Core type definitions for ATTN Protocol
 * @module
 */

/**
 * Bitcoin block height as a positive integer.
 * Used throughout ATTN Protocol for time-based coordination.
 *
 * @example
 * ```ts
 * const current_height: BlockHeight = 870000;
 * ```
 */
export type BlockHeight = number;

/**
 * Nostr public key as a 64-character hex string.
 *
 * @example
 * ```ts
 * const pubkey: Pubkey = "abc123..."; // 64 hex chars
 * ```
 */
export type Pubkey = string;

/**
 * Nostr event ID as a 64-character hex string (SHA-256 hash).
 *
 * @example
 * ```ts
 * const event_id: EventId = "def456..."; // 64 hex chars
 * ```
 */
export type EventId = string;

/**
 * WebSocket URL for a Nostr relay.
 *
 * @example
 * ```ts
 * const relay: RelayUrl = "wss://relay.example.com";
 * ```
 */
export type RelayUrl = string;

/**
 * City Protocol block reference.
 * ATTN Protocol events reference City Protocol block events for timing.
 */
export interface CityBlockReference {
  /** City clock pubkey that published the block event */
  ref_clock_pubkey?: string;
  /** City Protocol block identifier: org.cityprotocol:block:<height>:<hash> */
  ref_block_id?: string;
}

/**
 * Parsed event content types
 * These represent the JSON content structure of received ATTN Protocol events
 * (vs SDK's *EventParams which are for creating events)
 */

/**
 * City Protocol BLOCK event content (kind 38808)
 * Block events are now published by City Protocol, not ATTN Protocol.
 * This interface is provided for parsing block events from City Protocol.
 *
 * @see https://github.com/joinnextblock/city-protocol
 */
export interface CityBlockData {
  block_height: number;
  block_hash: string;
  block_time: number;
  previous_hash: string;
  difficulty?: string;
  tx_count?: number;
  size?: number;
  weight?: number;
  version?: number;
  merkle_root?: string;
  nonce?: number;
  ref_clock_pubkey?: string;
  ref_block_id?: string;
}

/**
 * @deprecated Use CityBlockData instead. Block events are now published by City Protocol.
 */
export interface BlockData {
  height: number;
  hash: string;
  time?: number;
  difficulty?: string;
  tx_count?: number;
  size?: number;
  weight?: number;
  version?: number;
  merkle_root?: string;
  nonce?: number;
  /** @deprecated Use ref_clock_pubkey instead */
  ref_node_pubkey?: string;
  ref_clock_pubkey?: string;
  ref_block_id?: string;
}

/**
 * MARKETPLACE event content (kind 38188)
 */
export interface MarketplaceData extends CityBlockReference {
  name?: string;
  description?: string;
  admin_pubkey?: string;
  min_duration?: number;
  max_duration?: number;
  match_fee_sats?: number;
  confirmation_fee_sats?: number;
  ref_marketplace_pubkey?: string;
  ref_marketplace_id?: string;
  /** @deprecated Use ref_clock_pubkey from CityBlockReference instead */
  ref_node_pubkey?: string;
  billboard_count?: number;
  promotion_count?: number;
  attention_count?: number;
  match_count?: number;
}

/**
 * BILLBOARD event content (kind 38288)
 */
export interface BillboardData {
  name?: string;
  description?: string;
  confirmation_fee_sats?: number;
  ref_billboard_pubkey?: string;
  ref_billboard_id?: string;
  ref_marketplace_pubkey?: string;
  ref_marketplace_id?: string;
}

/**
 * PROMOTION event content (kind 38388)
 */
export interface PromotionData {
  duration?: number;
  bid?: number;
  event_id?: string;
  call_to_action?: string;
  call_to_action_url?: string;
  escrow_id_list?: string[];
  ref_promotion_pubkey?: string;
  ref_promotion_id?: string;
  ref_marketplace_pubkey?: string;
  ref_marketplace_id?: string;
  ref_billboard_pubkey?: string;
  ref_billboard_id?: string;
}

/**
 * ATTENTION event content (kind 38488)
 */
export interface AttentionData {
  ask?: number;
  min_duration?: number;
  max_duration?: number;
  blocked_promotions_id?: string;
  blocked_promoters_id?: string;
  trusted_marketplaces_id?: string;
  trusted_billboards_id?: string;
  ref_attention_pubkey?: string;
  ref_attention_id?: string;
  ref_marketplace_pubkey?: string;
  ref_marketplace_id?: string;
}

/**
 * MATCH event content (kind 38888)
 * Per ATTN-01, MATCH events contain ONLY ref_* fields.
 * Values like ask, bid, duration are calculated at ingestion by fetching referenced events.
 */
export interface MatchData {
  ref_match_id?: string;
  ref_marketplace_id?: string;
  ref_billboard_id?: string;
  ref_promotion_id?: string;
  ref_attention_id?: string;
  ref_marketplace_pubkey?: string;
  ref_promotion_pubkey?: string;
  ref_attention_pubkey?: string;
  ref_billboard_pubkey?: string;
}

/**
 * BILLBOARD_CONFIRMATION event content (kind 38588)
 * Per ATTN-01, contains ONLY ref_* fields.
 */
export interface BillboardConfirmationData {
  ref_match_event_id?: string;
  ref_match_id?: string;
  ref_marketplace_pubkey?: string;
  ref_billboard_pubkey?: string;
  ref_promotion_pubkey?: string;
  ref_attention_pubkey?: string;
  ref_marketplace_id?: string;
  ref_billboard_id?: string;
  ref_promotion_id?: string;
  ref_attention_id?: string;
}

/**
 * ATTENTION_CONFIRMATION event content (kind 38688)
 * Per ATTN-01, contains ONLY ref_* fields.
 */
export interface AttentionConfirmationData {
  ref_match_event_id?: string;
  ref_match_id?: string;
  ref_marketplace_pubkey?: string;
  ref_billboard_pubkey?: string;
  ref_promotion_pubkey?: string;
  ref_attention_pubkey?: string;
  ref_marketplace_id?: string;
  ref_billboard_id?: string;
  ref_promotion_id?: string;
  ref_attention_id?: string;
}

/**
 * MARKETPLACE_CONFIRMATION event content (kind 38788)
 * Per ATTN-01, contains ONLY ref_* fields.
 */
export interface MarketplaceConfirmationData {
  ref_match_event_id?: string;
  ref_match_id?: string;
  ref_billboard_confirmation_event_id?: string;
  ref_attention_confirmation_event_id?: string;
  ref_marketplace_pubkey?: string;
  ref_billboard_pubkey?: string;
  ref_promotion_pubkey?: string;
  ref_attention_pubkey?: string;
  ref_marketplace_id?: string;
  ref_billboard_id?: string;
  ref_promotion_id?: string;
  ref_attention_id?: string;
}

/**
 * ATTENTION_PAYMENT_CONFIRMATION event content (kind 38988)
 * Per ATTN-01, contains sats_received, payment_proof, and ref_* fields.
 */
export interface AttentionPaymentConfirmationData {
  sats_received?: number;
  payment_proof?: string;
  ref_match_event_id?: string;
  ref_match_id?: string;
  ref_marketplace_confirmation_event_id?: string;
  ref_marketplace_pubkey?: string;
  ref_billboard_pubkey?: string;
  ref_promotion_pubkey?: string;
  ref_attention_pubkey?: string;
  ref_marketplace_id?: string;
  ref_billboard_id?: string;
  ref_promotion_id?: string;
  ref_attention_id?: string;
}
