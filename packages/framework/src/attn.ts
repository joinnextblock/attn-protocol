/**
 * Attn - Main class for attn-framework
 * Provides Rely-style on_* methods for hook registration
 * Manages Nostr relay connection internally
 */

import { HookEmitter } from './hooks/emitter.js';
import { HOOK_NAMES } from './hooks/index.js';
import { RelayConnection } from './relay/connection.js';
import { Publisher } from './relay/publisher.js';
import type { RelayConnectionConfig } from './relay/connection.js';
import type { WriteRelay } from './relay/publisher.js';
import type { Logger } from './logger.js';
import { create_default_logger } from './logger.js';
import type {
  HookHandler,
  BeforeHookHandler,
  AfterHookHandler,
  HookHandle,
  HookContext,
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
  ProfilePublishedContext,
  ProfileEventContext,
  RelayListEventContext,
  Nip51ListEventContext,
} from './hooks/types.js';

/**
 * Relay configuration with auth requirement
 */
export interface RelayWithAuth {
  url: string;
  requires_auth: boolean;
}

/**
 * Profile metadata for kind 0 events (NIP-01)
 */
export interface ProfileConfig {
  name: string;
  about?: string;
  picture?: string;
  banner?: string;
  website?: string;
  nip05?: string;
  lud16?: string;
  display_name?: string;
  bot?: boolean;
}

export interface AttnConfig {
  relays?: string[]; // Default: ['wss://relay.attnprotocol.org'] - deprecated, use relays_auth/relays_noauth
  relays_auth?: string[]; // Relays requiring NIP-42 authentication
  relays_noauth?: string[]; // Relays not requiring authentication
  private_key: Uint8Array;
  node_pubkeys?: string[]; // Optional - if not provided, block events won't be filtered by node
  marketplace_pubkeys?: string[];
  marketplace_d_tags?: string[]; // Filter marketplace events by d-tags (for subscribing to specific marketplaces)
  billboard_pubkeys?: string[];
  advertiser_pubkeys?: string[];
  auto_reconnect?: boolean; // Default: true
  deduplicate?: boolean; // Default: true
  connection_timeout_ms?: number; // Default: 30000
  reconnect_delay_ms?: number; // Default: 5000
  max_reconnect_attempts?: number; // Default: 10
  auth_timeout_ms?: number; // Default: 10000
  logger?: Logger; // Optional logger, defaults to Pino logger
  subscription_since?: number; // Unix timestamp to filter events (prevents infinite backlog on restart)

  // Write relays (for publishing events, separate from subscription relays)
  relays_write_auth?: string[]; // Write relays requiring NIP-42 authentication
  relays_write_noauth?: string[]; // Write relays not requiring authentication

  // Identity publishing (optional)
  profile?: ProfileConfig; // Profile metadata for kind 0 event
  follows?: string[]; // Optional follow list pubkeys for kind 3 event (NIP-02)
  publish_identity_on_connect?: boolean; // Auto-publish kind 0, 10002, and 3 on connect (default: true if profile is set)
}

/**
 * Main Attn class providing Rely-style hook registration
 * Manages connections internally
 */
export class Attn {
  private emitter: HookEmitter;
  private config: AttnConfig;
  private logger: Logger;
  private relay_list: RelayWithAuth[] = [];
  private write_relay_list: WriteRelay[] = [];
  private relay_connections: Map<string, RelayConnection> = new Map();
  private publisher: Publisher | null = null;
  private identity_published: boolean = false;

