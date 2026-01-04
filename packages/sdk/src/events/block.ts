/**
 * BLOCK Event builder (kind 38088)
 *
 * @deprecated Block events are now published by City Protocol (Kind 38808).
 * Use @city/clock or @city/sdk for block event creation.
 * This file is kept for backwards compatibility but will be removed in a future version.
 *
 * @see https://github.com/joinnextblock/city-protocol
 */

import { finalizeEvent, getPublicKey } from "nostr-tools";
import type { Event } from "nostr-tools";
import { CITY_PROTOCOL_KINDS } from "@attn/ts-core";
import type { BlockEventParams } from "../types/index.js";
import { format_d_tag } from "../utils/formatting.js";

/**
 * @deprecated Use @city/sdk build_block_event instead.
 * Block events are now published by City Protocol (Kind 38808).
 *
 * Create BLOCK event
 */
export function create_block_event(
  private_key: Uint8Array,
  params: BlockEventParams
): Event {
  if (typeof params.height !== "number") {
    throw new Error("Block height is required");
  }
  if (typeof params.hash !== "string" || params.hash.length === 0) {
    throw new Error("Block hash is required");
  }

  // Use block_height from params (required per BaseEventParams) or fallback to height
  // This allows flexibility: if block_height matches height, use it; otherwise use height
  const block_height = params.block_height ?? params.height;

  const clock_pubkey = params.node_pubkey ?? getPublicKey(private_key);
  const block_id = `org.cityprotocol:block:${params.height}:${params.hash}`;
  const ref_block_id = params.block_identifier ?? block_id;

  const content_object: Record<string, unknown> = {
    block_height: params.height,
    block_hash: params.hash,
    block_time: params.time,
    previous_hash: "",
    ref_clock_pubkey: clock_pubkey,
    ref_block_id: ref_block_id,
    // Legacy fields for backwards compatibility
    height: params.height,
    hash: params.hash,
    ref_node_pubkey: clock_pubkey,
  };

  if (params.time !== undefined) {
    content_object.time = params.time;
  }
  if (params.difficulty !== undefined) {
    content_object.difficulty =
      typeof params.difficulty === "number"
        ? params.difficulty.toString()
        : params.difficulty;
  }
  if (params.tx_count !== undefined) {
    content_object.tx_count = params.tx_count;
  }
  if (params.size !== undefined) {
    content_object.size = params.size;
  }
  if (params.weight !== undefined) {
    content_object.weight = params.weight;
  }
  if (params.version !== undefined) {
    content_object.version = params.version;
  }
  if (params.merkle_root) {
    content_object.merkle_root = params.merkle_root;
  }
  if (params.nonce !== undefined) {
    content_object.nonce = params.nonce;
  }

  const tags: string[][] = [
    ["d", block_id],
    ["t", block_height.toString()],
    ["p", clock_pubkey],
  ];

  // Add relay URLs if provided
  if (params.relay_list && params.relay_list.length > 0) {
    for (const relay of params.relay_list) {
      tags.push(["r", relay]);
    }
  }

  const event_template = {
    kind: CITY_PROTOCOL_KINDS.BLOCK,
    created_at: params.created_at ?? Math.floor(Date.now() / 1000),
    content: JSON.stringify(content_object),
    tags,
  };

  return finalizeEvent(event_template, private_key);
}
