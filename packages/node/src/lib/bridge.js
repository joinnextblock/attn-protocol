import { logger } from './logger.js';
import { BitcoinService } from './services/bitcoin.service.js';
import { NostrService } from './services/nostr.service.js';

const DEFAULTS = {
  zmq_host: 'localhost',
  zmq_port: '29000',
  zmq_topic: 'hashblock',
  rpc_host: 'localhost',
  rpc_port: 8332,
  rpc_protocol: 'http'
};

export class ZeroMQToNostrBridge {
  constructor(overrides = {}) {
    this.config = {
      zmq_host: overrides.config?.zmq_host || process.env.NODE_SERVICE_BITCOIN_ZMQ_HOST || DEFAULTS.zmq_host,
      zmq_port: overrides.config?.zmq_port || process.env.NODE_SERVICE_BITCOIN_ZMQ_PORT || DEFAULTS.zmq_port,
      zmq_topic: overrides.config?.zmq_topic || process.env.NODE_SERVICE_BITCOIN_ZMQ_TOPIC || DEFAULTS.zmq_topic,
      rpc_host: overrides.config?.rpc_host || process.env.NODE_SERVICE_BITCOIN_RPC_HOST || DEFAULTS.rpc_host,
      rpc_port: parseInt(
        overrides.config?.rpc_port || process.env.NODE_SERVICE_BITCOIN_RPC_PORT || String(DEFAULTS.rpc_port),
        10
      ),
      rpc_user: overrides.config?.rpc_user || process.env.NODE_SERVICE_BITCOIN_RPC_USER || '',
      rpc_password: overrides.config?.rpc_password || process.env.NODE_SERVICE_BITCOIN_RPC_PASSWORD || '',
      rpc_protocol: (overrides.config?.rpc_protocol || process.env.NODE_SERVICE_BITCOIN_RPC_PROTOCOL || DEFAULTS.rpc_protocol).toLowerCase()
    };

    const relay_config = overrides.relay_config || this.parse_relay_urls();

    this.bitcoin = overrides.bitcoin || new BitcoinService({
      zmq_host: this.config.zmq_host,
      zmq_port: this.config.zmq_port,
      zmq_topic: this.config.zmq_topic,
      rpc_host: this.config.rpc_host,
      rpc_port: this.config.rpc_port,
      rpc_user: this.config.rpc_user,
      rpc_password: this.config.rpc_password,
      rpc_protocol: this.config.rpc_protocol
    });

    this.nostr = overrides.nostr || new NostrService({
      auth_relay_urls: relay_config.auth_relay_urls,
      noauth_relay_urls: relay_config.noauth_relay_urls,
      private_key: overrides.private_key || process.env.NODE_SERVICE_NOSTR_PRIVATE_KEY
    });

    this.running = false;
  }

  parse_relay_urls() {
    const auth_urls_env = process.env.NODE_SERVICE_NOSTR_RELAY_URLS_AUTH;
    const noauth_urls_env = process.env.NODE_SERVICE_NOSTR_RELAY_URLS_NOAUTH;

    const auth_relay_urls = auth_urls_env
      ? auth_urls_env.split(',').map(url => url.trim()).filter(Boolean)
      : [];

    const noauth_relay_urls = noauth_urls_env
      ? noauth_urls_env.split(',').map(url => url.trim()).filter(Boolean)
      : [];

    // If no relays configured, default to localhost noauth relay
    if (auth_relay_urls.length === 0 && noauth_relay_urls.length === 0) {
      return {
        auth_relay_urls: [],
        noauth_relay_urls: ['ws://localhost:10547']
      };
    }

    return { auth_relay_urls, noauth_relay_urls };
  }

  async start() {
    logger.info('Starting ZeroMQ → Nostr bridge');

    try {
      // Connect to Nostr relays (with automatic reconnection)
      // This won't throw if no relays connect initially - they'll reconnect in background
      await this.nostr.connect();

      const connected_count = this.nostr.get_connected_count();
      if (connected_count === 0) {
        logger.warn('No Nostr relays connected initially, but reconnection attempts are in progress');
      } else {
        logger.info({ connectedRelays: connected_count }, 'Connected to Nostr relays');
      }

      // Publish startup snapshot (will only publish if relays are connected)
      await this.publish_current_block_snapshot();

      // Connect to Bitcoin ZMQ
      await this.bitcoin.connect();

      this.running = true;

      // Start listening for blocks
      await this.listen_for_blocks();
    } catch (error) {
      logger.error({ err: error }, 'Failed to start bridge');
      throw error;
    }
  }

  async listen_for_blocks() {
    for await (const { topic, message } of this.bitcoin.listen()) {
      if (!this.running) {
        break;
      }

      if (topic !== this.config.zmq_topic) {
        continue;
      }

      try {
        await this.handle_block_message(message);
      } catch (error) {
        logger.error({ err: error }, 'Failed to process block');
      }
    }
  }

  async handle_block_message(message) {
    if (!message || message.length !== 32) {
      logger.warn({ length: message?.length }, 'Unexpected hashblock payload length');
      return;
    }

    const block_hash = this.bitcoin.buffer_to_hex(message);
    logger.info({ blockHash: block_hash.substring(0, 16) }, 'New block hash received');
    await this.publish_block_from_hash(block_hash, 'zmq');
  }

  async publish_block_from_hash(block_hash, source = 'unknown') {
    const block = await this.bitcoin.get_block_data(block_hash);
    if (!block || typeof block.height !== 'number') {
      logger.error({ blockHash: block_hash }, 'Invalid block data received from RPC');
      return;
    }

    const result = await this.nostr.publish_block_event(block);
    logger.info({
      blockHeight: block.height,
      source,
      publishedTo: result.success,
      totalRelays: result.total
    }, 'Published ATTN-01 block event');
  }

  async publish_current_block_snapshot() {
    try {
      const block_hash = await this.bitcoin.get_best_block_hash();
      if (!block_hash || typeof block_hash !== 'string') {
        logger.warn('Unable to fetch best block hash on startup');
        return;
      }
      logger.info({
        blockHash: block_hash.substring(0, 16)
      }, 'Publishing startup block snapshot');
      await this.publish_block_from_hash(block_hash, 'startup');
    } catch (error) {
      logger.error({ err: error }, 'Failed to publish startup block snapshot');
    }
  }

  async stop() {
    logger.info('Stopping bridge');
    this.running = false;
    await this.bitcoin.disconnect();
    await this.nostr.disconnect();
  }

  /**
   * Get health statistics
   */
  get_health_stats() {
    return {
      running: this.running,
      nostr: this.nostr.get_connection_stats(),
      connectedRelays: this.nostr.get_connected_count(),
      relayClassification: this.nostr.get_relay_classification()
    };
  }

  /**
   * Get relay classification (auth vs noauth)
   */
  get_relay_classification() {
    return this.nostr.get_relay_classification();
  }
}
