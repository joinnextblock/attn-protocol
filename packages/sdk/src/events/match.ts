/**
 * MATCH Event builder (kind 38888)
 */

import { finalizeEvent } from "nostr-tools";
import type { Event } from "nostr-tools";
import type { MatchEventParams } from "../types/index.js";

/**
 * Create MATCH event
 */
export function create_match_event(
  private_key: Uint8Array,
  params: MatchEventParams
): Event {
  // Build content object with required fields
  const content_object: Record<string, unknown> = {
    ask: params.ask,
    bid: params.bid,
    duration: params.duration,
    kind_list: params.kind_list,
    relay_list: params.relay_list,
    marketplace_pubkey: params.marketplace_pubkey,
    promotion_pubkey: params.promotion_pubkey,
    attention_pubkey: params.attention_pubkey,
    billboard_pubkey: params.billboard_pubkey,
    marketplace_id: params.marketplace_id,
    billboard_id: params.billboard_id,
    promotion_id: params.promotion_id,
    attention_id: params.attention_id,
  };

  const tags: string[][] = [];

  // Required d tag (derived from match_id per ATTN-01.md)
  tags.push(["d", params.match_id]);

  // Required t tag (block height)
  if (params.block_height !== undefined) {
    tags.push(["t", params.block_height.toString()]);
  }

  // Required a tags (marketplace, billboard, promotion, attention coordinates)
  tags.push(["a", params.marketplace_coordinate]);
  tags.push(["a", params.billboard_coordinate]);
  tags.push(["a", params.promotion_coordinate]);
  tags.push(["a", params.attention_coordinate]);

  // Required p tags (marketplace, promotion, attention)
  tags.push(["p", params.marketplace_pubkey]);
  tags.push(["p", params.promotion_pubkey]);
  tags.push(["p", params.attention_pubkey]);

  // Required r tags (multiple allowed, one per relay)
  for (const relay of params.relays) {
    tags.push(["r", relay]);
  }

  // Required k tag (multiple allowed)
  const kind_array = Array.isArray(params.kind) ? params.kind : [params.kind];
  for (const k of kind_array) {
    tags.push(["k", k.toString()]);
  }

  const event_template = {
    kind: 38888,
    created_at: params.created_at ?? Math.floor(Date.now() / 1000),
    content: JSON.stringify(content_object),
    tags,
  };

  return finalizeEvent(event_template, private_key);
}

