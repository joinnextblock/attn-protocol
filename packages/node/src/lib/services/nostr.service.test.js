import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EventEmitter } from 'events';
import { NostrService } from './nostr.service.js';

class MockWebSocket extends EventEmitter {
  static instances = [];

  constructor(url) {
    super();
    this.url = url;
    this.readyState = 0; // CONNECTING
    this.send = jest.fn();
    MockWebSocket.instances.push(this);
  }

  static reset() {
    MockWebSocket.instances = [];
  }

  simulateOpen() {
    this.readyState = 1; // OPEN
    this.emit('open');
  }

  simulateMessage(data) {
    this.emit('message', data);
  }

  simulateClose() {
    this.readyState = 3; // CLOSED
    this.emit('close');
  }

  simulateError(error) {
    this.emit('error', error);
  }

  close() {
    this.simulateClose();
  }
}

describe('NostrService', () => {
  let service;
  let originalWebSocket;

  beforeEach(() => {
    originalWebSocket = global.WebSocket;
    global.WebSocket = MockWebSocket;
    MockWebSocket.reset();
  });

  afterEach(async () => {
    global.WebSocket = originalWebSocket;
    if (service) {
      await service.disconnect();
      service = null;
    }
  });

  const openAllSockets = () => {
    for (const socket of MockWebSocket.instances) {
      socket.simulateOpen();
      socket.simulateMessage(JSON.stringify(['AUTH', 'challenge']));
    }
  };

  it('generates keys when none provided', () => {
    service = new NostrService({ relay_urls: ['ws://example.com'] });
    expect(service.private_key).toBeDefined();
    expect(service.public_key).toBeDefined();
  });

  it('throws when no relay URLs configured', async () => {
    service = new NostrService({ relay_urls: [] });
    await expect(service.connect()).rejects.toThrow('No relay URLs provided');
  });

  it('connects to relays and tracks open sockets', async () => {
    service = new NostrService({ relay_urls: ['ws://localhost:10547'] });
    const connectPromise = service.connect();
    setImmediate(openAllSockets);
    await connectPromise;
    expect(service.get_connected_count()).toBe(1);
  });

  it('disconnects all sockets cleanly', async () => {
    service = new NostrService({ relay_urls: ['ws://localhost:10547'] });
    const connectPromise = service.connect();
    setImmediate(openAllSockets);
    await connectPromise;
    await service.disconnect();
    expect(service.relay_connections.size).toBe(0);
  });

  it('publishes events to connected relays', async () => {
    service = new NostrService({ relay_urls: ['ws://localhost:10547'] });
    const connectPromise = service.connect();
    setImmediate(openAllSockets);
    await connectPromise;

    const result = await service.publish_event('test', [['t', '1']], 38088);
    expect(result.success).toBe(1);
    expect(result.total).toBe(1);
    expect(MockWebSocket.instances[0].send).toHaveBeenCalled();
  });

  it('returns zero success when no relays are open', async () => {
    service = new NostrService({ relay_urls: ['ws://localhost:10547'], auth_timeout_ms: 0 });
    const result = await service.publish_event('test');
    expect(result.success).toBe(0);
    expect(result.total).toBe(0);
  });

  it('builds and publishes BLOCK events via the SDK', async () => {
    service = new NostrService({ relay_urls: ['ws://localhost:10547'] });
    const connectPromise = service.connect();
    setImmediate(openAllSockets);
    await connectPromise;

    const block = {
      height: 860000,
      hash: '0'.repeat(64),
      time: 1_700_000_000,
      difficulty: 55_000_000_000_000,
      tx: ['a', 'b', 'c'],
      size: 1200000,
      weight: 4000000,
      version: 2,
      merkleroot: '1'.repeat(64),
      nonce: 123
    };

    MockWebSocket.instances[0].send.mockClear();
    const result = await service.publish_block_event(block);
    expect(result.success).toBe(1);
    expect(result.failed).toBe(0);

    const payload = MockWebSocket.instances[0].send.mock.calls[0][0];
    const parsed = JSON.parse(payload);
    expect(parsed[0]).toBe('EVENT');
    const event = parsed[1];
    expect(event.kind).toBe(38088);

    // Check required tags: d, t, p, r
    const d_tag = event.tags.find(tag => tag[0] === 'd');
    expect(d_tag).toBeDefined();
    expect(d_tag[1]).toBe(`org.attnprotocol:block:${block.height}:${block.hash}`);

    const t_tag = event.tags.find(tag => tag[0] === 't');
    expect(t_tag).toBeDefined();
    expect(t_tag[1]).toBe(block.height.toString());

    const p_tag = event.tags.find(tag => tag[0] === 'p');
    expect(p_tag).toBeDefined();
    expect(p_tag[1]).toBe(service.public_key);

    // Check that r tags (relay URLs) are present
    const r_tags = event.tags.filter(tag => tag[0] === 'r');
    expect(r_tags.length).toBeGreaterThan(0);
    expect(r_tags[0][1]).toBe('ws://localhost:10547');

    const content = JSON.parse(event.content);
    expect(content.height).toBe(block.height);
    expect(content.ref_node_pubkey).toBe(service.public_key);
  });

  it('logs failures when send throws', async () => {
    service = new NostrService({ relay_urls: ['ws://localhost:10547'] });
    const connectPromise = service.connect();
    setImmediate(openAllSockets);
    await connectPromise;

    MockWebSocket.instances[0].send.mockImplementation(() => {
      throw new Error('send failed');
    });

    const result = await service.publish_event('test');
    expect(result.failed).toBe(1);
  });

  it('responds to NIP-42 auth challenges', async () => {
    service = new NostrService({ relay_urls: ['ws://localhost:10547'] });
    const connectPromise = service.connect();
    setImmediate(() => {
      for (const socket of MockWebSocket.instances) {
        socket.simulateOpen();
        socket.simulateMessage(JSON.stringify(['AUTH', 'nip42-test']));
      }
    });
    await connectPromise;
    expect(MockWebSocket.instances[0].send).toHaveBeenCalled();
    const payload = MockWebSocket.instances[0].send.mock.calls[0][0];
    expect(JSON.parse(payload)[0]).toBe('AUTH');
  });

  it('rejects when NIP-42 auth fails', async () => {
    service = new NostrService({ relay_urls: ['ws://localhost:10547'] });
    const connectPromise = service.connect();
    setImmediate(() => {
      for (const socket of MockWebSocket.instances) {
        socket.send.mockImplementationOnce(() => {
          throw new Error('auth send failed');
        });
        socket.simulateOpen();
        socket.simulateMessage(JSON.stringify(['AUTH', 'nip42-test']));
      }
    });
    await expect(connectPromise).rejects.toThrow('auth send failed');
  });

  it('marks connection ready when no auth challenge arrives', async () => {
    service = new NostrService({ relay_urls: ['ws://localhost:10547'], auth_timeout_ms: 0 });
    const connectPromise = service.connect();
    setImmediate(() => {
      for (const socket of MockWebSocket.instances) {
        socket.simulateOpen();
      }
    });
    await connectPromise;
    expect(service.get_connected_count()).toBe(1);
  });
});
