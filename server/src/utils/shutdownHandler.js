import { disconnectDB } from '../config/db.js';
import { logger } from './logger.js';

let isShuttingDown = false;

/**
 * Perform a clean, graceful shutdown of HTTP server and database connections.
 * Guarantees idempotency so multiple signals cannot trigger parallel shutdowns.
 *
 * @param {import('http').Server|null} server
 * @param {string} signal
 * @param {Object} [options]
 * @param {number} [options.exitCode=0]
 * @param {number} [options.timeoutMs=5000]
 * @param {boolean} [options.exitOnFinish=true]
 * @returns {Promise<void>}
 */
export const initiateShutdown = async (server, signal, options = {}) => {
  const { exitCode = 0, timeoutMs = 5000, exitOnFinish = true } = options;

  if (isShuttingDown) {
    logger.warn(`Shutdown already in progress. Ignoring duplicate signal: ${signal}`);
    return;
  }

  isShuttingDown = true;
  logger.info(`Received ${signal}. Initiating graceful shutdown...`);

  // Force process exit if graceful teardown exceeds timeoutMs
  let forceExitTimer = null;
  if (exitOnFinish) {
    forceExitTimer = setTimeout(() => {
      logger.error(`Graceful shutdown timed out after ${timeoutMs}ms. Forcing exit.`);
      process.exit(1);
    }, timeoutMs);
    if (forceExitTimer.unref) forceExitTimer.unref();
  }

  try {
    // 1. Close HTTP server and stop accepting new connections
    if (server && server.listening) {
      await new Promise((resolve) => {
        server.close((err) => {
          if (err) {
            logger.warn(`Error while closing HTTP server: ${err.message}`);
          } else {
            logger.info('HTTP server closed successfully.');
          }
          resolve();
        });
      });
    }

    // 2. Disconnect database connections cleanly
    await disconnectDB();
    logger.info('Database disconnected cleanly.');

    if (forceExitTimer) clearTimeout(forceExitTimer);

    if (exitOnFinish) {
      logger.info(`Graceful shutdown complete. Exiting with code ${exitCode}.`);
      process.exit(exitCode);
    }
  } catch (err) {
    logger.error(`Error during graceful shutdown: ${err.message}`);
    if (forceExitTimer) clearTimeout(forceExitTimer);
    if (exitOnFinish) {
      process.exit(1);
    }
  }
};

/**
 * Configure global process error and termination signal handlers.
 *
 * @param {import('http').Server} server
 * @param {Object} [options]
 */
export const setupProcessExceptionHandlers = (server, options = {}) => {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason) => {
    const errorMsg = reason instanceof Error ? reason.message : String(reason);
    logger.error(`[Process] Unhandled Promise Rejection: ${errorMsg}`, {
      stack: reason instanceof Error ? reason.stack : undefined,
    });
    // For fatal unhandled rejections in production, initiate clean shutdown
    initiateShutdown(server, 'unhandledRejection', { exitCode: 1, ...options });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    logger.error(`[Process] Uncaught Exception: ${err.message}`, {
      stack: err.stack,
    });
    // Never continue execution in an unknown corrupted state
    initiateShutdown(server, 'uncaughtException', { exitCode: 1, ...options });
  });

  // Handle OS termination signals
  process.on('SIGTERM', () => initiateShutdown(server, 'SIGTERM', { exitCode: 0, ...options }));
  process.on('SIGINT', () => initiateShutdown(server, 'SIGINT', { exitCode: 0, ...options }));
};

/**
 * Helper for test suites to reset shutdown state.
 */
export const resetShutdownState = () => {
  isShuttingDown = false;
};

export const getShutdownState = () => isShuttingDown;

export default {
  initiateShutdown,
  setupProcessExceptionHandlers,
  resetShutdownState,
  getShutdownState,
};
