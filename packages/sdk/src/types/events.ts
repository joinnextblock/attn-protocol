/**
 * Type definitions for ATTN Protocol event parameters
 */

import type { Event } from "nostr-tools";

/**
 * Base event parameters shared across all event types
 * block_height is required per ATTN-01: "Every event includes ["t", "<block_height>"] tag"
 */
export interface BaseEventParams {
  block_height: number; // Required per ATTN-01
  created_at?: number;
}

/**
 * BLOCK Event (kind 38088) parameters
 */
export interface BlockEventParams extends BaseEventParams {
  height: number;
  hash: string;
  time?: number; // Optional, informational only
  difficulty?: number | string;
  block_identifier?: string; // Optional, defaults to org.attnprotocol:block:<height>:<hash>
  tx_count?: number;
  size?: number;
  weight?: number;
  version?: number;
  merkle_root?: string | null;
  nonce?: number;
  node_pubkey?: string;
  relay_list?: string[]; // Relay URLs for r tags
}

/**
 * MARKETPLACE Event (kind 38188) parameters
 */
export interface MarketplaceEventParams extends BaseEventParams {
  name: string;
  description: string;
  kind_list: number[]; // Array of event kind numbers that can be promoted (tags only, NOT in content)
  relay_list: string[]; // Array of relay URLs (tags only, NOT in content)
  admin_pubkey: string; // Admin pubkey
  min_duration?: number; // Minimum duration in milliseconds (default: 15000)
  max_duration?: number; // Maximum duration in milliseconds (default: 60000)
  match_fee_sats?: number; // Match fee in satoshis (default: 0)
  confirmation_fee_sats?: number; // Confirmation fee in satoshis (default: 0)
  marketplace_id: string; // Marketplace identifier (required, used for d tag and content per ATTN-01.md)
  website_url?: string; // Website URL (for u tag, optional)
  marketplace_pubkey: string; // Marketplace pubkey (for content ref_marketplace_pubkey)
  // Block reference fields (required per ATTN-01)
  ref_node_pubkey: string; // Node pubkey that published the block event (required)
  ref_block_id: string; // Block event identifier (org.attnprotocol:block:<height>:<hash>) (required)
  block_coordinate: string; // Block coordinate: 38088:<node_pubkey>:org.attnprotocol:block:<height>:<hash> (required)
}

/**
 * BILLBOARD Event (kind 38288) parameters
 */
export interface BillboardEventParams extends BaseEventParams {
  billboard_id: string; // Billboard identifier (required, used for d tag and content per ATTN-01.md)
  name: string; // Billboard name (required)
  description?: string; // Billboard description (optional)
  confirmation_fee_sats?: number; // Confirmation fee in satoshis (default: 0)
  marketplace_coordinate: string; // Marketplace coordinate: 38188:<marketplace_pubkey>:org.attnprotocol:marketplace:<marketplace_id> (required)
  billboard_pubkey: string; // Billboard pubkey (required)
  marketplace_pubkey: string; // Marketplace pubkey (required)
  marketplace_id: string; // Marketplace identifier (for content ref_marketplace_id, from marketplace coordinate)
  relays: string[]; // Relay URLs (required, multiple allowed)
  kind: number; // Event kinds this billboard can display (required)
  url: string; // Billboard website URL (required)
}

/**
 * PROMOTION Event (kind 38388) parameters
 */
