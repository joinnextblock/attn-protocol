import { describe, it, expect } from 'vitest';
import { format_d_tag, format_coordinate } from './formatting.js';

describe('format_d_tag', () => {
  it('should format d-tag with org.attnprotocol prefix', () => {
    expect(format_d_tag('marketplace', 'marketplace_1')).toBe('org.attnprotocol:marketplace:marketplace_1');
    expect(format_d_tag('billboard', 'billboard_1')).toBe('org.attnprotocol:billboard:billboard_1');
    expect(format_d_tag('block', '850000:hash')).toBe('org.attnprotocol:block:850000:hash');
  });

  it('should return identifier as-is if it already has prefix', () => {
    const identifier = 'org.attnprotocol:marketplace:marketplace_1';
    expect(format_d_tag('marketplace', identifier)).toBe(identifier);
  });

  it('should handle different event types', () => {
    expect(format_d_tag('promotion', 'promotion_1')).toBe('org.attnprotocol:promotion:promotion_1');
    expect(format_d_tag('attention', 'attention_1')).toBe('org.attnprotocol:attention:attention_1');
    expect(format_d_tag('match', 'match_1')).toBe('org.attnprotocol:match:match_1');
  });
});

describe('format_coordinate', () => {
  it('should format coordinate with kind, pubkey, and d-tag', () => {
    const kind = 38188;
    const pubkey = 'a'.repeat(64);
    const d_tag = 'org.attnprotocol:marketplace:marketplace_1';

    const coordinate = format_coordinate(kind, pubkey, d_tag);
    expect(coordinate).toBe(`${kind}:${pubkey}:${d_tag}`);
  });

  it('should handle different event kinds', () => {
    // City Protocol block events (kind 38808)
    expect(format_coordinate(38808, 'a'.repeat(64), 'org.cityprotocol:block:850000:hash')).toBe(
      '38808:' + 'a'.repeat(64) + ':org.cityprotocol:block:850000:hash'
    );
    // ATTN Protocol billboard events
    expect(format_coordinate(38288, 'b'.repeat(64), 'org.attnprotocol:billboard:billboard_1')).toBe(
      '38288:' + 'b'.repeat(64) + ':org.attnprotocol:billboard:billboard_1'
    );
  });
});

