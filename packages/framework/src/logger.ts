/**
 * Logger interface and default logger implementation
 * Provides structured logging for the framework
 */

import pino from 'pino';

/**
 * Logger interface matching Pino's logger API
 * Allows services to provide their own logger implementation
 */
export interface Logger {
  debug(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
  debug(msg: string, ...args: unknown[]): void;
  info(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
  info(msg: string, ...args: unknown[]): void;
  warn(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
  warn(msg: string, ...args: unknown[]): void;
  error(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
  error(msg: string, ...args: unknown[]): void;
}

/**
 * Create default logger instance
 * Uses Pino with sensible defaults for production
 */
export function create_default_logger(): Logger {
  return pino({
    level: process.env.LOG_LEVEL || 'info',
    base: {
      name: '@attn-protocol/framework',
    },
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
  });
}

/**
 * Create a no-op logger for testing or when logging is disabled
 */
export function create_noop_logger(): Logger {
  const noop = () => {};
  return {
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
  };
}

