/**
 * AttnSdk - Main SDK class for creating and publishing ATTN Protocol events
 * @module
 */

import { getPublicKey } from "nostr-tools";
import { decode_private_key } from "@attn/ts-core";
import type { Event } from "nostr-tools";
import {
  create_block_event,
  create_marketplace_event,
  create_billboard_event,
  create_promotion_event,
  create_attention_event,
  create_match_event,
} from "./events/index.js";
import { publish_to_relay, publish_to_multiple } from "./relay/index.js";
import type {
  MarketplaceEventParams,
  BillboardEventParams,
  PromotionEventParams,
  AttentionEventParams,
  MatchEventParams,
  BlockEventParams,
  PublishResult,
  PublishResults,
} from "./types/index.js";

/**
 * Configuration options for the AttnSdk.
 *
 * @example
 * ```ts
 * // Using hex private key
 * const config: AttnSdkConfig = {
 *   private_key: "abc123..." // 64 hex characters
 * };
 *
 * // Using nsec format
 * const config: AttnSdkConfig = {
 *   private_key: "nsec1..."
 * };
 * ```
 */
export interface AttnSdkConfig {
  /**
   * Private key for signing events.
   * Accepts hex string (64 chars), nsec (NIP-19), or Uint8Array.
   */
  private_key: string | Uint8Array;
}

/**
 * Main SDK class for creating and publishing ATTN Protocol events.
 *
 * Provides a high-level API for:
 * - Creating signed Nostr events for all ATTN Protocol event types
 * - Publishing events to Nostr relays with optional NIP-42 authentication
 *
 * @example
 * ```ts
 * import { AttnSdk } from '@attn/ts-sdk';
 *
 * // Initialize with private key
 * const sdk = new AttnSdk({ private_key: "nsec1..." });
 *
 * // Create a promotion event
 * const event = sdk.create_promotion({
 *   marketplace_pubkey: "abc...",
 *   marketplace_d_tag: "my-marketplace",
 *   billboard_pubkey: "def...",
 *   billboard_d_tag: "main-slot",
 *   d_tag: "my-promo-1",
 *   duration: 100,
 *   bid: 1000,
 * });
 *
 * // Publish to relay
 * const result = await sdk.publish(event, "wss://relay.example.com");
 * ```
 */
export class AttnSdk {
  private private_key: Uint8Array;
  private public_key: string;

  constructor(config: AttnSdkConfig) {
    // Convert private key to Uint8Array if it's a string
    if (typeof config.private_key === "string") {
      this.private_key = decode_private_key(config.private_key);
    } else {
      this.private_key = config.private_key;
    }

    this.public_key = getPublicKey(this.private_key);
  }

  /**
   * Get the public key (hex)
   */
  get_public_key(): string {
    return this.public_key;
  }

  /**
   * Create BLOCK event (kind 38808 - City Protocol)
   * @deprecated Block events are now published by City Protocol. Use @city/clock or @city/sdk.
   */
  create_block(params: BlockEventParams): Event {
    return create_block_event(this.private_key, params);
  }

  /**
   * Create MARKETPLACE event (kind 38188)
   */
  create_marketplace(params: MarketplaceEventParams): Event {
    return create_marketplace_event(this.private_key, params);
  }

  /**
   * Create BILLBOARD event (kind 38288)
   */
  create_billboard(
    params: BillboardEventParams
  ): Event {
    return create_billboard_event(this.private_key, params);
  }

  /**
   * Create PROMOTION event (kind 38388)
   */
  create_promotion(params: PromotionEventParams): Event {
    return create_promotion_event(this.private_key, params);
  }

  /**
   * Create ATTENTION event (kind 38488)
   */
  create_attention(params: AttentionEventParams): Event {
    return create_attention_event(this.private_key, params);
  }

  /**
   * Create MATCH event (kind 38888)
   */
  create_match(params: MatchEventParams): Event {
    return create_match_event(this.private_key, params);
  }

  /**
   * Publish event to a single relay with optional NIP-42 authentication
   * @param event - Nostr event to publish
   * @param relay_url - WebSocket URL of the relay
   * @param timeout_ms - Timeout for publish response (default 3000ms)
   * @param auth_timeout_ms - Timeout for authentication (default 3000ms)
   * @param requires_auth - Whether relay requires NIP-42 authentication (default false)
   */
  async publish(
    event: Event,
    relay_url: string,
    timeout_ms?: number,
    auth_timeout_ms?: number,
    requires_auth: boolean = false
  ): Promise<PublishResult> {
    return publish_to_relay(relay_url, event, this.private_key, timeout_ms, auth_timeout_ms, requires_auth);
  }

  /**
   * Publish event to multiple relays with optional NIP-42 authentication
   * @param event - Nostr event to publish
   * @param relay_urls - WebSocket URLs of the relays
   * @param timeout_ms - Timeout for publish response (default 10000ms)
   * @param auth_timeout_ms - Timeout for authentication (default 10000ms)
   * @param requires_auth - Whether relays require NIP-42 authentication (default false)
   */
  async publish_to_multiple(
    event: Event,
    relay_urls: string[],
    timeout_ms?: number,
    auth_timeout_ms?: number,
    requires_auth: boolean = false
  ): Promise<PublishResults> {
    return publish_to_multiple(relay_urls, event, this.private_key, timeout_ms, auth_timeout_ms, requires_auth);
  }
}

