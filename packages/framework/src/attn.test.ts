import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Attn } from './attn.js';
import { create_mock_auth_challenge, create_mock_auth_response } from './test/fixtures/events.js';
// Import shared MockWebSocket from core package
import { create_mock_websocket } from '@attn/core/src/test/mocks/websocket.mock.js';

// Define MockWebSocket using vi.hoisted to ensure it's available for mocks
const { MockWebSocket } = vi.hoisted(() => create_mock_websocket());

// Mock isomorphic-ws
vi.mock('isomorphic-ws', () => {
  return {
    default: MockWebSocket,
  };
});

// Mock nostr-tools
let last_auth_event_id_attn: string | null = null;

vi.mock('nostr-tools', async () => {
  const actual = await vi.importActual('nostr-tools');
  return {
    ...actual,
    getPublicKey: vi.fn((key: Uint8Array) => {
      return new Uint8Array(32).fill(1);
    }),
    finalizeEvent: vi.fn((event: unknown, key: Uint8Array) => {
      const evt = event as Record<string, unknown>;
      // Generate a consistent ID based on event kind and challenge
      let event_id: string;
      if (evt.kind === 22242) {
        // Auth event - use challenge to generate consistent ID
        const challenge = (evt.tags as string[][])?.find((t) => t[0] === 'challenge')?.[1] || 'default';
        event_id = 'auth_event_' + challenge.substring(0, 8);
        last_auth_event_id_attn = event_id;
      } else {
        event_id = 'mock_event_id_' + Math.random().toString(36).substring(7);
      }
      return {
        ...evt,
        id: event_id,
        sig: 'mock_sig'.repeat(32),
      };
    }),
    utils: {
      bytesToHex: vi.fn((bytes: Uint8Array) => {
        return Array.from(bytes)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      }),
    },
  };
});

