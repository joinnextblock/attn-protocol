/**
 * ATTENTION Event builder (kind 38488)
 */

import { finalizeEvent } from "nostr-tools";
import type { Event } from "nostr-tools";
import { ATTN_EVENT_KINDS } from "@attn/ts-core";
import type { AttentionEventParams } from "../types/index.js";
import { format_d_tag } from "../utils/formatting.js";

/**
 * Create ATTENTION event
 */
export function create_attention_event(
  private_key: Uint8Array,
  params: AttentionEventParams
): Event {
  // Format d-tag with org.attnprotocol: prefix
  const attention_d_tag = format_d_tag("attention", params.attention_id);

  // Build content object - kind_list and relay_list are NOT in content per ATTN-01
  const content_object: Record<string, unknown> = {
    ask: params.ask,
    min_duration: params.min_duration,
    max_duration: params.max_duration,
    blocked_promotions_id: params.blocked_promotions_id,
    blocked_promoters_id: params.blocked_promoters_id,
    ref_attention_pubkey: params.attention_pubkey,
    ref_attention_id: params.attention_id,
    ref_marketplace_pubkey: params.marketplace_pubkey,
    ref_marketplace_id: params.marketplace_id,
  };

  // Add optional trusted lists if provided
  if (params.trusted_marketplaces_id) {
    content_object.trusted_marketplaces_id = params.trusted_marketplaces_id;
  }
  if (params.trusted_billboards_id) {
    content_object.trusted_billboards_id = params.trusted_billboards_id;
  }

  const tags: string[][] = [];

  // Required d tag
  tags.push(["d", attention_d_tag]);

  // Required t tag (block height) - per ATTN-01, every event must include this
  tags.push(["t", params.block_height.toString()]);

  // Required a tags (marketplace and block list coordinates)
  tags.push(["a", params.marketplace_coordinate]);
  tags.push(["a", params.blocked_promotions_coordinate]);
  tags.push(["a", params.blocked_promoters_coordinate]);

  // Optional a tags for trusted lists
  if (params.trusted_marketplaces_coordinate) {
    tags.push(["a", params.trusted_marketplaces_coordinate]);
  }
  if (params.trusted_billboards_coordinate) {
    tags.push(["a", params.trusted_billboards_coordinate]);
  }

  // Required p tags (attention and marketplace)
  tags.push(["p", params.attention_pubkey]);
  tags.push(["p", params.marketplace_pubkey]);

  // Required r tags (multiple allowed, one per relay)
  // relay_list is in tags only, NOT in content per ATTN-01
  for (const relay of params.relays) {
    tags.push(["r", relay]);
  }

  // Required k tags (multiple allowed, one per supported kind)
  // kind_list is in tags only, NOT in content per ATTN-01
  for (const kind of params.kinds) {
    tags.push(["k", kind.toString()]);
  }

  const event_template = {
    kind: ATTN_EVENT_KINDS.ATTENTION,
    created_at: params.created_at ?? Math.floor(Date.now() / 1000),
    content: JSON.stringify(content_object),
    tags,
  };

  return finalizeEvent(event_template, private_key);
}

