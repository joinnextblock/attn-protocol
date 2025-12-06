import { describe, it, expect, vi, beforeEach } from 'vitest';
import { create_promotion_event } from './promotion.js';
import { ATTN_EVENT_KINDS } from '@attn-protocol/core';
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

describe('create_promotion_event', () => {
  let private_key: Uint8Array;

  beforeEach(() => {
    private_key = new Uint8Array(32).fill(1);
    vi.clearAllMocks();
  });

  it('should create a promotion event with required fields', () => {
    const params = {
      block_height: 850000,
      promotion_id: 'promotion_1',
      duration: 30000,
      bid: 1000,
      event_id: 'event_id_123',
      call_to_action: 'Click Here',
      call_to_action_url: 'https://example.com',
      marketplace_coordinate: '38188:' + 'a'.repeat(64) + ':org.attnprotocol:marketplace:marketplace_1',
      video_coordinate: '34236:' + 'b'.repeat(64) + ':video_d_tag',
      billboard_coordinate: '38288:' + 'c'.repeat(64) + ':org.attnprotocol:billboard:billboard_1',
      marketplace_pubkey: 'a'.repeat(64),
      billboard_pubkey: 'c'.repeat(64),
      promotion_pubkey: 'd'.repeat(64),
      marketplace_id: 'marketplace_1',
      relays: ['ws://relay.example.com'],
      kind: 34236,
      url: 'https://example.com',
    };

    const event = create_promotion_event(private_key, params);

    expect(event.kind).toBe(ATTN_EVENT_KINDS.PROMOTION);
    expect(event.tags).toContainEqual(['d', 'org.attnprotocol:promotion:promotion_1']);
    expect(event.tags).toContainEqual(['t', '850000']);
    expect(event.tags).toContainEqual(['a', params.marketplace_coordinate]);
    expect(event.tags).toContainEqual(['a', params.video_coordinate]);
    expect(event.tags).toContainEqual(['a', params.billboard_coordinate]);
    expect(event.tags).toContainEqual(['p', params.marketplace_pubkey]);
    expect(event.tags).toContainEqual(['p', params.billboard_pubkey]);
    expect(event.tags).toContainEqual(['p', params.promotion_pubkey]);
    expect(event.tags).toContainEqual(['k', '34236']);
    expect(event.tags).toContainEqual(['u', 'https://example.com']);

    const content = JSON.parse(event.content);
    expect(content.duration).toBe(30000);
    expect(content.bid).toBe(1000);
    expect(content.event_id).toBe('event_id_123');
    expect(content.call_to_action).toBe('Click Here');
    expect(content.call_to_action_url).toBe('https://example.com');
    expect(content.ref_promotion_pubkey).toBe(params.promotion_pubkey);
    expect(content.ref_promotion_id).toBe('promotion_1');
  });

  it('should use default escrow_id_list when not provided', () => {
    const params = {
      block_height: 850000,
      promotion_id: 'promotion_1',
      duration: 30000,
      bid: 1000,
      event_id: 'event_id_123',
      call_to_action: 'Click Here',
      call_to_action_url: 'https://example.com',
      marketplace_coordinate: '38188:' + 'a'.repeat(64) + ':org.attnprotocol:marketplace:marketplace_1',
      video_coordinate: '34236:' + 'b'.repeat(64) + ':video_d_tag',
      billboard_coordinate: '38288:' + 'c'.repeat(64) + ':org.attnprotocol:billboard:billboard_1',
      marketplace_pubkey: 'a'.repeat(64),
      billboard_pubkey: 'c'.repeat(64),
      promotion_pubkey: 'd'.repeat(64),
      marketplace_id: 'marketplace_1',
      relays: ['ws://relay.example.com'],
      kind: 34236,
      url: 'https://example.com',
    };

    const event = create_promotion_event(private_key, params);
    const content = JSON.parse(event.content);

    expect(content.escrow_id_list).toEqual([]);
  });

  it('should extract billboard_id from billboard_coordinate when not provided', () => {
    const params = {
      block_height: 850000,
      promotion_id: 'promotion_1',
      duration: 30000,
      bid: 1000,
      event_id: 'event_id_123',
      call_to_action: 'Click Here',
      call_to_action_url: 'https://example.com',
      marketplace_coordinate: '38188:' + 'a'.repeat(64) + ':org.attnprotocol:marketplace:marketplace_1',
      video_coordinate: '34236:' + 'b'.repeat(64) + ':video_d_tag',
      billboard_coordinate: '38288:' + 'c'.repeat(64) + ':org.attnprotocol:billboard:billboard_1',
      marketplace_pubkey: 'a'.repeat(64),
      billboard_pubkey: 'c'.repeat(64),
      promotion_pubkey: 'd'.repeat(64),
      marketplace_id: 'marketplace_1',
      relays: ['ws://relay.example.com'],
      kind: 34236,
      url: 'https://example.com',
    };

    const event = create_promotion_event(private_key, params);
    const content = JSON.parse(event.content);

    expect(content.ref_billboard_id).toBe('billboard_1');
  });
});

