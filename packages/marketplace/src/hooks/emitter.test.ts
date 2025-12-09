/**
 * Tests for HookEmitter class
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HookEmitter } from './emitter.ts';

describe('HookEmitter', () => {
  let emitter: HookEmitter;

  beforeEach(() => {
    emitter = new HookEmitter();
  });

  describe('register', () => {
    it('should register a hook handler', () => {
      const handler = vi.fn();
      emitter.register('store_promotion', handler);
      expect(emitter.has('store_promotion')).toBe(true);
    });

    it('should overwrite existing handler when registering same hook', () => {
      const handler1 = vi.fn().mockResolvedValue('first');
      const handler2 = vi.fn().mockResolvedValue('second');

      emitter.register('store_promotion', handler1);
      emitter.register('store_promotion', handler2);

      expect(emitter.has('store_promotion')).toBe(true);
    });

    it('should return a handle for unregistering', () => {
      const handler = vi.fn();
      const handle = emitter.register('store_promotion', handler);

      expect(handle).toBeDefined();
      expect(typeof handle.unregister).toBe('function');
    });

    it('should unregister handler when handle.unregister is called', () => {
      const handler = vi.fn();
      const handle = emitter.register('store_promotion', handler);

      expect(emitter.has('store_promotion')).toBe(true);
      handle.unregister();
      expect(emitter.has('store_promotion')).toBe(false);
    });

    it('should not unregister if handler was replaced', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const handle1 = emitter.register('store_promotion', handler1);
      emitter.register('store_promotion', handler2);

      // Unregistering the first handle should not affect the second handler
      handle1.unregister();
      expect(emitter.has('store_promotion')).toBe(true);
    });
  });

  describe('has', () => {
    it('should return true for registered hook', () => {
      emitter.register('store_promotion', vi.fn());
      expect(emitter.has('store_promotion')).toBe(true);
    });

    it('should return false for unregistered hook', () => {
      expect(emitter.has('store_promotion')).toBe(false);
    });
  });

  describe('get_registered', () => {
    it('should return empty array when no hooks registered', () => {
      expect(emitter.get_registered()).toEqual([]);
    });

    it('should return array of registered hook names', () => {
      emitter.register('store_promotion', vi.fn());
      emitter.register('store_attention', vi.fn());
      emitter.register('exists', vi.fn());

      const registered = emitter.get_registered();
      expect(registered).toContain('store_promotion');
      expect(registered).toContain('store_attention');
      expect(registered).toContain('exists');
      expect(registered).toHaveLength(3);
    });
  });

  describe('emit', () => {
    it('should call handler with context and return result', async () => {
      const handler = vi.fn().mockResolvedValue({ exists: true });
      emitter.register('exists', handler);

      const context = { event_id: 'test-id', event_type: 'promotion' as const };
      const result = await emitter.emit('exists', context);

      expect(handler).toHaveBeenCalledWith(context);
      expect(result).toEqual({ exists: true });
    });

    it('should return undefined if hook not registered', async () => {
      const result = await emitter.emit('exists', { event_id: 'test-id', event_type: 'promotion' as const });
      expect(result).toBeUndefined();
    });

    it('should handle async handlers', async () => {
      const handler = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { exists: false };
      });
      emitter.register('exists', handler);

      const result = await emitter.emit('exists', { event_id: 'test-id', event_type: 'promotion' as const });
      expect(result).toEqual({ exists: false });
    });
  });

  describe('emit_required', () => {
    it('should call handler and return result', async () => {
      const handler = vi.fn().mockResolvedValue({ exists: true });
      emitter.register('exists', handler);

      const context = { event_id: 'test-id', event_type: 'promotion' as const };
      const result = await emitter.emit_required('exists', context);

      expect(handler).toHaveBeenCalledWith(context);
      expect(result).toEqual({ exists: true });
    });

    it('should throw error if hook not registered', async () => {
      await expect(
        emitter.emit_required('exists', { event_id: 'test-id', event_type: 'promotion' as const })
      ).rejects.toThrow("Required hook 'exists' is not registered");
    });

    it('should include hook name in error message', async () => {
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        emitter.emit_required('store_promotion', {} as any)
      ).rejects.toThrow("store_promotion");
    });
  });

  describe('clear', () => {
    it('should remove all registered handlers', () => {
      emitter.register('store_promotion', vi.fn());
      emitter.register('store_attention', vi.fn());
      emitter.register('exists', vi.fn());

      expect(emitter.get_registered()).toHaveLength(3);

      emitter.clear();

      expect(emitter.get_registered()).toHaveLength(0);
      expect(emitter.has('store_promotion')).toBe(false);
      expect(emitter.has('store_attention')).toBe(false);
      expect(emitter.has('exists')).toBe(false);
    });
  });

  describe('integration', () => {
    it('should handle void-returning handlers', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      emitter.register('store_promotion', handler);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await emitter.emit('store_promotion', {} as any);
      expect(result).toBeUndefined();
      expect(handler).toHaveBeenCalled();
    });

    it('should handle handlers that throw errors', async () => {
      const error = new Error('Handler error');
      const handler = vi.fn().mockRejectedValue(error);
      emitter.register('exists', handler);

      await expect(
        emitter.emit('exists', { event_id: 'test-id', event_type: 'promotion' as const })
      ).rejects.toThrow('Handler error');
    });
  });
});
