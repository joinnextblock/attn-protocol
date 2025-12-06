import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { publish_to_relay, publish_to_multiple } from './publisher.js';
import type { Event } from 'nostr-tools';
import { create_mock_auth_challenge, create_mock_auth_response, create_mock_event_response } from '../test/fixtures/events.js';

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
    // Store instance for test access
    if (!(globalThis as any).__mock_ws_instances) {
      (globalThis as any).__mock_ws_instances = [];
    }
    (globalThis as any).__mock_ws_instances.push(this);
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
    this._emit('close', code, reason);
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

// Mock ws module
vi.mock('ws', () => {
  return {
    default: MockWebSocket,
  };
});

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
        id: 'auth_event_id',
        sig: 'mock_sig',
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

describe('publish_to_relay', () => {
  let private_key: Uint8Array;
  let mock_event: Event;

  beforeEach(() => {
    private_key = new Uint8Array(32).fill(1);
    mock_event = {
      id: 'event_id_123',
      pubkey: 'a'.repeat(64),
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [],
      content: 'test content',
      sig: 'sig',
    };
    // Clear mock WebSocket instances
    (globalThis as any).__mock_ws_instances = [];
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should publish event successfully after authentication', async () => {
    // Clear instances before test
    (globalThis as any).__mock_ws_instances = [];

    const publish_promise = publish_to_relay('ws://localhost:8080', mock_event, private_key, 5000, 5000);

    // Wait for WebSocket to be created
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Get the mock WebSocket instance
    const ws_instances = (globalThis as any).__mock_ws_instances || [];
    const ws = ws_instances[ws_instances.length - 1] as InstanceType<typeof MockWebSocket>;

    expect(ws).toBeDefined();

    ws._simulate_open();
    await new Promise((resolve) => setTimeout(resolve, 10));
    ws._simulate_message(create_mock_auth_challenge('test_challenge'));
    await new Promise((resolve) => setTimeout(resolve, 50));
    ws._simulate_message(create_mock_auth_response('auth_event_id'));
    await new Promise((resolve) => setTimeout(resolve, 50));
    ws._simulate_message(create_mock_event_response('event_id_123', true, ''));

    const result = await publish_promise;

    expect(result.success).toBe(true);
    expect(result.event_id).toBe('event_id_123');
    expect(result.relay_url).toBe('ws://localhost:8080');
  });

  it('should handle authentication rejection', async () => {
    (globalThis as any).__mock_ws_instances = [];

    const publish_promise = publish_to_relay('ws://localhost:8080', mock_event, private_key, 5000, 5000);

    await new Promise((resolve) => setTimeout(resolve, 50));
    const ws_instances = (globalThis as any).__mock_ws_instances || [];
    const ws = ws_instances[ws_instances.length - 1] as InstanceType<typeof MockWebSocket>;

    expect(ws).toBeDefined();

    ws._simulate_open();
    await new Promise((resolve) => setTimeout(resolve, 10));
    ws._simulate_message(create_mock_auth_challenge('test_challenge'));
    await new Promise((resolve) => setTimeout(resolve, 50));
    const reject_message = JSON.stringify(['OK', 'auth_event_id', false, 'Authentication rejected']);
    ws._simulate_message(reject_message);

    const result = await publish_promise;

    expect(result.success).toBe(false);
    expect(result.error).toContain('Authentication rejected');
  });

  it('should handle timeout waiting for AUTH challenge', async () => {
    (globalThis as any).__mock_ws_instances = [];

    const publish_promise = publish_to_relay('ws://localhost:8080', mock_event, private_key, 5000, 100);

    await new Promise((resolve) => setTimeout(resolve, 50));
    const ws_instances = (globalThis as any).__mock_ws_instances || [];
    const ws = ws_instances[ws_instances.length - 1] as InstanceType<typeof MockWebSocket>;

    expect(ws).toBeDefined();

    ws._simulate_open();
    // Don't send AUTH challenge, let it timeout
    await new Promise((resolve) => setTimeout(resolve, 200));

    const result = await publish_promise;

    expect(result.success).toBe(false);
    expect(result.error).toContain('AUTH challenge');
  }, 20000);

  it('should handle timeout waiting for publish response', async () => {
    (globalThis as any).__mock_ws_instances = [];

    const publish_promise = publish_to_relay('ws://localhost:8080', mock_event, private_key, 100, 5000);

    await new Promise((resolve) => setTimeout(resolve, 50));
    const ws_instances = (globalThis as any).__mock_ws_instances || [];
    const ws = ws_instances[ws_instances.length - 1] as InstanceType<typeof MockWebSocket>;

    expect(ws).toBeDefined();

    ws._simulate_open();
    await new Promise((resolve) => setTimeout(resolve, 10));
    ws._simulate_message(create_mock_auth_challenge('test_challenge'));
    await new Promise((resolve) => setTimeout(resolve, 50));
    ws._simulate_message(create_mock_auth_response('auth_event_id'));
    await new Promise((resolve) => setTimeout(resolve, 50));
    // Don't send OK response, let it timeout
    await new Promise((resolve) => setTimeout(resolve, 200));

    const result = await publish_promise;

    expect(result.success).toBe(false);
    expect(result.error).toContain('Timeout');
  }, 20000);

  it('should handle WebSocket error', async () => {
    (globalThis as any).__mock_ws_instances = [];

    const publish_promise = publish_to_relay('ws://localhost:8080', mock_event, private_key, 5000, 5000);

    await new Promise((resolve) => setTimeout(resolve, 50));
    const ws_instances = (globalThis as any).__mock_ws_instances || [];
    const ws = ws_instances[ws_instances.length - 1] as InstanceType<typeof MockWebSocket>;

    expect(ws).toBeDefined();

    ws._simulate_error(new Error('Connection failed'));

    const result = await publish_promise;

    expect(result.success).toBe(false);
    expect(result.error).toContain('Connection failed');
  });

  it('should handle connection close before authentication', async () => {
    (globalThis as any).__mock_ws_instances = [];

    const publish_promise = publish_to_relay('ws://localhost:8080', mock_event, private_key, 5000, 5000);

    await new Promise((resolve) => setTimeout(resolve, 50));
    const ws_instances = (globalThis as any).__mock_ws_instances || [];
    const ws = ws_instances[ws_instances.length - 1] as InstanceType<typeof MockWebSocket>;

    expect(ws).toBeDefined();

    ws._simulate_open();
    await new Promise((resolve) => setTimeout(resolve, 10));
    ws._simulate_close(1000, 'Connection closed');

    const result = await publish_promise;

    expect(result.success).toBe(false);
    expect(result.error).toContain('Connection closed');
  });
});