describe('Attn', () => {
  let mock_private_key: Uint8Array;
  let mock_node_pubkey: string;
  let config: {
    relays: string[];
    private_key: Uint8Array;
    node_pubkeys: string[];
  };

  beforeEach(() => {
    mock_private_key = new Uint8Array(32).fill(1);
    mock_node_pubkey = 'a'.repeat(64);
    config = {
      relays: ['ws://localhost:8080'],
      private_key: mock_private_key,
      node_pubkeys: [mock_node_pubkey],
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create an Attn instance', () => {
      const attn = new Attn(config);
      expect(attn).toBeInstanceOf(Attn);
    });

    it('should accept configuration with optional fields', () => {
      const full_config = {
        ...config,
        marketplace_pubkeys: ['b'.repeat(64)],
        billboard_pubkeys: ['c'.repeat(64)],
        advertiser_pubkeys: ['d'.repeat(64)],
        auto_reconnect: false,
        deduplicate: false,
        connection_timeout_ms: 10000,
        reconnect_delay_ms: 2000,
        max_reconnect_attempts: 5,
        auth_timeout_ms: 5000,
      };

      const attn = new Attn(full_config);
      expect(attn).toBeInstanceOf(Attn);
    });
  });

  describe('connect', () => {
    it('should connect to relay', async () => {
      last_auth_event_id_attn = null;
      const attn = new Attn(config);
      const connect_promise = attn.connect();

      // Wait for connection to be created
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Get the relay connection
      const connections = (attn as any).relay_connections;
      expect(connections.size).toBe(1);

      const connection = connections.get('ws://localhost:8080');
      const ws = (connection as any).ws as InstanceType<typeof MockWebSocket>;
      expect(ws).toBeDefined();

      ws._simulate_open();
      await new Promise((resolve) => setTimeout(resolve, 10));
      ws._simulate_message(create_mock_auth_challenge('test_challenge'));

      await new Promise((resolve) => setTimeout(resolve, 100));

      const auth_event_id = last_auth_event_id_attn || 'auth_event_test';
      ws._simulate_message(create_mock_auth_response(auth_event_id));

      await connect_promise;

      // Verify connection state
      expect((connection as any).is_connected).toBe(true);
      expect((connection as any).is_authenticated).toBe(true);
      expect(ws.ready_state).toBe(1); // OPEN
      expect(attn.connected).toBe(true);
    });

    it('should connect to multiple relays', async () => {
      last_auth_event_id_attn = null;
      const multi_relay_config = {
        ...config,
        relays: ['ws://localhost:8080', 'ws://localhost:8081'],
      };

      const attn = new Attn(multi_relay_config);
      const connect_promise = attn.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));
      const connections = (attn as any).relay_connections;
      expect(connections.size).toBe(2);

      // Connect both relays
      for (const connection of connections.values()) {
        const ws = (connection as any).ws as InstanceType<typeof MockWebSocket>;
        expect(ws).toBeDefined();
        ws._simulate_open();
        await new Promise((resolve) => setTimeout(resolve, 10));
        ws._simulate_message(create_mock_auth_challenge('test_challenge'));
        await new Promise((resolve) => setTimeout(resolve, 100));
        const auth_event_id = last_auth_event_id_attn || 'auth_event_test';
        ws._simulate_message(create_mock_auth_response(auth_event_id));
        // Reset for next relay
        last_auth_event_id_attn = null;
        // Verify this connection is connected
        expect((connection as any).is_connected).toBe(true);
        expect((connection as any).is_authenticated).toBe(true);
        expect(ws.ready_state).toBe(1); // OPEN
      }

      await connect_promise;

      expect(attn.connected).toBe(true);
    });

    it('should throw error if no relays provided', async () => {
      const invalid_config = {
        ...config,
        relays: [],
      };

      const attn = new Attn(invalid_config);
      await expect(attn.connect()).rejects.toThrow('At least one relay URL is required');
    });

    it('should throw error if private_key is missing', async () => {
      const invalid_config = {
        ...config,
        private_key: undefined as unknown as Uint8Array,
      };

      const attn = new Attn(invalid_config);
      await expect(attn.connect()).rejects.toThrow('private_key');
    });

    // node_pubkeys is now optional, so we just verify no error is thrown during construction
    it('should allow empty node_pubkeys configuration', () => {
      const config_without_nodes = {
        ...config,
        node_pubkeys: [],
      };

      // Should not throw - node_pubkeys is optional
      const attn = new Attn(config_without_nodes);
      expect(attn).toBeDefined();
    });
  });

  describe('disconnect', () => {
    it('should disconnect from relay', async () => {
      last_auth_event_id_attn = null;
      const attn = new Attn(config);
      const connect_promise = attn.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));
      const connections = (attn as any).relay_connections;
      const connection = connections.get('ws://localhost:8080');
      const ws = (connection as any).ws as InstanceType<typeof MockWebSocket>;
      expect(ws).toBeDefined();

      ws._simulate_open();
      await new Promise((resolve) => setTimeout(resolve, 10));
      ws._simulate_message(create_mock_auth_challenge('test_challenge'));
      await new Promise((resolve) => setTimeout(resolve, 100));

      const auth_event_id = last_auth_event_id_attn || 'auth_event_test';
      ws._simulate_message(create_mock_auth_response(auth_event_id));
      await connect_promise;

      await attn.disconnect();

      expect(ws.closed).toBe(true);
      expect(attn.connected).toBe(false);
    });

    it('should handle disconnect when not connected', async () => {
      const attn = new Attn(config);
      await expect(attn.disconnect()).resolves.not.toThrow();
    });
  });

  describe('hook registration', () => {
    it('should register on_relay_connect handler', () => {
      const attn = new Attn(config);
      const handler = vi.fn();
      const handle = attn.on_relay_connect(handler);

      expect(handle).toBeDefined();
      expect(handle.unregister).toBeDefined();
    });

    it('should register on_block_event handler', () => {
      const attn = new Attn(config);
      const handler = vi.fn();
      const handle = attn.on_block_event(handler);

      expect(handle).toBeDefined();
      expect(handle.unregister).toBeDefined();
    });

    it('should register on_marketplace_event handler', () => {
      const attn = new Attn(config);
      const handler = vi.fn();
      const handle = attn.on_marketplace_event(handler);

      expect(handle).toBeDefined();
      expect(handle.unregister).toBeDefined();
    });

    it('should register on_billboard_event handler', () => {
      const attn = new Attn(config);
      const handler = vi.fn();
      const handle = attn.on_billboard_event(handler);

      expect(handle).toBeDefined();
      expect(handle.unregister).toBeDefined();
    });

    it('should register on_promotion_event handler', () => {
      const attn = new Attn(config);
      const handler = vi.fn();
      const handle = attn.on_promotion_event(handler);

      expect(handle).toBeDefined();
      expect(handle.unregister).toBeDefined();
    });

    it('should register on_attention_event handler', () => {
      const attn = new Attn(config);
      const handler = vi.fn();
      const handle = attn.on_attention_event(handler);

      expect(handle).toBeDefined();
      expect(handle.unregister).toBeDefined();
    });

    it('should register before_block_event handler', () => {
      const attn = new Attn(config);
      const handler = vi.fn();
      const handle = attn.before_block_event(handler);

      expect(handle).toBeDefined();
      expect(handle.unregister).toBeDefined();
    });

    it('should register after_block_event handler', () => {
      const attn = new Attn(config);
      const handler = vi.fn();
      const handle = attn.after_block_event(handler);

      expect(handle).toBeDefined();
      expect(handle.unregister).toBeDefined();
    });

    it('should register on_block_gap_detected handler', () => {
      const attn = new Attn(config);
      const handler = vi.fn();
      const handle = attn.on_block_gap_detected(handler);

      expect(handle).toBeDefined();
      expect(handle.unregister).toBeDefined();
    });

    it('should register before_marketplace_event handler', () => {
      const attn = new Attn(config);
      const handler = vi.fn();
      const handle = attn.before_marketplace_event(handler);

      expect(handle).toBeDefined();
      expect(handle.unregister).toBeDefined();
    });

    it('should register after_marketplace_event handler', () => {
      const attn = new Attn(config);
      const handler = vi.fn();
      const handle = attn.after_marketplace_event(handler);

      expect(handle).toBeDefined();
      expect(handle.unregister).toBeDefined();
    });

    it('should register before_billboard_event handler', () => {
      const attn = new Attn(config);
      const handler = vi.fn();
      const handle = attn.before_billboard_event(handler);

      expect(handle).toBeDefined();
      expect(handle.unregister).toBeDefined();
    });

    it('should register after_billboard_event handler', () => {
      const attn = new Attn(config);
      const handler = vi.fn();
      const handle = attn.after_billboard_event(handler);

      expect(handle).toBeDefined();
      expect(handle.unregister).toBeDefined();
    });

    it('should register on_billboard_confirmation_event handler', () => {
      const attn = new Attn(config);
      const handler = vi.fn();
      const handle = attn.on_billboard_confirmation_event(handler);

      expect(handle).toBeDefined();
      expect(handle.unregister).toBeDefined();
    });

    it('should register on_attention_confirmation_event handler', () => {
      const attn = new Attn(config);
      const handler = vi.fn();
      const handle = attn.on_attention_confirmation_event(handler);

      expect(handle).toBeDefined();
      expect(handle.unregister).toBeDefined();
    });

    it('should register on_marketplace_confirmation_event handler', () => {
      const attn = new Attn(config);
      const handler = vi.fn();
      const handle = attn.on_marketplace_confirmation_event(handler);

      expect(handle).toBeDefined();
      expect(handle.unregister).toBeDefined();
    });

    it('should register on_attention_payment_confirmation_event handler', () => {
      const attn = new Attn(config);
      const handler = vi.fn();
      const handle = attn.on_attention_payment_confirmation_event(handler);

      expect(handle).toBeDefined();
      expect(handle.unregister).toBeDefined();
    });
  });

  describe('connected property', () => {
    it('should return false when not connected', () => {
      const attn = new Attn(config);
      expect(attn.connected).toBe(false);
    });

    it('should return true when connected', async () => {
      last_auth_event_id_attn = null;
      const attn = new Attn(config);
      const connect_promise = attn.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));
      const connections = (attn as any).relay_connections;
      const connection = connections.get('ws://localhost:8080');
      const ws = (connection as any).ws as InstanceType<typeof MockWebSocket>;
      expect(ws).toBeDefined();

      ws._simulate_open();
      await new Promise((resolve) => setTimeout(resolve, 10));
      ws._simulate_message(create_mock_auth_challenge('test_challenge'));
      await new Promise((resolve) => setTimeout(resolve, 100));

      const auth_event_id = last_auth_event_id_attn || 'auth_event_test';
      ws._simulate_message(create_mock_auth_response(auth_event_id));
      await connect_promise;

      // Verify connection state
      expect((connection as any).is_connected).toBe(true);
      expect((connection as any).is_authenticated).toBe(true);
      expect(ws.ready_state).toBe(1); // OPEN
      expect(attn.connected).toBe(true);
    });
  });
});

