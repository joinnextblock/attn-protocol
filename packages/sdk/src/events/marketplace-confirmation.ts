/**
 * MARKETPLACE_CONFIRMATION Event builder (kind 38688)
 */

import { finalizeEvent } from "nostr-tools";
import type { Event } from "nostr-tools";
import type { MarketplaceConfirmationEventParams } from "../types/index.js";

/**
 * Create MARKETPLACE_CONFIRMATION event
 */
export function create_marketplace_confirmation_event(
  private_key: Uint8Array,
  params: MarketplaceConfirmationEventParams
): Event {
  const content_object: Record<string, unknown> = {
    block_height: params.block_height,
    sats_settled: params.sats_settled,
  };

  if (params.payout_breakdown) {
    content_object.payout_breakdown = params.payout_breakdown;
  }

  const tags: string[][] = [];

  // Required e tag references
  tags.push(["e", params.marketplace_ref]);
  tags.push(["e", params.promotion_ref]);
  tags.push(["e", params.attention_ref]);
  tags.push(["e", params.match_ref]);
  tags.push(["e", params.billboard_confirmation_ref]);
  tags.push(["e", params.viewer_confirmation_ref]);

  // Block height tag (using t tag format per marketplace requirements)
  tags.push(["t", params.block_height.toString()]);

  const event_template = {
    kind: 38688,
    created_at: params.created_at ?? Math.floor(Date.now() / 1000),
    content: JSON.stringify(content_object),
    tags,
  };

  return finalizeEvent(event_template, private_key);
}

