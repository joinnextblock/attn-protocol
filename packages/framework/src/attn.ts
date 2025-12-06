/**
 * Attn - Main class for attn-framework
 * Provides Rely-style on_* methods for hook registration
 * Manages Nostr relay connection internally
 */

import { HookEmitter } from './hooks/emitter.js';
import { HOOK_NAMES } from './hooks/index.js';
import { RelayConnection } from './relay/connection.js';
import type { RelayConnectionConfig } from './relay/connection.js';
import type { Logger } from './logger.js';
import type {
  HookHandler,
  BeforeHookHandler,
  AfterHookHandler,
  HookHandle,
  HookContext,
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
} from './hooks/types.js';

export interface AttnConfig {
  relays: string[];
  private_key: Uint8Array;
  node_pubkeys: string[];
  marketplace_pubkeys?: string[];
  billboard_pubkeys?: string[];
  advertiser_pubkeys?: string[];
  auto_reconnect?: boolean; // Default: true
  deduplicate?: boolean; // Default: true
  connection_timeout_ms?: number; // Default: 30000
  reconnect_delay_ms?: number; // Default: 5000
  max_reconnect_attempts?: number; // Default: 10
  auth_timeout_ms?: number; // Default: 10000
  logger?: Logger; // Optional logger, defaults to Pino logger
}

/**
 * Main Attn class providing Rely-style hook registration
 * Manages connections internally
 */
export class Attn {
  private emitter: HookEmitter;
  private config: AttnConfig;
  private relay_connections: Map<string, RelayConnection> = new Map();

  constructor(config: AttnConfig) {
    this.emitter = new HookEmitter(config.logger);
    this.config = config;
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
   * Requires at least one relay URL and trusted node pubkeys
   */
  async connect(): Promise<void> {
    this.validate_config();
    const connect_promises = this.config.relays.map((relay_url) => this.connect_relay(relay_url));
    await Promise.all(connect_promises);
  }

  /**
   * Disconnect from Nostr relay
   */
  async disconnect(reason?: string): Promise<void> {
    const disconnect_promises = Array.from(this.relay_connections.values()).map((connection) =>
      connection.disconnect(reason)
    );
    await Promise.all(disconnect_promises);
  }

  /**
   * Check if relay is currently connected
   */
  get connected(): boolean {
    for (const connection of this.relay_connections.values()) {
      if (connection.connected) {
        return true;
      }
    }
    return false;
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
   * Register handler for new marketplace events
   */
  on_new_marketplace(handler: HookHandler<NewMarketplaceContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.NEW_MARKETPLACE, handler);
  }

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
   * Register handler for attention confirmation events
   */
  on_attention_confirm(handler: HookHandler<AttentionConfirmContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.ATTENTION_CONFIRM, handler);
  }

  /**
   * Register handler for marketplace confirmed events
   */
  on_marketplace_confirmed(handler: HookHandler<MarketplaceConfirmedContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.MARKETPLACE_CONFIRMED, handler);
  }

  /**
   * Register handler for attention payment confirmation events
   */
  on_attention_payment_confirm(handler: HookHandler<AttentionPaymentConfirmContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.ATTENTION_PAYMENT_CONFIRM, handler);
  }

  // Block synchronization hooks

  /**
   * Register handler for new block events
   */
  on_new_block(handler: HookHandler<NewBlockContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.NEW_BLOCK, handler);
  }

  /**
   * Register handler before block events fire
   */
  before_new_block(handler: BeforeHookHandler<NewBlockContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.BEFORE_NEW_BLOCK, handler);
  }

  /**
   * Register handler after block events fire
   */
  after_new_block(handler: AfterHookHandler<NewBlockContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.AFTER_NEW_BLOCK, handler);
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

  /**
   * Validate base configuration
   */
  private validate_config(): void {
    if (!this.config?.relays?.length) {
      throw new Error('At least one relay URL is required');
    }
    if (!this.config.private_key || !(this.config.private_key instanceof Uint8Array)) {
      throw new Error('private_key (Uint8Array) is required');
    }
    if (!this.config.node_pubkeys || this.config.node_pubkeys.length === 0) {
      throw new Error('node_pubkeys configuration is required for block synchronization');
    }
  }

  /**
   * Connect (or reuse connection) for a specific relay URL
   */
  private async connect_relay(relay_url: string): Promise<void> {
    let connection = this.relay_connections.get(relay_url);
    if (!connection) {
      const relay_config: RelayConnectionConfig = {
        relay_url,
        private_key: this.config.private_key,
        node_pubkeys: this.config.node_pubkeys,
        marketplace_pubkeys: this.config.marketplace_pubkeys,
        billboard_pubkeys: this.config.billboard_pubkeys,
        advertiser_pubkeys: this.config.advertiser_pubkeys,
        connection_timeout_ms: this.config.connection_timeout_ms,
        reconnect_delay_ms: this.config.reconnect_delay_ms,
        max_reconnect_attempts: this.config.max_reconnect_attempts,
        auth_timeout_ms: this.config.auth_timeout_ms,
        auto_reconnect: this.config.auto_reconnect,
        deduplicate: this.config.deduplicate,
        logger: this.config.logger,
      };
      connection = new RelayConnection(relay_config, this.emitter);
      this.relay_connections.set(relay_url, connection);
    }
    await connection.connect();
  }
}

