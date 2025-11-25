/**
 * BILLBOARD Event builder (kind 38188)
 */

import { finalizeEvent } from "nostr-tools";
import type { Event } from "nostr-tools";
import type { BillboardEventParams } from "../types/index.js";

/**
 * Create BILLBOARD event
 */
export function create_billboard_event(
  private_key: Uint8Array,
  params: BillboardEventParams
): Event {
  // Build content object with required fields
  // billboard_id used for both d tag and content per ATTN-01.md
  const content_object: Record<string, unknown> = {
    name: params.name,
    billboard_pubkey: params.billboard_pubkey,
    marketplace_pubkey: params.marketplace_pubkey,
    billboard_id: params.billboard_id,
    marketplace_id: params.marketplace_id,
  };

  if (params.description) {
    content_object.description = params.description;
  }

  const tags: string[][] = [];

  // Required d tag (derived from billboard_id per ATTN-01.md)
  tags.push(["d", params.billboard_id]);

  // Required t tag (block height)
  if (params.block_height !== undefined) {
    tags.push(["t", params.block_height.toString()]);
  }

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
    kind: 38188,
    created_at: params.created_at ?? Math.floor(Date.now() / 1000),
    content: JSON.stringify(content_object),
    tags,
  };

  return finalizeEvent(event_template, private_key);
}

