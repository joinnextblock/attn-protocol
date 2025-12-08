/**
 * Connection Manager
 * Handles exponential backoff reconnection logic for both Nostr relays and ZMQ connections
 */

import { logger } from './logger.js';

const DEFAULT_CONFIG = {
  initial_delay_ms: 1000,        // Start with 1 second
  max_delay_ms: 60000,           // Cap at 60 seconds
  backoff_multiplier: 2,         // Double each attempt
  max_attempts: 10,              // Give up after 10 attempts
  reset_after_success_ms: 300000  // Reset attempts after 5 minutes of success
};

/**
 * Connection state tracker for a single connection endpoint
 */
export class ConnectionState {
  constructor(endpoint, config = {}) {
    this.endpoint = endpoint;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.attempts = 0;
    this.last_attempt_at = null;
    this.last_success_at = null;
    this.reconnect_timeout = null;
    this.is_connected = false;
    this.is_reconnecting = false;
  }

  /**
   * Calculate delay for next reconnection attempt
   */
  calculate_delay() {
    const delay = this.config.initial_delay_ms *
                  Math.pow(this.config.backoff_multiplier, this.attempts);
    return Math.min(delay, this.config.max_delay_ms);
  }

  /**
   * Check if we should attempt reconnection
   */
  should_attempt() {
    if (this.attempts >= this.config.max_attempts) {
      return false;
    }
    return true;
  }

  /**
   * Record a failed connection attempt
   */
  record_failure() {
    this.attempts++;
    this.last_attempt_at = Date.now();
    this.is_connected = false;
  }

  /**
   * Record a successful connection
   */
  record_success() {
    this.attempts = 0;
    this.last_success_at = Date.now();
    this.is_connected = true;
    this.is_reconnecting = false;
  }

  /**
   * Check if attempts should be reset (long period of success)
   */
  should_reset_attempts() {
    if (!this.last_success_at) return false;
    const time_since_success = Date.now() - this.last_success_at;
    return time_since_success > this.config.reset_after_success_ms;
  }

  /**
   * Reset connection state (for manual reset or after long success period)
   */
  reset() {
    if (this.reconnect_timeout) {
      clearTimeout(this.reconnect_timeout);
      this.reconnect_timeout = null;
    }
    this.attempts = 0;
    this.is_reconnecting = false;
  }

  /**
   * Cleanup
   */
  cleanup() {
    if (this.reconnect_timeout) {
      clearTimeout(this.reconnect_timeout);
      this.reconnect_timeout = null;
    }
  }
}

/**
 * Connection Manager
 * Tracks multiple connection endpoints and manages reconnection logic
 */
export class ConnectionManager {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.connections = new Map(); // endpoint -> ConnectionState
  }

  /**
   * Get or create connection state for an endpoint
   */
  get_connection_state(endpoint) {
    if (!this.connections.has(endpoint)) {
      this.connections.set(endpoint, new ConnectionState(endpoint, this.config));
    }
    return this.connections.get(endpoint);
  }

  /**
   * Schedule a reconnection attempt with exponential backoff
   * @param {string} endpoint - Connection endpoint identifier
   * @param {Function} connect_fn - Async function to attempt connection
   * @returns {Promise<boolean>} - True if reconnection was scheduled, false if max attempts reached
   */
  async schedule_reconnect(endpoint, connect_fn) {
    const state = this.get_connection_state(endpoint);

    if (!state.should_attempt()) {
      logger.error({
        endpoint,
        attempts: state.attempts,
        maxAttempts: state.config.max_attempts
      }, 'Max reconnection attempts reached; giving up');
      return false;
    }

    // Reset attempts if we've had long success period
    if (state.should_reset_attempts()) {
      logger.info({ endpoint }, 'Resetting reconnection attempts after long success period');
      state.reset();
    }

    const delay = state.calculate_delay();
    state.is_reconnecting = true;

    logger.warn({
      endpoint,
      delayMs: delay,
      attempt: state.attempts + 1,
      maxAttempts: state.config.max_attempts
    }, 'Scheduling reconnection with exponential backoff');

    return new Promise((resolve) => {
      state.reconnect_timeout = setTimeout(async () => {
        state.reconnect_timeout = null;
        try {
          await connect_fn();
          state.record_success();
          logger.info({ endpoint, attempt: state.attempts }, 'Reconnection successful');
          resolve(true);
        } catch (error) {
          state.record_failure();
          logger.error({
            endpoint,
            attempt: state.attempts,
            error: error.message
          }, 'Reconnection attempt failed');

          // Schedule next attempt
          const scheduled = await this.schedule_reconnect(endpoint, connect_fn);
          resolve(scheduled);
        }
      }, delay);
    });
  }

  /**
   * Record a successful connection
   */
  record_success(endpoint) {
    const state = this.get_connection_state(endpoint);
    state.record_success();
  }

  /**
   * Record a failed connection
   */
  record_failure(endpoint) {
    const state = this.get_connection_state(endpoint);
    state.record_failure();
  }

  /**
   * Check if endpoint has exceeded max attempts
   */
  is_circuit_open(endpoint) {
    const state = this.get_connection_state(endpoint);
    return !state.should_attempt();
  }

  /**
   * Get connection statistics
   */
  get_stats(endpoint = null) {
    if (endpoint) {
      const state = this.get_connection_state(endpoint);
      return {
        endpoint,
        attempts: state.attempts,
        maxAttempts: state.config.max_attempts,
        isConnected: state.is_connected,
        isReconnecting: state.is_reconnecting,
        lastAttemptAt: state.last_attempt_at,
        lastSuccessAt: state.last_success_at
      };
    }

    // Return stats for all connections
    const stats = {};
    for (const [ep, state] of this.connections) {
      stats[ep] = {
        attempts: state.attempts,
        maxAttempts: state.config.max_attempts,
        isConnected: state.is_connected,
        isReconnecting: state.is_reconnecting,
        lastAttemptAt: state.last_attempt_at,
        lastSuccessAt: state.last_success_at
      };
    }
    return stats;
  }

  /**
   * Reset connection state for an endpoint
   */
  reset(endpoint) {
    const state = this.connections.get(endpoint);
    if (state) {
      state.reset();
    }
  }

  /**
   * Cleanup all connections
   */
  cleanup() {
    for (const state of this.connections.values()) {
      state.cleanup();
    }
    this.connections.clear();
  }
}

