/**
 * Event data extraction utilities for @attn/marketplace
 */

import type { Event } from 'nostr-tools';
import type { BlockHeight } from '@attn/ts-core';

/**
 * Extract block height from event t tag
 * @param event - Nostr event
 * @returns Block height or null if not found/invalid
 */
export function extract_block_height(event: Event): BlockHeight | null {
  const t_tag = event.tags.find(t => t[0] === 't');
  if (!t_tag || !t_tag[1]) {
    return null;
  }

  const height = parseInt(t_tag[1], 10);
  if (isNaN(height) || height <= 0) {
    return null;
  }

  return height;
}

/**
 * Extract d tag value from event
 * @param event - Nostr event
 * @returns d tag value or null if not found
 */
export function extract_d_tag(event: Event): string | null {
  const d_tag = event.tags.find(t => t[0] === 'd');
  return d_tag?.[1] ?? null;
}

/**
 * Build event coordinate from kind, pubkey, and d tag
 * @param kind - Event kind
 * @param pubkey - Event pubkey
 * @param d_tag - d tag value
 * @returns Coordinate string (kind:pubkey:d_tag)
 */
export function build_coordinate(kind: number, pubkey: string, d_tag: string): string {
  return `${kind}:${pubkey}:${d_tag}`;
}

/**
 * Extract coordinate from event (kind:pubkey:d_tag)
 * @param event - Nostr event
 * @returns Coordinate string or null if d tag not found
 */
export function extract_coordinate(event: Event): string | null {
  const d_tag = extract_d_tag(event);
  if (!d_tag) {
    return null;
  }
  return build_coordinate(event.kind, event.pubkey, d_tag);
}

/**
 * Extract a tag value by prefix
 * @param event - Nostr event
 * @param prefix - Prefix to match (e.g., "38188:" for marketplace coordinate)
 * @returns a tag value or null if not found
 */
export function extract_a_tag_by_prefix(event: Event, prefix: string): string | null {
  const a_tag = event.tags.find(t => t[0] === 'a' && t[1]?.startsWith(prefix));
  return a_tag?.[1] ?? null;
}

/**
 * Extract marketplace coordinate from event
 * @param event - Nostr event
 * @returns Marketplace coordinate or null if not found
 */
export function extract_marketplace_coordinate(event: Event): string | null {
  return extract_a_tag_by_prefix(event, '38188:');
}

/**
 * Extract billboard coordinate from event
 * @param event - Nostr event
 * @returns Billboard coordinate or null if not found
 */
export function extract_billboard_coordinate(event: Event): string | null {
  return extract_a_tag_by_prefix(event, '38288:');
}

/**
 * Extract promotion coordinate from event
 * @param event - Nostr event
 * @returns Promotion coordinate or null if not found
 */
export function extract_promotion_coordinate(event: Event): string | null {
  return extract_a_tag_by_prefix(event, '38388:');
}

/**
 * Extract attention coordinate from event
 * @param event - Nostr event
 * @returns Attention coordinate or null if not found
 */
export function extract_attention_coordinate(event: Event): string | null {
  return extract_a_tag_by_prefix(event, '38488:');
}

/**
 * Extract match coordinate from event
 * @param event - Nostr event
 * @returns Match coordinate or null if not found
 */
export function extract_match_coordinate(event: Event): string | null {
  return extract_a_tag_by_prefix(event, '38888:');
}

/**
 * Parse coordinate into components
 * @param coordinate - Coordinate string (kind:pubkey:d_tag)
 * @returns Parsed components or null if invalid
 */
export function parse_coordinate(coordinate: string): {
  kind: number;
  pubkey: string;
  d_tag: string;
} | null {
  const parts = coordinate.split(':');
  if (parts.length < 3) {
    return null;
  }

  const kind = parseInt(parts[0]!, 10);
  if (isNaN(kind)) {
    return null;
  }

  return {
    kind,
    pubkey: parts[1]!,
    d_tag: parts.slice(2).join(':'), // d_tag may contain colons
  };
}

/**
 * Parse event content as JSON
 * @param event - Nostr event
 * @returns Parsed content or null if invalid JSON
 */
export function parse_content<T>(event: Event): T | null {
  if (!event.content) {
    return null;
  }

  try {
    return JSON.parse(event.content) as T;
  } catch {
    return null;
  }
}
