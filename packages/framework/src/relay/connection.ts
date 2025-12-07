/**
 * Nostr relay connection manager for attn framework
 * Handles connection lifecycle and emits hooks for block events
 */

import WebSocketBase from 'isomorphic-ws';
import type { Event } from 'nostr-tools';

// Browser-compatible WebSocket wrapper
// In browser, isomorphic-ws uses native WebSocket but doesn't expose .on() method
// We create a compatibility wrapper that adds .on() support
type WebSocketWithOn = WebSocketBase & {
  on(event: string, handler: Function): void;
  off?(event: string, handler?: Function): void;
  removeAllListeners?(): void;
};

function get_websocket_impl(): typeof WebSocketBase {
  // Check if we're in browser environment
  if (typeof globalThis !== 'undefined' && 'window' in globalThis && (globalThis as any).window?.WebSocket) {
    // Browser: Create wrapper that adds .on() method to native WebSocket
    const NativeWS = (globalThis as any).window.WebSocket;
    class BrowserWebSocketCompat extends NativeWS {
      private _listeners: Map<string, Set<Function>> = new Map();

      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        this._setupEventListeners();
      }

      private _setupEventListeners() {
        // Map native addEventListener to .on() style
        super.addEventListener('open', (event: Event) => {
          this._emit('open', event);
        });

        super.addEventListener('message', (event: MessageEvent) => {
          this._emit('message', event.data);
        });

        super.addEventListener('error', (event: Event) => {
          this._emit('error', event);
        });

        super.addEventListener('close', (event: Event) => {
          const close_event = event as { code?: number; reason?: string };
          this._emit('close', close_event.code, close_event.reason);
        });
      }

      on(event: string, handler: Function) {
        if (!this._listeners.has(event)) {
          this._listeners.set(event, new Set());
        }
        this._listeners.get(event)!.add(handler);
      }

      off(event: string, handler?: Function) {
        if (!this._listeners.has(event)) return;
        if (handler) {
          this._listeners.get(event)!.delete(handler);
        } else {
          this._listeners.get(event)!.clear();
        }
      }

      private _emit(event: string, ...args: any[]) {
        if (this._listeners.has(event)) {
          this._listeners.get(event)!.forEach((handler) => {
            try {
              handler(...args);
            } catch (error) {
              // Note: This is in browser WebSocket wrapper, logger not available here
              // Fallback to console for browser compatibility
              if (typeof console !== 'undefined' && console.error) {
                console.error('[attn] Error in WebSocket event handler:', error);
              }
            }
          });
        }
      }

      removeAllListeners() {
        this._listeners.clear();
      }
    }
    return BrowserWebSocketCompat as any;
  }
  // Node.js: use isomorphic-ws as-is
  return WebSocketBase;
}

const WebSocket = get_websocket_impl();
import { finalizeEvent, getPublicKey, utils } from 'nostr-tools';
import { HookEmitter } from '../hooks/emitter.js';
import { HOOK_NAMES } from '../hooks/index.js';
import { ATTN_EVENT_KINDS, NIP51_LIST_TYPES } from '@attn-protocol/core';
import type { Logger } from '../logger.js';
import { create_default_logger } from '../logger.js';
import type {
  RelayConnectContext,
  RelayDisconnectContext,
  SubscriptionContext,
  NewBlockContext,
  BlockData,
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
  NewProfileContext,
  NewRelayListContext,
  NewNip51ListContext,
} from '../hooks/types.js';

export interface RelayConnectionConfig {
  relay_url: string;
  private_key: Uint8Array;
  node_pubkeys: string[];
  marketplace_pubkeys?: string[];
  billboard_pubkeys?: string[];
  advertiser_pubkeys?: string[];
  connection_timeout_ms?: number;
  reconnect_delay_ms?: number;
  max_reconnect_attempts?: number;
  auth_timeout_ms?: number; // Timeout for NIP-42 authentication (default 10000ms)
  auto_reconnect?: boolean;
  deduplicate?: boolean;
  logger?: Logger; // Optional logger, defaults to Pino logger
  subscription_since?: number; // Unix timestamp to filter events (prevents infinite backlog on restart)
}

/**
 * Nostr relay connection manager
 * Manages connection to Nostr relay and listens for block events (kind 38088)
 */
export class RelayConnection {
  private ws: WebSocketWithOn | null = null;
  private config: RelayConnectionConfig;
  private hooks: HookEmitter;
  private logger: Logger;
  private is_connected: boolean = false;
  private is_authenticated: boolean = false;
  private connection_timeout_ms: number;
  private reconnect_delay_ms: number;
  private max_reconnect_attempts: number;
  private auth_timeout_ms: number;
  private reconnect_attempts: number = 0;
  private reconnect_timeout: NodeJS.Timeout | null = null;
  private auto_reconnect: boolean;
  private subscription_id: string; // For block events (kind 38088)
  private attn_subscription_id: string; // Base ID for ATTN Protocol events
  private attn_subscription_ids: string[] = [];
  private attn_filter_map: Map<string, { kinds: number[]; [key: string]: unknown }> = new Map();
  private standard_subscription_id: string; // For standard Nostr events (kind 0, 10002)
  private nip51_lists_subscription_id: string; // For NIP-51 lists (kind 30000)
  private message_handler: ((data: string | Buffer | ArrayBuffer | Buffer[]) => void) | null = null;
  private auth_timeout: NodeJS.Timeout | null = null;
  private auth_challenge_received: boolean = false;
  private auth_event_id: string | null = null;

  constructor(config: RelayConnectionConfig, hooks: HookEmitter) {
    this.config = config;
    this.hooks = hooks;
    this.logger = config.logger ?? create_default_logger();
    this.connection_timeout_ms = config.connection_timeout_ms ?? 30000;
    this.reconnect_delay_ms = config.reconnect_delay_ms ?? 5000;
    this.max_reconnect_attempts = config.max_reconnect_attempts ?? 10;
    this.auth_timeout_ms = config.auth_timeout_ms ?? 10000;
    this.auto_reconnect = config.auto_reconnect !== false;
    this.subscription_id = `attn-blocks-${Date.now()}`;
    this.attn_subscription_id = `attn-events-${Date.now()}`;
    this.standard_subscription_id = `attn-standard-${Date.now()}`;
    this.nip51_lists_subscription_id = `${this.standard_subscription_id}-nip51`;
  }

