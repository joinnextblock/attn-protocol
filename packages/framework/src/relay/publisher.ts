/**
 * Publisher module for publishing Nostr events.
 *
 * Handles publishing kind 0 (profile), kind 10002 (relay list),
 * kind 3 (follow list), and arbitrary events to multiple relays
 * with NIP-42 authentication support.
 *
 * @module
 */

import WebSocket from 'isomorphic-ws';
import { finalizeEvent, getPublicKey } from 'nostr-tools';
import type { Event } from 'nostr-tools';
import type { Logger } from '../logger.js';
import type { ProfileConfig } from '../attn.js';
import type { PublishResult } from '../hooks/types.js';

/**
 * Write relay configuration.
 *
 * Defines a relay URL and whether it requires authentication.
 */
export interface WriteRelay {
  /** WebSocket URL of the relay */
  url: string;
  /** Whether this relay requires NIP-42 authentication */
  requires_auth: boolean;
}

/**
 * Publisher configuration options.
 */
export interface PublisherConfig {
  /** Private key for signing events (32-byte Uint8Array) */
  private_key: Uint8Array;
  /** Relays to publish events to */
  write_relays: WriteRelay[];
  /** Read relays for relay list event (NIP-65) */
  read_relays: string[];
  /** Logger instance */
  logger: Logger;
  /**
   * NIP-42 authentication timeout in milliseconds.
   * @default 5000
   */
  auth_timeout_ms?: number;
  /**
   * Publish operation timeout in milliseconds.
   * @default 10000
   */
  publish_timeout_ms?: number;
}

/**
 * Results from publishing an event to multiple relays.
 */
export interface PublishResults {
  /** ID of the published event */
  event_id: string;
  /** Individual results from each relay */
  results: PublishResult[];
  /** Number of successful publishes */
  success_count: number;
  /** Number of failed publishes */
  failure_count: number;
}

/**
 * Publisher for writing Nostr events to relays.
 *
 * Supports publishing profile (kind 0), relay list (kind 10002),
 * follow list (kind 3), and arbitrary events with automatic
 * NIP-42 authentication handling.
 *
 * @example
 * ```ts
 * const publisher = new Publisher({
 *   private_key: privateKeyBytes,
 *   write_relays: [{ url: 'wss://relay.example.com', requires_auth: true }],
 *   read_relays: ['wss://relay.example.com'],
 *   logger: myLogger,
 * });
 *
 * const results = await publisher.publish_profile({
 *   name: 'Alice',
 *   about: 'Hello world',
 * });
 *
 * console.log(`Published to ${results.success_count} relays`);
 * ```
 */
export class Publisher {
  private config: PublisherConfig;
  private public_key_hex: string;
  private auth_timeout_ms: number;
  private publish_timeout_ms: number;

  /**
   * Create a new Publisher instance.
   *
   * @param config - Publisher configuration
   */
  constructor(config: PublisherConfig) {
    this.config = config;
    this.public_key_hex = get_public_key_hex(config.private_key);
    this.auth_timeout_ms = config.auth_timeout_ms ?? 5000;
    this.publish_timeout_ms = config.publish_timeout_ms ?? 10000;
  }

  /**
   * Publish a kind 0 profile event (NIP-01).
   *
   * @param profile - Profile metadata to publish
   * @returns Results from publishing to all configured relays
   */
  async publish_profile(profile: ProfileConfig): Promise<PublishResults> {
    const profile_data: Record<string, unknown> = {
      name: profile.name,
    };

    if (profile.about) profile_data.about = profile.about;
    if (profile.picture) profile_data.picture = profile.picture;
    if (profile.banner) profile_data.banner = profile.banner;
    if (profile.website) profile_data.website = profile.website;
    if (profile.nip05) profile_data.nip05 = profile.nip05;
    if (profile.lud16) profile_data.lud16 = profile.lud16;
    if (profile.display_name) profile_data.display_name = profile.display_name;
    if (profile.bot !== undefined) profile_data.bot = profile.bot;

    const event = {
      kind: 0,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: JSON.stringify(profile_data),
      pubkey: this.public_key_hex,
    };

    const signed_event = finalizeEvent(event, this.config.private_key);
    return this.publish_to_relays(signed_event);
  }

