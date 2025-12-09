/**
 * Zod validation schemas for ATTN Protocol event content
 * @module
 */

import { z } from 'zod';

/**
 * Base validation schemas for common types
 */

/**
 * Block height: positive integer
 */
const block_height_schema: z.ZodNumber = z.number().int().positive();

/**
 * Pubkey: 64-character hex string
 */
const pubkey_schema: z.ZodString = z
  .string()
  .length(64, 'Pubkey must be exactly 64 characters')
  .regex(/^[0-9a-f]+$/i, 'Pubkey must be hexadecimal');

/**
 * Event ID: 64-character hex string (SHA-256 hash)
 */
const event_id_schema: z.ZodString = z
  .string()
  .length(64, 'Event ID must be exactly 64 characters')
  .regex(/^[0-9a-f]+$/i, 'Event ID must be hexadecimal');

/**
 * Bitcoin block hash: hex string (typically 64 characters)
 */
const block_hash_schema: z.ZodString = z.string().regex(/^[0-9a-f]+$/i, 'Block hash must be hexadecimal');

/**
 * Merkle root: hex string (typically 64 characters)
 */
const merkle_root_schema: z.ZodString = z.string().regex(/^[0-9a-f]+$/i, 'Merkle root must be hexadecimal');

/**
 * Positive integer for satoshi amounts, durations, counts, etc.
 */
const positive_integer_schema: z.ZodNumber = z.number().int().nonnegative();

/**
 * Positive integer for fees, bids, asks, etc. (must be > 0)
 */
const positive_sats_schema: z.ZodNumber = z.number().int().positive();

/**
 * Non-negative integer for fees (can be 0, meaning no fee)
 */
const nonnegative_fee_sats_schema: z.ZodNumber = z.number().int().nonnegative();

/**
 * Unix timestamp (optional, informational)
 */
const unix_timestamp_schema: z.ZodOptional<z.ZodNumber> = z.number().int().nonnegative().optional();

/**
 * String array for lists (e.g., escrow_id_list)
 */
const string_array_schema: z.ZodOptional<z.ZodArray<z.ZodString, "many">> = z.array(z.string()).optional();

/**
 * BLOCK event content schema (kind 38088)
 */
export const block_data_schema: z.ZodObject<{
  height: z.ZodNumber;
  hash: z.ZodString;
  time: z.ZodOptional<z.ZodNumber>;
  difficulty: z.ZodOptional<z.ZodString>;
  tx_count: z.ZodOptional<z.ZodNumber>;
  size: z.ZodOptional<z.ZodNumber>;
  weight: z.ZodOptional<z.ZodNumber>;
  version: z.ZodOptional<z.ZodNumber>;
  merkle_root: z.ZodOptional<z.ZodString>;
  nonce: z.ZodOptional<z.ZodNumber>;
  ref_node_pubkey: z.ZodOptional<z.ZodString>;
  ref_block_id: z.ZodOptional<z.ZodString>;
}> = z.object({
  height: block_height_schema,
  hash: block_hash_schema,
  time: unix_timestamp_schema,
  difficulty: z.string().optional(),
  tx_count: positive_integer_schema.optional(),
  size: positive_integer_schema.optional(),
  weight: positive_integer_schema.optional(),
  version: z.number().int().optional(),
  merkle_root: merkle_root_schema.optional(),
  nonce: z.number().int().optional(),
  ref_node_pubkey: pubkey_schema.optional(),
  ref_block_id: z.string().optional(),
});

/**
 * MARKETPLACE event content schema (kind 38188)
 */
export const marketplace_data_schema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  admin_pubkey: pubkey_schema.optional(),
  min_duration: positive_integer_schema.optional(), // Milliseconds
  max_duration: positive_integer_schema.optional(), // Milliseconds
  match_fee_sats: nonnegative_fee_sats_schema.optional(),
  confirmation_fee_sats: nonnegative_fee_sats_schema.optional(),
  ref_marketplace_pubkey: pubkey_schema.optional(),
  ref_marketplace_id: z.string().optional(),
  ref_node_pubkey: pubkey_schema.optional(),
  ref_block_id: z.string().optional(),
  billboard_count: positive_integer_schema.optional(),
  promotion_count: positive_integer_schema.optional(),
  attention_count: positive_integer_schema.optional(),
  match_count: positive_integer_schema.optional(),
});

/**
 * BILLBOARD event content schema (kind 38288)
 */
export const billboard_data_schema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  confirmation_fee_sats: nonnegative_fee_sats_schema.optional(),
  ref_billboard_pubkey: pubkey_schema.optional(),
  ref_billboard_id: z.string().optional(),
  ref_marketplace_pubkey: pubkey_schema.optional(),
  ref_marketplace_id: z.string().optional(),
});

/**
 * PROMOTION event content schema (kind 38388)
 */
