/**
 * Event builder exports
 */

/**
 * @deprecated Block events are now published by City Protocol (Kind 38808).
 * Use @city/clock or @city/sdk for block event creation.
 */
export { create_block_event } from "./block.js";

export { create_marketplace_event } from "./marketplace.js";
export { create_billboard_event } from "./billboard.js";
export { create_promotion_event } from "./promotion.js";
export { create_attention_event } from "./attention.js";
export { create_match_event } from "./match.js";
export { create_billboard_confirmation_event } from "./billboard-confirmation.js";
export { create_attention_confirmation_event } from "./attention-confirmation.js";
export { create_marketplace_confirmation_event } from "./marketplace-confirmation.js";
export { create_attention_payment_confirmation_event } from "./attention-payment-confirmation.js";
