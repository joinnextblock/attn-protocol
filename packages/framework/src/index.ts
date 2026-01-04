/**
 * # @attn/framework
 *
 * Hook-based framework for building Bitcoin-native attention marketplace
 * implementations using the ATTN Protocol on Nostr.
 *
 * ## Installation
 *
 * ```bash
 * # JSR
 * bunx jsr add @attn/framework
 *
 * # npm (via JSR)
 * npx jsr add @attn/framework
 * ```
 *
 * ## Quick Start
 *
 * ```ts
 * import { Attn } from '@attn/ts-framework';
 *
 * const attn = new Attn({
 *   private_key: privateKeyBytes,
 *   relays_noauth: ['wss://relay.example.com'],
 *   marketplace_pubkeys: ['abc123...'],
 * });
 *
 * // Handle incoming promotions
 * attn.on_promotion_event((ctx) => {
 *   console.log('Promotion received:', ctx.event.id);
 * });
 *
 * // Handle attention offers
 * attn.on_attention_event((ctx) => {
 *   console.log('Attention offer:', ctx.event.id);
 * });
 *
 * // Handle block events for Bitcoin-synchronized timing
 * attn.on_block_event((ctx) => {
 *   console.log('Block height:', ctx.block_height);
 * });
 *
 * await attn.connect();
 * ```
 *
 * ## Features
 *
 * - **Hook-based API**: Register handlers for ATTN Protocol events
 * - **Automatic reconnection**: Resilient relay connections
 * - **NIP-42 authentication**: Support for authenticated relays
 * - **Event deduplication**: Built-in duplicate event filtering
 * - **Publisher**: Publish events to multiple relays
 *
 * @module
 * @see https://github.com/joinnextblock/attn-protocol
 */

// Main Attn class (Rely-style API)
export { Attn } from './attn.js';
export type { AttnConfig, ProfileConfig } from './attn.js';

// Hook name constants (for internal use)
export { HOOK_NAMES } from './hooks/index.js';
export type {
  HookHandler,
  BeforeHookHandler,
  AfterHookHandler,
  HookHandle,
  HookContext,
  BlockHeight,
  Pubkey,
  EventId,
  RelayConnectContext,
  RelayDisconnectContext,
  SubscriptionContext,
  MarketplaceEventContext,
  BillboardEventContext,
  PromotionEventContext,
  AttentionEventContext,
  MatchEventContext,
  MatchPublishedContext,
  BillboardConfirmationEventContext,
  AttentionConfirmationEventContext,
  MarketplaceConfirmationEventContext,
  AttentionPaymentConfirmationEventContext,
  BlockEventContext,
  BlockData,
  BlockGapDetectedContext,
  RateLimitContext,
  HealthChangeContext,
  PublishResult,
  ProfilePublishedContext,
  ProfileEventContext,
  RelayListEventContext,
  Nip51ListEventContext,
} from './hooks/types.js';

// Relay connection (internal, used by Attn)
export type { RelayConnectionConfig } from './relay/index.js';

// Publisher for writing events to relays
export { Publisher } from './relay/index.js';
export type { PublisherConfig, WriteRelay, PublishResults } from './relay/index.js';

// Logger interface and utilities
export type { Logger } from './logger.js';
export { create_default_logger, create_noop_logger } from './logger.js';

// Re-export core constants and types for backward compatibility
export { ATTN_EVENT_KINDS, NIP51_LIST_TYPES } from '@attn/ts-core';
export type { RelayUrl } from '@attn/ts-core';

