import app from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { migrateLegacyApplicationStatuses } from './utils/migrateLegacyApplications.js';

const PORT = env.PORT;

// Establish database connection if configured
await connectDB();
await migrateLegacyApplicationStatuses();

const server = app.listen(PORT, () => {
  console.log(`[Server] CareerAI API running in ${env.NODE_ENV} mode on port ${PORT}`);
  console.log(`[Server] Health check: http://localhost:${PORT}/api/v1/health`);
});

// Handle graceful shutdown
const handleShutdown = async (signal) => {
  console.log(`[Server] Received ${signal}. Shutting down gracefully...`);
  await disconnectDB();
  server.close(() => {
    console.log('[Server] HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

export default server;
