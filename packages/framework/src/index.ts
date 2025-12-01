/**
 * attn-framework - Hook-based ATTN Protocol framework
 *
 * Framework for building Bitcoin-native attention marketplace implementations
 * using the ATTN Protocol on Nostr.
 */

// Main Attn class (Rely-style API)
export { Attn } from './attn.js';
export type { AttnConfig } from './attn.js';

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
  NewMarketplaceContext,
  NewBillboardContext,
  NewPromotionContext,
  NewAttentionContext,
  NewMatchContext,
  MatchPublishedContext,
  BillboardConfirmContext,
  AttentionConfirmContext,
  MarketplaceConfirmedContext,
  AttentionPaymentConfirmContext,
  NewBlockContext,
  BlockData,
  BlockGapDetectedContext,
  RateLimitContext,
  HealthChangeContext,
  NewProfileContext,
  NewRelayListContext,
  NewNip51ListContext,
} from './hooks/types.js';

// Relay connection (internal, used by Attn)
export type { RelayConnectionConfig } from './relay/index.js';

// Re-export core constants and types for backward compatibility
export { ATTN_EVENT_KINDS, NIP51_LIST_TYPES } from '@attn-protocol/core';
export type { RelayUrl } from '@attn-protocol/core';

