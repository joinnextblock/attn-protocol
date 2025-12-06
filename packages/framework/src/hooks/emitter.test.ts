import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HookEmitter } from './emitter.js';
import type { HookContext } from './types.js';

describe('HookEmitter', () => {
  let emitter: HookEmitter;

  beforeEach(() => {
    emitter = new HookEmitter();
  });

  describe('register', () => {
    it('should register a handler for a hook', () => {
      const handler = vi.fn();
      const handle = emitter.register('test_hook', handler);

      expect(emitter.has_handlers('test_hook')).toBe(true);
      expect(emitter.handler_count('test_hook')).toBe(1);
      expect(handle).toBeDefined();
      expect(handle.unregister).toBeDefined();
    });

    it('should register multiple handlers for the same hook', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      emitter.register('test_hook', handler1);
      emitter.register('test_hook', handler2);
      emitter.register('test_hook', handler3);

      expect(emitter.handler_count('test_hook')).toBe(3);
    });

    it('should return a handle with unregister method', () => {
      const handler = vi.fn();
      const handle = emitter.register('test_hook', handler);

      expect(typeof handle.unregister).toBe('function');
    });
  });

  describe('emit', () => {
    it('should call registered handlers when emitting', async () => {
      const handler = vi.fn();
      emitter.register('test_hook', handler);

      const context: HookContext = { type: 'test' };
      await emitter.emit('test_hook', context);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(context);
    });

    it('should call all registered handlers in order', async () => {
      const call_order: number[] = [];
      const handler1 = vi.fn(() => {
        call_order.push(1);
      });
      const handler2 = vi.fn(() => {
        call_order.push(2);
      });
      const handler3 = vi.fn(() => {
        call_order.push(3);
      });

      emitter.register('test_hook', handler1);
      emitter.register('test_hook', handler2);
      emitter.register('test_hook', handler3);

      const context: HookContext = { type: 'test' };
      await emitter.emit('test_hook', context);

      expect(call_order).toEqual([1, 2, 3]);
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(1);
    });

    it('should handle async handlers', async () => {
      const handler = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      emitter.register('test_hook', handler);
      const context: HookContext = { type: 'test' };
      await emitter.emit('test_hook', context);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should not throw if no handlers are registered', async () => {
      const context: HookContext = { type: 'test' };
      await expect(emitter.emit('test_hook', context)).resolves.not.toThrow();
    });

    it('should continue executing other handlers if one throws', async () => {
      const mock_logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };
      const emitter_with_logger = new HookEmitter(mock_logger);
      const handler1 = vi.fn(() => {
        throw new Error('Handler 1 error');
      });
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      emitter_with_logger.register('test_hook', handler1);
      emitter_with_logger.register('test_hook', handler2);
      emitter_with_logger.register('test_hook', handler3);

      const context: HookContext = { type: 'test' };

      await emitter_with_logger.emit('test_hook', context);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(1);
      expect(mock_logger.error).toHaveBeenCalled();
    });

    it('should pass context to handlers', async () => {
      const handler = vi.fn();
      emitter.register('test_hook', handler);

      const context: HookContext = { type: 'test', data: { foo: 'bar' } };
      await emitter.emit('test_hook', context);

      expect(handler).toHaveBeenCalledWith(context);
    });
  });

  describe('unregister', () => {
    it('should unregister a handler', () => {
      const handler = vi.fn();
      const handle = emitter.register('test_hook', handler);

      expect(emitter.has_handlers('test_hook')).toBe(true);

      handle.unregister();

      expect(emitter.has_handlers('test_hook')).toBe(false);
      expect(emitter.handler_count('test_hook')).toBe(0);
    });

    it('should only unregister the specific handler', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      const handle1 = emitter.register('test_hook', handler1);
      emitter.register('test_hook', handler2);
      emitter.register('test_hook', handler3);

      expect(emitter.handler_count('test_hook')).toBe(3);

      handle1.unregister();

      expect(emitter.handler_count('test_hook')).toBe(2);
    });

    it('should remove hook entry when last handler is unregistered', () => {
      const handler = vi.fn();
      const handle = emitter.register('test_hook', handler);

      handle.unregister();

      expect(emitter.has_handlers('test_hook')).toBe(false);
    });
  });

  describe('has_handlers', () => {
    it('should return false when no handlers are registered', () => {
      expect(emitter.has_handlers('test_hook')).toBe(false);
    });

    it('should return true when handlers are registered', () => {
      emitter.register('test_hook', vi.fn());
      expect(emitter.has_handlers('test_hook')).toBe(true);
    });

    it('should return false after all handlers are unregistered', () => {
      const handle = emitter.register('test_hook', vi.fn());
      expect(emitter.has_handlers('test_hook')).toBe(true);

      handle.unregister();
      expect(emitter.has_handlers('test_hook')).toBe(false);
    });
  });

  describe('handler_count', () => {
    it('should return 0 when no handlers are registered', () => {
      expect(emitter.handler_count('test_hook')).toBe(0);
    });

    it('should return correct count of registered handlers', () => {
      emitter.register('test_hook', vi.fn());
      expect(emitter.handler_count('test_hook')).toBe(1);

      emitter.register('test_hook', vi.fn());
      expect(emitter.handler_count('test_hook')).toBe(2);

      emitter.register('test_hook', vi.fn());
      expect(emitter.handler_count('test_hook')).toBe(3);
    });
  });

  describe('clear', () => {
    it('should clear all handlers for a specific hook', () => {
      emitter.register('hook1', vi.fn());
      emitter.register('hook1', vi.fn());
      emitter.register('hook2', vi.fn());

      emitter.clear('hook1');

      expect(emitter.has_handlers('hook1')).toBe(false);
      expect(emitter.has_handlers('hook2')).toBe(true);
    });
  });

  describe('clear_all', () => {
    it('should clear all handlers for all hooks', () => {
      emitter.register('hook1', vi.fn());
      emitter.register('hook2', vi.fn());
      emitter.register('hook3', vi.fn());

      emitter.clear_all();

      expect(emitter.has_handlers('hook1')).toBe(false);
      expect(emitter.has_handlers('hook2')).toBe(false);
      expect(emitter.has_handlers('hook3')).toBe(false);
    });
  });
});

