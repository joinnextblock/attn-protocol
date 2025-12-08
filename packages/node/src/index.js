#!/usr/bin/env node

// Load environment variables from .env file FIRST, before any other imports
import { load_env } from './lib/env-loader.js';
load_env();

import { logger } from './lib/logger.js';
import { ZeroMQToNostrBridge } from './lib/bridge.js';

// Handle graceful shutdown
let shutdown_in_progress = false;
let bridge = null;

const graceful_shutdown = async (signal) => {
  if (shutdown_in_progress) {
    logger.warn('Shutdown already in progress, forcing exit');
    process.exit(1);
  }
  
  shutdown_in_progress = true;
  logger.info({ signal }, 'Received shutdown signal, shutting down gracefully');
  
  try {
    if (bridge && typeof bridge.stop === 'function') {
      await bridge.stop();
    }
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGINT', () => graceful_shutdown('SIGINT'));
process.on('SIGTERM', () => graceful_shutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error({ err: error }, 'Uncaught Exception');
  graceful_shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled Rejection');
  graceful_shutdown('unhandledRejection');
});

// Start the bridge
bridge = new ZeroMQToNostrBridge();
bridge.start().catch(error => {
  logger.error({ err: error }, 'Bridge failed to start');
  process.exit(1);
});
