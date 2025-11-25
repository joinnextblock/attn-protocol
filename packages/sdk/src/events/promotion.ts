/**
 * PROMOTION Event builder (kind 38288)
 */

import { finalizeEvent } from "nostr-tools";
import type { Event } from "nostr-tools";
import type { PromotionEventParams } from "../types/index.js";

/**
 * Create PROMOTION event
 */
export function create_promotion_event(
  private_key: Uint8Array,
  params: PromotionEventParams
): Event {
  // Build content object with required fields
  // promotion_id used for both d tag and content per ATTN-01.md
  const content_object: Record<string, unknown> = {
    duration: params.duration,
    bid: params.bid,
    event_id: params.event_id,
    call_to_action: params.call_to_action,
    call_to_action_url: params.call_to_action_url,
    marketplace_pubkey: params.marketplace_pubkey,
    promotion_pubkey: params.promotion_pubkey,
    marketplace_id: params.marketplace_id,
    promotion_id: params.promotion_id,
  };

  // Add optional description
  if (params.description) {
    content_object.description = params.description;
  }

  const tags: string[][] = [];

  // Required d tag (derived from promotion_id per ATTN-01.md)
  tags.push(["d", params.promotion_id]);

  // Required t tag (block height)
  if (params.block_height !== undefined) {
    tags.push(["t", params.block_height.toString()]);
  }

  // Required a tags (marketplace, video, billboard coordinates)
  tags.push(["a", params.marketplace_coordinate]);
  tags.push(["a", params.video_coordinate]);
  tags.push(["a", params.billboard_coordinate]);

  // Required p tags (marketplace and promotion)
  tags.push(["p", params.marketplace_pubkey]);
  tags.push(["p", params.promotion_pubkey]);

  // Required r tags (multiple allowed, one per relay)
  for (const relay of params.relays) {
    tags.push(["r", relay]);
  }

  // Required k tag
  tags.push(["k", params.kind.toString()]);

  // Required u tag
  tags.push(["u", params.url]);

  const event_template = {
    kind: 38288,
    created_at: params.created_at ?? Math.floor(Date.now() / 1000),
    content: JSON.stringify(content_object),
    tags,
  };

  return finalizeEvent(event_template, private_key);
}