export interface PromotionEventParams extends BaseEventParams {
  promotion_id: string; // Promotion identifier (required, used for d tag and content per ATTN-01.md)
  duration: number; // Duration in milliseconds (required)
  bid: number; // Total bid in satoshis for the duration (required)
  event_id: string; // Event ID of the content being promoted (required)
  call_to_action: string; // CTA button text (required)
  call_to_action_url: string; // CTA button URL (required)
  escrow_id_list?: string[]; // Payment proof (opaque to protocol, default: [])
  marketplace_coordinate: string; // Marketplace coordinate: 38188:<marketplace_pubkey>:org.attnprotocol:marketplace:<marketplace_id> (required)
  video_coordinate: string; // Video coordinate: 34236:<video_author_pubkey>:<video_d_tag> (required)
  billboard_coordinate: string; // Billboard coordinate: 38288:<billboard_pubkey>:org.attnprotocol:billboard:<billboard_id> (required)
  marketplace_pubkey: string; // Marketplace pubkey (required)
  billboard_pubkey: string; // Billboard pubkey (required)
  promotion_pubkey: string; // Promotion pubkey (required)
  marketplace_id: string; // Marketplace identifier (for content ref_marketplace_id, from marketplace coordinate)
  billboard_id?: string; // Billboard identifier (for content ref_billboard_id, extracted from billboard_coordinate if not provided)
  relays: string[]; // Relay URLs (required, multiple allowed)
  kind: number; // Kind of event being promoted (required, default: 34236)
  url: string; // Promotion URL (required)
}

/**
 * ATTENTION Event (kind 38488) parameters
 */
export interface AttentionEventParams extends BaseEventParams {
  attention_id: string; // Attention identifier (required, used for d tag and content per ATTN-01.md)
  ask: number; // Total ask in satoshis for the duration (required)
  min_duration: number; // Minimum duration in milliseconds (required)
  max_duration: number; // Maximum duration in milliseconds (required)
  marketplace_coordinate: string; // Marketplace coordinate: 38188:<marketplace_pubkey>:org.attnprotocol:marketplace:<marketplace_id> (required)
  blocked_promotions_coordinate: string; // Blocked promotions coordinate: 30000:<attention_pubkey>:org.attnprotocol:promotion:blocked (required)
  blocked_promoters_coordinate: string; // Blocked promoters coordinate: 30000:<attention_pubkey>:org.attnprotocol:promoter:blocked (required)
  attention_pubkey: string; // Attention pubkey (viewer) (required)
  marketplace_pubkey: string; // Marketplace pubkey (required)
  marketplace_id: string; // Marketplace identifier (for content ref_marketplace_id, from marketplace coordinate)
  blocked_promotions_id: string; // D tag for blocked promotions list (required)
  blocked_promoters_id: string; // D tag for blocked promoters list (required)
  relays: string[]; // Relay URLs (required, multiple allowed) - tags only, NOT in content
  kinds: number[]; // Event kinds the viewer is willing to see (required, multiple allowed) - tags only, NOT in content
  // Optional trusted lists
  trusted_marketplaces_id?: string; // D tag for trusted marketplaces list (optional)
  trusted_billboards_id?: string; // D tag for trusted billboards list (optional)
  trusted_marketplaces_coordinate?: string; // Trusted marketplaces coordinate: 30000:<attention_pubkey>:org.attnprotocol:marketplace:trusted (optional)
  trusted_billboards_coordinate?: string; // Trusted billboards coordinate: 30000:<attention_pubkey>:org.attnprotocol:billboard:trusted (optional)
}

/**
 * MATCH Event (kind 38888) parameters
 * Note: ask, bid, duration are NOT stored in MATCH events per ATTN-01
 * These values are calculated at ingestion by fetching referenced PROMOTION and ATTENTION events
 */
export interface MatchEventParams extends BaseEventParams {
  match_id: string; // Match identifier (required, used for d tag per ATTN-01.md)
  marketplace_coordinate: string; // a tag: 38188:<marketplace_pubkey>:org.attnprotocol:marketplace:<marketplace_id>
  billboard_coordinate: string; // a tag: 38288:<billboard_pubkey>:org.attnprotocol:billboard:<billboard_id>
  promotion_coordinate: string; // a tag: 38388:<promotion_pubkey>:org.attnprotocol:promotion:<promotion_id>
  attention_coordinate: string; // a tag: 38488:<attention_pubkey>:org.attnprotocol:attention:<attention_id>
  marketplace_pubkey: string;
  promotion_pubkey: string;
  attention_pubkey: string;
  billboard_pubkey: string;
  marketplace_id: string;
  billboard_id: string;
  promotion_id: string;
  attention_id: string;
  relays?: string[]; // Relay URLs for r tags (multiple allowed, optional)
  kinds?: number[]; // Event kind(s) for k tag (multiple allowed, optional)
}

