/**
 * PROMOTION Event builder (kind 38388)
 */

import { finalizeEvent } from "nostr-tools";
import type { Event } from "nostr-tools";
import { ATTN_EVENT_KINDS } from "@attn-protocol/core";
import type { PromotionEventParams } from "../types/index.js";
import { format_d_tag } from "../utils/formatting.js";

/**
 * Create PROMOTION event
 */
export function create_promotion_event(
  private_key: Uint8Array,
  params: PromotionEventParams
): Event {
  // Format d-tag with org.attnprotocol: prefix
  const promotion_d_tag = format_d_tag("promotion", params.promotion_id);

  // Extract billboard_id from billboard coordinate
  // Format: 38288:<billboard_pubkey>:org.attnprotocol:billboard:<billboard_id>
  const billboard_id = params.billboard_id ??
    (params.billboard_coordinate.split(":").slice(-1)[0]?.replace("org.attnprotocol:billboard:", "") || "");

  // Build content object with required fields
  const content_object: Record<string, unknown> = {
    duration: params.duration,
    bid: params.bid,
    event_id: params.event_id,
    call_to_action: params.call_to_action,
    call_to_action_url: params.call_to_action_url,
    escrow_id_list: params.escrow_id_list ?? [],
    ref_promotion_pubkey: params.promotion_pubkey,
    ref_promotion_id: params.promotion_id,
    ref_marketplace_pubkey: params.marketplace_pubkey,
    ref_marketplace_id: params.marketplace_id,
    ref_billboard_pubkey: params.billboard_pubkey,
    ref_billboard_id: billboard_id,
  };

  const tags: string[][] = [];

  // Required d tag
  tags.push(["d", promotion_d_tag]);

  // Required t tag (block height) - per ATTN-01, every event must include this
  tags.push(["t", params.block_height.toString()]);

  // Required a tags (marketplace, video, billboard coordinates)
  tags.push(["a", params.marketplace_coordinate]);
  tags.push(["a", params.video_coordinate]);
  tags.push(["a", params.billboard_coordinate]);

  // Required p tags (marketplace, billboard, and promotion)
  tags.push(["p", params.marketplace_pubkey]);
  tags.push(["p", params.billboard_pubkey]);
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
    kind: ATTN_EVENT_KINDS.PROMOTION,
    created_at: params.created_at ?? Math.floor(Date.now() / 1000),
    content: JSON.stringify(content_object),
    tags,
  };

  return finalizeEvent(event_template, private_key);
}

