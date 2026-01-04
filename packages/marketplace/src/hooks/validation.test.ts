/**
 * Tests for hook validation functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HookEmitter } from './emitter.ts';
import { validate_required_hooks, get_missing_required_hooks, MissingHooksError } from './validation.ts';
import { REQUIRED_HOOKS } from './types.ts';

describe('validate_required_hooks', () => {
  let emitter: HookEmitter;

  beforeEach(() => {
    emitter = new HookEmitter();
  });

  it('should throw MissingHooksError when no hooks are registered', () => {
    expect(() => validate_required_hooks(emitter)).toThrow(MissingHooksError);
  });

  it('should throw error listing all missing hooks', () => {
    try {
      validate_required_hooks(emitter);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(MissingHooksError);
      const missing_error = error as MissingHooksError;
      expect(missing_error.missing_hooks).toEqual(REQUIRED_HOOKS);
    }
  });

  it('should throw error when some required hooks are missing', () => {
    emitter.register('store_promotion', vi.fn());
    emitter.register('store_attention', vi.fn());

    try {
      validate_required_hooks(emitter);
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(MissingHooksError);
      const missing_error = error as MissingHooksError;
      expect(missing_error.missing_hooks).not.toContain('store_promotion');
      expect(missing_error.missing_hooks).not.toContain('store_attention');
      expect(missing_error.missing_hooks).toContain('store_billboard');
      expect(missing_error.missing_hooks).toContain('store_match');
      expect(missing_error.missing_hooks).toContain('query_promotions');
      expect(missing_error.missing_hooks).toContain('find_matches');
      expect(missing_error.missing_hooks).toContain('exists');
      expect(missing_error.missing_hooks).toContain('get_aggregates');
    }
  });

  it('should not throw when all required hooks are registered', () => {
    // Register all required hooks
    emitter.register('store_promotion', vi.fn());
    emitter.register('store_attention', vi.fn());
    emitter.register('store_billboard', vi.fn());
    emitter.register('store_match', vi.fn());
    emitter.register('query_promotions', vi.fn());
    emitter.register('find_matches', vi.fn());
    emitter.register('exists', vi.fn());
    emitter.register('get_aggregates', vi.fn());

    expect(() => validate_required_hooks(emitter)).not.toThrow();
  });

  it('should pass when required hooks registered plus optional hooks', () => {
    // Register all required hooks
    emitter.register('store_promotion', vi.fn());
    emitter.register('store_attention', vi.fn());
    emitter.register('store_billboard', vi.fn());
    emitter.register('store_match', vi.fn());
    emitter.register('query_promotions', vi.fn());
    emitter.register('find_matches', vi.fn());
    emitter.register('exists', vi.fn());
    emitter.register('get_aggregates', vi.fn());

    // Register optional hooks
    emitter.register('store_marketplace', vi.fn());
    emitter.register('block_boundary', vi.fn());
    emitter.register('validate_promotion', vi.fn());

    expect(() => validate_required_hooks(emitter)).not.toThrow();
  });
});

describe('get_missing_required_hooks', () => {
  let emitter: HookEmitter;

  beforeEach(() => {
    emitter = new HookEmitter();
  });

  it('should return all required hooks when none are registered', () => {
    const missing = get_missing_required_hooks(emitter);
    expect(missing).toEqual([...REQUIRED_HOOKS]);
  });

  it('should return empty array when all required hooks are registered', () => {
    emitter.register('store_promotion', vi.fn());
    emitter.register('store_attention', vi.fn());
    emitter.register('store_billboard', vi.fn());
    emitter.register('store_match', vi.fn());
    emitter.register('query_promotions', vi.fn());
    emitter.register('find_matches', vi.fn());
    emitter.register('exists', vi.fn());
    emitter.register('get_aggregates', vi.fn());

    const missing = get_missing_required_hooks(emitter);
    expect(missing).toEqual([]);
  });

  it('should return only missing hooks', () => {
    emitter.register('store_promotion', vi.fn());
    emitter.register('exists', vi.fn());
    emitter.register('get_aggregates', vi.fn());

    const missing = get_missing_required_hooks(emitter);
    expect(missing).not.toContain('store_promotion');
    expect(missing).not.toContain('exists');
    expect(missing).not.toContain('get_aggregates');
    expect(missing).toContain('store_attention');
    expect(missing).toContain('store_billboard');
    expect(missing).toContain('store_match');
    expect(missing).toContain('query_promotions');
    expect(missing).toContain('find_matches');
  });
});

describe('MissingHooksError', () => {
  it('should have correct name', () => {
    const error = new MissingHooksError(['store_promotion']);
    expect(error.name).toBe('MissingHooksError');
  });

  it('should store missing hooks array', () => {
    const missing = ['store_promotion', 'exists'];
    const error = new MissingHooksError(missing);
    expect(error.missing_hooks).toEqual(missing);
  });

  it('should have descriptive message', () => {
    const error = new MissingHooksError(['store_promotion', 'exists']);
    expect(error.message).toContain('store_promotion');
    expect(error.message).toContain('exists');
    expect(error.message).toContain('Missing required hook implementations');
    expect(error.message).toContain('@attn/ts-marketplace');
  });

  it('should include example registration code in message', () => {
    const error = new MissingHooksError(['store_promotion']);
    expect(error.message).toContain("marketplace.on('store_promotion'");
  });
});

describe('REQUIRED_HOOKS', () => {
  it('should contain expected hooks', () => {
    expect(REQUIRED_HOOKS).toContain('store_promotion');
    expect(REQUIRED_HOOKS).toContain('store_attention');
    expect(REQUIRED_HOOKS).toContain('store_billboard');
    expect(REQUIRED_HOOKS).toContain('store_match');
    expect(REQUIRED_HOOKS).toContain('query_promotions');
    expect(REQUIRED_HOOKS).toContain('find_matches');
    expect(REQUIRED_HOOKS).toContain('exists');
    expect(REQUIRED_HOOKS).toContain('get_aggregates');
  });

  it('should have exactly 8 required hooks', () => {
    expect(REQUIRED_HOOKS).toHaveLength(8);
  });
});
