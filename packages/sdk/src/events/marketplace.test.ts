import { describe, it, expect, vi, beforeEach } from 'vitest';
import { create_marketplace_event } from './marketplace.js';
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

describe('create_marketplace_event', () => {
  let private_key: Uint8Array;

  beforeEach(() => {
    private_key = new Uint8Array(32).fill(1);
    vi.clearAllMocks();
  });

  it('should create a marketplace event with required fields', () => {
    const params = {
      block_height: 850000,
      name: 'Test Marketplace',
      description: 'Test Description',
      kind_list: [34236],
      relay_list: ['ws://relay.example.com'],
      admin_pubkey: 'a'.repeat(64),
      marketplace_id: 'marketplace_1',
      marketplace_pubkey: 'b'.repeat(64),
      ref_node_pubkey: 'c'.repeat(64),
      ref_block_id: 'org.attnprotocol:block:850000:hash',
      block_coordinate: '38088:c'.repeat(64) + ':org.attnprotocol:block:850000:hash',
    };

    const event = create_marketplace_event(private_key, params);

    expect(event.kind).toBe(ATTN_EVENT_KINDS.MARKETPLACE);
    expect(event.tags).toContainEqual(['d', 'org.attnprotocol:marketplace:marketplace_1']);
    expect(event.tags).toContainEqual(['t', '850000']);
    expect(event.tags).toContainEqual(['a', params.block_coordinate]);
    expect(event.tags).toContainEqual(['k', '34236']);
    expect(event.tags).toContainEqual(['p', params.marketplace_pubkey]);
    expect(event.tags).toContainEqual(['p', params.ref_node_pubkey]);
    expect(event.tags).toContainEqual(['r', 'ws://relay.example.com']);

    const content = JSON.parse(event.content);
    expect(content.name).toBe('Test Marketplace');
    expect(content.description).toBe('Test Description');
    expect(content.admin_pubkey).toBe(params.admin_pubkey);
    expect(content.ref_marketplace_pubkey).toBe(params.marketplace_pubkey);
    expect(content.ref_marketplace_id).toBe('marketplace_1');
    expect(content.ref_node_pubkey).toBe(params.ref_node_pubkey);
    expect(content.ref_block_id).toBe(params.ref_block_id);
  });

  it('should use default values for optional fields', () => {
    const params = {
      block_height: 850000,
      name: 'Test Marketplace',
      description: 'Test Description',
      kind_list: [34236],
      relay_list: ['ws://relay.example.com'],
      admin_pubkey: 'a'.repeat(64),
      marketplace_id: 'marketplace_1',
      marketplace_pubkey: 'b'.repeat(64),
      ref_node_pubkey: 'c'.repeat(64),
      ref_block_id: 'org.attnprotocol:block:850000:hash',
      block_coordinate: '38088:c'.repeat(64) + ':org.attnprotocol:block:850000:hash',
    };

    const event = create_marketplace_event(private_key, params);
    const content = JSON.parse(event.content);

    expect(content.min_duration).toBe(15000);
    expect(content.max_duration).toBe(60000);
    expect(content.match_fee_sats).toBe(0);
    expect(content.confirmation_fee_sats).toBe(0);
  });

  it('should include optional website_url in tags', () => {
    const params = {
      block_height: 850000,
      name: 'Test Marketplace',
      description: 'Test Description',
      kind_list: [34236],
      relay_list: ['ws://relay.example.com'],
      admin_pubkey: 'a'.repeat(64),
      marketplace_id: 'marketplace_1',
      marketplace_pubkey: 'b'.repeat(64),
      ref_node_pubkey: 'c'.repeat(64),
      ref_block_id: 'org.attnprotocol:block:850000:hash',
      block_coordinate: '38088:c'.repeat(64) + ':org.attnprotocol:block:850000:hash',
      website_url: 'https://example.com',
    };

    const event = create_marketplace_event(private_key, params);

    expect(event.tags).toContainEqual(['u', 'https://example.com']);
  });

  it('should include multiple kind_list items in tags', () => {
    const params = {
      block_height: 850000,
      name: 'Test Marketplace',
      description: 'Test Description',
      kind_list: [34236, 1, 30023],
      relay_list: ['ws://relay.example.com'],
      admin_pubkey: 'a'.repeat(64),
      marketplace_id: 'marketplace_1',
      marketplace_pubkey: 'b'.repeat(64),
      ref_node_pubkey: 'c'.repeat(64),
      ref_block_id: 'org.attnprotocol:block:850000:hash',
      block_coordinate: '38088:c'.repeat(64) + ':org.attnprotocol:block:850000:hash',
    };

    const event = create_marketplace_event(private_key, params);

    expect(event.tags.filter((t) => t[0] === 'k')).toHaveLength(3);
    expect(event.tags).toContainEqual(['k', '34236']);
    expect(event.tags).toContainEqual(['k', '1']);
    expect(event.tags).toContainEqual(['k', '30023']);
  });

  it('should include multiple relay_list items in tags', () => {
    const params = {
      block_height: 850000,
      name: 'Test Marketplace',
      description: 'Test Description',
      kind_list: [34236],
      relay_list: ['ws://relay1.example.com', 'ws://relay2.example.com', 'ws://relay3.example.com'],
      admin_pubkey: 'a'.repeat(64),
      marketplace_id: 'marketplace_1',
      marketplace_pubkey: 'b'.repeat(64),
      ref_node_pubkey: 'c'.repeat(64),
      ref_block_id: 'org.attnprotocol:block:850000:hash',
      block_coordinate: '38088:c'.repeat(64) + ':org.attnprotocol:block:850000:hash',
    };

    const event = create_marketplace_event(private_key, params);

    expect(event.tags.filter((t) => t[0] === 'r')).toHaveLength(3);
    expect(event.tags).toContainEqual(['r', 'ws://relay1.example.com']);
    expect(event.tags).toContainEqual(['r', 'ws://relay2.example.com']);
    expect(event.tags).toContainEqual(['r', 'ws://relay3.example.com']);
  });
});

