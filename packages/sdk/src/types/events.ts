/**
 * Type definitions for ATTN Protocol event parameters
 */

import type { Event } from "nostr-tools";

/**
 * Base event parameters shared across all event types
 */
export interface BaseEventParams {
  block_height?: number;
  created_at?: number;
}

/**
 * BLOCK Event (kind 38088) parameters
 */
export interface BlockEventParams extends BaseEventParams {
  height: number;
  hash: string;
  time: number;
  difficulty?: number | string;
  block_identifier?: string;
  tx_count?: number;
  size?: number;
  weight?: number;
  version?: number;
  merkle_root?: string | null;
  nonce?: number;
  node_pubkey?: string;
}

/**
 * MARKETPLACE Event (kind 38188) parameters
 */
export interface MarketplaceEventParams extends BaseEventParams {
  name: string;
  description: string;
  image?: string;
  kind_list: number[]; // Array of event kind numbers that can be promoted
  relay_list: string[]; // Array of relay URLs
  url?: string; // Website URL
  admin_pubkey: string; // Admin pubkey
  admin_email?: string; // Admin email
  min_duration?: number; // Minimum duration in milliseconds (default: 15000)
  max_duration?: number; // Maximum duration in milliseconds (default: 60000)
  marketplace_id: string; // Marketplace identifier (required, used for d tag and content per ATTN-01.md)
  website_url?: string; // Website URL (for u tag, optional)
  // Content fields for pubkeys
  marketplace_pubkey: string; // Marketplace pubkey (for content)
}

/**
 * BILLBOARD Event (kind 38288) parameters
 */
export interface BillboardEventParams extends BaseEventParams {
  billboard_id: string; // Billboard identifier (required, used for d tag and content per ATTN-01.md)
  name: string; // Billboard name (required)
  description?: string; // Billboard description (optional)
  marketplace_coordinate: string; // Marketplace coordinate: 38188:<marketplace_pubkey>:<marketplace_id> (required)
  billboard_pubkey: string; // Billboard pubkey (required)
  marketplace_pubkey: string; // Marketplace pubkey (required)
  relays: string[]; // Relay URLs (required, multiple allowed)
  kind: number; // Event kinds this billboard can display (required)
  url: string; // Billboard website URL (required)
  // Content fields for pubkeys and ids
  marketplace_id: string; // Marketplace identifier (for content, from marketplace coordinate)
}

/**
 * PROMOTION Event (kind 38388) parameters
 */
export interface PromotionEventParams extends BaseEventParams {
  promotion_id: string; // Promotion identifier (required, used for d tag and content per ATTN-01.md)
  duration: number; // Duration in milliseconds (required)
  bid: number; // Total bid in satoshis for the duration (required)
  event_id: string; // Event ID of the content being promoted (required)
  description?: string; // Text description (optional)
  call_to_action: string; // CTA button text (required)
  call_to_action_url: string; // CTA button URL (required)
  marketplace_coordinate: string; // Marketplace coordinate: 38188:<marketplace_pubkey>:<marketplace_id> (required)
  video_coordinate: string; // Video coordinate: 34236:<video_author_pubkey>:<video_d_tag> (required)
  billboard_coordinate: string; // Billboard coordinate: 38288:<billboard_pubkey>:<billboard_id> (required)
  marketplace_pubkey: string; // Marketplace pubkey (required)
  promotion_pubkey: string; // Promotion pubkey (required)
  relays: string[]; // Relay URLs (required, multiple allowed)
  kind: number; // Kind of event being promoted (required, default: 34236)
  url: string; // Promotion URL (required)
  // Content fields for pubkeys and ids
  marketplace_id: string; // Marketplace identifier (for content, from marketplace coordinate)
}

/**
 * ATTENTION Event (kind 38488) parameters
 */
export interface AttentionEventParams extends BaseEventParams {
  attention_id: string; // Attention identifier (required, used for d tag and content per ATTN-01.md)
  ask: number; // Total ask in satoshis for the duration (required)
  min_duration: number; // Minimum duration in milliseconds (required)
  max_duration: number; // Maximum duration in milliseconds (required)
  kind_list: number[]; // Array of event kind numbers the viewer is willing to see (required)
  relay_list: string[]; // Array of relay URLs (required)
  marketplace_coordinate: string; // Marketplace coordinate: 38188:<marketplace_pubkey>:<marketplace_id> (required)
  blocked_promotions_coordinate: string; // Blocked promotions coordinate: 30000:<attention_pubkey>:org.attnprotocol:promotion:blocked
  blocked_promoters_coordinate: string; // Blocked promoters coordinate: 30000:<attention_pubkey>:org.attnprotocol:promoter:blocked
  attention_pubkey: string; // Attention pubkey (viewer) (required)
  marketplace_pubkey: string; // Marketplace pubkey (required)
  relays: string[]; // Relay URLs (required, multiple allowed)
  kinds: number[]; // Event kinds the viewer is willing to see (required, multiple allowed)
  // Content fields for pubkeys and ids
  marketplace_id: string; // Marketplace identifier (for content, from marketplace coordinate)
  blocked_promotions_id: string; // D tag for blocked promotions list
  blocked_promoters_id: string; // D tag for blocked promoters list
}

