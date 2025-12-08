/**
 * Pino logger for Node Service
 * Provides structured, high-performance logging
 */

import pino from 'pino';

// Detect if running in test mode
const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

// Determine log level from environment or default to 'info'
// Set to 'silent' when running tests to suppress all log output
const logLevel = isTest ? 'silent' : (process.env.NODE_SERVICE_LOG_LEVEL || 'info');

// Configure pino with pretty printing in development
const isDevelopment = process.env.NODE_ENV !== 'production' && !isTest;

const pinoConfig = {
  level: logLevel,
  ...(isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss.l',
        ignore: 'pid,hostname'
      }
    }
  }),
  // Add custom serializers for better error handling
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err
  }
};

// Create and export the logger instance
export const logger = pino(pinoConfig);

// Export pino for creating child loggers
export { pino };