  constructor(config: AttnConfig) {
    this.emitter = new HookEmitter(config.logger);
    this.config = config;
    this.logger = config.logger ?? create_default_logger();

    // Build relay list with auth requirements
    // Priority: relays_auth/relays_noauth > relays (deprecated)
    if (config.relays_auth || config.relays_noauth) {
      // New explicit auth configuration
      for (const url of config.relays_auth ?? []) {
        this.relay_list.push({ url, requires_auth: true });
      }
      for (const url of config.relays_noauth ?? []) {
        this.relay_list.push({ url, requires_auth: false });
      }
    } else if (config.relays) {
      // Legacy config - assume all relays require auth (backward compat)
      for (const url of config.relays) {
        this.relay_list.push({ url, requires_auth: true });
      }
    } else {
      // Default relay
      this.relay_list.push({ url: 'wss://relay.attnprotocol.org', requires_auth: false });
    }

    // Build write relay list
    // Priority: relays_write_auth/relays_write_noauth > subscription relays
    if (config.relays_write_auth || config.relays_write_noauth) {
      for (const url of config.relays_write_auth ?? []) {
        this.write_relay_list.push({ url, requires_auth: true });
      }
      for (const url of config.relays_write_noauth ?? []) {
        this.write_relay_list.push({ url, requires_auth: false });
      }
    } else {
      // Default to subscription relays for writing
      this.write_relay_list = this.relay_list.map((r) => ({ url: r.url, requires_auth: r.requires_auth }));
    }

    // Initialize publisher if we have write relays
    if (this.write_relay_list.length > 0) {
      this.publisher = new Publisher({
        private_key: config.private_key,
        write_relays: this.write_relay_list,
        read_relays: this.relay_list.map((r) => r.url),
        logger: this.logger,
        auth_timeout_ms: config.auth_timeout_ms,
      });
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
   * Requires at least one relay URL and trusted node pubkeys
   * If profile is configured, publishes kind 0 and kind 10002 after connecting
   */
  async connect(): Promise<void> {
    this.validate_config();
    const connect_promises = this.relay_list.map((relay) => this.connect_relay(relay.url, relay.requires_auth));
    await Promise.all(connect_promises);

    // Publish profile if configured and not already published
    const should_publish = this.config.publish_identity_on_connect ?? (this.config.profile !== undefined);
    if (should_publish && this.config.profile && !this.identity_published) {
      await this.publish_profile();
    }
  }

  /**
   * Publish profile (kind 0 profile, kind 10002 relay list, and optionally kind 3 follow list)
   * Called automatically on connect if profile is configured
   * @throws Error if profile is not configured
   */
  async publish_profile(): Promise<void> {
    if (!this.config.profile) {
      throw new Error('Cannot publish profile: profile is required but not configured');
    }
    if (!this.publisher) {
      throw new Error('Cannot publish profile: publisher not initialized (no write relays configured)');
    }

    const has_follows = this.config.follows && this.config.follows.length > 0;
    this.logger.info(
      { has_follows },
      `Publishing profile (kind 0, kind 10002${has_follows ? ', kind 3' : ''})`
    );

    try {
      // Publish profile (kind 0)
      const profile_results = await this.publisher.publish_profile(this.config.profile);
      this.logger.info(
        {
          event_id: profile_results.event_id.substring(0, 16),
          success_count: profile_results.success_count,
          failure_count: profile_results.failure_count,
        },
        'Published kind 0 profile event'
      );

      // Publish relay list (kind 10002)
      const relay_list_results = await this.publisher.publish_relay_list();
      this.logger.info(
        {
          event_id: relay_list_results.event_id.substring(0, 16),
          success_count: relay_list_results.success_count,
          failure_count: relay_list_results.failure_count,
        },
        'Published kind 10002 relay list event'
      );

      // Publish follow list (kind 3) if configured
      let follow_list_results: typeof profile_results | null = null;
      if (has_follows) {
        follow_list_results = await this.publisher.publish_follow_list(this.config.follows!);
        this.logger.info(
          {
            event_id: follow_list_results.event_id.substring(0, 16),
            follows_count: this.config.follows!.length,
            success_count: follow_list_results.success_count,
            failure_count: follow_list_results.failure_count,
          },
          'Published kind 3 follow list event'
        );
      }

      this.identity_published = true;

      // Emit hook
      const all_results = [
        ...profile_results.results,
        ...relay_list_results.results,
        ...(follow_list_results?.results ?? []),
      ];
      const context: ProfilePublishedContext = {
        profile_event_id: profile_results.event_id,
        relay_list_event_id: relay_list_results.event_id,
        follow_list_event_id: follow_list_results?.event_id,
        results: all_results,
        success_count: profile_results.success_count + relay_list_results.success_count + (follow_list_results?.success_count ?? 0),
        failure_count: profile_results.failure_count + relay_list_results.failure_count + (follow_list_results?.failure_count ?? 0),
      };
      await this.emitter.emit(HOOK_NAMES.PROFILE_PUBLISHED, context);
    } catch (error) {
      this.logger.error(
        { err: error },
        'Failed to publish profile'
      );
      throw error;
    }
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

  // ATTN Protocol event hooks - Marketplace

  /**
   * Register handler before marketplace events
   */
  before_marketplace_event(handler: BeforeHookHandler<MarketplaceEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.BEFORE_MARKETPLACE_EVENT, handler);
  }

  /**
   * Register handler for marketplace events
   */
  on_marketplace_event(handler: HookHandler<MarketplaceEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.MARKETPLACE_EVENT, handler);
  }

  /**
   * Register handler after marketplace events
   */
  after_marketplace_event(handler: AfterHookHandler<MarketplaceEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.AFTER_MARKETPLACE_EVENT, handler);
  }

