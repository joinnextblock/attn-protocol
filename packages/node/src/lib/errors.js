/**
 * Custom Error Types for Node Service
 * Provides standardized error handling across services
 */

export class BridgeError extends Error {
  constructor(message, code = 'BRIDGE_ERROR', details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BitcoinRpcError extends BridgeError {
  constructor(message, method = null, details = {}) {
    super(message, 'BITCOIN_RPC_ERROR', { method, ...details });
    this.name = 'BitcoinRpcError';
    this.method = method;
  }
}

export class BitcoinZmqError extends BridgeError {
  constructor(message, details = {}) {
    super(message, 'BITCOIN_ZMQ_ERROR', details);
    this.name = 'BitcoinZmqError';
  }
}

export class NostrRelayError extends BridgeError {
  constructor(message, relayUrl = null, details = {}) {
    super(message, 'NOSTR_RELAY_ERROR', { relayUrl, ...details });
    this.name = 'NostrRelayError';
    this.relayUrl = relayUrl;
  }
}

export class DatabaseError extends BridgeError {
  constructor(message, operation = null, details = {}) {
    super(message, 'DATABASE_ERROR', { operation, ...details });
    this.name = 'DatabaseError';
    this.operation = operation;
  }
}

export class ValidationError extends BridgeError {
  constructor(message, field = null, details = {}) {
    super(message, 'VALIDATION_ERROR', { field, ...details });
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class EventProcessingError extends BridgeError {
  constructor(message, topic = null, details = {}) {
    super(message, 'EVENT_PROCESSING_ERROR', { topic, ...details });
    this.name = 'EventProcessingError';
    this.topic = topic;
  }
}

