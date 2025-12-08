/**
 * Bitcoin Service
 * Handles Bitcoin ZMQ connections and RPC calls
 */

import * as zmq from 'zeromq';
import { BitcoinRpcError, BitcoinZmqError } from '../errors.js';
import { logger } from '../logger.js';

export class BitcoinService {
  constructor(config) {
    this.zmq_socket = new zmq.Subscriber();
    this.host = config.zmq_host || 'localhost';
    this.port = config.zmq_port || '29000';
    this.topic = config.zmq_topic || 'hashblock';
    this.rpc_host = config.rpc_host || 'localhost';
    this.rpc_port = config.rpc_port || 8332;
    this.rpc_user = config.rpc_user || '';
    this.rpc_password = config.rpc_password || '';
    this.rpc_protocol = (config.rpc_protocol || 'http').toLowerCase();

    // Log RPC configuration (without credentials)
    const has_auth = Boolean(this.rpc_user && this.rpc_password);
    logger.info({
      protocol: this.rpc_protocol,
      host: this.rpc_host,
      port: this.rpc_port,
      hasAuth: has_auth
    }, 'Bitcoin RPC configuration');
  }

  async connect() {
    const endpoint = `tcp://${this.host}:${this.port}`;
    logger.info({ endpoint }, 'Connecting to Bitcoin ZMQ');

    // Recreate socket if needed
    if (!this.zmq_socket || this.zmq_socket.closed) {
      this.zmq_socket = new zmq.Subscriber();
    }

    try {
      this.zmq_socket.connect(endpoint);
      this.zmq_socket.subscribe(this.topic);

      // Give the connection a moment to establish
      await new Promise(resolve => setTimeout(resolve, 100));

      logger.info({ endpoint }, 'Connected to Bitcoin ZMQ');
      logger.info({ topic: this.topic }, 'Subscribed to topic');
    } catch (error) {
      logger.error({ err: error, endpoint }, 'Failed to connect to Bitcoin ZMQ');
      throw new BitcoinZmqError(`Failed to connect to Bitcoin ZMQ: ${error.message}`, {
        endpoint: `${this.host}:${this.port}`,
        originalError: error.message
      });
    }
  }

  async disconnect() {
    if (this.zmq_socket) {
      try {
        this.zmq_socket.close();
      } catch (error) {
        logger.error({ err: error }, 'Error closing ZeroMQ socket');
      } finally {
        this.zmq_socket = null;
      }
    }
  }

  async* listen() {
    for await (const [topic, message] of this.zmq_socket) {
      yield { topic: topic.toString(), message };
    }
  }

  async call_rpc(method, params = []) {
    let timeout_id;
    try {
      const rpc_url = `${this.rpc_protocol}://${this.rpc_host}:${this.rpc_port}`;

      const request_body = {
        jsonrpc: "1.0",
        id: Date.now().toString(),
        method: method,
        params: params
      };

      const headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(request_body)).toString()
      };

      if (this.rpc_user && this.rpc_password) {
        headers['Authorization'] = `Basic ${Buffer.from(`${this.rpc_user}:${this.rpc_password}`).toString('base64')}`;
      }

      // Create abort controller for timeout
      const controller = new AbortController();
      timeout_id = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(rpc_url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(request_body),
        signal: controller.signal
      });

      clearTimeout(timeout_id);

      if (!response.ok) {
        const error_text = await response.text().catch(() => 'Unable to read error response');
        logger.error({
          method,
          status: response.status,
          statusText: response.statusText,
          rpcUrl: `${this.rpc_protocol}://${this.rpc_host}:${this.rpc_port}`,
          errorText: error_text
        }, 'HTTP error in RPC call');
        throw new BitcoinRpcError(
          `HTTP ${response.status} ${response.statusText} for ${method}`,
          method,
          { status: response.status, statusText: response.statusText, errorText: error_text }
        );
      }

      const response_text = await response.text();

      if (!response_text || response_text.trim() === '') {
        logger.error({ method }, 'Empty RPC response');
        throw new BitcoinRpcError(`Empty RPC response for ${method}`, method);
      }

      const result = JSON.parse(response_text);
      if (result.error) {
        const error_msg = result.error.message || JSON.stringify(result.error);
        logger.error({ method, error: error_msg }, 'RPC method error');
        throw new BitcoinRpcError(
          `RPC method error: ${error_msg}`,
          method,
          { rpcError: result.error }
        );
      }

      return result.result;

    } catch (error) {
      // Clear timeout if still active
      if (timeout_id) {
        clearTimeout(timeout_id);
      }

      // Handle different types of fetch errors
      let error_message = `RPC call failed for ${method}: ${error.message}`;
      const error_details = { rpcUrl: `${this.rpc_protocol}://${this.rpc_host}:${this.rpc_port}` };

      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        error_message = `RPC call timeout for ${method} after 30 seconds`;
        error_details.timeout = true;
      } else if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
        error_message = `RPC connection refused for ${method}`;
        error_details.connectionRefused = true;
      } else if (error.code === 'ENOTFOUND' || error.message.includes('ENOTFOUND')) {
        error_message = `RPC host not found for ${method}: ${this.rpc_host}`;
        error_details.hostNotFound = true;
      } else if (error.message.includes('fetch failed')) {
        error_message = `RPC fetch failed for ${method}`;
        error_details.fetchFailed = true;
      }

      logger.error({ err: error, method, errorDetails: error_details }, error_message);
      if (this.stats) {
        this.stats.increment('rpc_calls_failed');
      }

      // If it's already a BitcoinRpcError, re-throw it
      if (error instanceof BitcoinRpcError) {
        throw error;
      }

      throw new BitcoinRpcError(error_message, method, error_details);
    }
  }

  async get_block_data(block_hash) {
    return await this.call_rpc('getblock', [block_hash, 1]);
  }

  async get_best_block_hash() {
    return await this.call_rpc('getbestblockhash', []);
  }

  buffer_to_hex(buffer) {
    return buffer.toString('hex');
  }
}

