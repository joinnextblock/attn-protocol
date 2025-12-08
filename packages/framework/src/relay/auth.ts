/**
 * NIP-42 Authentication handler for Nostr relay connections
 * Handles AUTH challenge/response flow
 */

import { finalizeEvent, getPublicKey, utils } from 'nostr-tools';
import type { Logger } from '../logger.js';
import type { WebSocketWithOn } from './websocket.js';
import { WS_READY_STATE } from './websocket.js';

/**
 * Authentication state
 */
export interface AuthState {
  is_authenticated: boolean;
  auth_challenge_received: boolean;
  auth_event_id: string | null;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  relay_url: string;
  private_key: Uint8Array;
  auth_timeout_ms: number;
  logger: Logger;
}

/**
 * Authentication result
 */
export interface AuthResult {
  success: boolean;
  error?: Error;
}

/**
 * NIP-42 Authentication handler
 */
export class AuthHandler {
  private config: AuthConfig;
  private state: AuthState;
  private auth_timeout: NodeJS.Timeout | null = null;

  constructor(config: AuthConfig) {
    this.config = config;
    this.state = {
      is_authenticated: false,
      auth_challenge_received: false,
      auth_event_id: null,
    };
  }

  /**
   * Get current authentication state
   */
  get is_authenticated(): boolean {
    return this.state.is_authenticated;
  }

  /**
   * Set authenticated state
   */
  set_authenticated(value: boolean): void {
    this.state.is_authenticated = value;
  }

  /**
   * Get auth event ID (for matching OK responses)
   */
  get auth_event_id(): string | null {
    return this.state.auth_event_id;
  }

  /**
   * Check if auth challenge was received
   */
  get auth_challenge_received(): boolean {
    return this.state.auth_challenge_received;
  }

  /**
   * Reset authentication state
   */
  reset(): void {
    this.state = {
      is_authenticated: false,
      auth_challenge_received: false,
      auth_event_id: null,
    };
    this.clear_timeout();
  }

  /**
   * Clear any pending auth timeout
   */
  clear_timeout(): void {
    if (this.auth_timeout) {
      clearTimeout(this.auth_timeout);
      this.auth_timeout = null;
    }
  }

  /**
   * Handle AUTH challenge from relay (NIP-42)
   * @param challenge - The challenge string from the relay
   * @param ws - WebSocket connection to send response on
   * @param on_success - Callback when authentication succeeds
   * @param on_failure - Callback when authentication fails
   */
  handle_auth_challenge(
    challenge: string,
    ws: WebSocketWithOn,
    on_success: () => void,
    on_failure: (error: Error) => void
  ): void {
    this.state.auth_challenge_received = true;
    this.clear_timeout();

    if (!this.config.private_key) {
      on_failure(new Error('AUTH challenge received but no private_key provided'));
      return;
    }

    // Ensure private_key is a Uint8Array and create a fresh instance
    if (!(this.config.private_key instanceof Uint8Array)) {
      on_failure(new Error(`private_key must be a Uint8Array, got ${typeof this.config.private_key}`));
      return;
    }

    // Create a fresh Uint8Array copy to ensure it's a proper instance
    const private_key = new Uint8Array(this.config.private_key);

    try {
      // Normalize relay URL for challenge tag
      let normalized_relay_url = this.config.relay_url.trim();
      if (normalized_relay_url.endsWith('/')) {
        normalized_relay_url = normalized_relay_url.slice(0, -1);
      }

      try {
        const url = new URL(normalized_relay_url);
        normalized_relay_url = `${url.protocol}//${url.host}`;
      } catch {
        // Use original URL if parsing fails
      }

      // Get public key from private key
      const public_key_result: unknown = getPublicKey(private_key);
      let public_key_hex: string;
      if (public_key_result instanceof Uint8Array) {
        public_key_hex = utils.bytesToHex(public_key_result);
      } else if (typeof public_key_result === 'string') {
        public_key_hex = public_key_result;
      } else {
        throw new Error('getPublicKey returned unexpected type');
      }

      // Create kind 22242 authentication event
      const event = {
        kind: 22242,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['relay', normalized_relay_url],
          ['challenge', challenge],
        ],
        content: '',
        pubkey: public_key_hex,
      };

      // Sign the event
      const signed_event = finalizeEvent(event, private_key);
      this.state.auth_event_id = signed_event.id;

      // Send AUTH response
      const auth_message = JSON.stringify(['AUTH', signed_event]);
      this.config.logger.debug(
        { relay_url: this.config.relay_url, event_id: signed_event.id },
        'Sending AUTH response'
      );

      if (ws && ws.readyState === WS_READY_STATE.OPEN) {
        ws.send(auth_message);
      }

      // Set timeout for OK response
      this.auth_timeout = setTimeout(() => {
        this.auth_timeout = null;
        on_failure(new Error('Authentication timeout: No OK response received'));
      }, this.config.auth_timeout_ms);
    } catch (error) {
      this.clear_timeout();
      on_failure(
        new Error(
          `Failed to create authentication event: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }

  /**
   * Handle OK response for authentication
   * @param event_id - Event ID from OK response
   * @param accepted - Whether the event was accepted
   * @param reason - Rejection reason if not accepted
   * @returns AuthResult indicating success or failure
   */
  handle_auth_ok_response(event_id: string, accepted: boolean, reason?: string): AuthResult {
    if (event_id !== this.state.auth_event_id) {
      // Not our auth event
      return { success: false };
    }

    this.clear_timeout();
    this.state.auth_event_id = null;

    if (accepted) {
      this.config.logger.info({ relay_url: this.config.relay_url }, 'Authentication successful');
      this.state.is_authenticated = true;
      return { success: true };
    } else {
      const error_reason = reason || 'Unknown reason';
      this.config.logger.warn({ relay_url: this.config.relay_url, reason: error_reason }, 'Authentication rejected');
      return {
        success: false,
        error: new Error(`Authentication rejected by relay: ${error_reason}`),
      };
    }
  }

  /**
   * Start timeout for waiting for AUTH challenge
   * If no challenge received, assume relay doesn't require auth
   * @param on_no_auth_required - Callback if no auth is required
   */
  start_auth_challenge_timeout(on_no_auth_required: () => void): void {
    this.config.logger.debug(
      { relay_url: this.config.relay_url, timeout_ms: this.config.auth_timeout_ms },
      'Waiting for AUTH challenge'
    );

    this.auth_timeout = setTimeout(() => {
      if (!this.state.auth_challenge_received) {
        this.config.logger.info(
          { relay_url: this.config.relay_url, timeout_ms: this.config.auth_timeout_ms },
          'No AUTH challenge received - relay does not require authentication'
        );
        this.state.is_authenticated = true;
        on_no_auth_required();
      }
    }, this.config.auth_timeout_ms);
  }
}
