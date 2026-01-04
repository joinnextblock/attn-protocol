import WebSocket from 'ws';
import * as nostr_tools from 'nostr-tools';
import { create_block_event } from '@attn/ts-sdk';
import { EventEmitter } from 'events';
import { logger } from '../logger.js';
import { ConnectionManager } from '../connection-manager.js';

export class NostrService extends EventEmitter {
  constructor(config) {
    super();
    // Store auth and noauth relay URLs separately
    this.auth_relay_urls = config.auth_relay_urls || [];
    this.noauth_relay_urls = config.noauth_relay_urls || [];
    // Combined list for backwards compatibility
    this.relay_urls = [...this.auth_relay_urls, ...this.noauth_relay_urls];

    // Track relay classification: url -> 'auth' | 'noauth'
    this.relay_classification = new Map();
    for (const url of this.auth_relay_urls) {
      this.relay_classification.set(url, 'auth');
    }
    for (const url of this.noauth_relay_urls) {
      this.relay_classification.set(url, 'noauth');
    }

    this.private_key = this.normalize_private_key(config.private_key);
    this.public_key = this.normalize_public_key(nostr_tools.getPublicKey(this.private_key));
    this.relay_connections = new Map();
    this.auth_timeout_ms = typeof config.auth_timeout_ms === 'number'
      ? config.auth_timeout_ms
      : 5000;

    // Add connection manager for reconnection logic
    this.connection_manager = new ConnectionManager({
      initial_delay_ms: parseInt(process.env.NODE_SERVICE_RECONNECT_INITIAL_DELAY_MS || '1000', 10),
      max_delay_ms: parseInt(process.env.NODE_SERVICE_RECONNECT_MAX_DELAY_MS || '60000', 10),
      max_attempts: parseInt(process.env.NODE_SERVICE_RECONNECT_MAX_ATTEMPTS || '10', 10),
      backoff_multiplier: parseFloat(process.env.NODE_SERVICE_RECONNECT_BACKOFF_MULTIPLIER || '2', 10)
    });

    // Track reconnection handlers per relay
    this.reconnect_handlers = new Map();

    try {
      const npub = nostr_tools.nip19.npubEncode(this.public_key);
      logger.info({ npub, hex: this.public_key }, 'Nostr public key (npub and hex)');
      logger.info({
        authRelays: this.auth_relay_urls.length,
        noauthRelays: this.noauth_relay_urls.length
      }, 'Relay classification configured');
    } catch (error) {
      logger.error({ err: error }, 'Unable to encode public key');
    }
  }

  normalize_private_key(input_key) {
    if (!input_key) {
      return nostr_tools.generateSecretKey();
    }

    if (input_key instanceof Uint8Array) {
      return input_key;
    }

    if (typeof input_key === 'string') {
      if (input_key.startsWith('nsec')) {
        try {
          const decoded = nostr_tools.nip19.decode(input_key);
          return decoded.data;
        } catch (error) {
          logger.error({ err: error }, 'Error decoding nsec private key, generating random key');
          return nostr_tools.generateSecretKey();
        }
      }

      const hex_pattern = /^[0-9a-fA-F]{64}$/;
      if (hex_pattern.test(input_key)) {
        return nostr_tools.utils.hexToBytes(input_key);
      }

      logger.error({ key: input_key }, 'Invalid hex private key format, generating random key');
      return nostr_tools.generateSecretKey();
    }

    logger.error({ type: typeof input_key }, 'Unsupported private key type, generating random key');
    return nostr_tools.generateSecretKey();
  }

  normalize_public_key(pubkey) {
    if (pubkey instanceof Uint8Array) {
      return nostr_tools.utils.bytesToHex(pubkey);
    }
    if (typeof pubkey === 'string' && pubkey.startsWith('npub')) {
      const decoded = nostr_tools.nip19.decode(pubkey);
      return nostr_tools.utils.bytesToHex(decoded.data);
    }
    return pubkey;
  }

