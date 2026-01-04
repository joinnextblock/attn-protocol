import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { publish_to_relay, publish_to_multiple } from './publisher.js';
import type { Event } from 'nostr-tools';
import { create_mock_auth_challenge, create_mock_auth_response, create_mock_event_response } from '../test/fixtures/events.js';

// Import shared MockWebSocket from core package
import { create_mock_websocket } from '@attn/ts-core/src/test/mocks/websocket.mock.js';

// Define MockWebSocket using vi.hoisted to ensure it's available for mocks
const { MockWebSocket } = vi.hoisted(() => create_mock_websocket());

// Mock isomorphic-ws module (cross-platform WebSocket)
vi.mock('isomorphic-ws', () => {
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

    // Pass requires_auth = true to enable NIP-42 authentication flow
    const publish_promise = publish_to_relay('ws://localhost:8080', mock_event, private_key, 5000, 5000, true);

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

  it('should handle timeout waiting for AUTH challenge by publishing anyway', async () => {
    // When requires_auth is true but no AUTH challenge is received,
    // the publisher proceeds with publishing after the auth_timeout_ms
    (globalThis as any).__mock_ws_instances = [];

    // Pass requires_auth = true with short auth timeout
    const publish_promise = publish_to_relay('ws://localhost:8080', mock_event, private_key, 5000, 100, true);

    await new Promise((resolve) => setTimeout(resolve, 50));
    const ws_instances = (globalThis as any).__mock_ws_instances || [];
    const ws = ws_instances[ws_instances.length - 1] as InstanceType<typeof MockWebSocket>;

    expect(ws).toBeDefined();

    ws._simulate_open();
    // Don't send AUTH challenge, let auth timeout expire
    // After auth timeout, publisher should proceed to send event
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Now send the OK response for the event
    ws._simulate_message(create_mock_event_response('event_id_123', true, ''));

    const result = await publish_promise;

    // Publisher should succeed because it proceeds after auth timeout
    expect(result.success).toBe(true);
    expect(result.event_id).toBe('event_id_123');
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

