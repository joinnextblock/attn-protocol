import { describe, it, expect, vi } from 'vitest';
import { ZeroMQToNostrBridge } from './bridge.js';

const buildBuffer = () => Buffer.alloc(32, 0);

describe('ZeroMQToNostrBridge', () => {
  const blockHash = 'a'.repeat(64);
  const blockData = {
    hash: blockHash,
    height: 860000,
    time: 1_700_000_000,
    size: 1200000,
    weight: 4000000,
    tx: ['tx1', 'tx2'],
    version: 2,
    merkleroot: 'b'.repeat(64),
    nonce: 12345,
    difficulty: 55_000_000_000_000
  };

  const createBridge = () => {
    const bitcoin = {
      buffer_to_hex: vi.fn(() => blockHash),
      get_block_data: vi.fn().mockResolvedValue(blockData),
      get_best_block_hash: vi.fn().mockResolvedValue(blockHash)
    };

    const nostr = {
      publish_block_event: vi.fn().mockResolvedValue({ success: 1, total: 1 })
    };

    const bridge = new ZeroMQToNostrBridge({
      bitcoin,
      nostr,
      config: { zmq_topic: 'hashblock' },
      relay_urls: ['ws://example.com']
    });

    return { bridge, bitcoin, nostr };
  };

  it('publishes ATTN-01 block events for valid hashblock messages', async () => {
    const { bridge, bitcoin, nostr } = createBridge();
    const message = buildBuffer();

    await bridge.handle_block_message(message);

    expect(bitcoin.buffer_to_hex).toHaveBeenCalledWith(message);
    expect(bitcoin.get_block_data).toHaveBeenCalledWith(blockHash);
    expect(nostr.publish_block_event).toHaveBeenCalledTimes(1);
    expect(nostr.publish_block_event).toHaveBeenCalledWith(blockData);
  });

  it('ignores invalid message lengths', async () => {
    const { bridge, nostr } = createBridge();
    await bridge.handle_block_message(Buffer.alloc(16));
    expect(nostr.publish_block_event).not.toHaveBeenCalled();
  });

  it('wires start/stop lifecycle', async () => {
    const message = buildBuffer();
    const bitcoin = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      buffer_to_hex: vi.fn(() => blockHash),
      get_block_data: vi.fn().mockResolvedValue(blockData),
      get_best_block_hash: vi.fn().mockResolvedValue(blockHash),
      listen: vi.fn(async function* () {
        yield { topic: 'hashblock', message };
      }),
    };

    const nostr = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      publish_block_event: vi.fn().mockResolvedValue({ success: 1, total: 1 })
    };

    const bridge = new ZeroMQToNostrBridge({ bitcoin, nostr, relay_urls: ['ws://example.com'] });

    await bridge.start();
    await bridge.stop();

    expect(nostr.connect).toHaveBeenCalled();
    expect(bitcoin.connect).toHaveBeenCalled();
    expect(bitcoin.get_best_block_hash).toHaveBeenCalledTimes(1);
    expect(nostr.publish_block_event).toHaveBeenCalledTimes(2);
    expect(bitcoin.disconnect).toHaveBeenCalled();
  });

  it('publishes current best block on startup', async () => {
    const message = buildBuffer();
    const bitcoin = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      buffer_to_hex: vi.fn(() => blockHash),
      get_best_block_hash: vi.fn().mockResolvedValue(blockHash),
      get_block_data: vi.fn().mockResolvedValue(blockData),
      listen: vi.fn(async function* () {
        return;
      }),
    };

    const nostr = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      publish_block_event: vi.fn().mockResolvedValue({ success: 1, total: 1 })
    };

    const bridge = new ZeroMQToNostrBridge({ bitcoin, nostr, relay_urls: ['ws://example.com'] });

    await bridge.start();
    await bridge.stop();

    expect(bitcoin.get_best_block_hash).toHaveBeenCalledTimes(1);
    expect(nostr.publish_block_event).toHaveBeenCalledWith(blockData);
  });
});