  async connect() {
    if (this.relay_urls.length === 0) {
      throw new Error('No relay URLs provided');
    }

    logger.info({ relayUrls: this.relay_urls }, 'Attempting relay connections');
    await this.disconnect();

    // Connect to each relay with individual reconnection tracking
    const connect_promises = this.relay_urls.map(url =>
      this.connect_with_reconnect(url)
    );

    const results = await Promise.allSettled(connect_promises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failures = results.filter(r => r.status === 'rejected');

    // Allow bridge to start even if some relays fail (they'll reconnect in background)
    if (successful === 0) {
      logger.warn({
        total: this.relay_urls.length,
        failures: failures.map(f => f.reason?.message || String(f.reason))
      }, 'No relays connected initially, but will continue attempting reconnection in background');

      // Don't throw - let the service start and reconnect in background
      // The bridge can still function and will publish once relays come online
    } else {
      logger.info({ successful, total: this.relay_urls.length }, 'Connected to Nostr relays');
    }
  }

  /**
   * Connect to a single relay with automatic reconnection
   */
  async connect_with_reconnect(relay_url) {
    try {
      await this.open_connection(relay_url);
      this.connection_manager.record_success(relay_url);

      // Setup reconnection handler for this relay
      this.setup_relay_reconnection(relay_url);

      return relay_url;
    } catch (error) {
      this.connection_manager.record_failure(relay_url);

      // Schedule automatic reconnection in background (don't block)
      this.connection_manager.schedule_reconnect(
        relay_url,
        () => this.connect_with_reconnect(relay_url)
      ).catch(reconnect_error => {
        logger.error({
          err: reconnect_error,
          relayUrl: relay_url
        }, 'Error scheduling reconnection');
      });

      throw error;
    }
  }

  /**
   * Setup reconnection monitoring for a relay connection
   */
  setup_relay_reconnection(relay_url) {
    const socket = this.relay_connections.get(relay_url);
    if (!socket) return;

    // Remove existing handler if any
    if (this.reconnect_handlers.has(relay_url)) {
      const handler = this.reconnect_handlers.get(relay_url);
      if (typeof socket.off === 'function') {
        socket.off('close', handler);
        socket.off('error', handler);
      } else {
        socket.onclose = null;
        socket.onerror = null;
      }
    }

    // Create new reconnection handler
    const reconnect_handler = async () => {
      if (socket.readyState === WebSocket.OPEN) {
        return; // Still connected
      }

      logger.warn({ relayUrl: relay_url }, 'Relay connection lost, attempting reconnection');
      this.relay_connections.delete(relay_url);

      // Schedule reconnection
      this.connection_manager.schedule_reconnect(
        relay_url,
        () => this.connect_with_reconnect(relay_url)
      ).catch(reconnect_error => {
        logger.error({
          err: reconnect_error,
          relayUrl: relay_url
        }, 'Error scheduling reconnection after disconnect');
      });
    };

    this.reconnect_handlers.set(relay_url, reconnect_handler);

    // Attach handlers
    if (typeof socket.on === 'function') {
      socket.on('close', reconnect_handler);
      socket.on('error', reconnect_handler);
    } else {
      socket.onclose = reconnect_handler;
      socket.onerror = reconnect_handler;
    }
  }

  open_connection(relay_url) {
    return new Promise((resolve, reject) => {
      logger.info({ relayUrl: relay_url }, 'Connecting to relay');
      const WebSocketImpl = (typeof globalThis !== 'undefined' && globalThis.WebSocket)
        ? globalThis.WebSocket
        : WebSocket;
      const socket = new WebSocketImpl(relay_url);
      let settled = false;
      let auth_timer = null;

      const cleanup = () => {
        if (typeof socket.off === 'function') {
          socket.off('message', on_message);
          socket.off('error', on_error);
          socket.off('close', on_close);
          socket.off('open', on_open);
        } else {
          socket.onmessage = null;
          socket.onerror = null;
          socket.onclose = null;
          socket.onopen = null;
        }
        if (auth_timer) {
          clearTimeout(auth_timer);
          auth_timer = null;
        }
      };

      const finalize_success = () => {
        if (settled) return;
        settled = true;
        this.relay_connections.set(relay_url, socket);
        logger.info({ relayUrl: relay_url }, 'Relay connection established');
        resolve(relay_url);
      };

      const finalize_failure = (error) => {
        if (settled) return;
        settled = true;
        cleanup();
        try {
          socket.close();
        } catch (close_error) {
          logger.warn({ err: close_error, relayUrl: relay_url }, 'Error closing failed relay socket');
        }
        reject(error);
      };

      const on_message = async (raw_message) => {
        let payload;
        try {
          payload = JSON.parse(raw_message.toString());
        } catch (_error) {
          logger.warn({ relayUrl: relay_url }, 'Ignoring non-JSON relay message');
          return;
        }

        if (!Array.isArray(payload) || payload.length === 0) {
          return;
        }

        const [type, ...rest] = payload;

        if (type === 'AUTH') {
          const challenge = rest[0];
          try {
            await this.respond_to_auth(relay_url, socket, challenge);
            cleanup();
            finalize_success();
          } catch (error) {
            logger.error({ err: error, relayUrl: relay_url }, 'Failed NIP-42 auth');
            finalize_failure(error);
          }
        }
      };

      const on_error = (error) => {
        // Extract meaningful error message from ErrorEvent
        let error_message = 'Unknown connection error';
        if (error instanceof Error) {
          error_message = error.message;
        } else if (error?.error instanceof Error) {
          error_message = error.error.message;
        } else if (error?.message) {
          error_message = error.message;
        } else if (typeof error === 'string') {
          error_message = error;
        }

        const error_obj = error instanceof Error
          ? error
          : (error?.error instanceof Error
            ? error.error
            : new Error(error_message));

        logger.error({
          err: error_obj,
          relayUrl: relay_url,
          errorMessage: error_message
        }, 'Relay connection error');
        finalize_failure(error_obj);
      };

      const on_close = () => {
        logger.info({ relayUrl: relay_url }, 'Relay connection closed');
        this.relay_connections.delete(relay_url);
        cleanup();
        if (!settled) {
          finalize_failure(new Error('Relay closed before authentication completed'));
        }
      };

      const on_open = () => {
        auth_timer = setTimeout(() => {
          logger.info({ relayUrl: relay_url }, 'No NIP-42 challenge received, assuming auth optional');
          cleanup();
          finalize_success();
        }, this.auth_timeout_ms);
      };

      if (typeof socket.on === 'function') {
        socket.on('message', on_message);
        socket.on('error', on_error);
        socket.on('close', on_close);
        socket.on('open', on_open);
      } else {
        socket.onmessage = on_message;
        socket.onerror = on_error;
        socket.onclose = on_close;
        socket.onopen = on_open;
      }
    });
  }

  async disconnect() {
    // Cleanup reconnection handlers
    for (const [url, handler] of this.reconnect_handlers) {
      const socket = this.relay_connections.get(url);
      if (socket) {
        if (typeof socket.off === 'function') {
          socket.off('close', handler);
          socket.off('error', handler);
        } else {
          socket.onclose = null;
          socket.onerror = null;
        }
      }
    }
    this.reconnect_handlers.clear();

    const close_promises = [];
    for (const [url, socket] of this.relay_connections) {
      close_promises.push(new Promise(resolve => {
        socket.once('close', resolve);
        try {
          socket.close();
        } catch (error) {
          logger.error({ err: error, relayUrl: url }, 'Error closing relay connection');
          resolve();
        }
      }));
    }

    await Promise.all(close_promises);
    this.relay_connections.clear();

    // Cleanup connection manager
    this.connection_manager.cleanup();
  }

  get_connected_count() {
    return Array.from(this.relay_connections.values())
      .filter(socket => socket.readyState === WebSocket.OPEN)
      .length;
  }

  /**
   * Get connection statistics
   */
  get_connection_stats() {
    return this.connection_manager.get_stats();
  }

  /**
   * Get relay classification (auth vs noauth)
   * @returns {Object} Object with relay URLs as keys and 'auth' | 'noauth' as values
   */
  get_relay_classification() {
    return Object.fromEntries(this.relay_classification);
  }

  /**
   * Check if a relay requires authentication
   * @param {string} relay_url - The relay URL to check
   * @returns {boolean} True if the relay requires auth
   */
  is_auth_relay(relay_url) {
    return this.relay_classification.get(relay_url) === 'auth';
  }

  /**
   * Get connected auth relays
   * @returns {string[]} Array of connected auth relay URLs
   */
  get_connected_auth_relays() {
    return Array.from(this.relay_connections.entries())
      .filter(([url, socket]) =>
        socket.readyState === WebSocket.OPEN && this.is_auth_relay(url)
      )
      .map(([url]) => url);
  }

  /**
   * Get connected noauth relays
   * @returns {string[]} Array of connected noauth relay URLs
   */
  get_connected_noauth_relays() {
    return Array.from(this.relay_connections.entries())
      .filter(([url, socket]) =>
        socket.readyState === WebSocket.OPEN && !this.is_auth_relay(url)
      )
      .map(([url]) => url);
  }

  async publish_event(content, tags = [], kind = 38088) {
    const event_template = {
      kind,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content,
      pubkey: this.public_key
    };

    const signed_event = nostr_tools.finalizeEvent(event_template, this.private_key);
    return this.publish_signed_event(signed_event);
  }

  create_block_event(block) {
    const merkle_root = block.merkleroot || block.merkle_root || null;
    const tx_count = Array.isArray(block.tx)
      ? block.tx.length
      : (typeof block.nTx === 'number' ? block.nTx : 0);

    return create_block_event(this.private_key, {
      height: block.height,
      hash: block.hash,
      time: block.time,
      difficulty: block.difficulty,
      tx_count,
      size: block.size,
      weight: block.weight,
      version: block.version,
      merkle_root,
      nonce: block.nonce,
      block_height: block.height,
      node_pubkey: this.public_key,
      relay_list: this.relay_urls
    });
  }

  async publish_block_event(block) {
    const event = this.create_block_event(block);
    return this.publish_signed_event(event);
  }

  async publish_signed_event(event) {
    const open_relays = Array.from(this.relay_connections.entries())
      .filter(([_url, socket]) => socket.readyState === WebSocket.OPEN);

    if (open_relays.length === 0) {
      logger.warn('No connected relays available for publishing');
      return { success: 0, total: 0, event_id: event.id, failed: open_relays.length };
    }

    const payload = JSON.stringify(['EVENT', event]);

    let success_count = 0;
    let error_count = 0;

    for (const [url, socket] of open_relays) {
      try {
        socket.send(payload);
        success_count++;
      } catch (error) {
        error_count++;
        logger.error({ err: error, relayUrl: url }, 'Failed to publish event');
      }
    }

    logger.info({
      kind: event.kind,
      successCount: success_count,
      total: open_relays.length,
      errorCount: error_count
    }, 'Published event to relays');

    return {
      success: success_count,
      total: open_relays.length,
      failed: error_count,
      event_id: event.id
    };
  }

  async respond_to_auth(relay_url, socket, challenge) {
    if (typeof challenge !== 'string' || challenge.length === 0) {
      throw new Error('Invalid NIP-42 challenge received');
    }

    const auth_event = {
      kind: 22242,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['relay', relay_url],
        ['challenge', challenge]
      ],
      content: '',
      pubkey: this.public_key
    };

    const signed_event = nostr_tools.finalizeEvent(auth_event, this.private_key);
    const payload = JSON.stringify(['AUTH', signed_event]);
    socket.send(payload);
    logger.info({ relayUrl: relay_url }, 'Sent NIP-42 auth response');
  }
}
