/**
 * BILLBOARD Event builder (kind 38288)
 */

import { finalizeEvent } from "nostr-tools";
import type { Event } from "nostr-tools";
import { ATTN_EVENT_KINDS } from "@attn/ts-core";
import type { BillboardEventParams } from "../types/index.js";
import { format_d_tag, format_coordinate } from "../utils/formatting.js";

/**
 * Create BILLBOARD event
 */
export function create_billboard_event(
  private_key: Uint8Array,
  params: BillboardEventParams
): Event {
  // Format d-tag with org.attnprotocol: prefix
  const billboard_d_tag = format_d_tag("billboard", params.billboard_id);

  // Build content object with required fields
  const content_object: Record<string, unknown> = {
    name: params.name,
    confirmation_fee_sats: params.confirmation_fee_sats ?? 0,
    ref_billboard_pubkey: params.billboard_pubkey,
    ref_billboard_id: params.billboard_id,
    ref_marketplace_pubkey: params.marketplace_pubkey,
    ref_marketplace_id: params.marketplace_id,
  };

  if (params.description) {
    content_object.description = params.description;
  }

  const tags: string[][] = [];

  // Required d tag
  tags.push(["d", billboard_d_tag]);

  // Required t tag (block height) - per ATTN-01, every event must include this
  tags.push(["t", params.block_height.toString()]);

  // Required a tag (marketplace coordinate)
  tags.push(["a", params.marketplace_coordinate]);

  // Required p tags (billboard and marketplace)
  tags.push(["p", params.billboard_pubkey]);
  tags.push(["p", params.marketplace_pubkey]);

  // Required r tags (multiple allowed, one per relay)
  for (const relay of params.relays) {
    tags.push(["r", relay]);
  }

  // Required k tag
  tags.push(["k", params.kind.toString()]);

  // Required u tag
  tags.push(["u", params.url]);

  const event_template = {
    kind: ATTN_EVENT_KINDS.BILLBOARD,
    created_at: params.created_at ?? Math.floor(Date.now() / 1000),
    content: JSON.stringify(content_object),
    tags,
  };

  return finalizeEvent(event_template, private_key);
}

