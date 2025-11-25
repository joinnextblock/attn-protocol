/**
 * Hook type definitions for attn framework
 * Each hook receives context data and implementations decide what to do
 */

import type { Event } from 'nostr-tools';

export type BlockHeight = number;

export type Pubkey = string;

export type EventId = string;

/**
 * Hook context passed to all hook handlers
 */
export interface HookContext {
  block_height?: BlockHeight;
  timestamp?: number;
  [key: string]: unknown;
}

/**
 * Hook handler function signature
 */
export type HookHandler<T extends HookContext = HookContext> = (context: T) => Promise<void> | void;

/**
 * Hook registration handle for unregistering
 */
export interface HookHandle {
  unregister: () => void;
}

/**
 * Relay connection hook contexts
 */
export interface RelayConnectContext extends HookContext {
  relay_url: string;
}

export interface RelayDisconnectContext extends HookContext {
  relay_url: string;
  reason?: string;
  error?: Error;
}

export interface SubscriptionContext extends HookContext {
  relay_url: string;
  subscription_id: string;
  filter: {
    kinds: number[];
    authors?: string[];
  };
  status: 'subscribed' | 'confirmed'; // 'subscribed' when REQ sent, 'confirmed' when EOSE received
}

/**
 * Event lifecycle hook contexts
 */
export interface NewBillboardContext extends HookContext {
  event_id: EventId;
  pubkey: Pubkey;
  billboard_data: unknown;
  event: Event;
}

export interface NewPromotionContext extends HookContext {
  event_id: EventId;
  pubkey: Pubkey;
  promotion_data: unknown;
  event: Event;
}

export interface NewAttentionContext extends HookContext {
  event_id: EventId;
  pubkey: Pubkey;
  attention_data: unknown;
  event: Event;
}

export interface NewMatchContext extends HookContext {
  event_id: EventId;
  pubkey: Pubkey;
  match_data: unknown;
  event: Event;
}

export interface MatchPublishedContext extends HookContext {
  match_event_id: EventId;
  promotion_event_id: EventId;
  attention_event_id: EventId;
  match_data: unknown;
  event: Event;
}

export interface BillboardConfirmContext extends HookContext {
  confirmation_event_id: EventId;
  match_event_id: EventId;
  billboard_pubkey: Pubkey;
  confirmation_data: unknown;
  event: Event;
}

export interface ViewerConfirmContext extends HookContext {
  confirmation_event_id: EventId;
  match_event_id: EventId;
  viewer_pubkey: Pubkey;
  confirmation_data: unknown;
  event: Event;
}

export interface MarketplaceConfirmedContext extends HookContext {
  marketplace_event_id: EventId;
  match_event_id: EventId;
  settlement_data: unknown;
  event: Event;
}

/**
 * Block synchronization hook contexts
 */
export interface NewBlockContext extends HookContext {
  block_height: BlockHeight;
  block_hash?: string;
}

export interface BlockGapDetectedContext extends HookContext {
  expected_height: BlockHeight;
  actual_height: BlockHeight;
  gap_size: number;
}

/**
 * Error and health hook contexts
 */
export interface RateLimitContext extends HookContext {
  relay_url?: string;
  limit_type: string;
  retry_after?: number;
}

export interface HealthChangeContext extends HookContext {
  health_status: 'healthy' | 'degraded' | 'unhealthy';
  previous_status?: 'healthy' | 'degraded' | 'unhealthy';
  reason?: string;
}

/**
 * Standard Nostr event hook contexts
 */
export interface NewProfileContext extends HookContext {
  event_id: EventId;
  pubkey: Pubkey;
  profile_data: unknown;
  event: Event;
}

export interface NewRelayListContext extends HookContext {
  event_id: EventId;
  pubkey: Pubkey;
  relay_list_data: unknown;
  event: Event;
}

export interface NewNip51ListContext extends HookContext {
  event_id: EventId;
  pubkey: Pubkey;
  list_data: unknown;
  list_type: 'trusted_billboard' | 'trusted_marketplace' | 'blocked_promotion';
  event: Event;
}

