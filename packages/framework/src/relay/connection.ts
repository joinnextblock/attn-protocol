/**
 * Nostr relay connection manager for attn framework
 * Handles connection lifecycle and emits hooks for block events
 */

import WebSocket from 'ws';
import type { Event } from 'nostr-tools';
import { finalizeEvent, getPublicKey, utils } from 'nostr-tools';
import { HookEmitter } from '../hooks/emitter.js';
import { HOOK_NAMES } from '../hooks/index.js';
import type {
  RelayConnectContext,
  RelayDisconnectContext,
  SubscriptionContext,
  NewBlockContext,
  NewBillboardContext,
  NewPromotionContext,
  NewAttentionContext,
  NewMatchContext,
  MatchPublishedContext,
  BillboardConfirmContext,
  ViewerConfirmContext,
  MarketplaceConfirmedContext,
  NewProfileContext,
  NewRelayListContext,
  NewNip51ListContext,
} from '../hooks/types.js';

export interface RelayConnectionConfig {
  relay_url: string;
  private_key?: Uint8Array;
  bridge_pubkey_hex?: string; // Bridge service pubkey (hex) for filtering kind 30078 events
  marketplace_coordinates?: string[]; // Marketplace coordinates (format: "38088:pubkey:id") for filtering ATTN Protocol events by #a tag
  connection_timeout_ms?: number;
  reconnect_delay_ms?: number;
  max_reconnect_attempts?: number;
  auth_timeout_ms?: number; // Timeout for NIP-42 authentication (default 10000ms)
}

/**
 * Nostr relay connection manager
 * Manages connection to Nostr relay and listens for block events (kind 30078)
 */
export class RelayConnection {
  private ws: WebSocket | null = null;
  private config: RelayConnectionConfig;
  private hooks: HookEmitter;
  private is_connected: boolean = false;
  private is_authenticated: boolean = false;
  private connection_timeout_ms: number;
  private reconnect_delay_ms: number;
  private max_reconnect_attempts: number;
  private auth_timeout_ms: number;
  private reconnect_attempts: number = 0;
  private reconnect_timeout: NodeJS.Timeout | null = null;
  private subscription_id: string; // For block events (kind 30078)
  private attn_subscription_id: string; // For ATTN Protocol events
  private standard_subscription_id: string; // For standard Nostr events (kind 0, 10002, 30000)
  private message_handler: ((data: WebSocket.Data) => void) | null = null;
  private auth_timeout: NodeJS.Timeout | null = null;
  private auth_challenge_received: boolean = false;
  private auth_event_id: string | null = null;

  constructor(config: RelayConnectionConfig, hooks: HookEmitter) {
    this.config = config;
    this.hooks = hooks;
    this.connection_timeout_ms = config.connection_timeout_ms ?? 30000;
    this.reconnect_delay_ms = config.reconnect_delay_ms ?? 5000;
    this.max_reconnect_attempts = config.max_reconnect_attempts ?? 10;
    this.auth_timeout_ms = config.auth_timeout_ms ?? 10000;
    this.subscription_id = `attn-blocks-${Date.now()}`;
    this.attn_subscription_id = `attn-events-${Date.now()}`;
    this.standard_subscription_id = `attn-standard-${Date.now()}`;
  }

