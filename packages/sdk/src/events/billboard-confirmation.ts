/**
 * BILLBOARD_CONFIRMATION Event builder (kind 38488)
 */

import { finalizeEvent } from "nostr-tools";
import type { Event } from "nostr-tools";
import type { BillboardConfirmationEventParams } from "../types/index.js";

/**
 * Create BILLBOARD_CONFIRMATION event
 */
export function create_billboard_confirmation_event(
  private_key: Uint8Array,
  params: BillboardConfirmationEventParams
): Event {
  const content_object: Record<string, unknown> = {
    block: params.block,
  };

  const tags: string[][] = [];

  // Required e tag references
  tags.push(["e", params.marketplace_ref]);
  tags.push(["e", params.promotion_ref]);
  tags.push(["e", params.attention_ref]);
  tags.push(["e", params.match_ref]);

  const event_template = {
    kind: 38488,
    created_at: params.created_at ?? Math.floor(Date.now() / 1000),
    content: JSON.stringify(content_object),
    tags,
  };

  return finalizeEvent(event_template, private_key);
}

