import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AttnSdk } from './sdk.js';
import { create_block_event, create_marketplace_event, create_billboard_event } from './events/index.js';
import { publish_to_relay, publish_to_multiple } from './relay/index.js';

// Mock nostr-tools
vi.mock('nostr-tools', () => ({
  getPublicKey: vi.fn(() => 'a'.repeat(64)),
  nip19: {
    decode: vi.fn(),
  },
  utils: {
    hexToBytes: vi.fn((hex: string) => {
      // Simple hex to bytes conversion for testing
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
      }
      return bytes;
    }),
  },
}));

// Import after mock to get mocked versions
import { getPublicKey, nip19 } from 'nostr-tools';

// Mock event builders
vi.mock('./events/index.js', () => ({
  create_block_event: vi.fn(),
  create_marketplace_event: vi.fn(),
  create_billboard_event: vi.fn(),
  create_promotion_event: vi.fn(),
  create_attention_event: vi.fn(),
  create_match_event: vi.fn(),
}));

// Mock publisher
vi.mock('./relay/index.js', () => ({
  publish_to_relay: vi.fn(),
  publish_to_multiple: vi.fn(),
}));

describe('AttnSdk', () => {
  let private_key: Uint8Array;

  beforeEach(() => {
    private_key = new Uint8Array(32).fill(1);
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create AttnSdk with Uint8Array private key', () => {
      const sdk = new AttnSdk({ private_key });
      expect(sdk).toBeInstanceOf(AttnSdk);
      expect(getPublicKey).toHaveBeenCalledWith(private_key);
    });

    it('should convert hex string private key to Uint8Array correctly', () => {
      // Create a valid hex key (64 hex chars = 32 bytes)
      const hex_key = '0123456789abcdef'.repeat(4); // 64 hex characters
      const sdk = new AttnSdk({ private_key: hex_key });

      expect(sdk).toBeInstanceOf(AttnSdk);
      // Verify getPublicKey was called with a Uint8Array
      expect(getPublicKey).toHaveBeenCalled();
      const called_with = vi.mocked(getPublicKey).mock.calls[0]![0];
      expect(called_with).toBeInstanceOf(Uint8Array);
      expect(called_with.length).toBe(32);

      // Verify the conversion is correct - first byte should be 0x01, second 0x23, etc.
      expect(called_with[0]).toBe(0x01);
      expect(called_with[1]).toBe(0x23);
      expect(called_with[2]).toBe(0x45);
    });

    it('should handle hex key with lowercase letters', () => {
      const hex_key = 'abcdef0123456789'.repeat(4);
      const sdk = new AttnSdk({ private_key: hex_key });
      expect(sdk).toBeInstanceOf(AttnSdk);
      const called_with = vi.mocked(getPublicKey).mock.calls[0]![0];
      expect(called_with).toBeInstanceOf(Uint8Array);
      expect(called_with.length).toBe(32);
    });

    it('should handle hex key with uppercase letters', () => {
      const hex_key = 'ABCDEF0123456789'.repeat(4);
      const sdk = new AttnSdk({ private_key: hex_key });
      expect(sdk).toBeInstanceOf(AttnSdk);
      const called_with = vi.mocked(getPublicKey).mock.calls[0]![0];
      expect(called_with).toBeInstanceOf(Uint8Array);
      expect(called_with.length).toBe(32);
    });

    it('should decode nsec string private key correctly', () => {
      const nsec_data = new Uint8Array(32).fill(42);
      const mock_decode_result = {
        type: 'nsec',
        data: nsec_data,
      };

      vi.mocked(nip19.decode).mockReturnValueOnce(mock_decode_result as any);

      const nsec_key = 'nsec1test';
      const sdk = new AttnSdk({ private_key: nsec_key });

      expect(sdk).toBeInstanceOf(AttnSdk);
      expect(nip19.decode).toHaveBeenCalledWith(nsec_key);
      expect(getPublicKey).toHaveBeenCalledWith(nsec_data);
    });

    it('should throw error for hex private key with wrong length', () => {
      expect(() => {
        new AttnSdk({ private_key: 'short' });
      }).toThrow('Invalid hex private key: must be 64 hex characters');
    });

    it('should throw error for hex private key with 64 chars but invalid format', () => {
      // 64 characters but not valid hex (contains 'g')
      const invalid_hex = 'g'.repeat(64);
      expect(() => {
        new AttnSdk({ private_key: invalid_hex });
      }).toThrow('Invalid hex private key format');
    });

    it('should throw error for nsec with wrong decoded type', () => {
      vi.mocked(nip19.decode).mockReturnValueOnce({
        type: 'npub',
        data: new Uint8Array(32),
      } as any);

      expect(() => {
        new AttnSdk({ private_key: 'nsec1invalid' });
      }).toThrow('Invalid nsec format');
    });

    it('should throw error when nsec decode throws', () => {
      vi.mocked(nip19.decode).mockImplementationOnce(() => {
        throw new Error('Invalid bech32');
      });

      expect(() => {
        new AttnSdk({ private_key: 'nsec1invalid' });
      }).toThrow();
    });
  });

  describe('get_public_key', () => {
    it('should return public key from getPublicKey', () => {
      const mock_public_key = 'b'.repeat(64);
      vi.mocked(getPublicKey).mockReturnValueOnce(mock_public_key);

      const sdk = new AttnSdk({ private_key });
      const public_key = sdk.get_public_key();

      expect(public_key).toBe(mock_public_key);
      expect(getPublicKey).toHaveBeenCalledWith(private_key);
    });

    it('should return same public key for hex string and equivalent Uint8Array', () => {
      const hex_key = '0123456789abcdef'.repeat(4);
      const expected_bytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        const hex_pair = hex_key.substring(i * 2, i * 2 + 2);
        expected_bytes[i] = parseInt(hex_pair, 16);
      }

      const mock_public_key = 'c'.repeat(64);
      vi.mocked(getPublicKey).mockReturnValue(mock_public_key);

      const sdk_from_hex = new AttnSdk({ private_key: hex_key });
      vi.clearAllMocks();
      const sdk_from_bytes = new AttnSdk({ private_key: expected_bytes });

      expect(sdk_from_hex.get_public_key()).toBe(mock_public_key);
      expect(sdk_from_bytes.get_public_key()).toBe(mock_public_key);
    });
  });

  describe('create_block', () => {
    it('should create block event with Uint8Array private key', () => {
      // Note: Block events are now published by City Protocol (Kind 38808)
      // This test verifies the deprecated ATTN SDK block builder still works
      const mock_event = {
        id: 'block_event_id',
        pubkey: 'a'.repeat(64),
        created_at: 1234567890,
        kind: 38808, // City Protocol block kind
        tags: [],
        content: '',
        sig: 'sig',
      };

      vi.mocked(create_block_event).mockReturnValueOnce(mock_event as any);

      const sdk = new AttnSdk({ private_key });
      const params = {
        block_height: 850000,
        height: 850000,
        hash: 'block_hash',
      };

      const event = sdk.create_block(params);

      expect(create_block_event).toHaveBeenCalledWith(private_key, params);
      expect(event).toBe(mock_event);
    });

    it('should use converted private key from hex string', () => {
      const hex_key = '0123456789abcdef'.repeat(4);
      const expected_bytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        const hex_pair = hex_key.substring(i * 2, i * 2 + 2);
        expected_bytes[i] = parseInt(hex_pair, 16);
      }

      const mock_event = {
        id: 'block_event_id',
        pubkey: 'a'.repeat(64),
        created_at: 1234567890,
        kind: 38808, // City Protocol block kind
        tags: [],
        content: '',
        sig: 'sig',
      };

      vi.mocked(create_block_event).mockReturnValueOnce(mock_event as any);

      const sdk = new AttnSdk({ private_key: hex_key });
      const params = {
        block_height: 850000,
        height: 850000,
        hash: 'block_hash',
      };

      sdk.create_block(params);

      // Verify the converted Uint8Array was passed, not the hex string
      const called_key = vi.mocked(create_block_event).mock.calls[0]![0];
      expect(called_key).toBeInstanceOf(Uint8Array);
      expect(called_key.length).toBe(32);
      expect(Array.from(called_key)).toEqual(Array.from(expected_bytes));
    });
  });

  describe('create_marketplace', () => {
    it('should create marketplace event', () => {
      const mock_event = {
        id: 'marketplace_event_id',
        pubkey: 'a'.repeat(64),
        created_at: 1234567890,
        kind: 38188,
        tags: [],
        content: '',
        sig: 'sig',
      };

      vi.mocked(create_marketplace_event).mockReturnValueOnce(mock_event as any);

      const sdk = new AttnSdk({ private_key });
      const params = {
        block_height: 850000,
        name: 'Test Marketplace',
        description: 'Test Description',
        kind_list: [34236],
        relay_list: ['ws://relay.example.com'],
        admin_pubkey: 'a'.repeat(64),
        marketplace_id: 'marketplace_1',
        marketplace_pubkey: 'b'.repeat(64),
        ref_clock_pubkey: 'c'.repeat(64),
        ref_block_id: 'org.cityprotocol:block:850000:hash',
        block_coordinate: '38808:' + 'c'.repeat(64) + ':org.cityprotocol:block:850000:hash',
      };

      const event = sdk.create_marketplace(params);

      expect(create_marketplace_event).toHaveBeenCalledWith(private_key, params);
      expect(event).toBe(mock_event);
    });
  });

  describe('create_billboard', () => {
    it('should create billboard event', () => {
      const mock_event = {
        id: 'billboard_event_id',
        pubkey: 'a'.repeat(64),
        created_at: 1234567890,
        kind: 38288,
        tags: [],
        content: '',
        sig: 'sig',
      };

      vi.mocked(create_billboard_event).mockReturnValueOnce(mock_event as any);

      const sdk = new AttnSdk({ private_key });
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

      const event = sdk.create_billboard(params);

      expect(create_billboard_event).toHaveBeenCalledWith(private_key, params);
      expect(event).toBe(mock_event);
    });
  });

  describe('publish', () => {
    it('should publish event to relay', async () => {
      const mock_result = {
        event_id: 'event_id',
        relay_url: 'ws://relay.example.com',
        success: true,
      };

      vi.mocked(publish_to_relay).mockResolvedValueOnce(mock_result);

      const sdk = new AttnSdk({ private_key });
      const event = {
        id: 'event_id',
        pubkey: 'a'.repeat(64),
        created_at: 1234567890,
        kind: 1,
        tags: [],
        content: '',
        sig: 'sig',
      };

      const result = await sdk.publish(event, 'ws://relay.example.com');

      expect(publish_to_relay).toHaveBeenCalledWith(
        'ws://relay.example.com',
        event,
        private_key,
        undefined,
        undefined,
        false
      );
      expect(result).toBe(mock_result);
    });

    it('should publish event with custom timeouts', async () => {
      const mock_result = {
        event_id: 'event_id',
        relay_url: 'ws://relay.example.com',
        success: true,
      };

      vi.mocked(publish_to_relay).mockResolvedValueOnce(mock_result);

      const sdk = new AttnSdk({ private_key });
      const event = {
        id: 'event_id',
        pubkey: 'a'.repeat(64),
        created_at: 1234567890,
        kind: 1,
        tags: [],
        content: '',
        sig: 'sig',
      };

      await sdk.publish(event, 'ws://relay.example.com', 5000, 3000);

      expect(publish_to_relay).toHaveBeenCalledWith(
        'ws://relay.example.com',
        event,
        private_key,
        5000,
        3000,
        false
      );
    });
  });

  describe('publish_to_multiple', () => {
    it('should publish event to multiple relays', async () => {
      const mock_result = {
        event_id: 'event_id',
        results: [
          { event_id: 'event_id', relay_url: 'ws://relay1.example.com', success: true },
          { event_id: 'event_id', relay_url: 'ws://relay2.example.com', success: true },
        ],
        success_count: 2,
        failure_count: 0,
      };

      vi.mocked(publish_to_multiple).mockResolvedValueOnce(mock_result);

      const sdk = new AttnSdk({ private_key });
      const event = {
        id: 'event_id',
        pubkey: 'a'.repeat(64),
        created_at: 1234567890,
        kind: 1,
        tags: [],
        content: '',
        sig: 'sig',
      };

      const result = await sdk.publish_to_multiple(event, ['ws://relay1.example.com', 'ws://relay2.example.com']);

      expect(publish_to_multiple).toHaveBeenCalledWith(
        ['ws://relay1.example.com', 'ws://relay2.example.com'],
        event,
        private_key,
        undefined,
        undefined,
        false
      );
      expect(result).toBe(mock_result);
    });
  });
});