  /**
   * Connect to Nostr relay
   * Emits on_relay_connect hook on success
   */
  async connect(): Promise<void> {
    if (this.is_connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
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

          // Set up message handler first (before authentication)
          this.message_handler = (data: WebSocket.Data) => {
            try {
              const message = JSON.parse(data.toString());
              const [type, ...rest] = message;

              // Handle AUTH challenge (NIP-42)
              if (type === 'AUTH') {
                const challenge = rest[0];
                if (challenge && typeof challenge === 'string') {
                  console.log('[attn] Received AUTH challenge from relay');
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
                  console.log(`[attn] Received OK response for auth event ${event_id}, accepted: ${accepted}`);
                  if (accepted === true) {
                    console.log('[attn] Authentication successful, subscribing to events');
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
                    console.log(`[attn] Authentication rejected: ${rest[2] || 'Unknown reason'}`);
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
                  } else if (subscription_id === this.attn_subscription_id) {
                    // ATTN Protocol events subscription - route by kind
                    this.handle_attn_event(event);
                  } else if (subscription_id === this.standard_subscription_id) {
                    // Standard Nostr events subscription - route by kind
                    this.handle_standard_event(event);
                  }
                } else if (type === 'EOSE') {
                  const subscription_id = rest[0] as string;

                  if (subscription_id === this.subscription_id) {
                    // End of stored events - block subscription confirmed
                    const filter: { kinds: number[]; authors?: string[] } = {
                      kinds: [30078],
                    };
                    if (this.config.bridge_pubkey_hex) {
                      filter.authors = [this.config.bridge_pubkey_hex];
                    }
                    const confirmed_context: SubscriptionContext = {
                      relay_url: this.config.relay_url,
                      subscription_id: this.subscription_id,
                      filter: { ...filter },
                      status: 'confirmed',
                    };
                    this.hooks.emit(HOOK_NAMES.SUBSCRIPTION, confirmed_context).catch(() => {
                      // Ignore errors in hook handlers
                    });
                  } else if (subscription_id === this.attn_subscription_id) {
                    // End of stored events - ATTN Protocol subscription confirmed
                    const filter: { kinds: number[]; '#a'?: string[] } = {
                      kinds: [38188, 38288, 38388, 38488, 38588, 38688, 38888],
                    };
                    if (this.config.marketplace_coordinates && this.config.marketplace_coordinates.length > 0) {
                      filter['#a'] = this.config.marketplace_coordinates;
                    }
                    const confirmed_context: SubscriptionContext = {
                      relay_url: this.config.relay_url,
                      subscription_id: this.attn_subscription_id,
                      filter: { kinds: filter.kinds },
                      status: 'confirmed',
                    };
                    this.hooks.emit(HOOK_NAMES.SUBSCRIPTION, confirmed_context).catch(() => {
                      // Ignore errors in hook handlers
                    });
                  } else if (subscription_id === this.standard_subscription_id) {
                    // End of stored events - standard Nostr events subscription confirmed
                    const filter: { kinds: number[] } = {
                      kinds: [0, 10002, 30000, 38988],
                    };
                    const confirmed_context: SubscriptionContext = {
                      relay_url: this.config.relay_url,
                      subscription_id: this.standard_subscription_id,
                      filter: { kinds: filter.kinds },
                      status: 'confirmed',
                    };
                    this.hooks.emit(HOOK_NAMES.SUBSCRIPTION, confirmed_context).catch(() => {
                      // Ignore errors in hook handlers
                    });
                  }
                } else if (type === 'NOTICE') {
                  const notice = rest[0] || '';
                  console.log(`[attn] Relay NOTICE: ${notice}`);
                  if (typeof notice === 'string' && notice.toLowerCase().includes('error')) {
                    console.error(`[attn] Relay error notice: ${notice}`);
                  }
                }
              }
            } catch (error) {
              // Ignore parse errors
            }
          };

          this.ws!.on('message', this.message_handler);

          // Wait for AUTH challenge - do NOT subscribe until authentication completes
          if (this.config.private_key) {
            console.log('[attn] Private key provided, waiting for AUTH challenge...');
            // Set timeout: if no AUTH challenge received within timeout, reject connection
            this.auth_timeout = setTimeout(() => {
              if (!this.auth_challenge_received) {
                console.log('[attn] No AUTH challenge received within timeout');
                reject(new Error('No AUTH challenge received from relay - NIP-42 authentication required'));
              }
            }, this.auth_timeout_ms);
            // Do NOT subscribe here - wait for authentication to complete
            // Subscription will happen in the OK response handler after successful authentication
          } else {
            // No private key provided - cannot authenticate, reject connection
            reject(new Error('private_key required for NIP-42 authentication'));
          }
        });

        this.ws.on('error', (error) => {
          clearTimeout(timeout);
          const err = error instanceof Error ? error : new Error(String(error));
          this.handle_disconnect('Connection error', err);
          reject(err);
        });