  /**
   * Publish a kind 10002 relay list event (NIP-65).
   *
   * Creates relay tags from configured read and write relays.
   *
   * @returns Results from publishing to all configured relays
   */
  async publish_relay_list(): Promise<PublishResults> {
    const tags: string[][] = [];

    // Add read relays
    for (const url of this.config.read_relays) {
      const write_relay = this.config.write_relays.find((r) => r.url === url);
      if (write_relay) {
        // Both read and write
        tags.push(['r', url]);
      } else {
        // Read only
        tags.push(['r', url, 'read']);
      }
    }

    // Add write-only relays
    for (const relay of this.config.write_relays) {
      if (!this.config.read_relays.includes(relay.url)) {
        tags.push(['r', relay.url, 'write']);
      }
    }

    const event = {
      kind: 10002,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content: '',
      pubkey: this.public_key_hex,
    };

    const signed_event = finalizeEvent(event, this.config.private_key);
    return this.publish_to_relays(signed_event);
  }

  /**
   * Publish kind 3 follow list event (NIP-02)
   * @param pubkeys - Array of pubkeys to follow
   */
  async publish_follow_list(pubkeys: string[]): Promise<PublishResults> {
    const tags = pubkeys.map((pk) => ['p', pk]);

    const event = {
      kind: 3,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content: '',
      pubkey: this.public_key_hex,
    };

    const signed_event = finalizeEvent(event, this.config.private_key);
    return this.publish_to_relays(signed_event);
  }

  /**
   * Publish an arbitrary event to all write relays
   */
  async publish_event(event: Event): Promise<PublishResults> {
    return this.publish_to_relays(event);
  }

  /**
   * Publish event to all configured write relays
   */
  private async publish_to_relays(event: Event): Promise<PublishResults> {
    const results: PublishResult[] = [];

    const publish_promises = this.config.write_relays.map((relay) =>
      this.publish_to_single_relay(relay.url, event, relay.requires_auth)
    );

    const settled = await Promise.allSettled(publish_promises);

    for (let i = 0; i < settled.length; i++) {
      const result = settled[i];
      const relay = this.config.write_relays[i];

      if (!result) {
        results.push({
          event_id: event.id,
          relay_url: relay?.url ?? 'unknown',
          success: false,
          error: 'No result',
        });
      } else if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        const rejected = result as PromiseRejectedResult;
        results.push({
          event_id: event.id,
          relay_url: relay?.url ?? 'unknown',
          success: false,
          error: rejected.reason?.message ?? 'Unknown error',
        });
      }
    }

    const success_count = results.filter((r) => r.success).length;
    const failure_count = results.length - success_count;

