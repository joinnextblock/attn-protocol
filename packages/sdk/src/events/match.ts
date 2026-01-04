/**
 * MATCH Event builder (kind 38888)
 */

import { finalizeEvent } from "nostr-tools";
import type { Event } from "nostr-tools";
import { ATTN_EVENT_KINDS } from "@attn/ts-core";
import type { MatchEventParams } from "../types/index.js";
import { format_d_tag } from "../utils/formatting.js";

/**
 * Create MATCH event
 * Note: ask, bid, duration, kind_list, relay_list are NOT in content per ATTN-01
 * These values are calculated at ingestion by fetching referenced events
 */
export function create_match_event(
  private_key: Uint8Array,
  params: MatchEventParams
): Event {
  // Format d-tag with org.attnprotocol: prefix
  const match_d_tag = format_d_tag("match", params.match_id);

  // Build content object - ONLY ref_* fields per ATTN-01
  // Values like ask, bid, duration are calculated at ingestion, not stored
  const content_object: Record<string, unknown> = {
    ref_match_id: params.match_id,
    ref_promotion_id: params.promotion_id,
    ref_attention_id: params.attention_id,
    ref_billboard_id: params.billboard_id,
    ref_marketplace_id: params.marketplace_id,
    ref_marketplace_pubkey: params.marketplace_pubkey,
    ref_promotion_pubkey: params.promotion_pubkey,
    ref_attention_pubkey: params.attention_pubkey,
    ref_billboard_pubkey: params.billboard_pubkey,
  };

  const tags: string[][] = [];

  // Required d tag
  tags.push(["d", match_d_tag]);

  // Required t tag (block height) - per ATTN-01, every event must include this
  tags.push(["t", params.block_height.toString()]);

  // Required a tags (marketplace, billboard, promotion, attention coordinates)
  tags.push(["a", params.marketplace_coordinate]);
  tags.push(["a", params.billboard_coordinate]);
  tags.push(["a", params.promotion_coordinate]);
  tags.push(["a", params.attention_coordinate]);

  // Required p tags (marketplace, promotion, attention, billboard)
  tags.push(["p", params.marketplace_pubkey]);
  tags.push(["p", params.promotion_pubkey]);
  tags.push(["p", params.attention_pubkey]);
  tags.push(["p", params.billboard_pubkey]);

  // Required r tags (multiple allowed, one per relay)
  if (params.relays && params.relays.length > 0) {
    for (const relay of params.relays) {
      tags.push(["r", relay]);
    }
  }

  // Required k tags (multiple allowed)
  if (params.kinds && params.kinds.length > 0) {
    for (const k of params.kinds) {
      tags.push(["k", k.toString()]);
    }
  }

  const event_template = {
    kind: ATTN_EVENT_KINDS.MATCH,
    created_at: params.created_at ?? Math.floor(Date.now() / 1000),
    content: JSON.stringify(content_object),
    tags,
  };

  return finalizeEvent(event_template, private_key);
}