describe('publish_to_multiple', () => {
  let private_key: Uint8Array;
  let mock_event: Event;

  beforeEach(() => {
    private_key = new Uint8Array(32).fill(1);
    mock_event = {
      id: 'event_id_123',
      pubkey: 'a'.repeat(64),
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags: [],
      content: 'test content',
      sig: 'sig',
    };
    // Clear mock WebSocket instances
    (globalThis as any).__mock_ws_instances = [];
    vi.clearAllMocks();
  });

  it('should publish to multiple relays', async () => {
    (globalThis as any).__mock_ws_instances = [];

    const relay_urls = ['ws://relay1.example.com', 'ws://relay2.example.com', 'ws://relay3.example.com'];

    const publish_promise = publish_to_multiple(relay_urls, mock_event, private_key, 5000, 5000);

    // Wait for WebSockets to be created
    await new Promise((resolve) => setTimeout(resolve, 100));

    const ws_instances = (globalThis as any).__mock_ws_instances || [];
    const ws_list = ws_instances.slice(-3) as InstanceType<typeof MockWebSocket>[];

    expect(ws_list.length).toBeGreaterThanOrEqual(3);

    // Simulate successful publishing for all relays
    for (const ws of ws_list) {
      ws._simulate_open();
      await new Promise((resolve) => setTimeout(resolve, 10));
      ws._simulate_message(create_mock_auth_challenge('test_challenge'));
      await new Promise((resolve) => setTimeout(resolve, 50));
      ws._simulate_message(create_mock_auth_response('auth_event_id'));
      await new Promise((resolve) => setTimeout(resolve, 50));
      ws._simulate_message(create_mock_event_response('event_id_123', true, ''));
    }

    const result = await publish_promise;

    expect(result.event_id).toBe('event_id_123');
    expect(result.results).toHaveLength(3);
    expect(result.success_count).toBe(3);
    expect(result.failure_count).toBe(0);
  });

  it('should handle partial failures', async () => {
    (globalThis as any).__mock_ws_instances = [];

    const relay_urls = ['ws://relay1.example.com', 'ws://relay2.example.com'];

    const publish_promise = publish_to_multiple(relay_urls, mock_event, private_key, 5000, 5000);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const ws_instances = (globalThis as any).__mock_ws_instances || [];
    const ws_list = ws_instances.slice(-2) as InstanceType<typeof MockWebSocket>[];

    expect(ws_list.length).toBeGreaterThanOrEqual(2);

    // First relay succeeds
    const ws1 = ws_list[0]!;
    const ws2 = ws_list[1]!;
    expect(ws1).toBeDefined();
    expect(ws2).toBeDefined();

    ws1._simulate_open();
    await new Promise((resolve) => setTimeout(resolve, 10));
    ws1._simulate_message(create_mock_auth_challenge('test_challenge'));
    await new Promise((resolve) => setTimeout(resolve, 50));
    ws1._simulate_message(create_mock_auth_response('auth_event_id'));
    await new Promise((resolve) => setTimeout(resolve, 50));
    ws1._simulate_message(create_mock_event_response('event_id_123', true, ''));

    // Second relay fails
    ws2._simulate_error(new Error('Connection failed'));

    const result = await publish_promise;

    expect(result.success_count).toBe(1);
    expect(result.failure_count).toBe(1);
    expect(result.results[0]?.success).toBe(true);
    expect(result.results[1]?.success).toBe(false);
  });
});