/**
 * BILLBOARD_CONFIRMATION Event (kind 38588) parameters
 */
export interface BillboardConfirmationEventParams extends BaseEventParams {
  // block_height is required from BaseEventParams
  confirmation_id: string; // Confirmation identifier (required, used for d tag per ATTN-01.md)
  match_event_id: string; // Match event ID (required, for e tag with "match" marker)
  marketplace_event_id?: string; // Marketplace event ID (optional, for e tag)
  billboard_event_id?: string; // Billboard event ID (optional, for e tag)
  promotion_event_id?: string; // Promotion event ID (optional, for e tag)
  attention_event_id?: string; // Attention event ID (optional, for e tag)
  marketplace_coordinate: string; // a tag: 38188:<marketplace_pubkey>:org.attnprotocol:marketplace:<marketplace_id>
  billboard_coordinate: string; // a tag: 38288:<billboard_pubkey>:org.attnprotocol:billboard:<billboard_id>
  promotion_coordinate: string; // a tag: 38388:<promotion_pubkey>:org.attnprotocol:promotion:<promotion_id>
  attention_coordinate: string; // a tag: 38488:<attention_pubkey>:org.attnprotocol:attention:<attention_id>
  match_coordinate: string; // a tag: 38888:<marketplace_pubkey>:org.attnprotocol:match:<match_id>
  marketplace_pubkey: string;
  billboard_pubkey: string;
  promotion_pubkey: string;
  attention_pubkey: string;
  marketplace_id: string;
  billboard_id: string;
  promotion_id: string;
  attention_id: string;
  match_id: string;
  relays?: string[]; // Relay URLs (optional)
}

/**
 * ATTENTION_CONFIRMATION Event (kind 38688) parameters
 */
export interface AttentionConfirmationEventParams extends BaseEventParams {
  // block_height is required from BaseEventParams
  confirmation_id: string; // Confirmation identifier (required, used for d tag per ATTN-01.md)
  match_event_id: string; // Match event ID (required, for e tag with "match" marker)
  marketplace_event_id?: string; // Marketplace event ID (optional, for e tag)
  billboard_event_id?: string; // Billboard event ID (optional, for e tag)
  promotion_event_id?: string; // Promotion event ID (optional, for e tag)
  attention_event_id?: string; // Attention event ID (optional, for e tag)
  marketplace_coordinate: string; // a tag: 38188:<marketplace_pubkey>:org.attnprotocol:marketplace:<marketplace_id>
  billboard_coordinate: string; // a tag: 38288:<billboard_pubkey>:org.attnprotocol:billboard:<billboard_id>
  promotion_coordinate: string; // a tag: 38388:<promotion_pubkey>:org.attnprotocol:promotion:<promotion_id>
  attention_coordinate: string; // a tag: 38488:<attention_pubkey>:org.attnprotocol:attention:<attention_id>
  match_coordinate: string; // a tag: 38888:<marketplace_pubkey>:org.attnprotocol:match:<match_id>
  marketplace_pubkey: string;
  billboard_pubkey: string;
  promotion_pubkey: string;
  attention_pubkey: string;
  marketplace_id: string;
  billboard_id: string;
  promotion_id: string;
  attention_id: string;
  match_id: string;
  relays?: string[]; // Relay URLs (optional)
}

/**
 * MARKETPLACE_CONFIRMATION Event (kind 38788) parameters
 */
