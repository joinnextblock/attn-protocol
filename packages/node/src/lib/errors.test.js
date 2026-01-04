import { describe, it, expect } from 'vitest';
import {
  BridgeError,
  BitcoinRpcError,
  BitcoinZmqError,
  NostrRelayError,
  DatabaseError,
  ValidationError,
  EventProcessingError
} from './errors.js';

describe('Error Classes', () => {
  describe('BridgeError', () => {
    it('should create error with message and code', () => {
      const error = new BridgeError('Test error', 'TEST_CODE');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('BridgeError');
    });

    it('should include details', () => {
      const details = { field: 'test' };
      const error = new BridgeError('Test error', 'TEST_CODE', details);
      expect(error.details).toEqual(details);
    });
  });

  describe('BitcoinRpcError', () => {
    it('should create error with method', () => {
      const error = new BitcoinRpcError('RPC failed', 'getblock');
      expect(error.message).toBe('RPC failed');
      expect(error.method).toBe('getblock');
      expect(error.code).toBe('BITCOIN_RPC_ERROR');
      expect(error.name).toBe('BitcoinRpcError');
    });

    it('should include details', () => {
      const details = { status: 500 };
      const error = new BitcoinRpcError('RPC failed', 'getblock', details);
      expect(error.details.status).toBe(500);
    });
  });

  describe('BitcoinZmqError', () => {
    it('should create error with details', () => {
      const details = { endpoint: 'localhost:29000' };
      const error = new BitcoinZmqError('ZMQ failed', details);
      expect(error.message).toBe('ZMQ failed');
      expect(error.code).toBe('BITCOIN_ZMQ_ERROR');
      expect(error.details.endpoint).toBe('localhost:29000');
    });
  });

  describe('NostrRelayError', () => {
    it('should create error with relay URL', () => {
      const error = new NostrRelayError('Relay failed', 'ws://localhost:10547');
      expect(error.message).toBe('Relay failed');
      expect(error.relayUrl).toBe('ws://localhost:10547');
      expect(error.code).toBe('NOSTR_RELAY_ERROR');
    });
  });

  describe('DatabaseError', () => {
    it('should create error with operation', () => {
      const error = new DatabaseError('DB failed', 'store_block');
      expect(error.message).toBe('DB failed');
      expect(error.operation).toBe('store_block');
      expect(error.code).toBe('DATABASE_ERROR');
    });
  });

  describe('ValidationError', () => {
    it('should create error with field', () => {
      const error = new ValidationError('Invalid value', 'height');
      expect(error.message).toBe('Invalid value');
      expect(error.field).toBe('height');
      expect(error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('EventProcessingError', () => {
    it('should create error with topic', () => {
      const error = new EventProcessingError('Processing failed', 'hashblock');
      expect(error.message).toBe('Processing failed');
      expect(error.topic).toBe('hashblock');
      expect(error.code).toBe('EVENT_PROCESSING_ERROR');
    });
  });
});

