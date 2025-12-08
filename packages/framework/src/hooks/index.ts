/**
 * Hook system core for the ATTN Framework.
 *
 * Provides the hook emitter infrastructure and hook name constants
 * for building event-driven ATTN Protocol applications.
 *
 * @module
 */

export { HookEmitter } from './emitter.ts';
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
  BlockGapDetectedContext,
  RateLimitContext,
  HealthChangeContext,
  PublishResult,
  ProfilePublishedContext,
  ProfileEventContext,
  RelayListEventContext,
  Nip51ListEventContext,
} from './types.ts';

/**
 * Hook name constants for internal use.
 *
 * These constants define the string identifiers for each hook type.
 * Use the `on_*`, `before_*`, and `after_*` methods on the `Attn` class
 * to register handlers instead of using these constants directly.
 *
 * @example
 * ```ts
 * // Preferred: Use Attn class methods
 * attn.on_promotion_event(handler);
 *
 * // Internal: Hook names for advanced use cases
 * console.log(HOOK_NAMES.PROMOTION_EVENT); // 'on_promotion_event'
 * ```
 */
export const HOOK_NAMES = {
  // Infrastructure hooks
  RELAY_CONNECT: 'on_relay_connect',
  RELAY_DISCONNECT: 'on_relay_disconnect',
  SUBSCRIPTION: 'on_subscription',
  RATE_LIMIT: 'on_rate_limit',

  // ATTN Protocol event hooks (with before/after lifecycle)
  BEFORE_MARKETPLACE_EVENT: 'before_marketplace_event',
  MARKETPLACE_EVENT: 'on_marketplace_event',
  AFTER_MARKETPLACE_EVENT: 'after_marketplace_event',

  BEFORE_BILLBOARD_EVENT: 'before_billboard_event',
  BILLBOARD_EVENT: 'on_billboard_event',
  AFTER_BILLBOARD_EVENT: 'after_billboard_event',

  BEFORE_PROMOTION_EVENT: 'before_promotion_event',
  PROMOTION_EVENT: 'on_promotion_event',
  AFTER_PROMOTION_EVENT: 'after_promotion_event',

  BEFORE_ATTENTION_EVENT: 'before_attention_event',
  ATTENTION_EVENT: 'on_attention_event',
  AFTER_ATTENTION_EVENT: 'after_attention_event',

  BEFORE_MATCH_EVENT: 'before_match_event',
  MATCH_EVENT: 'on_match_event',
  AFTER_MATCH_EVENT: 'after_match_event',
  MATCH_PUBLISHED: 'on_match_published',

  // Confirmation event hooks (with before/after lifecycle)
  BEFORE_BILLBOARD_CONFIRMATION_EVENT: 'before_billboard_confirmation_event',
  BILLBOARD_CONFIRMATION_EVENT: 'on_billboard_confirmation_event',
  AFTER_BILLBOARD_CONFIRMATION_EVENT: 'after_billboard_confirmation_event',

  BEFORE_ATTENTION_CONFIRMATION_EVENT: 'before_attention_confirmation_event',
  ATTENTION_CONFIRMATION_EVENT: 'on_attention_confirmation_event',
  AFTER_ATTENTION_CONFIRMATION_EVENT: 'after_attention_confirmation_event',

  BEFORE_MARKETPLACE_CONFIRMATION_EVENT: 'before_marketplace_confirmation_event',
  MARKETPLACE_CONFIRMATION_EVENT: 'on_marketplace_confirmation_event',
  AFTER_MARKETPLACE_CONFIRMATION_EVENT: 'after_marketplace_confirmation_event',

  BEFORE_ATTENTION_PAYMENT_CONFIRMATION_EVENT: 'before_attention_payment_confirmation_event',
  ATTENTION_PAYMENT_CONFIRMATION_EVENT: 'on_attention_payment_confirmation_event',
  AFTER_ATTENTION_PAYMENT_CONFIRMATION_EVENT: 'after_attention_payment_confirmation_event',

  // Block synchronization hooks (with before/after lifecycle)
  BEFORE_BLOCK_EVENT: 'before_block_event',
  BLOCK_EVENT: 'on_block_event',
  AFTER_BLOCK_EVENT: 'after_block_event',
  BLOCK_GAP_DETECTED: 'on_block_gap_detected',

  // Health hooks
  HEALTH_CHANGE: 'on_health_change',

  // Identity publishing hooks
  PROFILE_PUBLISHED: 'on_profile_published',

  // Standard Nostr event hooks (with before/after lifecycle)
  BEFORE_PROFILE_EVENT: 'before_profile_event',
  PROFILE_EVENT: 'on_profile_event',
  AFTER_PROFILE_EVENT: 'after_profile_event',

  BEFORE_RELAY_LIST_EVENT: 'before_relay_list_event',
  RELAY_LIST_EVENT: 'on_relay_list_event',
  AFTER_RELAY_LIST_EVENT: 'after_relay_list_event',

  BEFORE_NIP51_LIST_EVENT: 'before_nip51_list_event',
  NIP51_LIST_EVENT: 'on_nip51_list_event',
  AFTER_NIP51_LIST_EVENT: 'after_nip51_list_event',
} as const;