    return {
      event_id: event.id,
      results,
      success_count,
      failure_count,
    };
  }

  /**
   * Publish event to a single relay with optional NIP-42 authentication
   */
  private async publish_to_single_relay(
    relay_url: string,
    event: Event,
    requires_auth: boolean
  ): Promise<PublishResult> {
    return new Promise((resolve) => {
      let ws: WebSocket | null = null;
      let resolved = false;
      let is_authenticated = false;
      let event_sent = false;
      let auth_event_id: string | null = null;
      let auth_timeout: NodeJS.Timeout | null = null;
      let publish_timeout: NodeJS.Timeout | null = null;

      const cleanup = () => {
        if (auth_timeout) {
          clearTimeout(auth_timeout);
          auth_timeout = null;
        }
        if (publish_timeout) {
          clearTimeout(publish_timeout);
          publish_timeout = null;
        }
      };

      const fail = (error: string) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          if (ws) ws.close();
          resolve({
            event_id: event.id,
            relay_url,
            success: false,
            error,
          });
        }
      };

      const send_event = () => {
        if (event_sent || resolved || !ws) return;
        event_sent = true;
        const event_message = JSON.stringify(['EVENT', event]);
        ws.send(event_message);
        publish_timeout = setTimeout(() => {
          if (!resolved) {
            fail('Timeout waiting for relay response');
          }
        }, this.publish_timeout_ms);
      };

      try {
        ws = new WebSocket(relay_url);

        ws.onopen = () => {
          if (requires_auth) {
            auth_timeout = setTimeout(() => {
              if (!is_authenticated && !resolved) {
                is_authenticated = true;
                send_event();
              }
            }, this.auth_timeout_ms);
          } else {
            is_authenticated = true;
            send_event();
          }
        };

        ws.onmessage = (msg: { data: unknown }) => {
          try {
            const raw_data = msg.data;
            const data = typeof raw_data === 'string' ? raw_data : String(raw_data);
            const message = JSON.parse(data);
            if (!Array.isArray(message) || message.length < 1) return;

            const [type, ...rest] = message;

            // Handle AUTH challenge
            if (type === 'AUTH' && requires_auth && !is_authenticated) {
              const challenge = rest[0];
              if (challenge && typeof challenge === 'string') {
                if (auth_timeout) {
                  clearTimeout(auth_timeout);
                  auth_timeout = null;
                }

                try {
                  let normalized_url = relay_url.trim();
                  if (normalized_url.endsWith('/')) {
                    normalized_url = normalized_url.slice(0, -1);
                  }

                  const auth_event = {
                    kind: 22242,
                    created_at: Math.floor(Date.now() / 1000),
                    tags: [
                      ['relay', normalized_url],
                      ['challenge', challenge],
                    ],
                    content: '',
                    pubkey: this.public_key_hex,
                  };

                  const signed_auth = finalizeEvent(auth_event, this.config.private_key);
                  auth_event_id = signed_auth.id;

                  ws?.send(JSON.stringify(['AUTH', signed_auth]));

                  auth_timeout = setTimeout(() => {
                    if (!is_authenticated) {
                      fail('Authentication timeout: No OK response');
                    }
                  }, this.auth_timeout_ms);
                } catch (error) {
                  fail(`Auth event creation failed: ${error instanceof Error ? error.message : 'Unknown'}`);
                }
              }
              return;
            }

            // Handle OK for auth
            if (type === 'OK' && requires_auth && !is_authenticated && auth_event_id) {
              const ev_id = rest[0];
              const accepted = rest[1];
              if (ev_id === auth_event_id) {
                if (auth_timeout) {
                  clearTimeout(auth_timeout);
                  auth_timeout = null;
                }
                if (accepted === true) {
                  is_authenticated = true;
                  auth_event_id = null;
                  send_event();
                } else {
                  const reason = rest[2] || 'Unknown reason';
                  fail(`Auth rejected: ${reason}`);
                }
              }
              return;
            }

            // Handle OK for published event
            if (type === 'OK' && event_sent) {
              const ev_id = rest[0];
              const accepted = rest[1];
              const message_text = rest[2];

              if (ev_id === event.id && !resolved) {
                resolved = true;
                cleanup();
                ws?.close();
                resolve({
                  event_id: event.id,
                  relay_url,
                  success: accepted === true,
                  error: accepted === false ? message_text : undefined,
                });
              }
            }
          } catch {
            // Ignore parse errors
          }
        };

        ws.onerror = (error: unknown) => {
          const err_obj = error as { message?: string };
          const err_msg = err_obj?.message ?? 'WebSocket error';
          fail(err_msg);
        };

        ws.onclose = () => {
          if (!resolved) {
            if (!event_sent) {
              fail('Connection closed before event sent');
            } else {
              fail('Connection closed before response');
            }
          }
        };
      } catch (error) {
        fail(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    });
  }
}

/**
 * Get public key hex from private key
 */
function get_public_key_hex(private_key: Uint8Array): string {
  const result = getPublicKey(private_key);
  if (typeof result === 'string') {
    return result;
  }
  // Handle Uint8Array result
  const bytes = result as Uint8Array;
  return Array.from(bytes)
    .map((b: number) => b.toString(16).padStart(2, '0'))
    .join('');
}
