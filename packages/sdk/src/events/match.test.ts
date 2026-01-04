import { describe, it, expect, vi, beforeEach } from 'vitest';
import { create_match_event } from './match.js';
import { ATTN_EVENT_KINDS } from '@attn/ts-core';
import { finalizeEvent } from 'nostr-tools';

// Mock nostr-tools
vi.mock('nostr-tools', async () => {
  const actual = await vi.importActual('nostr-tools');
  return {
    ...actual,
    finalizeEvent: vi.fn((event: unknown, key: Uint8Array) => {
      const evt = event as Record<string, unknown>;
      return {
        ...evt,
        id: 'mock_event_id',
        pubkey: 'mock_pubkey',
        sig: 'mock_sig',
      };
    }),
  };
});

describe('create_match_event', () => {
  let private_key: Uint8Array;

  beforeEach(() => {
    private_key = new Uint8Array(32).fill(1);
    vi.clearAllMocks();
  });

  it('should create a match event with required fields', () => {
    const params = {
      block_height: 850000,
      match_id: 'match_1',
      promotion_id: 'promotion_1',
      attention_id: 'attention_1',
      billboard_id: 'billboard_1',
      marketplace_id: 'marketplace_1',
      marketplace_pubkey: 'a'.repeat(64),
      promotion_pubkey: 'b'.repeat(64),
      attention_pubkey: 'c'.repeat(64),
      billboard_pubkey: 'd'.repeat(64),
      marketplace_coordinate: '38188:' + 'a'.repeat(64) + ':org.attnprotocol:marketplace:marketplace_1',
      billboard_coordinate: '38288:' + 'd'.repeat(64) + ':org.attnprotocol:billboard:billboard_1',
      promotion_coordinate: '38388:' + 'b'.repeat(64) + ':org.attnprotocol:promotion:promotion_1',
      attention_coordinate: '38488:' + 'c'.repeat(64) + ':org.attnprotocol:attention:attention_1',
      relays: ['ws://relay.example.com'],
      kinds: [34236],
    };

    const event = create_match_event(private_key, params);

    expect(event.kind).toBe(ATTN_EVENT_KINDS.MATCH);
    expect(event.tags).toContainEqual(['d', 'org.attnprotocol:match:match_1']);
    expect(event.tags).toContainEqual(['t', '850000']);
    expect(event.tags).toContainEqual(['a', params.marketplace_coordinate]);
    expect(event.tags).toContainEqual(['a', params.billboard_coordinate]);
    expect(event.tags).toContainEqual(['a', params.promotion_coordinate]);
    expect(event.tags).toContainEqual(['a', params.attention_coordinate]);
    expect(event.tags).toContainEqual(['p', params.marketplace_pubkey]);
    expect(event.tags).toContainEqual(['p', params.promotion_pubkey]);
    expect(event.tags).toContainEqual(['p', params.attention_pubkey]);
    expect(event.tags).toContainEqual(['p', params.billboard_pubkey]);
    expect(event.tags).toContainEqual(['k', '34236']);

    const content = JSON.parse(event.content);
    expect(content.ref_match_id).toBe('match_1');
    expect(content.ref_promotion_id).toBe('promotion_1');
    expect(content.ref_attention_id).toBe('attention_1');
    expect(content.ref_billboard_id).toBe('billboard_1');
    expect(content.ref_marketplace_id).toBe('marketplace_1');
  });

  it('should handle optional relays and kinds', () => {
    const params = {
      block_height: 850000,
      match_id: 'match_1',
      promotion_id: 'promotion_1',
      attention_id: 'attention_1',
      billboard_id: 'billboard_1',
      marketplace_id: 'marketplace_1',
      marketplace_pubkey: 'a'.repeat(64),
      promotion_pubkey: 'b'.repeat(64),
      attention_pubkey: 'c'.repeat(64),
      billboard_pubkey: 'd'.repeat(64),
      marketplace_coordinate: '38188:' + 'a'.repeat(64) + ':org.attnprotocol:marketplace:marketplace_1',
      billboard_coordinate: '38288:' + 'd'.repeat(64) + ':org.attnprotocol:billboard:billboard_1',
      promotion_coordinate: '38388:' + 'b'.repeat(64) + ':org.attnprotocol:promotion:promotion_1',
      attention_coordinate: '38488:' + 'c'.repeat(64) + ':org.attnprotocol:attention:attention_1',
    };

    const event = create_match_event(private_key, params);

    expect(event.tags.filter((t) => t[0] === 'r')).toHaveLength(0);
    expect(event.tags.filter((t) => t[0] === 'k')).toHaveLength(0);
  });
});

