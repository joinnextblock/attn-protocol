import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { BitcoinService } from './bitcoin.service.js';
import { BitcoinRpcError, BitcoinZmqError } from '../errors.js';

describe('BitcoinService', () => {
  let service;
  let mockConfig;
  let originalFetch;

  beforeEach(() => {
    mockConfig = {
      zmq_host: 'localhost',
      zmq_port: '29000',
      zmq_topic: 'hashblock',
      rpc_host: 'localhost',
      rpc_port: 8332,
      rpc_user: 'test',
      rpc_password: 'test',
      rpc_protocol: 'http'
    };
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (service) {
      service.disconnect().catch(() => {});
    }
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      service = new BitcoinService({});
      expect(service.host).toBe('localhost');
      expect(service.port).toBe('29000');
      expect(service.rpc_host).toBe('localhost');
      expect(service.rpc_port).toBe(8332);
    });

    it('should initialize with provided config', () => {
      service = new BitcoinService(mockConfig);
      expect(service.host).toBe('localhost');
      expect(service.port).toBe('29000');
      expect(service.rpc_host).toBe('localhost');
      expect(service.rpc_port).toBe(8332);
    });

    it('should handle rpc_protocol case insensitivity', () => {
      service = new BitcoinService({ ...mockConfig, rpc_protocol: 'HTTPS' });
      expect(service.rpc_protocol).toBe('https');
    });
  });

  describe('connect', () => {
    it('should connect to ZMQ endpoint', async () => {
      service = new BitcoinService(mockConfig);
      // Create mock socket
      const mockSocket = {
        connect: jest.fn(),
        subscribe: jest.fn(),
        close: jest.fn(),
        closed: false
      };
      service.zmq_socket = mockSocket;

      await service.connect();
      expect(mockSocket.connect).toHaveBeenCalled();
      expect(mockSocket.subscribe).toHaveBeenCalledWith('hashblock');
    });

    it('should handle connection errors', async () => {
      service = new BitcoinService(mockConfig);
      const mockSocket = {
        connect: jest.fn(() => {
          throw new Error('Connection failed');
        }),
        subscribe: jest.fn(),
        close: jest.fn(),
        closed: false
      };
      service.zmq_socket = mockSocket;

      await expect(service.connect()).rejects.toThrow(BitcoinZmqError);
    });

    it('should recreate socket if closed', async () => {
      service = new BitcoinService(mockConfig);
      const mockSocket = {
        connect: jest.fn(),
        subscribe: jest.fn(),
        close: jest.fn(),
        closed: true
      };
      service.zmq_socket = mockSocket;

      await service.connect();
      // Socket should be recreated (new instance)
      expect(service.zmq_socket).toBeDefined();
    });
  });

  describe('disconnect', () => {
    it('should close ZMQ socket', async () => {
      service = new BitcoinService(mockConfig);
      const mockSocket = {
        connect: jest.fn(),
        subscribe: jest.fn(),
        close: jest.fn(),
        closed: false
      };
      service.zmq_socket = mockSocket;
      await service.disconnect();
      expect(mockSocket.close).toHaveBeenCalled();
    });

    it('should handle errors during disconnect', async () => {
      service = new BitcoinService(mockConfig);
      const mockSocket = {
        connect: jest.fn(),
        subscribe: jest.fn(),
        close: jest.fn(() => {
          throw new Error('Close failed');
        }),
        closed: false
      };
      service.zmq_socket = mockSocket;
      await service.disconnect(); // Should not throw
    });
  });

  describe('listen', () => {
    it('should be an async generator', () => {
      service = new BitcoinService(mockConfig);
      const generator = service.listen();
      expect(generator).toBeDefined();
      expect(typeof generator[Symbol.asyncIterator]).toBe('function');
    });
  });

  describe('call_rpc', () => {
    it('should make successful RPC call', async () => {
      service = new BitcoinService(mockConfig);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          result: { height: 850000 },
          error: null,
          id: 'test'
        })
      });

      const result = await service.call_rpc('getblockhash', [850000]);
      expect(result.height).toBe(850000);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should include authentication headers when credentials provided', async () => {
      service = new BitcoinService(mockConfig);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          result: { height: 850000 },
          error: null,
          id: 'test'
        })
      });

      await service.call_rpc('getblockhash', [850000]);
      const fetchCall = global.fetch.mock.calls[0];
      const headers = fetchCall[1].headers;
      expect(headers['Authorization']).toBeDefined();
    });

    it('should handle HTTP errors', async () => {
      service = new BitcoinService(mockConfig);
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Unauthorized'
      });

      await expect(service.call_rpc('getblockhash', [850000]))
        .rejects.toThrow(BitcoinRpcError);
    });

    it('should handle RPC method errors', async () => {
      service = new BitcoinService(mockConfig);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          result: null,
          error: { code: -1, message: 'Method not found' },
          id: 'test'
        })
      });

      await expect(service.call_rpc('invalidmethod', []))
        .rejects.toThrow(BitcoinRpcError);
    });

    it('should handle empty RPC response', async () => {
      service = new BitcoinService(mockConfig);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => ''
      });

      await expect(service.call_rpc('getblockhash', [850000]))
        .rejects.toThrow(BitcoinRpcError);
    });

    it('should handle network errors', async () => {
      service = new BitcoinService(mockConfig);
      global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(service.call_rpc('getblockhash', [850000]))
        .rejects.toThrow(BitcoinRpcError);
    });

    it('should handle timeout errors', async () => {
      service = new BitcoinService(mockConfig);
      const abortController = new AbortController();
      global.fetch = jest.fn().mockImplementation(() => {
        abortController.abort();
        return Promise.reject(new Error('AbortError'));
      });

      await expect(service.call_rpc('getblockhash', [850000]))
        .rejects.toThrow(BitcoinRpcError);
    });
  });

  describe('get_block_data', () => {
    it('should call RPC with correct parameters', async () => {
      service = new BitcoinService(mockConfig);
      const blockHash = '0'.repeat(64);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          result: { hash: blockHash, height: 850000 },
          error: null,
          id: 'test'
        })
      });

      const result = await service.get_block_data(blockHash);
      expect(result.hash).toBe(blockHash);
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('get_best_block_hash', () => {
    it('should fetch current best block hash', async () => {
      service = new BitcoinService(mockConfig);
      const best_hash = '0'.repeat(64);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({
          result: best_hash,
          error: null,
          id: 'test'
        })
      });

      const result = await service.get_best_block_hash();
      expect(result).toBe(best_hash);
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('buffer_to_hex', () => {
    it('should convert buffer to hex string', () => {
      service = new BitcoinService(mockConfig);
      const buffer = Buffer.from('hello', 'utf8');
      const hex = service.buffer_to_hex(buffer);
      expect(hex).toBe('68656c6c6f');
    });
  });
});

