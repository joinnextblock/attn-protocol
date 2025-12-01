/**
 * ATTN SDK - Main exports
 *
 * TypeScript SDK for creating and publishing ATTN Protocol events
 */

// Main SDK class
export { AttnSdk } from "./sdk.js";
export type { AttnSdkConfig } from "./sdk.js";

// Event builders
export {
  create_block_event,
  create_marketplace_event,
  create_billboard_event,
  create_promotion_event,
  create_attention_event,
  create_match_event,
  create_billboard_confirmation_event,
  create_attention_confirmation_event,
  create_marketplace_confirmation_event,
  create_attention_payment_confirmation_event,
} from "./events/index.js";

// Types
export type {
  BaseEventParams,
  BlockEventParams,
  MarketplaceEventParams,
  BillboardEventParams,
  PromotionEventParams,
  AttentionEventParams,
  MatchEventParams,
  BillboardConfirmationEventParams,
  AttentionConfirmationEventParams,
  MarketplaceConfirmationEventParams,
  AttentionPaymentConfirmationEventParams,
  PublishResult,
  PublishResults,
} from "./types/index.js";

// Relay publishing
export { publish_to_relay, publish_to_multiple } from "./relay/index.js";

// Validation utilities
export {
  get_tag_value,
  get_tag_values,
  get_tag_value_by_prefix,
  validate_block_height,
  validate_sats_per_second,
  validate_json_content,
  validate_d_tag_prefix,
  validate_a_tag_reference,
  validate_pubkey,
} from "./utils/index.js";

export type { ValidationResult } from "./utils/index.js";

