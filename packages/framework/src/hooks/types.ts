/**
 * Hook type definitions for attn framework
 * Each hook receives context data and implementations decide what to do
 */

import type { Event } from 'nostr-tools';
import type { BlockHeight, Pubkey, EventId } from '@attn-protocol/core';

export type { BlockHeight, Pubkey, EventId };

/**
 * Hook context passed to all hook handlers
 * Contains only the raw event - implementations extract what they need
 */
export interface HookContext {
  timestamp?: number;
  [key: string]: unknown;
}

/**
 * Hook handler function signature
 */
export type HookHandler<T extends HookContext = HookContext> = (context: T) => Promise<void> | void;

export type BeforeHookHandler<T extends HookContext = HookContext> = HookHandler<T>;
export type AfterHookHandler<T extends HookContext = HookContext> = HookHandler<T>;

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
    [key: string]: unknown;
  };
  status: 'subscribed' | 'confirmed'; // 'subscribed' when REQ sent, 'confirmed' when EOSE received
}

/**
 * Event lifecycle hook contexts
 * All contexts include event_id, pubkey (from event object), parsed content, and the raw event
 * Implementations extract any additional data they need from the event or parsed content
 */
export interface MarketplaceEventContext extends HookContext {
  event_id: EventId;
  pubkey: Pubkey;
  marketplace_data: unknown;
  event: Event;
}

export interface BillboardEventContext extends HookContext {
  event_id: EventId;
  pubkey: Pubkey;
  billboard_data: unknown;
  event: Event;
}

export interface PromotionEventContext extends HookContext {
  event_id: EventId;
  pubkey: Pubkey;
  promotion_data: unknown;
  event: Event;
}

export interface AttentionEventContext extends HookContext {
  event_id: EventId;
  pubkey: Pubkey;
  attention_data: unknown;
  event: Event;
}

export interface MatchEventContext extends HookContext {
  event_id: EventId;
  pubkey: Pubkey;
  match_data: unknown;
  event: Event;
}

/**
 * Match published context - backward compatibility hook
 * Contains only event metadata and parsed content
 * Implementations extract promotion/attention IDs from match_data or event.tags
 */
export interface MatchPublishedContext extends HookContext {
  match_event_id: EventId;
  match_data: unknown;
  event: Event;
}

/**
 * Confirmation event contexts
 * Contains event metadata and parsed content
 * Implementations extract reference IDs from confirmation_data or event.tags
 */
export interface BillboardConfirmationEventContext extends HookContext {
  event_id: EventId;
  pubkey: Pubkey;
  confirmation_data: unknown;
  event: Event;
}

export interface AttentionConfirmationEventContext extends HookContext {
  event_id: EventId;
  pubkey: Pubkey;
  confirmation_data: unknown;
  event: Event;
}

export interface MarketplaceConfirmationEventContext extends HookContext {
  event_id: EventId;
  pubkey: Pubkey;
  settlement_data: unknown;
  event: Event;
}

export interface AttentionPaymentConfirmationEventContext extends HookContext {
  event_id: EventId;
  pubkey: Pubkey;
  payment_data: unknown;
  event: Event;
}

/**
 * Block synchronization hook contexts
 */
export interface BlockData {
  height: BlockHeight;
  hash?: string;
  time?: number;
  difficulty?: string;
  tx_count?: number;
  size?: number;
  weight?: number;
  version?: number;
  merkle_root?: string;
  nonce?: number;
  node_pubkey?: string;
}

export interface BlockEventContext extends HookContext {
  block_height: BlockHeight;
  block_hash?: string;
  block_time?: number;
  block_data?: BlockData;
  event?: Event;
  relay_url?: string;
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
 * Profile published context - emitted after kind 0, kind 10002, and optionally kind 3 are published on connect
 */
export interface PublishResult {
  event_id: string;
  relay_url: string;
  success: boolean;
  error?: string;
}

export interface ProfilePublishedContext extends HookContext {
  profile_event_id?: string;
  relay_list_event_id?: string;
  follow_list_event_id?: string;
  results: PublishResult[];
  success_count: number;
  failure_count: number;
}

/**
 * Standard Nostr event hook contexts
 */
export interface ProfileEventContext extends HookContext {
  event_id: EventId;
  pubkey: Pubkey;
  profile_data: unknown;
  event: Event;
}

export interface RelayListEventContext extends HookContext {
  event_id: EventId;
  pubkey: Pubkey;
  relay_list_data: unknown;
  event: Event;
}

/**
 * NIP-51 list context
 * Contains event metadata and parsed content
 * Implementations extract list_type from event.tags d-tag or list_data
 */
export interface Nip51ListEventContext extends HookContext {
  event_id: EventId;
  pubkey: Pubkey;
  list_data: unknown;
  event: Event;
}
