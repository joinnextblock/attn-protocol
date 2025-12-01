/**
 * Hook system core for attn framework
 * Provides hook emitter and hook name constants
 */

export { HookEmitter } from './emitter.js';
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
  BlockGapDetectedContext,
  RateLimitContext,
  HealthChangeContext,
  NewProfileContext,
  NewRelayListContext,
  NewNip51ListContext,
} from './types.js';

/**
 * Hook name constants
 */
export const HOOK_NAMES = {
  // Infrastructure hooks
  RELAY_CONNECT: 'on_relay_connect',
  RELAY_DISCONNECT: 'on_relay_disconnect',
  SUBSCRIPTION: 'on_subscription',
  RATE_LIMIT: 'on_rate_limit',

  // Event lifecycle hooks
  NEW_MARKETPLACE: 'on_new_marketplace',
  NEW_BILLBOARD: 'on_new_billboard',
  NEW_PROMOTION: 'on_new_promotion',
  NEW_ATTENTION: 'on_new_attention',
  NEW_MATCH: 'on_new_match',
  MATCH_PUBLISHED: 'on_match_published',
  BILLBOARD_CONFIRM: 'on_billboard_confirm',
  ATTENTION_CONFIRM: 'on_attention_confirm',
  MARKETPLACE_CONFIRMED: 'on_marketplace_confirmed',
  ATTENTION_PAYMENT_CONFIRM: 'on_attention_payment_confirm',

  // Block synchronization hooks
  BEFORE_NEW_BLOCK: 'before_new_block',
  NEW_BLOCK: 'on_new_block',
  AFTER_NEW_BLOCK: 'after_new_block',
  BLOCK_GAP_DETECTED: 'on_block_gap_detected',

  // Health hooks
  HEALTH_CHANGE: 'on_health_change',

  // Standard Nostr event hooks
  NEW_PROFILE: 'on_new_profile',
  NEW_RELAY_LIST: 'on_new_relay_list',
  NEW_NIP51_LIST: 'on_new_nip51_list',
} as const;