        this.ws.on('close', (code, reason) => {
          clearTimeout(timeout);
          if (this.is_connected) {
            const reason_str = reason.toString();
            this.handle_disconnect(`Connection closed: code=${code}, reason=${reason_str || 'none'}`);
          }
          this.schedule_reconnect();
        });
      } catch (error) {
        clearTimeout(timeout);
        const err = error instanceof Error ? error : new Error(String(error));
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
      console.log('[attn] Sending AUTH response with event ID:', signed_event.id);
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
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
   * Subscribe to block events (kind 30078) and ATTN Protocol events
   */
  private subscribe_to_events(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('[attn] Cannot subscribe: WebSocket not open');
      return;
    }

    // Subscribe to block events (kind 30078 from Bridge service)
    const block_filter: { kinds: number[]; authors?: string[] } = {
      kinds: [30078],
    };

    // Filter by Bridge service pubkey if provided
    if (this.config.bridge_pubkey_hex) {
      block_filter.authors = [this.config.bridge_pubkey_hex];
    }

    const block_req_message = JSON.stringify([
      'REQ',
      this.subscription_id,
      block_filter,
    ]);
    console.log('[attn] Sending REQ subscription for block events:', JSON.stringify(block_filter));
    this.ws.send(block_req_message);

    // Emit subscription hook (subscribed status) for block events
    const block_subscription_context: SubscriptionContext = {
      relay_url: this.config.relay_url,
      subscription_id: this.subscription_id,
      filter: { ...block_filter },
      status: 'subscribed',
    };
    this.hooks.emit(HOOK_NAMES.SUBSCRIPTION, block_subscription_context).catch(() => {
      // Ignore errors in hook handlers
    });

    // Subscribe to ATTN Protocol events (38188, 38288, 38388, 38488, 38588, 38688, 38888)
    const attn_filter: { kinds: number[]; '#a'?: string[] } = {
      kinds: [38188, 38288, 38388, 38488, 38588, 38688, 38888],
    };

    // Filter by marketplace coordinates if provided
    if (this.config.marketplace_coordinates && this.config.marketplace_coordinates.length > 0) {
      attn_filter['#a'] = this.config.marketplace_coordinates;
    }

    const attn_req_message = JSON.stringify([
      'REQ',
      this.attn_subscription_id,
      attn_filter,
    ]);
    console.log('[attn] Sending REQ subscription for ATTN Protocol events:', JSON.stringify(attn_filter));
    this.ws.send(attn_req_message);

    // Emit subscription hook (subscribed status) for ATTN Protocol events
    const attn_subscription_context: SubscriptionContext = {
      relay_url: this.config.relay_url,
      subscription_id: this.attn_subscription_id,
      filter: { kinds: attn_filter.kinds },
      status: 'subscribed',
    };
    this.hooks.emit(HOOK_NAMES.SUBSCRIPTION, attn_subscription_context).catch(() => {
      // Ignore errors in hook handlers
    });

    // Subscribe to standard Nostr events (kind 0, 10002, 30000) and protocol block lists (kind 38988)
    const standard_filter: { kinds: number[] } = {
      kinds: [0, 10002, 30000, 38988],
    };

    const standard_req_message = JSON.stringify([
      'REQ',
      this.standard_subscription_id,
      standard_filter,
    ]);
    console.log('[attn] Sending REQ subscription for standard Nostr events:', JSON.stringify(standard_filter));
    this.ws.send(standard_req_message);

    // Emit subscription hook (subscribed status) for standard Nostr events
    const standard_subscription_context: SubscriptionContext = {
      relay_url: this.config.relay_url,
      subscription_id: this.standard_subscription_id,
      filter: { kinds: standard_filter.kinds },
      status: 'subscribed',
    };
    this.hooks.emit(HOOK_NAMES.SUBSCRIPTION, standard_subscription_context).catch(() => {
      // Ignore errors in hook handlers
    });
  }

  /**
   * Handle block event from relay (kind 30078)
   */
  private async handle_block_event(event: Event): Promise<void> {
    try {
      // Extract block height from event
      // Bridge service publishes kind 30078 with block_height in content or tags
      const block_height_tag = event.tags.find((tag) => tag[0] === 't' && tag[1]);
      const block_height = block_height_tag ? parseInt(block_height_tag[1]!, 10) : undefined;

      if (!block_height || isNaN(block_height)) {
        console.warn(`[attn] Block event missing or invalid block_height: ${event.id}`);
        return;
      }

      // Parse block hash from content if available
      let block_hash: string | undefined;
      try {
        const content_data = JSON.parse(event.content);
        block_hash = content_data.block_hash || content_data.hash;
      } catch {
        // Content might not be JSON, try to extract from tags
        const hash_tag = event.tags.find((tag) => tag[0] === 'hash' || tag[0] === 'block_hash');
        block_hash = hash_tag?.[1];
      }

      // Emit new block hook
      const context: NewBlockContext = {
        block_height,
        block_hash,
      };

      await this.hooks.emit(HOOK_NAMES.NEW_BLOCK, context);
    } catch (error) {
      console.error(`[attn] Error handling block event:`, error);
    }
  }

  /**
   * Route ATTN Protocol events to appropriate handlers based on kind
   */
  private async handle_attn_event(event: Event): Promise<void> {
    try {
      switch (event.kind) {
        case 38188: // BILLBOARD
          await this.handle_billboard_event(event);
          break;
        case 38288: // PROMOTION
          await this.handle_promotion_event(event);
          break;
        case 38388: // ATTENTION
          await this.handle_attention_event(event);
          break;
        case 38488: // BILLBOARD_CONFIRMATION
          await this.handle_billboard_confirmation_event(event);
          break;
        case 38588: // VIEWER_CONFIRMATION
          await this.handle_viewer_confirmation_event(event);
          break;
        case 38688: // MARKETPLACE_CONFIRMATION
          await this.handle_marketplace_confirmation_event(event);
          break;
        case 38888: // MATCH
          await this.handle_match_event(event);
          break;
        default:
          console.warn(`[attn] Unknown ATTN Protocol event kind: ${event.kind}`);
      }
    } catch (error) {
      console.error(`[attn] Error handling ATTN Protocol event (kind ${event.kind}):`, error);
    }
  }

  /**
   * Handle BILLBOARD event (kind 38188)
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
      console.error(`[attn] Error handling billboard event:`, error);
    }
  }

  /**
   * Handle PROMOTION event (kind 38288)
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
      console.error(`[attn] Error handling promotion event:`, error);
    }
  }

  /**
   * Handle ATTENTION event (kind 38388)
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
      console.error(`[attn] Error handling attention event:`, error);
    }
  }

  /**
   * Handle BILLBOARD_CONFIRMATION event (kind 38488)
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
      console.error(`[attn] Error handling billboard confirmation event:`, error);
    }
  }

  /**
   * Handle VIEWER_CONFIRMATION event (kind 38588)
   */
  private async handle_viewer_confirmation_event(event: Event): Promise<void> {
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

      // Extract viewer pubkey (attention owner) from event pubkey
      const viewer_pubkey = event.pubkey;

      // Extract block height from t tag
      const block_height_tag = event.tags.find((tag) => tag[0] === 't' && tag[1]);
      const block_height = block_height_tag ? parseInt(block_height_tag[1]!, 10) : undefined;

      const context: ViewerConfirmContext = {
        confirmation_event_id: event.id,
        match_event_id: match_event_id || '',
        viewer_pubkey,
        confirmation_data,
        block_height,
        event,
      };

      await this.hooks.emit(HOOK_NAMES.VIEWER_CONFIRM, context);
    } catch (error) {
      console.error(`[attn] Error handling viewer confirmation event:`, error);
    }
  }

  /**
   * Handle MARKETPLACE_CONFIRMATION event (kind 38688)
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
      console.error(`[attn] Error handling marketplace confirmation event:`, error);
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
        if (a_tag[1]?.startsWith('38288:')) {
          // Promotion coordinate - extract event ID would require looking up the event
          // For now, we'll use the coordinate itself
          promotion_event_id = a_tag[1];
        } else if (a_tag[1]?.startsWith('38388:')) {
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
      console.error(`[attn] Error handling match event:`, error);
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
        case 30000: // NIP-51 Lists (trusted billboards, trusted marketplaces)
          await this.handle_nip51_list_event(event);
          break;
        case 38988: // Block lists (protocol-specific)
          await this.handle_block_list_event(event);
          break;
        default:
          console.warn(`[attn] Unknown standard Nostr event kind: ${event.kind}`);
      }
    } catch (error) {
      console.error(`[attn] Error handling standard Nostr event (kind ${event.kind}):`, error);
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
      console.error(`[attn] Error handling profile event:`, error);
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
      console.error(`[attn] Error handling relay list event:`, error);
    }
  }

  /**
   * Handle Block List event (kind 38988)
   */
  private async handle_block_list_event(event: Event): Promise<void> {
    try {
      // Parse content
      let list_data: unknown;
      try {
        list_data = JSON.parse(event.content);
      } catch {
        list_data = event.content;
      }

      const context: NewNip51ListContext = {
        event_id: event.id,
        pubkey: event.pubkey,
        list_data,
        list_type: 'blocked_promotion',
        event,
      };

      await this.hooks.emit(HOOK_NAMES.NEW_NIP51_LIST, context);
    } catch (error) {
      console.error(`[attn] Error handling block list event:`, error);
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
      let list_type: 'trusted_billboard' | 'trusted_marketplace' | 'blocked_promotion';

      // Heuristic: determine list type from d tag pattern
      if (d_tag.toLowerCase().includes('billboard') || d_tag.toLowerCase().includes('trusted-billboard')) {
        list_type = 'trusted_billboard';
      } else if (d_tag.toLowerCase().includes('marketplace') || d_tag.toLowerCase().includes('trusted-marketplace')) {
        list_type = 'trusted_marketplace';
      } else if (d_tag.toLowerCase().includes('block') || d_tag.toLowerCase().includes('blocked') || d_tag.toLowerCase().includes('promotion')) {
        list_type = 'blocked_promotion';
      } else {
        // Default to blocked_promotion if unclear (most common use case)
        list_type = 'blocked_promotion';
      }

      const context: NewNip51ListContext = {
        event_id: event.id,
        pubkey: event.pubkey,
        list_data,
        list_type,
        event,
      };

      await this.hooks.emit(HOOK_NAMES.NEW_NIP51_LIST, context);
    } catch (error) {
      console.error(`[attn] Error handling NIP-51 list event:`, error);
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

    if (!this.is_connected && (!this.ws || this.ws.readyState === WebSocket.CLOSED)) {
      return;
    }

    try {
      if (this.ws) {
        // Close both subscriptions
        if (this.ws.readyState === WebSocket.OPEN) {
          const close_block_message = JSON.stringify(['CLOSE', this.subscription_id]);
          this.ws.send(close_block_message);
          const close_attn_message = JSON.stringify(['CLOSE', this.attn_subscription_id]);
          this.ws.send(close_attn_message);
          const close_standard_message = JSON.stringify(['CLOSE', this.standard_subscription_id]);
          this.ws.send(close_standard_message);
        }
        this.ws.removeAllListeners();
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
      const err = error instanceof Error ? error : new Error(String(error));

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
    if (this.reconnect_timeout) {
      return; // Already scheduled
    }

    if (this.reconnect_attempts >= this.max_reconnect_attempts) {
      console.error(`[attn] Max reconnection attempts (${this.max_reconnect_attempts}) reached for ${this.config.relay_url}`);
      return;
    }

    const delay = this.reconnect_delay_ms * Math.pow(2, this.reconnect_attempts);
    this.reconnect_attempts++;

    console.log(`[attn] Will attempt to reconnect to ${this.config.relay_url} in ${delay}ms (attempt ${this.reconnect_attempts}/${this.max_reconnect_attempts})...`);

    this.reconnect_timeout = setTimeout(() => {
      this.reconnect_timeout = null;
      this.connect().catch((error) => {
        console.error(`[attn] Reconnection failed:`, error);
      });
    }, delay);
  }

  /**
   * Check if currently connected
   */
  get connected(): boolean {
    return this.is_connected && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get current relay URL
   */
  get relay_url(): string {
    return this.config.relay_url;
  }
}

