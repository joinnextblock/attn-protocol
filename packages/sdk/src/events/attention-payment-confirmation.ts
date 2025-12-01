/**
 * ATTENTION_PAYMENT_CONFIRMATION Event builder (kind 38988)
 */

import { finalizeEvent } from "nostr-tools";
import type { Event } from "nostr-tools";
import { ATTN_EVENT_KINDS } from "@attn-protocol/core";
import type { AttentionPaymentConfirmationEventParams } from "../types/index.js";
import { format_d_tag } from "../utils/formatting.js";

/**
 * Create ATTENTION_PAYMENT_CONFIRMATION event
 */
export function create_attention_payment_confirmation_event(
  private_key: Uint8Array,
  params: AttentionPaymentConfirmationEventParams
): Event {
  // Format d-tag with org.attnprotocol: prefix
  const confirmation_d_tag = format_d_tag("attention-payment-confirmation", params.confirmation_id);

  // Build content object - sats_received, payment_proof, and ref_* fields per ATTN-01
  const content_object: Record<string, unknown> = {
    sats_received: params.sats_received,
    ref_match_event_id: params.match_event_id,
    ref_match_id: params.match_id,
    ref_marketplace_confirmation_event_id: params.marketplace_confirmation_event_id,
    ref_marketplace_pubkey: params.marketplace_pubkey,
    ref_billboard_pubkey: params.billboard_pubkey,
    ref_promotion_pubkey: params.promotion_pubkey,
    ref_attention_pubkey: params.attention_pubkey,
    ref_marketplace_id: params.marketplace_id,
    ref_billboard_id: params.billboard_id,
    ref_promotion_id: params.promotion_id,
    ref_attention_id: params.attention_id,
  };

  // Add optional payment_proof if provided
  if (params.payment_proof !== undefined) {
    content_object.payment_proof = params.payment_proof;
  }

  const tags: string[][] = [];

  // Required d tag
  tags.push(["d", confirmation_d_tag]);

  // Required t tag (block height) - per ATTN-01, every event must include this
  tags.push(["t", params.block_height.toString()]);

  // Required e tag references with marketplace_confirmation marker
  tags.push([
    "e",
    params.marketplace_confirmation_event_id,
    "",
    "marketplace_confirmation",
  ]);
  tags.push(["e", params.match_event_id]);
  if (params.marketplace_event_id) {
    tags.push(["e", params.marketplace_event_id]);
  }
  if (params.billboard_event_id) {
    tags.push(["e", params.billboard_event_id]);
  }
  if (params.promotion_event_id) {
    tags.push(["e", params.promotion_event_id]);
  }
  if (params.attention_event_id) {
    tags.push(["e", params.attention_event_id]);
  }

  // Required a tag references (coordinates)
  tags.push(["a", params.marketplace_coordinate]);
  tags.push(["a", params.billboard_coordinate]);
  tags.push(["a", params.promotion_coordinate]);
  tags.push(["a", params.attention_coordinate]);
  tags.push(["a", params.match_coordinate]);

  // Required p tags
  tags.push(["p", params.marketplace_pubkey]);
  tags.push(["p", params.billboard_pubkey]);
  tags.push(["p", params.promotion_pubkey]);
  tags.push(["p", params.attention_pubkey]);

  // Required r tags
  if (params.relays && params.relays.length > 0) {
    for (const relay of params.relays) {
      tags.push(["r", relay]);
    }
  }

  const event_template = {
    kind: ATTN_EVENT_KINDS.ATTENTION_PAYMENT_CONFIRMATION,
    created_at: params.created_at ?? Math.floor(Date.now() / 1000),
    content: JSON.stringify(content_object),
    tags,
  };

  return finalizeEvent(event_template, private_key);
}

