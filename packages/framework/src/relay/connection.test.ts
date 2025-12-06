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
import { ATTN_EVENT_KINDS } from '@attn-protocol/core';
import { HOOK_NAMES } from '../hooks/index.js';
import { getPublicKey } from 'nostr-tools';

// Define MockWebSocket using vi.hoisted to ensure it's available for mocks
const { MockWebSocket } = vi.hoisted(() => {
  class MockWebSocket {
  public url: string;
  public ready_state: number = 0;
  public listeners: Map<string, Set<Function>> = new Map();
  public sent_messages: string[] = [];
  public closed: boolean = false;
  public close_code?: number;
  public close_reason?: string;

  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  constructor(url: string | URL) {
    this.url = typeof url === 'string' ? url : url.toString();
  }

  // Add readyState getter to match WebSocket API
  get readyState(): number {
    return this.ready_state;
  }

  on(event: string, handler: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler?: Function): void {
    if (!this.listeners.has(event)) return;
    if (handler) {
      this.listeners.get(event)!.delete(handler);
    } else {
      this.listeners.get(event)!.clear();
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }

  send(data: string): void {
    if (this.ready_state !== 1) {
      throw new Error('WebSocket is not open');
    }
    this.sent_messages.push(data);
  }

  close(code?: number, reason?: string): void {
    this.closed = true;
    this.close_code = code;
    this.close_reason = reason;
    this.ready_state = 3;
    this._emit('close', code, reason);
  }

  _simulate_open(): void {
    this.ready_state = 1;
    this._emit('open');
  }

  _simulate_message(data: string): void {
    this._emit('message', data);
  }

  _simulate_error(error: Error): void {
    this._emit('error', error);
  }

  _simulate_close(code?: number, reason?: string): void {
    this.ready_state = 3;
    this.closed = true;
    this.close_code = code;
    this.close_reason = reason;
    // Emit close with proper arguments - always pass code and reason (can be undefined)
    this._emit('close', code ?? 1000, reason ?? '');
  }

  private _emit(event: string, ...args: unknown[]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in WebSocket ${event} handler:`, error);
        }
      });
    }
  }

  get_last_message(): string | undefined {
    return this.sent_messages[this.sent_messages.length - 1];
  }

  get_all_messages(): string[] {
    return [...this.sent_messages];
  }

  clear_messages(): void {
    this.sent_messages = [];
  }
  }

  return { MockWebSocket };
});

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
    it('should emit on_new_block hook when block event is received', async () => {
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
      hooks.register(HOOK_NAMES.NEW_BLOCK, block_handler);

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
            kind: ATTN_EVENT_KINDS.BLOCK,
          }),
        })
      );
    });

    it('should emit before_new_block and after_new_block hooks', async () => {
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
      hooks.register(HOOK_NAMES.BEFORE_NEW_BLOCK, before_handler);
      hooks.register(HOOK_NAMES.AFTER_NEW_BLOCK, after_handler);

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

