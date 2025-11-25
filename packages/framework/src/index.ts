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
  HookHandle,
  HookContext,
  BlockHeight,
  Pubkey,
  EventId,
  RelayConnectContext,
  RelayDisconnectContext,
  SubscriptionContext,
  NewBillboardContext,
  NewPromotionContext,
  NewAttentionContext,
  NewMatchContext,
  MatchPublishedContext,
  BillboardConfirmContext,
  ViewerConfirmContext,
  MarketplaceConfirmedContext,
  NewBlockContext,
  BlockGapDetectedContext,
  RateLimitContext,
  HealthChangeContext,
  NewProfileContext,
  NewRelayListContext,
  NewNip51ListContext,
} from './hooks/types.js';

// Relay connection (internal, used by Attn)
export type { RelayConnectionConfig } from './relay/index.js';

// Core types (only export unique types from types/index, BlockHeight/Pubkey/EventId come from hooks/types)
export type { RelayUrl } from './types/index.js';

