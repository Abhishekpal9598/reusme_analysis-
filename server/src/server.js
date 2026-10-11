import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { migrateLegacyApplicationStatuses } from './utils/migrateLegacyApplications.js';
import { setupProcessExceptionHandlers } from './utils/shutdownHandler.js';
import { logger } from './utils/logger.js';

const PORT = env.PORT;

// Establish database connection if configured
await connectDB();
await migrateLegacyApplicationStatuses();

const server = app.listen(PORT, () => {
  logger.info(`[Server] CareerAI API running in ${env.NODE_ENV} mode on port ${PORT}`);
  logger.info(`[Server] Health check: http://localhost:${PORT}/api/v1/health`);
});

// Configure process exception and termination signal handlers
setupProcessExceptionHandlers(server);

export default server;
