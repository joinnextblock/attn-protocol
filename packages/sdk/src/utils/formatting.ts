/**
 * Formatting utilities for ATTN Protocol events
 */

/**
 * Format d-tag with org.attnprotocol: prefix
 * @param event_type - Event type (block, marketplace, billboard, promotion, attention, match, billboard-confirmation, attention-confirmation, marketplace-confirmation)
 * @param identifier - Unique identifier
 * @returns Formatted d-tag string
 */
export function format_d_tag(event_type: string, identifier: string): string {
  // If already has prefix, return as-is
  if (identifier.startsWith("org.attnprotocol:")) {
    return identifier;
  }
  return `org.attnprotocol:${event_type}:${identifier}`;
}

/**
 * Format a-tag coordinate
 * @param kind - Event kind number
 * @param pubkey - Pubkey hex string
 * @param d_tag - D-tag identifier
 * @returns Formatted coordinate string
 */
export function format_coordinate(
  kind: number,
  pubkey: string,
  d_tag: string
): string {
  return `${kind}:${pubkey}:${d_tag}`;
}