/**
 * MATCH Event (kind 38888) parameters
 */
export interface MatchEventParams extends BaseEventParams {
  // block_height from BaseEventParams is required for MATCH events
  match_id: string; // Match identifier (required, used for d tag per ATTN-01.md)
  marketplace_coordinate: string; // a tag: 38188:<marketplace_pubkey>:<marketplace_id>
  billboard_coordinate: string; // a tag: 38288:<billboard_pubkey>:<billboard_id>
  promotion_coordinate: string; // a tag: 38388:<promotion_pubkey>:<promotion_id>
  attention_coordinate: string; // a tag: 38488:<attention_pubkey>:<attention_id>
  marketplace_pubkey: string;
  promotion_pubkey: string;
  attention_pubkey: string;
  billboard_pubkey: string;
  marketplace_id: string;
  billboard_id: string;
  promotion_id: string;
  attention_id: string;
  ask: number; // Ask amount in satoshis
  bid: number; // Bid amount in satoshis
  duration: number; // Duration in milliseconds
  kind_list: number[]; // Array of event kind numbers
  relay_list: string[]; // Array of relay URLs
  relays: string[]; // Relay URLs for r tags (multiple allowed)
  kind?: number | number[]; // Event kind(s) for k tag (multiple allowed, deprecated)
}

/**
 * BILLBOARD_CONFIRMATION Event (kind 38588) parameters
 */
export interface BillboardConfirmationEventParams extends BaseEventParams {
  block: number; // Block height as integer
  price: number; // Total satoshis settled
  marketplace_ref: string; // e tag reference to marketplace event
  promotion_ref: string; // e tag reference to promotion event
  attention_ref: string; // e tag reference to attention event
  match_ref: string; // e tag reference to match event
  marketplace_coordinate: string; // a tag reference: 38188:<marketplace_pubkey>:<marketplace_id>
  promotion_coordinate: string; // a tag reference: 38388:<promotion_pubkey>:<promotion_id>
  attention_coordinate: string; // a tag reference: 38488:<attention_pubkey>:<attention_id>
  match_coordinate: string; // a tag reference: 38888:<match_pubkey>:<match_id>
  marketplace_pubkey: string;
  promotion_pubkey: string;
  attention_pubkey: string;
  billboard_pubkey: string;
  marketplace_id: string;
  promotion_id: string;
  attention_id: string;
  match_id: string;
  relays: string[]; // Relay URLs
  url: string; // Confirmation landing page
}

/**
 * VIEWER_CONFIRMATION Event (kind 38688) parameters
 */
export interface ViewerConfirmationEventParams extends BaseEventParams {
  block: number;
  price: number;
  sats_delivered: number;
  proof_payload?: string;
  marketplace_ref: string; // e tag reference to marketplace event
  promotion_ref: string; // e tag reference to promotion event
  attention_ref: string; // e tag reference to attention event
  match_ref: string; // e tag reference to match event
  marketplace_coordinate: string;
  promotion_coordinate: string;
  attention_coordinate: string;
  match_coordinate: string;
  marketplace_pubkey: string;
  promotion_pubkey: string;
  attention_pubkey: string;
  billboard_pubkey: string;
  marketplace_id: string;
  promotion_id: string;
  attention_id: string;
  match_id: string;
  relays: string[];
  url: string;
}

/**
 * MARKETPLACE_CONFIRMATION Event (kind 38788) parameters
 */
export interface MarketplaceConfirmationEventParams extends BaseEventParams {
  block: number;
  duration: number;
  ask: number;
  bid: number;
  price: number;
  sats_settled: number;
  payout_breakdown?: {
    viewer: number;
    billboard: number;
  };
  marketplace_ref: string; // e tag reference to marketplace event
  promotion_ref: string; // e tag reference to promotion event
  attention_ref: string; // e tag reference to attention event
  match_ref: string; // e tag reference to match event
  billboard_confirmation_ref: string; // e tag reference to billboard confirmation event
  viewer_confirmation_ref: string; // e tag reference to viewer confirmation event
  marketplace_coordinate: string;
  promotion_coordinate: string;
  attention_coordinate: string;
  match_coordinate: string;
  marketplace_pubkey: string;
  promotion_pubkey: string;
  attention_pubkey: string;
  billboard_pubkey: string;
  marketplace_id: string;
  promotion_id: string;
  attention_id: string;
  match_id: string;
  relays: string[];
  url: string;
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

