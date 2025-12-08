/**
 * Relay module exports
 */

// Main connection manager
export { RelayConnection } from './connection.js';
export type { RelayConnectionConfig } from './connection.js';

// Sub-modules (for advanced usage)
export { AuthHandler } from './auth.js';
export type { AuthState, AuthConfig, AuthResult } from './auth.js';

export { SubscriptionManager } from './subscriptions.js';
export type { SubscriptionFilter, SubscriptionConfig } from './subscriptions.js';

export { EventHandlers } from './handlers.js';
export type { EventHandlerConfig } from './handlers.js';

// WebSocket utilities
export { get_websocket_impl, WS_READY_STATE } from './websocket.js';
export type { WebSocketWithOn } from './websocket.js';

