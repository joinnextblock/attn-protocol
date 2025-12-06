import { describe, it, expect, vi, beforeEach } from 'vitest';
import { create_billboard_event } from './billboard.js';
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

describe('create_billboard_event', () => {
  let private_key: Uint8Array;

  beforeEach(() => {
    private_key = new Uint8Array(32).fill(1);
    vi.clearAllMocks();
  });

  it('should create a billboard event with required fields', () => {
    const params = {
      block_height: 850000,
      billboard_id: 'billboard_1',
      name: 'Test Billboard',
      marketplace_coordinate: '38188:' + 'a'.repeat(64) + ':org.attnprotocol:marketplace:marketplace_1',
      billboard_pubkey: 'b'.repeat(64),
      marketplace_pubkey: 'a'.repeat(64),
      marketplace_id: 'marketplace_1',
      relays: ['ws://relay.example.com'],
      kind: 34236,
      url: 'https://example.com',
    };

    const event = create_billboard_event(private_key, params);

    expect(event.kind).toBe(ATTN_EVENT_KINDS.BILLBOARD);
    expect(event.tags).toContainEqual(['d', 'org.attnprotocol:billboard:billboard_1']);
    expect(event.tags).toContainEqual(['t', '850000']);
    expect(event.tags).toContainEqual(['a', params.marketplace_coordinate]);
    expect(event.tags).toContainEqual(['p', params.billboard_pubkey]);
    expect(event.tags).toContainEqual(['p', params.marketplace_pubkey]);
    expect(event.tags).toContainEqual(['r', 'ws://relay.example.com']);
    expect(event.tags).toContainEqual(['k', '34236']);
    expect(event.tags).toContainEqual(['u', 'https://example.com']);

    const content = JSON.parse(event.content);
    expect(content.name).toBe('Test Billboard');
    expect(content.ref_billboard_pubkey).toBe(params.billboard_pubkey);
    expect(content.ref_billboard_id).toBe('billboard_1');
    expect(content.ref_marketplace_pubkey).toBe(params.marketplace_pubkey);
    expect(content.ref_marketplace_id).toBe('marketplace_1');
  });

  it('should include optional description in content', () => {
    const params = {
      block_height: 850000,
      billboard_id: 'billboard_1',
      name: 'Test Billboard',
      description: 'Test Description',
      marketplace_coordinate: '38188:' + 'a'.repeat(64) + ':org.attnprotocol:marketplace:marketplace_1',
      billboard_pubkey: 'b'.repeat(64),
      marketplace_pubkey: 'a'.repeat(64),
      marketplace_id: 'marketplace_1',
      relays: ['ws://relay.example.com'],
      kind: 34236,
      url: 'https://example.com',
    };

    const event = create_billboard_event(private_key, params);
    const content = JSON.parse(event.content);

    expect(content.description).toBe('Test Description');
  });

  it('should use default confirmation_fee_sats when not provided', () => {
    const params = {
      block_height: 850000,
      billboard_id: 'billboard_1',
      name: 'Test Billboard',
      marketplace_coordinate: '38188:' + 'a'.repeat(64) + ':org.attnprotocol:marketplace:marketplace_1',
      billboard_pubkey: 'b'.repeat(64),
      marketplace_pubkey: 'a'.repeat(64),
      marketplace_id: 'marketplace_1',
      relays: ['ws://relay.example.com'],
      kind: 34236,
      url: 'https://example.com',
    };

    const event = create_billboard_event(private_key, params);
    const content = JSON.parse(event.content);

    expect(content.confirmation_fee_sats).toBe(0);
  });

  it('should include multiple relays in tags', () => {
    const params = {
      block_height: 850000,
      billboard_id: 'billboard_1',
      name: 'Test Billboard',
      marketplace_coordinate: '38188:' + 'a'.repeat(64) + ':org.attnprotocol:marketplace:marketplace_1',
      billboard_pubkey: 'b'.repeat(64),
      marketplace_pubkey: 'a'.repeat(64),
      marketplace_id: 'marketplace_1',
      relays: ['ws://relay1.example.com', 'ws://relay2.example.com'],
      kind: 34236,
      url: 'https://example.com',
    };

    const event = create_billboard_event(private_key, params);

    expect(event.tags.filter((t) => t[0] === 'r')).toHaveLength(2);
    expect(event.tags).toContainEqual(['r', 'ws://relay1.example.com']);
    expect(event.tags).toContainEqual(['r', 'ws://relay2.example.com']);
  });
});

