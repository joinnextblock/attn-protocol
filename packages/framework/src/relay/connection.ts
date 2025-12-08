/**
 * Nostr relay connection manager for attn framework
 * Orchestrates connection lifecycle, authentication, subscriptions, and event handling
 */

import type { Event } from 'nostr-tools';
import { HookEmitter } from '../hooks/emitter.js';
import { HOOK_NAMES } from '../hooks/index.js';
import type { Logger } from '../logger.js';
import { create_default_logger } from '../logger.js';
import type { RelayConnectContext, RelayDisconnectContext } from '../hooks/types.js';

// Import sub-modules
import { get_websocket_impl, WS_READY_STATE } from './websocket.js';
import type { WebSocketWithOn } from './websocket.js';
import { AuthHandler } from './auth.js';
import { SubscriptionManager } from './subscriptions.js';
import { EventHandlers } from './handlers.js';

const WebSocket = get_websocket_impl();

/**
 * Relay connection configuration
 */
export interface RelayConnectionConfig {
  relay_url: string;
  requires_auth?: boolean;
  private_key: Uint8Array;
  node_pubkeys?: string[];
  marketplace_pubkeys?: string[];
  marketplace_d_tags?: string[];
  billboard_pubkeys?: string[];
  advertiser_pubkeys?: string[];
  connection_timeout_ms?: number;
  reconnect_delay_ms?: number;
  max_reconnect_attempts?: number;
  auth_timeout_ms?: number;
  auto_reconnect?: boolean;
  deduplicate?: boolean;
  logger?: Logger;
  subscription_since?: number;
}

/**
 * Nostr relay connection manager
 * Manages connection to Nostr relay and handles events
 */
export class RelayConnection {
  private ws: WebSocketWithOn | null = null;
  private config: RelayConnectionConfig;
  private hooks: HookEmitter;
  private logger: Logger;

  // Sub-modules
  private auth_handler: AuthHandler;
  private subscription_manager: SubscriptionManager;
  private event_handlers: EventHandlers;

  // Connection state
  private is_connected: boolean = false;
  private requires_auth: boolean;
  private connection_timeout_ms: number;
  private reconnect_delay_ms: number;
  private max_reconnect_attempts: number;
  private auto_reconnect: boolean;
  private reconnect_attempts: number = 0;
  private reconnect_timeout: NodeJS.Timeout | null = null;
  private message_handler: ((data: string | Buffer | ArrayBuffer | Buffer[]) => void) | null = null;

  constructor(config: RelayConnectionConfig, hooks: HookEmitter) {
    this.config = config;
    this.hooks = hooks;
    this.logger = config.logger ?? create_default_logger();

    // Configuration defaults
    this.requires_auth = config.requires_auth === true;
    this.connection_timeout_ms = config.connection_timeout_ms ?? 30000;
    this.reconnect_delay_ms = config.reconnect_delay_ms ?? 5000;
    this.max_reconnect_attempts = config.max_reconnect_attempts ?? 10;
    this.auto_reconnect = config.auto_reconnect !== false;

    // Initialize sub-modules
    this.auth_handler = new AuthHandler({
      relay_url: config.relay_url,
      private_key: config.private_key,
      auth_timeout_ms: config.auth_timeout_ms ?? 10000,
      logger: this.logger,
    });

    this.subscription_manager = new SubscriptionManager({
      relay_url: config.relay_url,
      node_pubkeys: config.node_pubkeys,
      marketplace_pubkeys: config.marketplace_pubkeys,
      marketplace_d_tags: config.marketplace_d_tags,
      billboard_pubkeys: config.billboard_pubkeys,
      advertiser_pubkeys: config.advertiser_pubkeys,
      subscription_since: config.subscription_since,
      logger: this.logger,
      hooks,
    });

    this.event_handlers = new EventHandlers({
      hooks,
      logger: this.logger,
      relay_url: config.relay_url,
    });
  }

