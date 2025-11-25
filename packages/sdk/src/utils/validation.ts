/**
 * Validation utilities for ATTN Protocol events
 */

import type { Event } from "nostr-tools";

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Get tag value by name
 */
export function get_tag_value(event: Event, tag_name: string): string {
  const tag = event.tags.find((t) => t[0] === tag_name);
  return tag?.[1] ?? "";
}

/**
 * Get all tag values by name
 */
export function get_tag_values(event: Event, tag_name: string): string[] {
  return event.tags.filter((t) => t[0] === tag_name).map((t) => t[1] ?? "");
}

/**
 * Get tag value by prefix
 */
export function get_tag_value_by_prefix(
  event: Event,
  tag_name: string,
  prefix: string
): string {
  const tag = event.tags.find(
    (t) => t[0] === tag_name && t[1]?.startsWith(prefix)
  );
  return tag?.[1] ?? "";
}

/**
 * Get content field value from JSON content
 */
function get_content_field(event: Event, field_name: string): unknown {
  if (!event.content) {
    return undefined;
  }
  try {
    const content = JSON.parse(event.content);
    return content[field_name];
  } catch {
    return undefined;
  }
}

/**
 * Validate block height (from content and t tag)
 */
export function validate_block_height(
  event: Event
): ValidationResult {
  // Check content first
  const block_height_content = get_content_field(event, "block_height");
  if (block_height_content === undefined) {
    return { valid: false, message: "Missing block_height in content" };
  }
  const height = typeof block_height_content === "number"
    ? block_height_content
    : parseInt(String(block_height_content), 10);
  if (isNaN(height) || height <= 0) {
    return {
      valid: false,
      message: "Invalid block_height: must be positive integer",
    };
  }
  // Also check t tag (block_height as topic)
  const block_height_tag = get_tag_value(event, "t");
  const tag_height = parseInt(block_height_tag, 10);
  if (block_height_tag && (!isNaN(tag_height) && tag_height === height)) {
    return { valid: true };
  }
  return { valid: true }; // Content is valid, t tag is optional but recommended
}

/**
 * Validate sats_per_second (from content)
 */
export function validate_sats_per_second(
  event: Event
): ValidationResult {
  const sats_per_second = get_content_field(event, "sats_per_second");
  if (sats_per_second === undefined) {
    return { valid: false, message: "Missing sats_per_second in content" };
  }
  const sats = typeof sats_per_second === "number"
    ? sats_per_second
    : parseInt(String(sats_per_second), 10);
  if (isNaN(sats) || sats <= 0) {
    return {
      valid: false,
      message: "Invalid sats_per_second: must be positive integer",
    };
  }
  return { valid: true };
}

/**
 * Validate JSON content
 */
export function validate_json_content(
  event: Event
): ValidationResult {
  if (!event.content) {
    return { valid: true }; // Empty content is valid
  }
  try {
    JSON.parse(event.content);
    return { valid: true };
  } catch {
    return { valid: false, message: "Content must be valid JSON" };
  }
}

/**
 * Validate d tag prefix
 */
export function validate_d_tag_prefix(
  event: Event,
  prefix: string
): ValidationResult {
  const d_tag = get_tag_value(event, "d");
  if (!d_tag) {
    return { valid: false, message: "Missing d tag" };
  }
  if (!d_tag.startsWith(prefix)) {
    return {
      valid: false,
      message: `d tag must start with '${prefix}'`,
    };
  }
  return { valid: true };
}

/**
 * Validate required a tag reference
 */
export function validate_a_tag_reference(
  event: Event,
  prefix: string
): ValidationResult {
  const ref = get_tag_value_by_prefix(event, "a", prefix);
  if (!ref) {
    return {
      valid: false,
      message: `Must reference via 'a' tag with prefix '${prefix}'`,
    };
  }
  return { valid: true };
}


/**
 * Validate pubkey format
 */
export function validate_pubkey(pubkey: string): ValidationResult {
  if (!pubkey || pubkey.length !== 64) {
    return {
      valid: false,
      message: "Invalid pubkey format: must be 64 hex characters",
    };
  }
  if (!/^[0-9a-f]+$/i.test(pubkey)) {
    return {
      valid: false,
      message: "Invalid pubkey format: must be hexadecimal",
    };
  }
  return { valid: true };
}

