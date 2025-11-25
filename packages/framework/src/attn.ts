/**
 * Attn - Main class for attn-framework
 * Provides Rely-style on_* methods for hook registration
 * Manages Nostr relay connection internally
 */

import { HookEmitter } from './hooks/emitter.js';
import { HOOK_NAMES } from './hooks/index.js';
import { RelayConnection } from './relay/connection.js';
import type { RelayConnectionConfig } from './relay/connection.js';
import type {
  HookHandler,
  HookHandle,
  HookContext,
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

export interface AttnConfig {
  relay?: RelayConnectionConfig;
}

/**
 * Main Attn class providing Rely-style hook registration
 * Manages connections internally
 */
export class Attn {
  private emitter: HookEmitter;
  private relay_connection: RelayConnection | null = null;

  constructor(config?: AttnConfig) {
    this.emitter = new HookEmitter();

    // Initialize relay connection if config provided
    if (config?.relay) {
      this.relay_connection = new RelayConnection(config.relay, this.emitter);
    }
  }

  /**
   * Internal method for emitting hooks (used by connection managers)
   */
  async emit<T extends HookContext = HookContext>(
    hook_name: string,
    context: T
  ): Promise<void> {
    await this.emitter.emit(hook_name, context);
  }

  // Relay connection methods

  /**
   * Connect to Nostr relay
   * Requires relay config to be provided in constructor
   */
  async connect(): Promise<void> {
    if (!this.relay_connection) {
      throw new Error('Relay connection not initialized. Provide relay config in constructor.');
    }
    await this.relay_connection.connect();
  }

  /**
   * Disconnect from Nostr relay
   */
  async disconnect(reason?: string): Promise<void> {
    if (!this.relay_connection) {
      return;
    }
    await this.relay_connection.disconnect(reason);
  }

  /**
   * Check if relay is currently connected
   */
  get connected(): boolean {
    return this.relay_connection?.connected ?? false;
  }

  // Infrastructure hooks

  /**
   * Register handler for Relay connection
   */
  on_relay_connect(handler: HookHandler<RelayConnectContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.RELAY_CONNECT, handler);
  }

  /**
   * Register handler for Relay disconnection
   */
  on_relay_disconnect(handler: HookHandler<RelayDisconnectContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.RELAY_DISCONNECT, handler);
  }

  /**
   * Register handler for subscription events
   */
  on_subscription(handler: HookHandler<SubscriptionContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.SUBSCRIPTION, handler);
  }

  /**
   * Register handler for rate limit events
   */
  on_rate_limit(handler: HookHandler<RateLimitContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.RATE_LIMIT, handler);
  }

  // Event lifecycle hooks

  /**
   * Register handler for new billboard events
   */
  on_new_billboard(handler: HookHandler<NewBillboardContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.NEW_BILLBOARD, handler);
  }

  /**
   * Register handler for new promotion events
   */
  on_new_promotion(handler: HookHandler<NewPromotionContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.NEW_PROMOTION, handler);
  }

  /**
   * Register handler for new attention events
   */
  on_new_attention(handler: HookHandler<NewAttentionContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.NEW_ATTENTION, handler);
  }

  /**
   * Register handler for new match events
   */
  on_new_match(handler: HookHandler<NewMatchContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.NEW_MATCH, handler);
  }

  /**
   * Register handler for match published events
   */
  on_match_published(handler: HookHandler<MatchPublishedContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.MATCH_PUBLISHED, handler);
  }

  /**
   * Register handler for billboard confirmation events
   */
  on_billboard_confirm(handler: HookHandler<BillboardConfirmContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.BILLBOARD_CONFIRM, handler);
  }

  /**
   * Register handler for viewer confirmation events
   */
  on_viewer_confirm(handler: HookHandler<ViewerConfirmContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.VIEWER_CONFIRM, handler);
  }

  /**
   * Register handler for marketplace confirmed events
   */
  on_marketplace_confirmed(handler: HookHandler<MarketplaceConfirmedContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.MARKETPLACE_CONFIRMED, handler);
  }

  // Block synchronization hooks

  /**
   * Register handler for new block events
   */
  on_new_block(handler: HookHandler<NewBlockContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.NEW_BLOCK, handler);
  }

  /**
   * Register handler for block gap detection
   */
  on_block_gap_detected(handler: HookHandler<BlockGapDetectedContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.BLOCK_GAP_DETECTED, handler);
  }

  // Health hooks

  /**
   * Register handler for health change events
   */
  on_health_change(handler: HookHandler<HealthChangeContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.HEALTH_CHANGE, handler);
  }

  // Standard Nostr event hooks

  /**
   * Register handler for new profile events (kind 0)
   */
  on_new_profile(handler: HookHandler<NewProfileContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.NEW_PROFILE, handler);
  }

  /**
   * Register handler for new relay list events (kind 10002)
   */
  on_new_relay_list(handler: HookHandler<NewRelayListContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.NEW_RELAY_LIST, handler);
  }

  /**
   * Register handler for new NIP-51 list events (kind 30000)
   */
  on_new_nip51_list(handler: HookHandler<NewNip51ListContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.NEW_NIP51_LIST, handler);
  }
}

