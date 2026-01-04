import { describe, it, expect, vi, beforeEach } from 'vitest';
import { create_block_event } from './block.js';
import { finalizeEvent, getPublicKey } from 'nostr-tools';

// Mock @attn/core
vi.mock('@attn/ts-core', () => ({
  CITY_PROTOCOL_KINDS: {
    BLOCK: 38808,
  },
}));

// Import after mock
import { CITY_PROTOCOL_KINDS } from '@attn/ts-core';

// Mock nostr-tools
vi.mock('nostr-tools', async () => {
  const actual = await vi.importActual('nostr-tools');
  return {
    ...actual,
    getPublicKey: vi.fn((key: Uint8Array) => {
      return new Uint8Array(32).fill(1);
    }),
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

describe('create_block_event', () => {
  let private_key: Uint8Array;

  beforeEach(() => {
    private_key = new Uint8Array(32).fill(1);
    vi.clearAllMocks();
  });

  it('should create a block event with required fields', () => {
    const params = {
      block_height: 850000,
      height: 850000,
      hash: 'block_hash_123',
    };

    const event = create_block_event(private_key, params);

    expect(event.kind).toBe(CITY_PROTOCOL_KINDS.BLOCK);
    expect(event.tags).toContainEqual(['d', 'org.cityprotocol:block:850000:block_hash_123']);
    expect(event.tags).toContainEqual(['t', '850000']);
    expect(JSON.parse(event.content)).toMatchObject({
      height: 850000,
      hash: 'block_hash_123',
    });
  });

  it('should include optional fields when provided', () => {
    const params = {
      block_height: 850000,
      height: 850000,
      hash: 'block_hash_123',
      time: 1234567890,
      difficulty: 1000000,
      tx_count: 100,
      size: 1000000,
      weight: 2000000,
      version: 1,
      merkle_root: 'merkle_root_hash',
      nonce: 12345,
    };

    const event = create_block_event(private_key, params);
    const content = JSON.parse(event.content);

    expect(content.time).toBe(1234567890);
    expect(content.difficulty).toBe('1000000');
    expect(content.tx_count).toBe(100);
    expect(content.size).toBe(1000000);
    expect(content.weight).toBe(2000000);
    expect(content.version).toBe(1);
    expect(content.merkle_root).toBe('merkle_root_hash');
    expect(content.nonce).toBe(12345);
  });

  it('should include relay_list in tags when provided', () => {
    const params = {
      block_height: 850000,
      height: 850000,
      hash: 'block_hash_123',
      relay_list: ['ws://relay1.example.com', 'ws://relay2.example.com'],
    };

    const event = create_block_event(private_key, params);

    expect(event.tags).toContainEqual(['r', 'ws://relay1.example.com']);
    expect(event.tags).toContainEqual(['r', 'ws://relay2.example.com']);
  });

  it('should throw error if height is missing', () => {
    const params = {
      block_height: 850000,
      hash: 'block_hash_123',
    } as any;

    expect(() => {
      create_block_event(private_key, params);
    }).toThrow('Block height is required');
  });

  it('should throw error if hash is missing', () => {
    const params = {
      block_height: 850000,
      height: 850000,
      hash: '',
    };

    expect(() => {
      create_block_event(private_key, params);
    }).toThrow('Block hash is required');
  });

  it('should use node_pubkey when provided', () => {
    const node_pubkey = 'a'.repeat(64);
    const params = {
      block_height: 850000,
      height: 850000,
      hash: 'block_hash_123',
      node_pubkey,
    };

    const event = create_block_event(private_key, params);

    expect(event.tags).toContainEqual(['p', node_pubkey]);
    expect(JSON.parse(event.content)).toMatchObject({
      ref_node_pubkey: node_pubkey,
    });
  });

  it('should use block_identifier when provided', () => {
    const block_identifier = 'custom_block_id';
    const params = {
      block_height: 850000,
      height: 850000,
      hash: 'block_hash_123',
      block_identifier,
    };

    const event = create_block_event(private_key, params);
    const content = JSON.parse(event.content);

    expect(content.ref_block_id).toBe(block_identifier);
  });
});

