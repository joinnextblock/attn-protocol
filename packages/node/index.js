#!/usr/bin/env node

// Load environment variables from .env file FIRST, before any other imports
import { load_env } from './src/lib/env-loader.js';
load_env();

import { logger } from './src/lib/logger.js';
import { ZeroMQToNostrBridge } from './src/lib/bridge.js';

// Handle graceful shutdown
let shutdownInProgress = false;

const gracefulShutdown = async (signal) => {
  if (shutdownInProgress) {
    logger.warn('Shutdown already in progress, forcing exit');
    process.exit(1);
  }
  
  shutdownInProgress = true;
  logger.info({ signal }, 'Received shutdown signal, shutting down gracefully');
  
  try {
    await bridge.stop();
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error({ err: error }, 'Uncaught Exception');
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled Rejection');
  gracefulShutdown('unhandledRejection');
});

// Start the bridge
const bridge = new ZeroMQToNostrBridge();
bridge.start().catch(error => {
  logger.error({ err: error }, 'Bridge failed to start');
  process.exit(1);
});
