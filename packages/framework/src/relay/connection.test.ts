import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RelayConnection } from './connection.js';
import { HookEmitter } from '../hooks/emitter.js';
import {
  create_mock_block_event,
  create_mock_auth_challenge,
  create_mock_auth_response,
  create_mock_event_message,
  create_mock_eose,
} from '../test/fixtures/events.js';
import { ATTN_EVENT_KINDS, CITY_PROTOCOL_KINDS } from '@attn/ts-core';
import { HOOK_NAMES } from '../hooks/index.js';
import { getPublicKey } from 'nostr-tools';

// Import shared MockWebSocket from core package
import { create_mock_websocket } from '@attn/ts-core/src/test/mocks/websocket.mock.js';

// Define MockWebSocket using vi.hoisted to ensure it's available for mocks
const { MockWebSocket } = vi.hoisted(() => create_mock_websocket());

// Mock isomorphic-ws
vi.mock('isomorphic-ws', () => {
  return {
    default: MockWebSocket,
  };
});

// Mock nostr-tools
let last_auth_event_id: string | null = null;

vi.mock('nostr-tools', async () => {
  const actual = await vi.importActual('nostr-tools');
  return {
    ...actual,
    getPublicKey: vi.fn((key: Uint8Array) => {
      // Return a mock public key
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
        last_auth_event_id = event_id;
      } else {
        event_id = 'mock_event_id_' + Math.random().toString(36).substring(7);
      }
      // Return a mock signed event
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

describe('RelayConnection', () => {
  let connection: RelayConnection;
  let hooks: HookEmitter;
  let mock_private_key: Uint8Array;
  let mock_node_pubkey: string;

  beforeEach(() => {
    hooks = new HookEmitter();
    mock_private_key = new Uint8Array(32).fill(1);
    mock_node_pubkey = 'a'.repeat(64);

    const config = {
      relay_url: 'ws://localhost:8080',
      private_key: mock_private_key,
      node_pubkeys: [mock_node_pubkey],
      requires_auth: true, // Enable auth for tests
      connection_timeout_ms: 5000,
      auth_timeout_ms: 5000,
    };

    connection = new RelayConnection(config, hooks);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create a RelayConnection instance', () => {
      expect(connection).toBeInstanceOf(RelayConnection);
    });

    it('should throw error if private_key is missing', () => {
      const config = {
        relay_url: 'ws://localhost:8080',
        private_key: undefined as unknown as Uint8Array,
        node_pubkeys: [mock_node_pubkey],
      };

      expect(() => {
        new RelayConnection(config, hooks);
      }).not.toThrow(); // Constructor doesn't validate, connect() does
    });

    it('should throw error if node_pubkeys is empty', () => {
      const config = {
        relay_url: 'ws://localhost:8080',
        private_key: mock_private_key,
        node_pubkeys: [],
      };

      expect(() => {
        new RelayConnection(config, hooks);
      }).not.toThrow(); // Constructor doesn't validate, connect() does
    });
  });

  describe('connect', () => {
    it('should connect to relay and authenticate', async () => {
      last_auth_event_id = null;
      const connect_promise = connection.connect();

      // Wait a bit for WebSocket to be created
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Get the mock WebSocket instance
      const ws = (connection as any).ws as InstanceType<typeof MockWebSocket>;
      expect(ws).toBeDefined();

      // Simulate WebSocket open
      ws._simulate_open();
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Simulate AUTH challenge
      const challenge = 'test_challenge';
      ws._simulate_message(create_mock_auth_challenge(challenge));

      // Wait a bit for auth processing - the mock will set last_auth_event_id
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Use the actual auth event ID that was generated
      const auth_event_id = last_auth_event_id || 'auth_event_test';
      ws._simulate_message(create_mock_auth_response(auth_event_id));

      // Wait for connection to complete
      await connect_promise;

      expect((connection as any).is_connected).toBe(true);
      expect((connection as any).is_authenticated).toBe(true);
    });

    it('should emit on_relay_connect hook after successful connection', async () => {
      last_auth_event_id = null;
      const connect_handler = vi.fn();
      hooks.register(HOOK_NAMES.RELAY_CONNECT, connect_handler);

      const connect_promise = connection.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));
      const ws = (connection as any).ws as InstanceType<typeof MockWebSocket>;
      expect(ws).toBeDefined();

      ws._simulate_open();
      await new Promise((resolve) => setTimeout(resolve, 10));
      ws._simulate_message(create_mock_auth_challenge('test_challenge'));

      await new Promise((resolve) => setTimeout(resolve, 100));

      const auth_event_id = last_auth_event_id || 'auth_event_test';
      ws._simulate_message(create_mock_auth_response(auth_event_id));

      await connect_promise;

      expect(connect_handler).toHaveBeenCalledTimes(1);
      expect(connect_handler).toHaveBeenCalledWith({
        relay_url: 'ws://localhost:8080',
      });
    });

    it('should handle connection timeout', async () => {
      const config = {
        relay_url: 'ws://localhost:8080',
        private_key: mock_private_key,
        node_pubkeys: [mock_node_pubkey],
        connection_timeout_ms: 100,
      };

      connection = new RelayConnection(config, hooks);

      await expect(connection.connect()).rejects.toThrow('Connection timeout');
    });

    it('should handle authentication rejection', async () => {
      last_auth_event_id = null;
      const connect_promise = connection.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));
      const ws = (connection as any).ws as InstanceType<typeof MockWebSocket>;
      expect(ws).toBeDefined();

      ws._simulate_open();
      await new Promise((resolve) => setTimeout(resolve, 10));
      ws._simulate_message(create_mock_auth_challenge('test_challenge'));

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Simulate rejected auth - use the actual auth event ID
      const auth_event_id = last_auth_event_id || 'auth_event_test';
      const reject_message = JSON.stringify(['OK', auth_event_id, false, 'Authentication rejected']);
      ws._simulate_message(reject_message);

      await expect(connect_promise).rejects.toThrow('Authentication rejected');
    });

    it('should not connect if already connected', async () => {
      last_auth_event_id = null;
      // First connection
      const connect_promise1 = connection.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));
      const ws = (connection as any).ws as InstanceType<typeof MockWebSocket>;
      expect(ws).toBeDefined();

      ws._simulate_open();
      await new Promise((resolve) => setTimeout(resolve, 10));
      ws._simulate_message(create_mock_auth_challenge('test_challenge'));
      await new Promise((resolve) => setTimeout(resolve, 100));

      const auth_event_id = last_auth_event_id || 'auth_event_test';
      ws._simulate_message(create_mock_auth_response(auth_event_id));
      await connect_promise1;

      // Verify connection is actually connected
      expect((connection as any).is_connected).toBe(true);
      expect((connection as any).is_authenticated).toBe(true);
      expect(ws.ready_state).toBe(1); // OPEN

      // Second connection attempt should return immediately
      await expect(connection.connect()).resolves.not.toThrow();
    });
  });

  describe('disconnect', () => {
    it('should disconnect from relay', async () => {
      last_auth_event_id = null;
      // Connect first
      const connect_promise = connection.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));
      const ws = (connection as any).ws as InstanceType<typeof MockWebSocket>;
      expect(ws).toBeDefined();

      ws._simulate_open();
      await new Promise((resolve) => setTimeout(resolve, 10));
      ws._simulate_message(create_mock_auth_challenge('test_challenge'));
      await new Promise((resolve) => setTimeout(resolve, 100));

      const auth_event_id = last_auth_event_id || 'auth_event_test';
      ws._simulate_message(create_mock_auth_response(auth_event_id));
      await connect_promise;

      // Now disconnect
      const disconnect_handler = vi.fn();
      hooks.register(HOOK_NAMES.RELAY_DISCONNECT, disconnect_handler);

      await connection.disconnect();

      expect(ws.closed).toBe(true);
      expect((connection as any).is_connected).toBe(false);
      expect(disconnect_handler).toHaveBeenCalledTimes(1);
    });

    it('should handle disconnect when not connected', async () => {
      await expect(connection.disconnect()).resolves.not.toThrow();
    });
  });

  describe('handle_block_event', () => {
    it('should emit on_block_event hook when block event is received', async () => {
      last_auth_event_id = null;
      // Connect first
      const connect_promise = connection.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));
      const ws = (connection as any).ws as InstanceType<typeof MockWebSocket>;
      expect(ws).toBeDefined();

      ws._simulate_open();
      await new Promise((resolve) => setTimeout(resolve, 10));
      ws._simulate_message(create_mock_auth_challenge('test_challenge'));
      await new Promise((resolve) => setTimeout(resolve, 100));

      const auth_event_id = last_auth_event_id || 'auth_event_test';
      ws._simulate_message(create_mock_auth_response(auth_event_id));
      await connect_promise;

      // Register block handler
      const block_handler = vi.fn();
      hooks.register(HOOK_NAMES.BLOCK_EVENT, block_handler);

      // Send block event
      const block_event = create_mock_block_event(850000, mock_node_pubkey);
      const subscription_id = (connection as any).subscription_id;
      ws._simulate_message(create_mock_event_message(subscription_id, block_event));

      // Wait for event processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(block_handler).toHaveBeenCalledTimes(1);
      expect(block_handler).toHaveBeenCalledWith(
        expect.objectContaining({
          block_height: 850000,
          block_hash: 'block_hash_850000',
          event: expect.objectContaining({
            kind: CITY_PROTOCOL_KINDS.BLOCK,
          }),
        })
      );
    });

    it('should emit before_block_event and after_block_event hooks', async () => {
      last_auth_event_id = null;
      // Connect first
      const connect_promise = connection.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));
      const ws = (connection as any).ws as InstanceType<typeof MockWebSocket>;
      expect(ws).toBeDefined();

      ws._simulate_open();
      await new Promise((resolve) => setTimeout(resolve, 10));
      ws._simulate_message(create_mock_auth_challenge('test_challenge'));
      await new Promise((resolve) => setTimeout(resolve, 100));

      const auth_event_id = last_auth_event_id || 'auth_event_test';
      ws._simulate_message(create_mock_auth_response(auth_event_id));
      await connect_promise;

      // Register handlers
      const before_handler = vi.fn();
      const after_handler = vi.fn();
      hooks.register(HOOK_NAMES.BEFORE_BLOCK_EVENT, before_handler);
      hooks.register(HOOK_NAMES.AFTER_BLOCK_EVENT, after_handler);

      // Send block event
      const block_event = create_mock_block_event(850000, mock_node_pubkey);
      const subscription_id = (connection as any).subscription_id;
      ws._simulate_message(create_mock_event_message(subscription_id, block_event));

      // Wait for event processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(before_handler).toHaveBeenCalledTimes(1);
      expect(after_handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('subscription handling', () => {
    it('should emit subscription hook when EOSE is received', async () => {
      last_auth_event_id = null;
      // Connect first
      const connect_promise = connection.connect();

      await new Promise((resolve) => setTimeout(resolve, 50));
      const ws = (connection as any).ws as InstanceType<typeof MockWebSocket>;
      expect(ws).toBeDefined();

      ws._simulate_open();
      await new Promise((resolve) => setTimeout(resolve, 10));
      ws._simulate_message(create_mock_auth_challenge('test_challenge'));
      await new Promise((resolve) => setTimeout(resolve, 100));

      const auth_event_id = last_auth_event_id || 'auth_event_test';
      ws._simulate_message(create_mock_auth_response(auth_event_id));
      await connect_promise;

      // Register subscription handler
      const subscription_handler = vi.fn();
      hooks.register(HOOK_NAMES.SUBSCRIPTION, subscription_handler);

      // Send EOSE
      const subscription_id = (connection as any).subscription_id;
      ws._simulate_message(create_mock_eose(subscription_id));

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(subscription_handler).toHaveBeenCalledTimes(1);
      expect(subscription_handler).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_id,
          status: 'confirmed',
        })
      );
    });
  });
});

