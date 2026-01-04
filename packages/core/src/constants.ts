/**
 * ATTN Protocol event kinds as defined in ATTN-01 specification.
 * These are Nostr event kinds in the 38xxx range for addressable events.
 *
 * Note: Block events are now published by City Protocol (Kind 38808).
 * ATTN Protocol events reference City block events for timing.
 *
 * @example
 * ```ts
 * import { ATTN_EVENT_KINDS } from '@attn/ts-core';
 *
 * // Filter for promotion events
 * const filter = { kinds: [ATTN_EVENT_KINDS.PROMOTION] };
 * ```
 *
 * @see https://github.com/joinnextblock/attn-protocol/blob/main/packages/protocol/docs/ATTN-01.md
 */
export const ATTN_EVENT_KINDS = {
  /** Marketplace registration/update event (kind 38188) */
  MARKETPLACE: 38188,
  /** Billboard (ad slot) registration/update event (kind 38288) */
  BILLBOARD: 38288,
  /** Promotion (ad) submission event (kind 38388) */
  PROMOTION: 38388,
  /** Attention offer event from users (kind 38488) */
  ATTENTION: 38488,
  /** Billboard owner confirms a match (kind 38588) */
  BILLBOARD_CONFIRMATION: 38588,
  /** Attention provider confirms a match (kind 38688) */
  ATTENTION_CONFIRMATION: 38688,
  /** Marketplace confirms both parties agreed (kind 38788) */
  MARKETPLACE_CONFIRMATION: 38788,
  /** Match event pairing promotion with attention (kind 38888) */
  MATCH: 38888,
  /** Payment confirmation from attention provider (kind 38988) */
  ATTENTION_PAYMENT_CONFIRMATION: 38988,
} as const;

/**
 * City Protocol event kinds referenced by ATTN Protocol.
 * Block events are published by City Protocol's clock service.
 *
 * @see https://github.com/joinnextblock/city-protocol
 */
export const CITY_PROTOCOL_KINDS = {
  /** Block event from City Protocol clock (kind 38808) */
  BLOCK: 38808,
} as const;

/**
 * @deprecated Use CITY_PROTOCOL_KINDS.BLOCK instead. Block events are now published by City Protocol.
 */
export const ATTN_BLOCK_KIND = CITY_PROTOCOL_KINDS.BLOCK;

/**
 * NIP-51 list type identifiers for ATTN Protocol.
 * Used for user preference lists (blocked promotions, trusted marketplaces, etc.)
 *
 * @example
 * ```ts
 * import { NIP51_LIST_TYPES } from '@attn/ts-core';
 *
 * // Create a blocked promoters list
 * const listEvent = {
 *   kind: 30000,
 *   tags: [['d', NIP51_LIST_TYPES.BLOCKED_PROMOTERS], ...blockedPubkeys]
 * };
 * ```
 */
export const NIP51_LIST_TYPES = {
  /** List of blocked promotion event IDs */
  BLOCKED_PROMOTIONS: 'org.attnprotocol:promotion:blocked',
  /** List of blocked promoter pubkeys */
  BLOCKED_PROMOTERS: 'org.attnprotocol:promoter:blocked',
  /** List of trusted billboard pubkeys */
  TRUSTED_BILLBOARDS: 'org.attnprotocol:billboard:trusted',
  /** List of trusted marketplace pubkeys */
  TRUSTED_MARKETPLACES: 'org.attnprotocol:marketplace:trusted',
} as const;

/**
 * City Protocol namespace prefix for block references.
 */
export const CITY_BLOCK_ID_PREFIX = 'org.cityprotocol:block:';