  // ATTN Protocol event hooks - Billboard

  /**
   * Register handler before billboard events
   */
  before_billboard_event(handler: BeforeHookHandler<BillboardEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.BEFORE_BILLBOARD_EVENT, handler);
  }

  /**
   * Register handler for billboard events
   */
  on_billboard_event(handler: HookHandler<BillboardEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.BILLBOARD_EVENT, handler);
  }

  /**
   * Register handler after billboard events
   */
  after_billboard_event(handler: AfterHookHandler<BillboardEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.AFTER_BILLBOARD_EVENT, handler);
  }

  // ATTN Protocol event hooks - Promotion

  /**
   * Register handler before promotion events
   */
  before_promotion_event(handler: BeforeHookHandler<PromotionEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.BEFORE_PROMOTION_EVENT, handler);
  }

  /**
   * Register handler for promotion events
   */
  on_promotion_event(handler: HookHandler<PromotionEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.PROMOTION_EVENT, handler);
  }

  /**
   * Register handler after promotion events
   */
  after_promotion_event(handler: AfterHookHandler<PromotionEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.AFTER_PROMOTION_EVENT, handler);
  }

  // ATTN Protocol event hooks - Attention

  /**
   * Register handler before attention events
   */
  before_attention_event(handler: BeforeHookHandler<AttentionEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.BEFORE_ATTENTION_EVENT, handler);
  }

  /**
   * Register handler for attention events
   */
  on_attention_event(handler: HookHandler<AttentionEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.ATTENTION_EVENT, handler);
  }

  /**
   * Register handler after attention events
   */
  after_attention_event(handler: AfterHookHandler<AttentionEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.AFTER_ATTENTION_EVENT, handler);
  }

  // ATTN Protocol event hooks - Match

  /**
   * Register handler before match events
   */
  before_match_event(handler: BeforeHookHandler<MatchEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.BEFORE_MATCH_EVENT, handler);
  }

  /**
   * Register handler for match events
   */
  on_match_event(handler: HookHandler<MatchEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.MATCH_EVENT, handler);
  }

  /**
   * Register handler after match events
   */
  after_match_event(handler: AfterHookHandler<MatchEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.AFTER_MATCH_EVENT, handler);
  }

  /**
   * Register handler for match published events
   */
  on_match_published(handler: HookHandler<MatchPublishedContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.MATCH_PUBLISHED, handler);
  }

  // Confirmation event hooks - Billboard Confirmation

  /**
   * Register handler before billboard confirmation events
   */
  before_billboard_confirmation_event(handler: BeforeHookHandler<BillboardConfirmationEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.BEFORE_BILLBOARD_CONFIRMATION_EVENT, handler);
  }

  /**
   * Register handler for billboard confirmation events
   */
  on_billboard_confirmation_event(handler: HookHandler<BillboardConfirmationEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.BILLBOARD_CONFIRMATION_EVENT, handler);
  }

  /**
   * Register handler after billboard confirmation events
   */
  after_billboard_confirmation_event(handler: AfterHookHandler<BillboardConfirmationEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.AFTER_BILLBOARD_CONFIRMATION_EVENT, handler);
  }

  // Confirmation event hooks - Attention Confirmation

  /**
   * Register handler before attention confirmation events
   */
  before_attention_confirmation_event(handler: BeforeHookHandler<AttentionConfirmationEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.BEFORE_ATTENTION_CONFIRMATION_EVENT, handler);
  }

  /**
   * Register handler for attention confirmation events
   */
  on_attention_confirmation_event(handler: HookHandler<AttentionConfirmationEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.ATTENTION_CONFIRMATION_EVENT, handler);
  }

  /**
   * Register handler after attention confirmation events
   */
  after_attention_confirmation_event(handler: AfterHookHandler<AttentionConfirmationEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.AFTER_ATTENTION_CONFIRMATION_EVENT, handler);
  }

  // Confirmation event hooks - Marketplace Confirmation

  /**
   * Register handler before marketplace confirmation events
   */
  before_marketplace_confirmation_event(handler: BeforeHookHandler<MarketplaceConfirmationEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.BEFORE_MARKETPLACE_CONFIRMATION_EVENT, handler);
  }

  /**
   * Register handler for marketplace confirmation events
   */
  on_marketplace_confirmation_event(handler: HookHandler<MarketplaceConfirmationEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.MARKETPLACE_CONFIRMATION_EVENT, handler);
  }

  /**
   * Register handler after marketplace confirmation events
   */
  after_marketplace_confirmation_event(handler: AfterHookHandler<MarketplaceConfirmationEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.AFTER_MARKETPLACE_CONFIRMATION_EVENT, handler);
  }

  // Confirmation event hooks - Attention Payment Confirmation

  /**
   * Register handler before attention payment confirmation events
   */
  before_attention_payment_confirmation_event(handler: BeforeHookHandler<AttentionPaymentConfirmationEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.BEFORE_ATTENTION_PAYMENT_CONFIRMATION_EVENT, handler);
  }

  /**
   * Register handler for attention payment confirmation events
   */
  on_attention_payment_confirmation_event(handler: HookHandler<AttentionPaymentConfirmationEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.ATTENTION_PAYMENT_CONFIRMATION_EVENT, handler);
  }

  /**
   * Register handler after attention payment confirmation events
   */
  after_attention_payment_confirmation_event(handler: AfterHookHandler<AttentionPaymentConfirmationEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.AFTER_ATTENTION_PAYMENT_CONFIRMATION_EVENT, handler);
  }

  // Block synchronization hooks

  /**
   * Register handler before block events
   */
  before_block_event(handler: BeforeHookHandler<BlockEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.BEFORE_BLOCK_EVENT, handler);
  }

  /**
   * Register handler for block events
   */
  on_block_event(handler: HookHandler<BlockEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.BLOCK_EVENT, handler);
  }

  /**
   * Register handler after block events
   */
  after_block_event(handler: AfterHookHandler<BlockEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.AFTER_BLOCK_EVENT, handler);
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

  // Identity publishing hooks

  /**
   * Register handler for profile published events
   * Emitted after kind 0 and kind 10002 are published on connect
   */
  on_profile_published(handler: HookHandler<ProfilePublishedContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.PROFILE_PUBLISHED, handler);
  }

  // Standard Nostr event hooks - Profile

  /**
   * Register handler before profile events (kind 0)
   */
  before_profile_event(handler: BeforeHookHandler<ProfileEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.BEFORE_PROFILE_EVENT, handler);
  }

  /**
   * Register handler for profile events (kind 0)
   */
  on_profile_event(handler: HookHandler<ProfileEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.PROFILE_EVENT, handler);
  }

  /**
   * Register handler after profile events (kind 0)
   */
  after_profile_event(handler: AfterHookHandler<ProfileEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.AFTER_PROFILE_EVENT, handler);
  }

  // Standard Nostr event hooks - Relay List

  /**
   * Register handler before relay list events (kind 10002)
   */
  before_relay_list_event(handler: BeforeHookHandler<RelayListEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.BEFORE_RELAY_LIST_EVENT, handler);
  }

  /**
   * Register handler for relay list events (kind 10002)
   */
  on_relay_list_event(handler: HookHandler<RelayListEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.RELAY_LIST_EVENT, handler);
  }

  /**
   * Register handler after relay list events (kind 10002)
   */
  after_relay_list_event(handler: AfterHookHandler<RelayListEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.AFTER_RELAY_LIST_EVENT, handler);
  }

  // Standard Nostr event hooks - NIP-51 List

  /**
   * Register handler before NIP-51 list events (kind 30000)
   */
  before_nip51_list_event(handler: BeforeHookHandler<Nip51ListEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.BEFORE_NIP51_LIST_EVENT, handler);
  }

  /**
   * Register handler for NIP-51 list events (kind 30000)
   */
  on_nip51_list_event(handler: HookHandler<Nip51ListEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.NIP51_LIST_EVENT, handler);
  }

  /**
   * Register handler after NIP-51 list events (kind 30000)
   */
  after_nip51_list_event(handler: AfterHookHandler<Nip51ListEventContext>): HookHandle {
    return this.emitter.register(HOOK_NAMES.AFTER_NIP51_LIST_EVENT, handler);
  }

  /**
   * Validate base configuration
   */
  private validate_config(): void {
    // relay_list is now guaranteed to have a default value from constructor
    if (this.relay_list.length === 0) {
      throw new Error('At least one relay URL is required');
    }
    if (!this.config.private_key || !(this.config.private_key instanceof Uint8Array)) {
      throw new Error('private_key (Uint8Array) is required');
    }
    // node_pubkeys is optional - if not provided, block events won't be filtered by node
  }

  /**
   * Connect (or reuse connection) for a specific relay URL
   * @param relay_url - WebSocket URL of the relay
   * @param requires_auth - Whether relay requires NIP-42 authentication
   */
  private async connect_relay(relay_url: string, requires_auth: boolean = true): Promise<void> {
    let connection = this.relay_connections.get(relay_url);
    if (!connection) {
      const relay_config: RelayConnectionConfig = {
        relay_url,
        requires_auth,
        private_key: this.config.private_key,
        node_pubkeys: this.config.node_pubkeys,
        marketplace_pubkeys: this.config.marketplace_pubkeys,
        marketplace_d_tags: this.config.marketplace_d_tags,
        billboard_pubkeys: this.config.billboard_pubkeys,
        advertiser_pubkeys: this.config.advertiser_pubkeys,
        connection_timeout_ms: this.config.connection_timeout_ms,
        reconnect_delay_ms: this.config.reconnect_delay_ms,
        max_reconnect_attempts: this.config.max_reconnect_attempts,
        auth_timeout_ms: this.config.auth_timeout_ms,
        auto_reconnect: this.config.auto_reconnect,
        deduplicate: this.config.deduplicate,
        logger: this.config.logger,
        subscription_since: this.config.subscription_since,
      };
      connection = new RelayConnection(relay_config, this.emitter);
      this.relay_connections.set(relay_url, connection);
    }
    await connection.connect();
  }
}

