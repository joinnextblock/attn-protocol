/**
 * MARKETPLACE Event builder (kind 38188)
 */

import { finalizeEvent } from "nostr-tools";
import type { Event } from "nostr-tools";
import { ATTN_EVENT_KINDS } from "@attn-protocol/core";
import type { MarketplaceEventParams } from "../types/index.js";
import { format_d_tag, format_coordinate } from "../utils/formatting.js";

/**
 * Create MARKETPLACE event (kind 38188)
 */
export function create_marketplace_event(
  private_key: Uint8Array,
  params: MarketplaceEventParams
): Event {
  // Format d-tag with org.attnprotocol: prefix
  const marketplace_d_tag = format_d_tag("marketplace", params.marketplace_id);

  // Build content object - kind_list and relay_list are NOT in content per ATTN-01
  const content_object: Record<string, unknown> = {
    name: params.name,
    description: params.description,
    admin_pubkey: params.admin_pubkey,
    min_duration: params.min_duration ?? 15000,
    max_duration: params.max_duration ?? 60000,
    match_fee_sats: params.match_fee_sats ?? 0,
    confirmation_fee_sats: params.confirmation_fee_sats ?? 0,
    ref_marketplace_pubkey: params.marketplace_pubkey,
    ref_marketplace_id: params.marketplace_id,
    ref_node_pubkey: params.ref_node_pubkey, // Required per ATTN-01
    ref_block_id: params.ref_block_id, // Required per ATTN-01
    // Metrics fields (required per ATTN-01, can be 0)
    billboard_count: params.billboard_count ?? 0,
    promotion_count: params.promotion_count ?? 0,
    attention_count: params.attention_count ?? 0,
    match_count: params.match_count ?? 0,
  };

  const tags: string[][] = [];

  // Required d tag
  tags.push(["d", marketplace_d_tag]);

  // Required t tag (block height) - per ATTN-01, every event must include this
  tags.push(["t", params.block_height.toString()]);

  // Required a tag for block coordinate - per ATTN-01
  tags.push(["a", params.block_coordinate]);

  // Required k tags (multiple allowed, one per supported kind)
  // kind_list is in tags only, NOT in content per ATTN-01
  for (const kind of params.kind_list) {
    tags.push(["k", kind.toString()]);
  }

  // Required p tag (marketplace pubkey)
  tags.push(["p", params.marketplace_pubkey]);

  // Required p tag for node pubkey - per ATTN-01
  tags.push(["p", params.ref_node_pubkey]);

  // Required r tags (multiple allowed, one per relay)
  // relay_list is in tags only, NOT in content per ATTN-01
  for (const relay of params.relay_list) {
    tags.push(["r", relay]);
  }

  // Optional u tag (website URL)
  if (params.website_url) {
    tags.push(["u", params.website_url]);
  }

  const event_template = {
    kind: ATTN_EVENT_KINDS.MARKETPLACE,
    created_at: params.created_at ?? Math.floor(Date.now() / 1000),
    content: JSON.stringify(content_object),
    tags,
  };

  return finalizeEvent(event_template, private_key);
}
