import { describe, it, expect, vi, beforeEach } from 'vitest';
import { create_attention_event } from './attention.js';
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

describe('create_attention_event', () => {
  let private_key: Uint8Array;

  beforeEach(() => {
    private_key = new Uint8Array(32).fill(1);
    vi.clearAllMocks();
  });

  it('should create an attention event with required fields', () => {
    const params = {
      block_height: 850000,
      attention_id: 'attention_1',
      ask: 500,
      min_duration: 15000,
      max_duration: 60000,
      blocked_promotions_id: 'blocked_promotions_id',
      blocked_promoters_id: 'blocked_promoters_id',
      marketplace_coordinate: '38188:' + 'a'.repeat(64) + ':org.attnprotocol:marketplace:marketplace_1',
      blocked_promotions_coordinate: '30000:' + 'b'.repeat(64) + ':org.attnprotocol:promotion:blocked',
      blocked_promoters_coordinate: '30000:' + 'c'.repeat(64) + ':org.attnprotocol:promoter:blocked',
      attention_pubkey: 'd'.repeat(64),
      marketplace_pubkey: 'a'.repeat(64),
      marketplace_id: 'marketplace_1',
      relays: ['ws://relay.example.com'],
      kinds: [34236],
    };

    const event = create_attention_event(private_key, params);

    expect(event.kind).toBe(ATTN_EVENT_KINDS.ATTENTION);
    expect(event.tags).toContainEqual(['d', 'org.attnprotocol:attention:attention_1']);
    expect(event.tags).toContainEqual(['t', '850000']);
    expect(event.tags).toContainEqual(['a', params.marketplace_coordinate]);
    expect(event.tags).toContainEqual(['a', params.blocked_promotions_coordinate]);
    expect(event.tags).toContainEqual(['a', params.blocked_promoters_coordinate]);
    expect(event.tags).toContainEqual(['p', params.attention_pubkey]);
    expect(event.tags).toContainEqual(['p', params.marketplace_pubkey]);
    expect(event.tags).toContainEqual(['k', '34236']);

    const content = JSON.parse(event.content);
    expect(content.ask).toBe(500);
    expect(content.min_duration).toBe(15000);
    expect(content.max_duration).toBe(60000);
    expect(content.blocked_promotions_id).toBe('blocked_promotions_id');
    expect(content.blocked_promoters_id).toBe('blocked_promoters_id');
    expect(content.ref_attention_pubkey).toBe(params.attention_pubkey);
    expect(content.ref_attention_id).toBe('attention_1');
  });

  it('should include optional trusted lists when provided', () => {
    const params = {
      block_height: 850000,
      attention_id: 'attention_1',
      ask: 500,
      min_duration: 15000,
      max_duration: 60000,
      blocked_promotions_id: 'blocked_promotions_id',
      blocked_promoters_id: 'blocked_promoters_id',
      marketplace_coordinate: '38188:' + 'a'.repeat(64) + ':org.attnprotocol:marketplace:marketplace_1',
      blocked_promotions_coordinate: '30000:' + 'b'.repeat(64) + ':org.attnprotocol:promotion:blocked',
      blocked_promoters_coordinate: '30000:' + 'c'.repeat(64) + ':org.attnprotocol:promoter:blocked',
      trusted_marketplaces_coordinate: '30000:' + 'd'.repeat(64) + ':org.attnprotocol:marketplace:trusted',
      trusted_billboards_coordinate: '30000:' + 'e'.repeat(64) + ':org.attnprotocol:billboard:trusted',
      attention_pubkey: 'f'.repeat(64),
      marketplace_pubkey: 'a'.repeat(64),
      marketplace_id: 'marketplace_1',
      trusted_marketplaces_id: 'trusted_marketplaces_id',
      trusted_billboards_id: 'trusted_billboards_id',
      relays: ['ws://relay.example.com'],
      kinds: [34236],
    };

    const event = create_attention_event(private_key, params);

    expect(event.tags).toContainEqual(['a', params.trusted_marketplaces_coordinate]);
    expect(event.tags).toContainEqual(['a', params.trusted_billboards_coordinate]);

    const content = JSON.parse(event.content);
    expect(content.trusted_marketplaces_id).toBe('trusted_marketplaces_id');
    expect(content.trusted_billboards_id).toBe('trusted_billboards_id');
  });

  it('should include multiple kinds in tags', () => {
    const params = {
      block_height: 850000,
      attention_id: 'attention_1',
      ask: 500,
      min_duration: 15000,
      max_duration: 60000,
      blocked_promotions_id: 'blocked_promotions_id',
      blocked_promoters_id: 'blocked_promoters_id',
      marketplace_coordinate: '38188:' + 'a'.repeat(64) + ':org.attnprotocol:marketplace:marketplace_1',
      blocked_promotions_coordinate: '30000:' + 'b'.repeat(64) + ':org.attnprotocol:promotion:blocked',
      blocked_promoters_coordinate: '30000:' + 'c'.repeat(64) + ':org.attnprotocol:promoter:blocked',
      attention_pubkey: 'd'.repeat(64),
      marketplace_pubkey: 'a'.repeat(64),
      marketplace_id: 'marketplace_1',
      relays: ['ws://relay.example.com'],
      kinds: [34236, 1, 30023],
    };

    const event = create_attention_event(private_key, params);

    expect(event.tags.filter((t) => t[0] === 'k')).toHaveLength(3);
    expect(event.tags).toContainEqual(['k', '34236']);
    expect(event.tags).toContainEqual(['k', '1']);
    expect(event.tags).toContainEqual(['k', '30023']);
  });
});

