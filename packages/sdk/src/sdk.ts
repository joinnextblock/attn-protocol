/**
 * AttnSdk - Main SDK class for creating and publishing ATTN Protocol events
 */

import { getPublicKey, nip19 } from "nostr-tools";
import type { Event } from "nostr-tools";
import {
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
  PublishResult,
  PublishResults,
} from "./types/index.js";

/**
 * AttnSdk configuration
 */
export interface AttnSdkConfig {
  private_key: string | Uint8Array;
}

/**
 * Main SDK class for ATTN Protocol
 */
export class AttnSdk {
  private private_key: Uint8Array;
  private public_key: string;

  constructor(config: AttnSdkConfig) {
    // Convert private key to Uint8Array if it's a string
    if (typeof config.private_key === "string") {
      // Check if it's a nsec (nip19 encoded)
      if (config.private_key.startsWith("nsec")) {
        const decoded = nip19.decode(config.private_key);
        if (decoded.type !== "nsec") {
          throw new Error("Invalid nsec format");
        }
        this.private_key = decoded.data as Uint8Array;
      } else {
        // Assume it's hex (64 hex characters = 32 bytes)
        if (config.private_key.length !== 64) {
          throw new Error(
            "Invalid hex private key: must be 64 hex characters"
          );
        }
        // Convert hex string to Uint8Array
        const hex_bytes = config.private_key.match(/.{1,2}/g);
        if (!hex_bytes) {
          throw new Error("Invalid hex private key format");
        }
        this.private_key = Uint8Array.from(
          hex_bytes.map((byte) => parseInt(byte, 16))
        );
      }
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
   * Create MARKETPLACE event (kind 38088)
   */
  create_marketplace(params: MarketplaceEventParams): Event {
    return create_marketplace_event(this.private_key, params);
  }

  /**
   * Create BILLBOARD event (kind 38188)
   */
  create_billboard(
    params: BillboardEventParams
  ): Event {
    return create_billboard_event(this.private_key, params);
  }

  /**
   * Create PROMOTION event (kind 38288)
   */
  create_promotion(params: PromotionEventParams): Event {
    return create_promotion_event(this.private_key, params);
  }

  /**
   * Create ATTENTION event (kind 38388)
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
   * Publish event to a single relay
   */
  async publish(
    event: Event,
    relay_url: string,
    timeout_ms?: number
  ): Promise<PublishResult> {
    return publish_to_relay(relay_url, event, timeout_ms);
  }

  /**
   * Publish event to multiple relays
   */
  async publish_to_multiple(
    event: Event,
    relay_urls: string[],
    timeout_ms?: number
  ): Promise<PublishResults> {
    return publish_to_multiple(relay_urls, event, timeout_ms);
  }
}

