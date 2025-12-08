/**
 * WebSocket compatibility layer for browser and Node.js environments
 * Provides a unified interface with .on() method support across platforms
 */

import WebSocketBase from 'isomorphic-ws';

/**
 * WebSocket interface with .on() method support
 * In browser, native WebSocket doesn't expose .on() method,
 * so we create a compatibility wrapper that adds it
 */
export type WebSocketWithOn = WebSocketBase & {
  on(event: string, handler: Function): void;
  off?(event: string, handler?: Function): void;
  removeAllListeners?(): void;
};

/**
 * WebSocket ready states
 */
export const WS_READY_STATE = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
} as const;

/**
 * Get the appropriate WebSocket implementation for the current environment
 * @returns WebSocket constructor (browser-compatible wrapper or isomorphic-ws)
 */
export function get_websocket_impl(): typeof WebSocketBase {
  // Check if we're in browser environment
  if (
    typeof globalThis !== 'undefined' &&
    'window' in globalThis &&
    (globalThis as Record<string, unknown>).window &&
    ((globalThis as Record<string, unknown>).window as { WebSocket?: unknown }).WebSocket
  ) {
    // Browser: Create wrapper that adds .on() method to native WebSocket
    const NativeWS = ((globalThis as Record<string, unknown>).window as { WebSocket: typeof WebSocket }).WebSocket;

    class BrowserWebSocketCompat extends NativeWS {
      private _listeners: Map<string, Set<Function>> = new Map();

      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        this._setup_event_listeners();
      }

      private _setup_event_listeners() {
        // Map native addEventListener to .on() style
        super.addEventListener('open', (event: Event) => {
          this._emit('open', event);
        });

        super.addEventListener('message', (event: MessageEvent) => {
          this._emit('message', event.data);
        });

        super.addEventListener('error', (event: Event) => {
          this._emit('error', event);
        });

        super.addEventListener('close', (event: Event) => {
          const close_event = event as { code?: number; reason?: string };
          this._emit('close', close_event.code, close_event.reason);
        });
      }

      on(event: string, handler: Function) {
        if (!this._listeners.has(event)) {
          this._listeners.set(event, new Set());
        }
        this._listeners.get(event)!.add(handler);
      }

      off(event: string, handler?: Function) {
        if (!this._listeners.has(event)) return;
        if (handler) {
          this._listeners.get(event)!.delete(handler);
        } else {
          this._listeners.get(event)!.clear();
        }
      }

      private _emit(event: string, ...args: unknown[]) {
        if (this._listeners.has(event)) {
          this._listeners.get(event)!.forEach((handler) => {
            try {
              handler(...args);
            } catch (error) {
              // Note: This is in browser WebSocket wrapper, logger not available here
              // Fallback to console for browser compatibility
              if (typeof console !== 'undefined' && console.error) {
                console.error('[attn] Error in WebSocket event handler:', error);
              }
            }
          });
        }
      }

      removeAllListeners() {
        this._listeners.clear();
      }
    }

    return BrowserWebSocketCompat as unknown as typeof WebSocketBase;
  }

  // Node.js: use isomorphic-ws as-is
  return WebSocketBase;
}