export interface MarketplaceConfirmationEventParams extends BaseEventParams {
  // block_height is required from BaseEventParams
  confirmation_id: string; // Confirmation identifier (required, used for d tag per ATTN-01.md)
  match_event_id: string; // Match event ID (required, for e tag with "match" marker)
  billboard_confirmation_event_id: string; // Billboard confirmation event ID (required, for e tag with "billboard_confirmation" marker)
  attention_confirmation_event_id: string; // Attention confirmation event ID (required, for e tag with "attention_confirmation" marker)
  marketplace_event_id?: string; // Marketplace event ID (optional, for e tag)
  billboard_event_id?: string; // Billboard event ID (optional, for e tag)
  promotion_event_id?: string; // Promotion event ID (optional, for e tag)
  attention_event_id?: string; // Attention event ID (optional, for e tag)
  marketplace_coordinate: string; // a tag: 38188:<marketplace_pubkey>:org.attnprotocol:marketplace:<marketplace_id>
  billboard_coordinate: string; // a tag: 38288:<billboard_pubkey>:org.attnprotocol:billboard:<billboard_id>
  promotion_coordinate: string; // a tag: 38388:<promotion_pubkey>:org.attnprotocol:promotion:<promotion_id>
  attention_coordinate: string; // a tag: 38488:<attention_pubkey>:org.attnprotocol:attention:<attention_id>
  match_coordinate: string; // a tag: 38888:<marketplace_pubkey>:org.attnprotocol:match:<match_id>
  marketplace_pubkey: string;
  billboard_pubkey: string;
  promotion_pubkey: string;
  attention_pubkey: string;
  marketplace_id: string;
  billboard_id: string;
  promotion_id: string;
  attention_id: string;
  match_id: string;
  relays?: string[]; // Relay URLs (optional)
}

/**
 * ATTENTION_PAYMENT_CONFIRMATION Event (kind 38988) parameters
 */
export interface AttentionPaymentConfirmationEventParams extends BaseEventParams {
  // block_height is required from BaseEventParams
  confirmation_id: string; // Confirmation identifier (required, used for d tag per ATTN-01.md)
  sats_received: number; // Amount actually received (required)
  payment_proof?: string; // Optional proof of payment (Lightning invoice, tx ID, etc.)
  marketplace_confirmation_event_id: string; // Marketplace confirmation event ID (required, for e tag with "marketplace_confirmation" marker)
  match_event_id: string; // Match event ID (required, for e tag)
  marketplace_event_id?: string; // Marketplace event ID (optional, for e tag)
  billboard_event_id?: string; // Billboard event ID (optional, for e tag)
  promotion_event_id?: string; // Promotion event ID (optional, for e tag)
  attention_event_id?: string; // Attention event ID (optional, for e tag)
  marketplace_coordinate: string; // a tag: 38188:<marketplace_pubkey>:org.attnprotocol:marketplace:<marketplace_id>
  billboard_coordinate: string; // a tag: 38288:<billboard_pubkey>:org.attnprotocol:billboard:<billboard_id>
  promotion_coordinate: string; // a tag: 38388:<promotion_pubkey>:org.attnprotocol:promotion:<promotion_id>
  attention_coordinate: string; // a tag: 38488:<attention_pubkey>:org.attnprotocol:attention:<attention_id>
  match_coordinate: string; // a tag: 38888:<marketplace_pubkey>:org.attnprotocol:match:<match_id>
  marketplace_pubkey: string;
  billboard_pubkey: string;
  promotion_pubkey: string;
  attention_pubkey: string;
  marketplace_id: string;
  billboard_id: string;
  promotion_id: string;
  attention_id: string;
  match_id: string;
  relays?: string[]; // Relay URLs (optional)
}

/**
 * Published event result
 */
export interface PublishResult {
  event_id: string;
  relay_url: string;
  success: boolean;
  error?: string;
}

/**
 * Multi-relay publish result
 */
export interface PublishResults {
  event_id: string;
  results: PublishResult[];
  success_count: number;
  failure_count: number;
}