  /**
   * Connect to Nostr relay
   * Emits on_relay_connect hook on success
   */
  async connect(): Promise<void> {
    if (this.is_connected && this.ws && this.ws.readyState === 1) {
      // readyState 1 = OPEN
      return;
    }

    if (!this.config.private_key) {
      throw new Error('private_key required for relay connection');
    }
    if (!this.config.node_pubkeys || this.config.node_pubkeys.length === 0) {
      throw new Error('node_pubkeys configuration is required');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.ws) {
          this.ws.close();
        }
        reject(new Error(`Connection timeout for ${this.config.relay_url}`));
      }, this.connection_timeout_ms);

      try {
        this.ws = new WebSocket(this.config.relay_url);

        this.ws.on('open', () => {
          clearTimeout(timeout);
          this.is_connected = true;
          this.is_authenticated = false;
          this.auth_challenge_received = false;
          this.reconnect_attempts = 0;

          this.logger.info({ relay_url: this.config.relay_url }, 'WebSocket opened, waiting for AUTH challenge');

          // Set up message handler first (before authentication)
          this.message_handler = (data: string | Buffer | ArrayBuffer | Buffer[]) => {
            try {
              const message = JSON.parse(data.toString());
              const [type, ...rest] = message;

              // Handle AUTH challenge (NIP-42)
              if (type === 'AUTH') {
                const challenge = rest[0];
                if (challenge && typeof challenge === 'string') {
                  this.logger.debug({ relay_url: this.config.relay_url }, 'Received AUTH challenge from relay');
                  this.auth_challenge_received = true;
                  // Clear the timeout that waits for AUTH challenge
                  if (this.auth_timeout) {
                    clearTimeout(this.auth_timeout);
                    this.auth_timeout = null;
                  }
                  this.handle_auth_challenge(challenge, resolve, reject);
                  return;
                }
              }

              // Handle OK response for authentication
              if (type === 'OK' && !this.is_authenticated && this.auth_event_id) {
                const event_id = rest[0];
                const accepted = rest[1];
                // Check if this is an auth response (match event ID)
                if (event_id === this.auth_event_id) {
                  this.logger.debug({ relay_url: this.config.relay_url, event_id, accepted }, 'Received OK response for auth event');
                  if (accepted === true) {
                    this.logger.info({ relay_url: this.config.relay_url }, 'Authentication successful, subscribing to events');
                    this.is_authenticated = true;
                    this.auth_event_id = null;
                    if (this.auth_timeout) {
                      clearTimeout(this.auth_timeout);
                      this.auth_timeout = null;
                    }
                    // Now subscribe to events
                    this.subscribe_to_events();
                    // Emit connection hook
                    const context: RelayConnectContext = {
                      relay_url: this.config.relay_url,
                    };
                    this.hooks.emit(HOOK_NAMES.RELAY_CONNECT, context).then(() => {
                      resolve();
                    });
                    return;
                  } else if (accepted === false) {
                    const reason = rest[2] || 'Unknown reason';
                    this.logger.warn({ relay_url: this.config.relay_url, reason }, 'Authentication rejected');
                    this.auth_event_id = null;
                    if (this.auth_timeout) {
                      clearTimeout(this.auth_timeout);
                      this.auth_timeout = null;
                    }
                    reject(new Error(`Authentication rejected by relay: ${rest[2] || 'Unknown reason'}`));
                    return;
                  }
                }
              }

              // Handle regular messages (only after authentication completes)
              if (this.is_authenticated) {
                if (type === 'EVENT') {
                  const subscription_id = rest[0] as string;
                  const event = rest[1] as Event;

                  // Route to appropriate handler based on subscription ID and event kind
                  if (subscription_id === this.subscription_id) {
                    // Block events subscription
                    this.handle_block_event(event);
                  } else if (this.attn_subscription_ids.includes(subscription_id)) {
                    // ATTN Protocol events subscription - route by kind
                    this.handle_attn_event(event);
                  } else if (subscription_id === this.standard_subscription_id || subscription_id === this.nip51_lists_subscription_id) {
                    // Standard Nostr events subscription (profiles, relay lists, or NIP-51 lists) - route by kind
                    this.handle_standard_event(event);
                  }
                } else if (type === 'EOSE') {
                  const subscription_id = rest[0] as string;

                  if (subscription_id === this.subscription_id) {
                    // End of stored events - block subscription confirmed
                  const filter: { kinds: number[]; authors: string[] } = {
                    kinds: [ATTN_EVENT_KINDS.BLOCK],
                    authors: this.config.node_pubkeys,
                  };
                    const confirmed_context: SubscriptionContext = {
                      relay_url: this.config.relay_url,
                      subscription_id: this.subscription_id,
                    filter: { ...filter },
                      status: 'confirmed',
                    };
                    this.hooks.emit(HOOK_NAMES.SUBSCRIPTION, confirmed_context).catch(() => {
                      // Ignore errors in hook handlers
                    });
                  } else if (this.attn_subscription_ids.includes(subscription_id)) {
                    // End of stored events - ATTN Protocol subscription confirmed
                    const filter = this.attn_filter_map.get(subscription_id) ?? { kinds: [] };
                    const confirmed_context: SubscriptionContext = {
                      relay_url: this.config.relay_url,
                      subscription_id,
                      filter: { ...filter },
                      status: 'confirmed',
                    };
                    this.hooks.emit(HOOK_NAMES.SUBSCRIPTION, confirmed_context).catch(() => {
                      // Ignore errors in hook handlers
                    });
                  } else if (subscription_id === this.standard_subscription_id) {
                    // End of stored events - standard Nostr events subscription confirmed (profiles, relay lists)
                    const filter: { kinds: number[] } = {
                      kinds: [0, 10002],
                    };
                    const confirmed_context: SubscriptionContext = {
                      relay_url: this.config.relay_url,
                      subscription_id: this.standard_subscription_id,
                      filter: { ...filter },
                      status: 'confirmed',
                    };
                    this.hooks.emit(HOOK_NAMES.SUBSCRIPTION, confirmed_context).catch(() => {
                      // Ignore errors in hook handlers
                    });
                  } else if (subscription_id === this.nip51_lists_subscription_id) {
                    // End of stored events - NIP-51 lists subscription confirmed
                    const filter: { kinds: number[]; [key: string]: unknown } = {
                      kinds: [30000],
                      '#d': [
                        NIP51_LIST_TYPES.BLOCKED_PROMOTIONS,
                        NIP51_LIST_TYPES.BLOCKED_PROMOTERS,
                        NIP51_LIST_TYPES.TRUSTED_BILLBOARDS,
                        NIP51_LIST_TYPES.TRUSTED_MARKETPLACES,
                      ],
                    };
                    const confirmed_context: SubscriptionContext = {
                      relay_url: this.config.relay_url,
                      subscription_id: this.nip51_lists_subscription_id,
                      filter: { ...filter },
                      status: 'confirmed',
                    };
                    this.hooks.emit(HOOK_NAMES.SUBSCRIPTION, confirmed_context).catch(() => {
                      // Ignore errors in hook handlers
                    });
                  }
                } else if (type === 'NOTICE') {
                  const notice = rest[0] || '';
                  if (typeof notice === 'string' && notice.toLowerCase().includes('error')) {
                    this.logger.error({ relay_url: this.config.relay_url, notice }, 'Relay error notice');
                  } else {
                    this.logger.info({ relay_url: this.config.relay_url, notice }, 'Relay NOTICE');
                  }
                }
              }
            } catch (error) {
              // Ignore parse errors
            }
          };

          this.ws!.on('message', this.message_handler);

          // Wait for AUTH challenge - some relays don't require authentication
          // If no AUTH challenge is received within a short timeout, proceed without authentication
          this.logger.debug({ relay_url: this.config.relay_url, timeout_ms: this.auth_timeout_ms }, 'Private key provided, waiting for AUTH challenge');
          // Set timeout: if no AUTH challenge received, proceed without authentication
          this.auth_timeout = setTimeout(() => {
            if (!this.auth_challenge_received) {
              // Relay doesn't require authentication - proceed without auth
              this.logger.info({
                relay_url: this.config.relay_url,
                timeout_ms: this.auth_timeout_ms,
              }, 'No AUTH challenge received - relay does not require authentication, proceeding without auth');
              this.is_authenticated = true; // Mark as authenticated to allow subscriptions
              // Subscribe to events without authentication
              this.subscribe_to_events();
              // Emit connection hook
              const context: RelayConnectContext = {
                relay_url: this.config.relay_url,
              };
              this.hooks.emit(HOOK_NAMES.RELAY_CONNECT, context).then(() => {
                resolve();
              });
            }
          }, this.auth_timeout_ms);
          // Do NOT subscribe here - wait for authentication to complete OR timeout
          // Subscription will happen in the OK response handler after successful authentication
          // OR in the timeout handler if no AUTH challenge is received
        });

        this.ws.on('error', (error) => {
          clearTimeout(timeout);
          // Better error handling for ErrorEvent objects and other error types
          let err: Error;
          if (error instanceof Error) {
            err = error;
          } else if (error && typeof error === 'object') {
            // Handle ErrorEvent-like objects (from WebSocket library)
            const error_obj = error as Record<string, unknown>;
            const error_message =
              (typeof error_obj.message === 'string' && error_obj.message) ||
              (typeof error_obj.type === 'string' && `WebSocket error: ${error_obj.type}`) ||
              (error_obj.toString && typeof error_obj.toString === 'function' && error_obj.toString() !== '[object Object]' ? error_obj.toString() : null) ||
              'Unknown WebSocket error';
            err = new Error(error_message);
            // Preserve original error properties if available
            if (error_obj.code) {
              (err as Error & { code?: unknown }).code = error_obj.code;
            }
            if (error_obj.type) {
              (err as Error & { type?: unknown }).type = error_obj.type;
            }
          } else {
            err = new Error(`WebSocket connection error: ${String(error)}`);
          }
          this.logger.error({ relay_url: this.config.relay_url, error: err.message }, 'WebSocket error');
          this.handle_disconnect('Connection error', err);
          reject(err);
        });

        this.ws.on('close', (code, reason) => {
          clearTimeout(timeout);
          const reason_str = reason ? reason.toString() : undefined;
          const close_message = `Connection closed: code=${code}, reason=${reason_str || 'none'}`;
          this.logger.info({ relay_url: this.config.relay_url, code, reason: reason_str || 'none' }, 'Connection closed');
          if (this.is_connected) {
            this.handle_disconnect(close_message);
          }
          this.schedule_reconnect();
        });
      } catch (error) {
        clearTimeout(timeout);
        // Better error handling for catch blocks
        let err: Error;
        if (error instanceof Error) {
          err = error;
        } else if (error && typeof error === 'object') {
          const error_obj = error as Record<string, unknown>;
          const error_message =
            (typeof error_obj.message === 'string' && error_obj.message) ||
            `Failed to create WebSocket connection: ${String(error)}`;
          err = new Error(error_message);
        } else {
          err = new Error(`Failed to create WebSocket: ${String(error)}`);
        }
        this.logger.error({ relay_url: this.config.relay_url, error: err.message }, 'Failed to create WebSocket');
        reject(err);
      }
    });
  }

  /**
   * Handle AUTH challenge from relay (NIP-42)
   */
  private handle_auth_challenge(
    challenge: string,
    resolve: () => void,
    reject: (error: Error) => void
  ): void {
    if (!this.config.private_key) {
      reject(new Error('AUTH challenge received but no private_key provided'));
      return;
    }

    // Ensure private_key is a Uint8Array and create a fresh instance
    if (!(this.config.private_key instanceof Uint8Array)) {
      reject(new Error(`private_key must be a Uint8Array, got ${typeof this.config.private_key}`));
      return;
    }

    // Create a fresh Uint8Array copy to ensure it's a proper instance
    // This prevents any serialization/deserialization issues
    const private_key = new Uint8Array(this.config.private_key);

    try {
      // Normalize relay URL for challenge tag
      let normalized_relay_url = this.config.relay_url.trim();
      if (normalized_relay_url.endsWith('/')) {
        normalized_relay_url = normalized_relay_url.slice(0, -1);
      }

      try {
        const url = new URL(normalized_relay_url);
        normalized_relay_url = `${url.protocol}//${url.host}`;
      } catch {
        // Use original URL if parsing fails
      }

      // Get public key from private key
      // getPublicKey returns Uint8Array in nostr-tools v2
      const public_key_result: unknown = getPublicKey(private_key);
      let public_key_hex: string;
      if (public_key_result instanceof Uint8Array) {
        public_key_hex = utils.bytesToHex(public_key_result);
      } else if (typeof public_key_result === 'string') {
        public_key_hex = public_key_result;
      } else {
        throw new Error('getPublicKey returned unexpected type');
      }

      // Create kind 22242 authentication event
      const event = {
        kind: 22242,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['relay', normalized_relay_url],
          ['challenge', challenge],
        ],
        content: '',
        pubkey: public_key_hex,
      };

      // Sign the event (use the fresh Uint8Array instance)
      const signed_event = finalizeEvent(event, private_key);
      this.auth_event_id = signed_event.id;

      // Send AUTH response
      const auth_message = JSON.stringify(['AUTH', signed_event]);
      this.logger.debug({ relay_url: this.config.relay_url, event_id: signed_event.id }, 'Sending AUTH response');
      if (this.ws && this.ws.readyState === 1) {
        // readyState 1 = OPEN
        this.ws.send(auth_message);
      }

      // Set timeout for OK response
      if (this.auth_timeout) {
        clearTimeout(this.auth_timeout);
      }
      this.auth_timeout = setTimeout(() => {
        this.auth_timeout = null;
        reject(new Error('Authentication timeout: No OK response received'));
      }, this.auth_timeout_ms);
    } catch (error) {
      if (this.auth_timeout) {
        clearTimeout(this.auth_timeout);
        this.auth_timeout = null;
      }
      reject(new Error(`Failed to create authentication event: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Subscribe to block events (kind 38088) and ATTN Protocol events
   */
  private subscribe_to_events(): void {
    if (!this.ws || this.ws.readyState !== 1) {
      // readyState 1 = OPEN
      this.logger.warn({ relay_url: this.config.relay_url, ready_state: this.ws?.readyState }, 'Cannot subscribe: WebSocket not open');
      return;
    }

    // Get subscription_since filter if configured (prevents infinite backlog on restart)
    const since_filter = this.config.subscription_since;
    if (since_filter) {
      this.logger.info({ relay_url: this.config.relay_url, since: since_filter, since_date: new Date(since_filter * 1000).toISOString() }, 'Using since filter for subscriptions');
    }

    // Subscribe to block events (kind 38088 from trusted node services)
    const block_filter: { kinds: number[]; authors: string[]; since?: number } = {
      kinds: [ATTN_EVENT_KINDS.BLOCK],
      authors: this.config.node_pubkeys,
    };
    if (since_filter) {
      block_filter.since = since_filter;
    }

    const block_req_message = JSON.stringify(['REQ', this.subscription_id, block_filter]);
    this.logger.debug({ relay_url: this.config.relay_url, subscription_id: this.subscription_id, filter: block_filter }, 'Sending REQ subscription for block events');
    this.ws.send(block_req_message);

    const block_subscription_context: SubscriptionContext = {
      relay_url: this.config.relay_url,
      subscription_id: this.subscription_id,
      filter: { ...block_filter },
      status: 'subscribed',
    };
    this.hooks.emit(HOOK_NAMES.SUBSCRIPTION, block_subscription_context).catch(() => {});

    // Subscribe to ATTN Protocol events (all kinds in a single subscription)
    const attn_filter: { kinds: number[]; since?: number; [key: string]: unknown } = {
      kinds: [
        ATTN_EVENT_KINDS.MARKETPLACE,
        ATTN_EVENT_KINDS.BILLBOARD,
        ATTN_EVENT_KINDS.PROMOTION,
        ATTN_EVENT_KINDS.ATTENTION,
        ATTN_EVENT_KINDS.BILLBOARD_CONFIRMATION,
        ATTN_EVENT_KINDS.ATTENTION_CONFIRMATION,
        ATTN_EVENT_KINDS.MARKETPLACE_CONFIRMATION,
        ATTN_EVENT_KINDS.ATTENTION_PAYMENT_CONFIRMATION,
        ATTN_EVENT_KINDS.MATCH,
      ],
    };
    if (since_filter) {
      attn_filter.since = since_filter;
    }

    // Combine all pubkey filters if any are specified
    const all_pubkeys: string[] = [];
    if (this.config.marketplace_pubkeys?.length) {
      all_pubkeys.push(...this.config.marketplace_pubkeys);
    }
    if (this.config.billboard_pubkeys?.length) {
      all_pubkeys.push(...this.config.billboard_pubkeys);
    }
    if (this.config.advertiser_pubkeys?.length) {
      all_pubkeys.push(...this.config.advertiser_pubkeys);
    }

    // Remove duplicates and add to filter if any pubkeys specified
    if (all_pubkeys.length > 0) {
      const unique_pubkeys = Array.from(new Set(all_pubkeys));
      attn_filter['#p'] = unique_pubkeys;
    }

    this.attn_subscription_ids = [this.attn_subscription_id];
    this.attn_filter_map.set(this.attn_subscription_id, attn_filter);

    const attn_req_message = JSON.stringify(['REQ', this.attn_subscription_id, attn_filter]);
    this.logger.debug({ relay_url: this.config.relay_url, subscription_id: this.attn_subscription_id, filter: attn_filter }, 'Sending REQ subscription for ATTN Protocol events');
    this.ws.send(attn_req_message);

    const attn_subscription_context: SubscriptionContext = {
      relay_url: this.config.relay_url,
      subscription_id: this.attn_subscription_id,
      filter: { ...attn_filter },
      status: 'subscribed',
    };
    this.hooks.emit(HOOK_NAMES.SUBSCRIPTION, attn_subscription_context).catch(() => {});

    // Subscribe to standard Nostr events (profiles, relay lists)
    // Note: We don't apply since filter to profiles/relay lists as we always want the latest
    const profiles_relay_lists_filter: { kinds: number[] } = {
      kinds: [0, 10002],
    };

    const profiles_relay_lists_req_message = JSON.stringify(['REQ', this.standard_subscription_id, profiles_relay_lists_filter]);
    this.logger.debug({ relay_url: this.config.relay_url, subscription_id: this.standard_subscription_id, filter: profiles_relay_lists_filter }, 'Sending REQ subscription for standard Nostr events');
    this.ws.send(profiles_relay_lists_req_message);

    const profiles_relay_lists_subscription_context: SubscriptionContext = {
      relay_url: this.config.relay_url,
      subscription_id: this.standard_subscription_id,
      filter: { ...profiles_relay_lists_filter },
      status: 'subscribed',
    };
    this.hooks.emit(HOOK_NAMES.SUBSCRIPTION, profiles_relay_lists_subscription_context).catch(() => {});

    // Subscribe to NIP-51 lists (kind 30000 with d tag filter)
    // Note: We don't apply since filter to NIP-51 lists as we always want the latest
    const nip51_lists_filter: { kinds: number[]; [key: string]: unknown } = {
      kinds: [30000],
      '#d': [
        NIP51_LIST_TYPES.BLOCKED_PROMOTIONS,
        NIP51_LIST_TYPES.BLOCKED_PROMOTERS,
        NIP51_LIST_TYPES.TRUSTED_BILLBOARDS,
        NIP51_LIST_TYPES.TRUSTED_MARKETPLACES,
      ],
    };

    const nip51_lists_req_message = JSON.stringify(['REQ', this.nip51_lists_subscription_id, nip51_lists_filter]);
    this.logger.debug({ relay_url: this.config.relay_url, subscription_id: this.nip51_lists_subscription_id, filter: nip51_lists_filter }, 'Sending REQ subscription for NIP-51 lists');
    this.ws.send(nip51_lists_req_message);

    const nip51_lists_subscription_context: SubscriptionContext = {
      relay_url: this.config.relay_url,
      subscription_id: this.nip51_lists_subscription_id,
      filter: { ...nip51_lists_filter },
      status: 'subscribed',
    };
    this.hooks.emit(HOOK_NAMES.SUBSCRIPTION, nip51_lists_subscription_context).catch(() => {});
  }

  /**
   * Handle block event from relay (kind 38088)
   */
  private async handle_block_event(event: Event): Promise<void> {
    try {
      let block_data: BlockData | null = null;
      try {
        block_data = JSON.parse(event.content) as BlockData;
      } catch {
        block_data = null;
      }

      const block_height_from_content =
        typeof block_data?.height === 'number'
          ? block_data.height
          : block_data?.height !== undefined
          ? parseInt(String(block_data.height), 10)
          : undefined;
      const block_height_tag = event.tags.find((tag) => tag[0] === 't' && tag[1]);
      const block_height = block_height_from_content ?? (block_height_tag ? parseInt(block_height_tag[1]!, 10) : undefined);

      if (!block_height || Number.isNaN(block_height)) {
        this.logger.warn({ relay_url: this.config.relay_url, event_id: event.id }, 'Block event missing or invalid block_height');
        return;
      }

      const context: NewBlockContext = {
        block_height,
        block_hash: block_data?.hash,
        block_time: block_data?.time,
        raw_block_data: block_data ?? undefined,
        event,
        relay_url: this.config.relay_url,
      };

      if (this.hooks.has_handlers(HOOK_NAMES.BEFORE_NEW_BLOCK)) {
        await this.hooks.emit(HOOK_NAMES.BEFORE_NEW_BLOCK, context);
      }

      await this.hooks.emit(HOOK_NAMES.NEW_BLOCK, context);

      if (this.hooks.has_handlers(HOOK_NAMES.AFTER_NEW_BLOCK)) {
        await this.hooks.emit(HOOK_NAMES.AFTER_NEW_BLOCK, context);
      }
    } catch (error) {
      this.logger.error({ relay_url: this.config.relay_url, error: error instanceof Error ? error.message : String(error) }, 'Error handling block event');
    }
  }

  /**
   * Route ATTN Protocol events to appropriate handlers based on kind
   */
  private async handle_attn_event(event: Event): Promise<void> {
    try {
      switch (event.kind) {
        case ATTN_EVENT_KINDS.MARKETPLACE:
          await this.handle_marketplace_event(event);
          break;
        case ATTN_EVENT_KINDS.BILLBOARD:
          await this.handle_billboard_event(event);
          break;
        case ATTN_EVENT_KINDS.PROMOTION:
          await this.handle_promotion_event(event);
          break;
        case ATTN_EVENT_KINDS.ATTENTION:
          await this.handle_attention_event(event);
          break;
        case ATTN_EVENT_KINDS.BILLBOARD_CONFIRMATION:
          await this.handle_billboard_confirmation_event(event);
          break;
        case ATTN_EVENT_KINDS.ATTENTION_CONFIRMATION:
          await this.handle_attention_confirmation_event(event);
          break;
        case ATTN_EVENT_KINDS.MARKETPLACE_CONFIRMATION:
          await this.handle_marketplace_confirmation_event(event);
          break;
        case ATTN_EVENT_KINDS.ATTENTION_PAYMENT_CONFIRMATION:
          await this.handle_attention_payment_confirmation_event(event);
          break;
        case ATTN_EVENT_KINDS.MATCH:
          await this.handle_match_event(event);
          break;
        default:
          this.logger.warn({ relay_url: this.config.relay_url, event_kind: event.kind, event_id: event.id }, 'Unknown ATTN Protocol event kind');
      }
    } catch (error) {
      this.logger.error({ relay_url: this.config.relay_url, event_kind: event.kind, error: error instanceof Error ? error.message : String(error) }, 'Error handling ATTN Protocol event');
    }
  }

  /**
   * Handle MARKETPLACE event (kind 38188)
   */
  private async handle_marketplace_event(event: Event): Promise<void> {
    try {
      let marketplace_data: unknown;
      try {
        marketplace_data = JSON.parse(event.content);
      } catch {
        marketplace_data = event.content;
      }

      const block_height_tag = event.tags.find((tag) => tag[0] === 't' && tag[1]);
      const block_height = block_height_tag ? parseInt(block_height_tag[1]!, 10) : undefined;

      const context: NewMarketplaceContext = {
        event_id: event.id,
        pubkey: event.pubkey,
        marketplace_data,
        block_height,
        event,
      };

      await this.hooks.emit(HOOK_NAMES.NEW_MARKETPLACE, context);
    } catch (error) {
      this.logger.error({ relay_url: this.config.relay_url, event_id: event.id, error: error instanceof Error ? error.message : String(error) }, 'Error handling marketplace event');
    }
  }

  /**
   * Handle BILLBOARD event (kind 38288)
   */
  private async handle_billboard_event(event: Event): Promise<void> {
    try {
      // Parse content
      let billboard_data: unknown;
      try {
        billboard_data = JSON.parse(event.content);
      } catch {
        billboard_data = event.content;
      }

      // Extract block height from t tag
      const block_height_tag = event.tags.find((tag) => tag[0] === 't' && tag[1]);
      const block_height = block_height_tag ? parseInt(block_height_tag[1]!, 10) : undefined;

      const context: NewBillboardContext = {
        event_id: event.id,
        pubkey: event.pubkey,
        billboard_data,
        block_height,
        event,
      };

      await this.hooks.emit(HOOK_NAMES.NEW_BILLBOARD, context);
    } catch (error) {
      this.logger.error({ relay_url: this.config.relay_url, event_id: event.id, error: error instanceof Error ? error.message : String(error) }, 'Error handling billboard event');
    }
  }

  /**
   * Handle PROMOTION event (kind 38388)
   */
  private async handle_promotion_event(event: Event): Promise<void> {
    try {
      // Parse content
      let promotion_data: unknown;
      try {
        promotion_data = JSON.parse(event.content);
      } catch {
        promotion_data = event.content;
      }

      // Extract block height from t tag
      const block_height_tag = event.tags.find((tag) => tag[0] === 't' && tag[1]);
      const block_height = block_height_tag ? parseInt(block_height_tag[1]!, 10) : undefined;

      const context: NewPromotionContext = {
        event_id: event.id,
        pubkey: event.pubkey,
        promotion_data,
        block_height,
        event,
      };

      await this.hooks.emit(HOOK_NAMES.NEW_PROMOTION, context);
    } catch (error) {
      this.logger.error({ relay_url: this.config.relay_url, event_id: event.id, error: error instanceof Error ? error.message : String(error) }, 'Error handling promotion event');
    }
  }

  /**
   * Handle ATTENTION event (kind 38488)
   */
  private async handle_attention_event(event: Event): Promise<void> {
    try {
      // Parse content
      let attention_data: unknown;
      try {
        attention_data = JSON.parse(event.content);
      } catch {
        attention_data = event.content;
      }

      // Extract block height from t tag
      const block_height_tag = event.tags.find((tag) => tag[0] === 't' && tag[1]);
      const block_height = block_height_tag ? parseInt(block_height_tag[1]!, 10) : undefined;

      const context: NewAttentionContext = {
        event_id: event.id,
        pubkey: event.pubkey,
        attention_data,
        block_height,
        event,
      };

      await this.hooks.emit(HOOK_NAMES.NEW_ATTENTION, context);
    } catch (error) {
      this.logger.error({ relay_url: this.config.relay_url, event_id: event.id, error: error instanceof Error ? error.message : String(error) }, 'Error handling attention event');
    }
  }

  /**
   * Handle BILLBOARD_CONFIRMATION event (kind 38588)
   */
  private async handle_billboard_confirmation_event(event: Event): Promise<void> {
    try {
      // Parse content
      let confirmation_data: unknown;
      try {
        confirmation_data = JSON.parse(event.content);
      } catch {
        confirmation_data = event.content;
      }

      // Extract match event ID from e tags (should be the last e tag before t tag)
      const e_tags = event.tags.filter((tag) => tag[0] === 'e');
      const match_event_id = e_tags.length > 0 ? e_tags[e_tags.length - 1]?.[1] : undefined;

      // Extract operator pubkey (billboard owner) from p tags
      const p_tags = event.tags.filter((tag) => tag[0] === 'p');
      const operator_pubkey = p_tags.length > 0 ? p_tags[0]?.[1] : undefined;

      // Extract block height from t tag
      const block_height_tag = event.tags.find((tag) => tag[0] === 't' && tag[1]);
      const block_height = block_height_tag ? parseInt(block_height_tag[1]!, 10) : undefined;

      const context: BillboardConfirmContext = {
        confirmation_event_id: event.id,
        match_event_id: match_event_id || '',
        billboard_pubkey: operator_pubkey || '',
        confirmation_data,
        block_height,
        event,
      };

      await this.hooks.emit(HOOK_NAMES.BILLBOARD_CONFIRM, context);
    } catch (error) {
      this.logger.error({ relay_url: this.config.relay_url, event_id: event.id, error: error instanceof Error ? error.message : String(error) }, 'Error handling billboard confirmation event');
    }
  }

  /**
   * Handle ATTENTION_CONFIRMATION event (kind 38688)
   */
  private async handle_attention_confirmation_event(event: Event): Promise<void> {
    try {
      // Parse content
      let confirmation_data: unknown;
      try {
        confirmation_data = JSON.parse(event.content);
      } catch {
        confirmation_data = event.content;
      }

      // Extract match event ID from e tags (should be the last e tag before t tag)
      const e_tags = event.tags.filter((tag) => tag[0] === 'e');
      const match_event_id = e_tags.length > 0 ? e_tags[e_tags.length - 1]?.[1] : undefined;

      // Extract attention owner pubkey from event pubkey
      const attention_pubkey = event.pubkey;

      // Extract block height from t tag
      const block_height_tag = event.tags.find((tag) => tag[0] === 't' && tag[1]);
      const block_height = block_height_tag ? parseInt(block_height_tag[1]!, 10) : undefined;

      const context: AttentionConfirmContext = {
        confirmation_event_id: event.id,
        match_event_id: match_event_id || '',
        attention_pubkey,
        confirmation_data,
        block_height,
        event,
      };

      await this.hooks.emit(HOOK_NAMES.ATTENTION_CONFIRM, context);
    } catch (error) {
      this.logger.error({ relay_url: this.config.relay_url, event_id: event.id, error: error instanceof Error ? error.message : String(error) }, 'Error handling attention confirmation event');
    }
  }

  /**
   * Handle MARKETPLACE_CONFIRMATION event (kind 38788)
   */
  private async handle_marketplace_confirmation_event(event: Event): Promise<void> {
    try {
      // Parse content
      let settlement_data: unknown;
      try {
        settlement_data = JSON.parse(event.content);
      } catch {
        settlement_data = event.content;
      }

      // Extract match event ID from e tags
      const e_tags = event.tags.filter((tag) => tag[0] === 'e');
      const match_event_id = e_tags.length > 0 ? e_tags[0]?.[1] : undefined;

      // Extract marketplace event ID (first e tag should be marketplace)
      const marketplace_event_id = e_tags.length > 0 ? e_tags[0]?.[1] : undefined;

      // Extract block height from t tag
      const block_height_tag = event.tags.find((tag) => tag[0] === 't' && tag[1]);
      const block_height = block_height_tag ? parseInt(block_height_tag[1]!, 10) : undefined;

      const context: MarketplaceConfirmedContext = {
        marketplace_event_id: marketplace_event_id || '',
        match_event_id: match_event_id || '',
        settlement_data,
        block_height,
        event,
      };

      await this.hooks.emit(HOOK_NAMES.MARKETPLACE_CONFIRMED, context);
    } catch (error) {
      this.logger.error({ relay_url: this.config.relay_url, event_id: event.id, error: error instanceof Error ? error.message : String(error) }, 'Error handling marketplace confirmation event');
    }
  }

  /**
   * Handle ATTENTION_PAYMENT_CONFIRMATION event (kind 38988)
   */
  private async handle_attention_payment_confirmation_event(event: Event): Promise<void> {
    try {
      // Parse content
      let payment_data: unknown;
      try {
        payment_data = JSON.parse(event.content);
      } catch {
        payment_data = event.content;
      }

      // Extract e tags
      const e_tags = event.tags.filter((tag) => tag[0] === 'e');

      // Extract marketplace confirmation event ID (should have "marketplace_confirmation" marker)
      let marketplace_confirmation_event_id: string | undefined;
      for (const e_tag of e_tags) {
        if (e_tag[3] === 'marketplace_confirmation') {
          marketplace_confirmation_event_id = e_tag[1];
          break;
        }
      }

      // Extract match event ID (fallback to first e tag if no marketplace_confirmation found)
      const match_event_id = e_tags.length > 0 ? e_tags.find((tag) => tag[3] !== 'marketplace_confirmation')?.[1] || e_tags[0]?.[1] : undefined;

      // Extract attention owner pubkey from event pubkey
      const attention_pubkey = event.pubkey;

      // Extract block height from t tag
      const block_height_tag = event.tags.find((tag) => tag[0] === 't' && tag[1]);
      const block_height = block_height_tag ? parseInt(block_height_tag[1]!, 10) : undefined;

      const context: AttentionPaymentConfirmContext = {
        confirmation_event_id: event.id,
        marketplace_confirmation_event_id: marketplace_confirmation_event_id || '',
        match_event_id: match_event_id || '',
        attention_pubkey,
        payment_data,
        block_height,
        event,
      };

      await this.hooks.emit(HOOK_NAMES.ATTENTION_PAYMENT_CONFIRM, context);
    } catch (error) {
      this.logger.error({ relay_url: this.config.relay_url, event_id: event.id, error: error instanceof Error ? error.message : String(error) }, 'Error handling attention payment confirmation event');
    }
  }

  /**
   * Handle MATCH event (kind 38888)
   */
  private async handle_match_event(event: Event): Promise<void> {
    try {
      // Parse content
      let match_data: unknown;
      try {
        match_data = JSON.parse(event.content);
      } catch {
        match_data = event.content;
      }

      // Extract promotion and attention event IDs from a tags
      const a_tags = event.tags.filter((tag) => tag[0] === 'a');
      let promotion_event_id: string | undefined;
      let attention_event_id: string | undefined;

      for (const a_tag of a_tags) {
        if (a_tag[1]?.startsWith(`${ATTN_EVENT_KINDS.PROMOTION}:`)) {
          // Promotion coordinate - extract event ID would require looking up the event
          // For now, we'll use the coordinate itself
          promotion_event_id = a_tag[1];
        } else if (a_tag[1]?.startsWith(`${ATTN_EVENT_KINDS.ATTENTION}:`)) {
          // Attention coordinate
          attention_event_id = a_tag[1];
        }
      }

      // Extract block height from t tag
      const block_height_tag = event.tags.find((tag) => tag[0] === 't' && tag[1]);
      const block_height = block_height_tag ? parseInt(block_height_tag[1]!, 10) : undefined;

      // Emit NEW_MATCH hook (consistent with on_new_promotion and on_new_attention)
      const new_match_context: NewMatchContext = {
        event_id: event.id,
        pubkey: event.pubkey,
        match_data,
        block_height,
        event,
      };
      await this.hooks.emit(HOOK_NAMES.NEW_MATCH, new_match_context);

      // Emit MATCH_PUBLISHED hook (for backward compatibility, includes promotion/attention IDs)
      const match_published_context: MatchPublishedContext = {
        match_event_id: event.id,
        promotion_event_id: promotion_event_id || '',
        attention_event_id: attention_event_id || '',
        match_data,
        block_height,
        event,
      };
      await this.hooks.emit(HOOK_NAMES.MATCH_PUBLISHED, match_published_context);
    } catch (error) {
      this.logger.error({ relay_url: this.config.relay_url, event_id: event.id, error: error instanceof Error ? error.message : String(error) }, 'Error handling match event');
    }
  }

  /**
   * Route standard Nostr events to appropriate handlers based on kind
   */
  private async handle_standard_event(event: Event): Promise<void> {
    try {
      switch (event.kind) {
        case 0: // Profile Metadata
          await this.handle_profile_event(event);
          break;
        case 10002: // Relay List Metadata
          await this.handle_relay_list_event(event);
          break;
        case 30000: // NIP-51 Lists
          await this.handle_nip51_list_event(event);
          break;
        default:
          this.logger.warn({ relay_url: this.config.relay_url, event_kind: event.kind, event_id: event.id }, 'Unknown standard Nostr event kind');
      }
    } catch (error) {
      this.logger.error({ relay_url: this.config.relay_url, event_kind: event.kind, error: error instanceof Error ? error.message : String(error) }, 'Error handling standard Nostr event');
    }
  }

  /**
   * Handle Profile event (kind 0)
   */
  private async handle_profile_event(event: Event): Promise<void> {
    try {
      // Parse content
      let profile_data: unknown;
      try {
        profile_data = JSON.parse(event.content);
      } catch {
        profile_data = event.content;
      }

      const context: NewProfileContext = {
        event_id: event.id,
        pubkey: event.pubkey,
        profile_data,
        event,
      };

      await this.hooks.emit(HOOK_NAMES.NEW_PROFILE, context);
    } catch (error) {
      this.logger.error({ relay_url: this.config.relay_url, event_id: event.id, error: error instanceof Error ? error.message : String(error) }, 'Error handling profile event');
    }
  }

  /**
   * Handle Relay List event (kind 10002)
   */
  private async handle_relay_list_event(event: Event): Promise<void> {
    try {
      // Parse content
      let relay_list_data: unknown;
      try {
        relay_list_data = JSON.parse(event.content);
      } catch {
        relay_list_data = event.content;
      }

      const context: NewRelayListContext = {
        event_id: event.id,
        pubkey: event.pubkey,
        relay_list_data,
        event,
      };

      await this.hooks.emit(HOOK_NAMES.NEW_RELAY_LIST, context);
    } catch (error) {
      this.logger.error({ relay_url: this.config.relay_url, event_id: event.id, error: error instanceof Error ? error.message : String(error) }, 'Error handling relay list event');
    }
  }

  /**
   * Handle NIP-51 List event (kind 30000)
   */
  private async handle_nip51_list_event(event: Event): Promise<void> {
    try {
      // Parse content
      let list_data: unknown;
      try {
        list_data = JSON.parse(event.content);
      } catch {
        list_data = event.content;
      }

      // Determine list type from d tag
      const d_tag = event.tags.find((tag) => tag[0] === 'd')?.[1] || '';
      let list_type: NewNip51ListContext['list_type'];

      switch (d_tag) {
        case NIP51_LIST_TYPES.TRUSTED_BILLBOARDS:
          list_type = 'trusted_billboard';
          break;
        case NIP51_LIST_TYPES.TRUSTED_MARKETPLACES:
          list_type = 'trusted_marketplace';
          break;
        case NIP51_LIST_TYPES.BLOCKED_PROMOTERS:
          list_type = 'blocked_promoter';
          break;
        case NIP51_LIST_TYPES.BLOCKED_PROMOTIONS:
        default:
          list_type = 'blocked_promotion';
          break;
      }

      const context: NewNip51ListContext = {
        event_id: event.id,
        pubkey: event.pubkey,
        list_data,
        list_type,
        list_identifier: d_tag,
        event,
      };

      await this.hooks.emit(HOOK_NAMES.NEW_NIP51_LIST, context);
    } catch (error) {
      this.logger.error({ relay_url: this.config.relay_url, event_id: event.id, error: error instanceof Error ? error.message : String(error) }, 'Error handling NIP-51 list event');
    }
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

    if (this.auth_timeout) {
      clearTimeout(this.auth_timeout);
      this.auth_timeout = null;
    }

    if (!this.is_connected && (!this.ws || this.ws.readyState === 3)) {
      // readyState 3 = CLOSED
      return;
    }

    try {
      if (this.ws) {
        // Close both subscriptions
        if (this.ws.readyState === WebSocket.OPEN) {
          const close_block_message = JSON.stringify(['CLOSE', this.subscription_id]);
          this.ws.send(close_block_message);
          for (const attn_id of this.attn_subscription_ids) {
            const close_attn_message = JSON.stringify(['CLOSE', attn_id]);
            this.ws.send(close_attn_message);
          }
          this.attn_subscription_ids = [];
          this.attn_filter_map.clear();
          const close_standard_message = JSON.stringify(['CLOSE', this.standard_subscription_id]);
          this.ws.send(close_standard_message);
          const close_nip51_message = JSON.stringify(['CLOSE', this.nip51_lists_subscription_id]);
          this.ws.send(close_nip51_message);
        }
          if (this.ws.removeAllListeners) {
            this.ws.removeAllListeners();
          }
        this.ws.close();
      }
      this.ws = null;
      this.message_handler = null;
      this.is_connected = false;
      this.is_authenticated = false;
      this.auth_challenge_received = false;
      this.auth_event_id = null;

      // Emit disconnect hook
      const context: RelayDisconnectContext = {
        relay_url: this.config.relay_url,
        reason: reason ?? 'Disconnected',
      };

      await this.hooks.emit(HOOK_NAMES.RELAY_DISCONNECT, context);
    } catch (error) {
      // Better error handling for disconnect errors
      let err: Error;
      if (error instanceof Error) {
        err = error;
      } else if (error && typeof error === 'object') {
        const error_obj = error as Record<string, unknown>;
        const error_message =
          (typeof error_obj.message === 'string' && error_obj.message) ||
          `Error during disconnect: ${String(error)}`;
        err = new Error(error_message);
      } else {
        err = new Error(`Error during disconnect: ${String(error)}`);
      }

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
      this.logger.error({ relay_url: this.config.relay_url, max_attempts: this.max_reconnect_attempts }, 'Max reconnection attempts reached');
      return;
    }

    const delay = this.reconnect_delay_ms * Math.pow(2, this.reconnect_attempts);
    this.reconnect_attempts++;

    this.logger.info({ relay_url: this.config.relay_url, delay_ms: delay, attempt: this.reconnect_attempts, max_attempts: this.max_reconnect_attempts }, 'Will attempt to reconnect');

    this.reconnect_timeout = setTimeout(() => {
      this.reconnect_timeout = null;
      this.connect().catch((error) => {
        this.logger.error({ relay_url: this.config.relay_url, error: error instanceof Error ? error.message : String(error) }, 'Reconnection failed');
      });
    }, delay);
  }

  /**
   * Check if currently connected
   */
  get connected(): boolean {
    return this.is_connected && this.ws !== null && this.ws.readyState === 1; // readyState 1 = OPEN
  }

  /**
   * Get current relay URL
   */
  get relay_url(): string {
    return this.config.relay_url;
  }
}

