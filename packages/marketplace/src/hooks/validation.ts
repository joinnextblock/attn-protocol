/**
 * Hook validation for @attn/marketplace
 */

import { REQUIRED_HOOKS } from './types.ts';
import type { HookEmitter } from './emitter.ts';

/**
 * Error thrown when required hooks are missing
 */
export class MissingHooksError extends Error {
  public readonly missing_hooks: string[];

  constructor(missing_hooks: string[]) {
    const message = `Missing required hook implementations: ${missing_hooks.join(', ')}\n\n` +
      `@attn/ts-marketplace requires you to bring your own implementations.\n` +
      `Register handlers for these hooks before calling start():\n\n` +
      missing_hooks.map(h => `  marketplace.on('${h}', async (ctx) => { /* your implementation */ });`).join('\n');

    super(message);
    this.name = 'MissingHooksError';
    this.missing_hooks = missing_hooks;
  }
}

/**
 * Validate that all required hooks are registered
 * @param emitter - Hook emitter to validate
 * @throws MissingHooksError if required hooks are missing
 */
export function validate_required_hooks(emitter: HookEmitter): void {
  const missing: string[] = [];

  for (const hook of REQUIRED_HOOKS) {
    if (!emitter.has(hook)) {
      missing.push(hook);
    }
  }

  if (missing.length > 0) {
    throw new MissingHooksError(missing);
  }
}

/**
 * Get list of missing required hooks (without throwing)
 * @param emitter - Hook emitter to check
 * @returns Array of missing hook names
 */
export function get_missing_required_hooks(emitter: HookEmitter): string[] {
  const missing: string[] = [];

  for (const hook of REQUIRED_HOOKS) {
    if (!emitter.has(hook)) {
      missing.push(hook);
    }
  }

  return missing;
}