export const promotion_data_schema = z.object({
  duration: positive_integer_schema.optional(), // Milliseconds
  bid: positive_sats_schema.optional(),
  event_id: event_id_schema.optional(),
  call_to_action: z.string().optional(),
  call_to_action_url: z.string().url().optional(),
  escrow_id_list: string_array_schema,
  ref_promotion_pubkey: pubkey_schema.optional(),
  ref_promotion_id: z.string().optional(),
  ref_marketplace_pubkey: pubkey_schema.optional(),
  ref_marketplace_id: z.string().optional(),
  ref_billboard_pubkey: pubkey_schema.optional(),
  ref_billboard_id: z.string().optional(),
});

/**
 * ATTENTION event content schema (kind 38488)
 */
export const attention_data_schema = z.object({
  ask: positive_sats_schema.optional(),
  min_duration: positive_integer_schema.optional(), // Milliseconds
  max_duration: positive_integer_schema.optional(), // Milliseconds
  blocked_promotions_id: z.string().optional(),
  blocked_promoters_id: z.string().optional(),
  trusted_marketplaces_id: z.string().optional(),
  trusted_billboards_id: z.string().optional(),
  ref_attention_pubkey: pubkey_schema.optional(),
  ref_attention_id: z.string().optional(),
  ref_marketplace_pubkey: pubkey_schema.optional(),
  ref_marketplace_id: z.string().optional(),
});

/**
 * MATCH event content schema (kind 38888)
 * Per ATTN-01, MATCH events contain ONLY ref_* fields.
 */
export const match_data_schema = z.object({
  ref_match_id: z.string().optional(),
  ref_marketplace_id: z.string().optional(),
  ref_billboard_id: z.string().optional(),
  ref_promotion_id: z.string().optional(),
  ref_attention_id: z.string().optional(),
  ref_marketplace_pubkey: pubkey_schema.optional(),
  ref_promotion_pubkey: pubkey_schema.optional(),
  ref_attention_pubkey: pubkey_schema.optional(),
  ref_billboard_pubkey: pubkey_schema.optional(),
});

/**
 * BILLBOARD_CONFIRMATION event content schema (kind 38588)
 * Per ATTN-01, contains ONLY ref_* fields.
 */
export const billboard_confirmation_data_schema = z.object({
  ref_match_event_id: event_id_schema.optional(),
  ref_match_id: z.string().optional(),
  ref_marketplace_pubkey: pubkey_schema.optional(),
  ref_billboard_pubkey: pubkey_schema.optional(),
  ref_promotion_pubkey: pubkey_schema.optional(),
  ref_attention_pubkey: pubkey_schema.optional(),
  ref_marketplace_id: z.string().optional(),
  ref_billboard_id: z.string().optional(),
  ref_promotion_id: z.string().optional(),
  ref_attention_id: z.string().optional(),
});

/**
 * ATTENTION_CONFIRMATION event content schema (kind 38688)
 * Per ATTN-01, contains ONLY ref_* fields.
 */
export const attention_confirmation_data_schema = z.object({
  ref_match_event_id: event_id_schema.optional(),
  ref_match_id: z.string().optional(),
  ref_marketplace_pubkey: pubkey_schema.optional(),
  ref_billboard_pubkey: pubkey_schema.optional(),
  ref_promotion_pubkey: pubkey_schema.optional(),
  ref_attention_pubkey: pubkey_schema.optional(),
  ref_marketplace_id: z.string().optional(),
  ref_billboard_id: z.string().optional(),
  ref_promotion_id: z.string().optional(),
  ref_attention_id: z.string().optional(),
});

/**
 * MARKETPLACE_CONFIRMATION event content schema (kind 38788)
 * Per ATTN-01, contains ONLY ref_* fields.
 */
export const marketplace_confirmation_data_schema = z.object({
  ref_match_event_id: event_id_schema.optional(),
  ref_match_id: z.string().optional(),
  ref_billboard_confirmation_event_id: event_id_schema.optional(),
  ref_attention_confirmation_event_id: event_id_schema.optional(),
  ref_marketplace_pubkey: pubkey_schema.optional(),
  ref_billboard_pubkey: pubkey_schema.optional(),
  ref_promotion_pubkey: pubkey_schema.optional(),
  ref_attention_pubkey: pubkey_schema.optional(),
  ref_marketplace_id: z.string().optional(),
  ref_billboard_id: z.string().optional(),
  ref_promotion_id: z.string().optional(),
  ref_attention_id: z.string().optional(),
});

/**
 * ATTENTION_PAYMENT_CONFIRMATION event content schema (kind 38988)
 * Per ATTN-01, contains sats_received, payment_proof, and ref_* fields.
 */
export const attention_payment_confirmation_data_schema = z.object({
  sats_received: positive_sats_schema.optional(),
  payment_proof: z.string().optional(),
  ref_match_event_id: event_id_schema.optional(),
  ref_match_id: z.string().optional(),
  ref_marketplace_confirmation_event_id: event_id_schema.optional(),
  ref_marketplace_pubkey: pubkey_schema.optional(),
  ref_billboard_pubkey: pubkey_schema.optional(),
  ref_promotion_pubkey: pubkey_schema.optional(),
  ref_attention_pubkey: pubkey_schema.optional(),
  ref_marketplace_id: z.string().optional(),
  ref_billboard_id: z.string().optional(),
  ref_promotion_id: z.string().optional(),
  ref_attention_id: z.string().optional(),
});
