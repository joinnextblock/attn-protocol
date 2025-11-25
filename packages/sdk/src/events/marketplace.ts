/**
 * MARKETPLACE Event builder (kind 38088)
 */

import { finalizeEvent } from "nostr-tools";
import type { Event } from "nostr-tools";
import type { MarketplaceEventParams } from "../types/index.js";

/**
 * Create MARKETPLACE event (kind 38088)
 */
export function create_marketplace_event(
  private_key: Uint8Array,
  params: MarketplaceEventParams
): Event {
  // marketplace_id used for both d tag and content per ATTN-01.md
  const content_object: Record<string, unknown> = {
    name: params.name,
    description: params.description,
    kind_list: params.kind_list,
    relay_list: params.relay_list,
    admin_pubkey: params.admin_pubkey,
    marketplace_pubkey: params.marketplace_pubkey,
    marketplace_id: params.marketplace_id,
  };

  if (params.image) {
    content_object.image = params.image;
  }

  if (params.url) {
    content_object.url = params.url;
  }

  if (params.admin_email) {
    content_object.admin_email = params.admin_email;
  }

  if (params.min_duration !== undefined) {
    content_object.min_duration = params.min_duration;
  }

  if (params.max_duration !== undefined) {
    content_object.max_duration = params.max_duration;
  }

  const tags: string[][] = [];

  // Required d tag (derived from marketplace_id per ATTN-01.md)
  tags.push(["d", params.marketplace_id]);

  // Required t tag (block height)
  if (params.block_height !== undefined) {
    tags.push(["t", params.block_height.toString()]);
  }

  // Required k tags (multiple allowed, one per supported kind)
  for (const kind of params.kind_list) {
    tags.push(["k", kind.toString()]);
  }

  // Required p tag (marketplace owner pubkey)
  tags.push(["p", params.owner_pubkey]);

  // Required r tags (multiple allowed, one per relay)
  for (const relay of params.relay_list) {
    tags.push(["r", relay]);
  }

  // Optional u tag (website URL)
  if (params.website_url) {
    tags.push(["u", params.website_url]);
  }

  const event_template = {
    kind: 38088,
    created_at: params.created_at ?? Math.floor(Date.now() / 1000),
    content: JSON.stringify(content_object),
    tags,
  };

  return finalizeEvent(event_template, private_key);
}