  /**
   * Connect to Nostr relay
   * Emits on_relay_connect hook on success
   */
  async connect(): Promise<void> {
    if (this.is_connected && this.ws && this.ws.readyState === WS_READY_STATE.OPEN) {
      return;
    }

    if (!this.config.private_key) {
      throw new Error('private_key required for relay connection');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.ws) {
          this.ws.close();
        }
        reject(new Error(`Connection timeout for ${this.config.relay_url}`));
      }, this.connection_timeout_ms);

      try {
        this.ws = new WebSocket(this.config.relay_url) as WebSocketWithOn;

        this.ws.on('open', () => {
          clearTimeout(timeout);
          this.is_connected = true;
          this.auth_handler.reset();
          this.reconnect_attempts = 0;

          if (this.requires_auth) {
            this.logger.info({ relay_url: this.config.relay_url }, 'WebSocket opened, waiting for AUTH challenge');
          } else {
            this.logger.info({ relay_url: this.config.relay_url }, 'WebSocket opened, no auth required');
          }

          // Set up message handler
          this.setup_message_handler(resolve, reject);

          if (this.requires_auth) {
            // Wait for AUTH challenge
            this.auth_handler.start_auth_challenge_timeout(() => {
              this.on_authentication_complete(resolve);
            });
          } else {
            // No auth required - proceed immediately
            this.auth_handler.set_authenticated(true);
            this.on_authentication_complete(resolve);
          }
        });

        this.ws.on('error', (error) => {
          clearTimeout(timeout);
          const err = this.normalize_error(error, 'WebSocket connection error');
          this.logger.error({ relay_url: this.config.relay_url, error: err.message }, 'WebSocket error');
          this.handle_disconnect('Connection error', err);
          reject(err);
        });

        this.ws.on('close', (code, reason) => {
          clearTimeout(timeout);
          const reason_str = reason ? reason.toString() : undefined;
          this.logger.info(
            { relay_url: this.config.relay_url, code, reason: reason_str || 'none' },
            'Connection closed'
          );
          if (this.is_connected) {
            this.handle_disconnect(`Connection closed: code=${code}, reason=${reason_str || 'none'}`);
          }
          this.schedule_reconnect();
        });
      } catch (error) {
        clearTimeout(timeout);
        const err = this.normalize_error(error, 'Failed to create WebSocket');
        this.logger.error({ relay_url: this.config.relay_url, error: err.message }, 'Failed to create WebSocket');
        reject(err);
      }
    });
  }

  /**
   * Disconnect from relay
   * Emits on_relay_disconnect hook
   */
  async disconnect(reason?: string): Promise<void> {
    if (this.reconnect_timeout) {
      clearTimeout(this.reconnect_timeout);
      this.reconnect_timeout = null;
    }

    this.auth_handler.clear_timeout();

    if (!this.is_connected && (!this.ws || this.ws.readyState === WS_READY_STATE.CLOSED)) {
      return;
    }

    try {
      if (this.ws) {
        // Close all subscriptions
        if (this.ws.readyState === WS_READY_STATE.OPEN) {
          this.subscription_manager.close_all(this.ws);
        }

        if (this.ws.removeAllListeners) {
          this.ws.removeAllListeners();
        }
        this.ws.close();
      }

      this.cleanup_connection_state();

      const context: RelayDisconnectContext = {
        relay_url: this.config.relay_url,
        reason: reason ?? 'Disconnected',
      };
      await this.hooks.emit(HOOK_NAMES.RELAY_DISCONNECT, context);
    } catch (error) {
      const err = this.normalize_error(error, 'Error during disconnect');

      const context: RelayDisconnectContext = {
        relay_url: this.config.relay_url,
        reason: 'Error during disconnect',
        error: err,
      };
      await this.hooks.emit(HOOK_NAMES.RELAY_DISCONNECT, context);
      throw err;
    }
  }

  /**
   * Check if currently connected
   */
  get connected(): boolean {
    return this.is_connected && this.ws !== null && this.ws.readyState === WS_READY_STATE.OPEN;
  }

  /**
   * Check if authenticated (for tests and debugging)
   */
  get is_authenticated(): boolean {
    return this.auth_handler.is_authenticated;
  }

  /**
   * Get current relay URL
   */
  get relay_url(): string {
    return this.config.relay_url;
  }

  /**
   * Get block subscription ID (for tests and debugging)
   */
  get subscription_id(): string {
    return this.subscription_manager.subscription_ids.block;
  }

  /**
   * Get ATTN subscription IDs (for tests and debugging)
   */
  get attn_subscription_ids(): string[] {
    return this.subscription_manager.subscription_ids.attn;
  }

  /**
   * Get standard subscription ID (for tests and debugging)
   */
  get standard_subscription_id(): string {
    return this.subscription_manager.subscription_ids.standard;
  }

  /**
   * Get NIP-51 subscription ID (for tests and debugging)
   */
  get nip51_lists_subscription_id(): string {
    return this.subscription_manager.subscription_ids.nip51;
  }

  // ============================================================================
  // Private methods
  // ============================================================================

  /**
   * Set up message handler for WebSocket
   */
  private setup_message_handler(
    resolve: () => void,
    reject: (error: Error) => void
  ): void {
    this.message_handler = (data: string | Buffer | ArrayBuffer | Buffer[]) => {
      try {
        const message = JSON.parse(data.toString());
        const [type, ...rest] = message;

        // Handle AUTH challenge (NIP-42)
        if (type === 'AUTH') {
          const challenge = rest[0];
          if (challenge && typeof challenge === 'string') {
            this.logger.debug({ relay_url: this.config.relay_url }, 'Received AUTH challenge from relay');
            this.auth_handler.handle_auth_challenge(
              challenge,
              this.ws!,
              () => this.on_authentication_complete(resolve),
              reject
            );
            return;
          }
        }

        // Handle OK response for authentication
        if (type === 'OK' && !this.auth_handler.is_authenticated && this.auth_handler.auth_event_id) {
          const event_id = rest[0];
          const accepted = rest[1];
          const reason = rest[2];

          const result = this.auth_handler.handle_auth_ok_response(event_id, accepted, reason);
          if (result.success) {
            this.on_authentication_complete(resolve);
          } else if (result.error) {
            reject(result.error);
          }
          return;
        }

        // Handle regular messages (only after authentication completes)
        if (this.auth_handler.is_authenticated) {
          this.handle_authenticated_message(type, rest);
        }
      } catch {
        // Ignore parse errors
      }
    };

    this.ws!.on('message', this.message_handler);
  }

  /**
   * Handle messages after authentication is complete
   */
  private handle_authenticated_message(type: string, rest: unknown[]): void {
    if (type === 'EVENT') {
      const subscription_id = rest[0] as string;
      const event = rest[1] as Event;
      this.route_event(subscription_id, event);
    } else if (type === 'EOSE') {
      const subscription_id = rest[0] as string;
      this.subscription_manager.emit_subscription_confirmed(subscription_id);
    } else if (type === 'NOTICE') {
      const notice = rest[0] || '';
      if (typeof notice === 'string' && notice.toLowerCase().includes('error')) {
        this.logger.error({ relay_url: this.config.relay_url, notice }, 'Relay error notice');
      } else {
        this.logger.info({ relay_url: this.config.relay_url, notice }, 'Relay NOTICE');
      }
    }
  }

  /**
   * Route event to appropriate handler based on subscription ID
   */
  private route_event(subscription_id: string, event: Event): void {
    const subs = this.subscription_manager.subscription_ids;

    if (subscription_id === subs.block) {
      this.event_handlers.handle_block_event(event);
    } else if (subs.attn.includes(subscription_id)) {
      this.event_handlers.handle_attn_event(event);
    } else if (subscription_id === subs.standard || subscription_id === subs.nip51) {
      this.event_handlers.handle_standard_event(event);
    }
  }

  /**
   * Called when authentication is complete (success or not required)
   */
  private on_authentication_complete(resolve: () => void): void {
    this.logger.debug({ relay_url: this.config.relay_url }, 'Authentication complete, subscribing to events');
    this.subscription_manager.subscribe_all(this.ws!);

    const context: RelayConnectContext = {
      relay_url: this.config.relay_url,
    };
    this.hooks.emit(HOOK_NAMES.RELAY_CONNECT, context).then(() => {
      resolve();
    });
  }

  /**
   * Handle disconnect and emit hook
   */
  private async handle_disconnect(reason: string, error?: Error): Promise<void> {
    this.is_connected = false;

    const context: RelayDisconnectContext = {
      relay_url: this.config.relay_url,
      reason,
      error,
    };

    await this.hooks.emit(HOOK_NAMES.RELAY_DISCONNECT, context);
  }

  /**
   * Clean up connection state
   */
  private cleanup_connection_state(): void {
    this.ws = null;
    this.message_handler = null;
    this.is_connected = false;
    this.auth_handler.reset();
  }

  /**
   * Schedule reconnection attempt
   */
  private schedule_reconnect(): void {
    if (!this.auto_reconnect) {
      return;
    }
    if (this.reconnect_timeout) {
      return; // Already scheduled
    }

    if (this.reconnect_attempts >= this.max_reconnect_attempts) {
      this.logger.error(
        { relay_url: this.config.relay_url, max_attempts: this.max_reconnect_attempts },
        'Max reconnection attempts reached'
      );
      return;
    }

    const delay = this.reconnect_delay_ms * Math.pow(2, this.reconnect_attempts);
    this.reconnect_attempts++;

    this.logger.info(
      {
        relay_url: this.config.relay_url,
        delay_ms: delay,
        attempt: this.reconnect_attempts,
        max_attempts: this.max_reconnect_attempts,
      },
      'Will attempt to reconnect'
    );

    this.reconnect_timeout = setTimeout(() => {
      this.reconnect_timeout = null;
      this.connect().catch((error) => {
        this.logger.error(
          { relay_url: this.config.relay_url, error: error instanceof Error ? error.message : String(error) },
          'Reconnection failed'
        );
      });
    }, delay);
  }

  /**
   * Normalize various error types to Error objects
   */
  private normalize_error(error: unknown, default_message: string): Error {
    if (error instanceof Error) {
      return error;
    }

    if (error && typeof error === 'object') {
      const error_obj = error as Record<string, unknown>;
      const error_message =
        (typeof error_obj.message === 'string' && error_obj.message) ||
        (typeof error_obj.type === 'string' && `WebSocket error: ${error_obj.type}`) ||
        (error_obj.toString &&
          typeof error_obj.toString === 'function' &&
          error_obj.toString() !== '[object Object]'
          ? error_obj.toString()
          : null) ||
        default_message;

      const err = new Error(error_message);
      if (error_obj.code) {
        (err as Error & { code?: unknown }).code = error_obj.code;
      }
      if (error_obj.type) {
        (err as Error & { type?: unknown }).type = error_obj.type;
      }
      return err;
    }

    return new Error(`${default_message}: ${String(error)}`);
  }
}
