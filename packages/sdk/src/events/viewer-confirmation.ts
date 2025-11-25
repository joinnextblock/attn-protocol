/**
 * VIEWER_CONFIRMATION Event builder (kind 38588)
 */

import { finalizeEvent } from "nostr-tools";
import type { Event } from "nostr-tools";
import type { ViewerConfirmationEventParams } from "../types/index.js";

/**
 * Create VIEWER_CONFIRMATION event
 */
export function create_viewer_confirmation_event(
  private_key: Uint8Array,
  params: ViewerConfirmationEventParams
): Event {
  const content_object: Record<string, unknown> = {
    block_height: params.block_height,
    sats_delivered: params.sats_delivered,
  };

  if (params.proof_payload) {
    content_object.proof_payload = params.proof_payload;
  }

  const tags: string[][] = [];

  // Required e tag references
  tags.push(["e", params.marketplace_ref]);
  tags.push(["e", params.promotion_ref]);
  tags.push(["e", params.attention_ref]);
  tags.push(["e", params.match_ref]);

  // Block height tag (using t tag format per marketplace requirements)
  tags.push(["t", params.block_height.toString()]);

  const event_template = {
    kind: 38588,
    created_at: params.created_at ?? Math.floor(Date.now() / 1000),
    content: JSON.stringify(content_object),
    tags,
  };

  return finalizeEvent(event_template, private_key);
}

