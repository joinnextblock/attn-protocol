/**
 * Hook event emitter for attn framework
 * Provides infrastructure for registering and emitting lifecycle hooks
 */

import type {
  HookHandler,
  HookHandle,
  HookContext,
} from './types.js';
import type { Logger } from '../logger.js';
import { create_default_logger } from '../logger.js';

/**
 * Hook emitter that manages hook registration and execution
 */
export class HookEmitter {
  private handlers: Map<string, Set<HookHandler>> = new Map();
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger ?? create_default_logger();
  }

  /**
   * Register a handler for a specific hook
   * @param hook_name - Name of the hook (e.g., 'on_relay_connect')
   * @param handler - Handler function to call when hook fires
   * @returns Handle for unregistering the handler
   */
  register<T extends HookContext = HookContext>(
    hook_name: string,
    handler: HookHandler<T>
  ): HookHandle {
    if (!this.handlers.has(hook_name)) {
      this.handlers.set(hook_name, new Set());
    }

    const handler_set = this.handlers.get(hook_name)!;
    handler_set.add(handler as HookHandler);

    return {
      unregister: () => {
        handler_set.delete(handler as HookHandler);
        if (handler_set.size === 0) {
          this.handlers.delete(hook_name);
        }
      },
    };
  }

  /**
   * Emit a hook event to all registered handlers
   * Handlers execute in registration order
   * @param hook_name - Name of the hook to emit
   * @param context - Context data to pass to handlers
   */
  async emit<T extends HookContext = HookContext>(
    hook_name: string,
    context: T
  ): Promise<void> {
    const handler_set = this.handlers.get(hook_name);
    if (!handler_set || handler_set.size === 0) {
      return;
    }

    // Execute handlers in registration order
    const handlers = Array.from(handler_set);
    for (const handler of handlers) {
      try {
        await handler(context);
      } catch (error) {
        // Log error but don't stop other handlers
        this.logger.error({
          hook_name,
          error: error instanceof Error ? error.message : String(error),
        }, 'Error in hook handler');
      }
    }
  }

  /**
   * Check if any handlers are registered for a hook
   * @param hook_name - Name of the hook to check
   * @returns True if handlers are registered
   */
  has_handlers(hook_name: string): boolean {
    const handler_set = this.handlers.get(hook_name);
    return handler_set !== undefined && handler_set.size > 0;
  }

  /**
   * Get count of registered handlers for a hook
   * @param hook_name - Name of the hook to check
   * @returns Number of registered handlers
   */
  handler_count(hook_name: string): number {
    const handler_set = this.handlers.get(hook_name);
    return handler_set?.size ?? 0;
  }

  /**
   * Clear all handlers for a hook
   * @param hook_name - Name of the hook to clear
   */
  clear(hook_name: string): void {
    this.handlers.delete(hook_name);
  }

  /**
   * Clear all handlers for all hooks
   */
  clear_all(): void {
    this.handlers.clear();
  }
}

