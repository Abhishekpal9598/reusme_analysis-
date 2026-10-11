import mongoose from 'mongoose';
import { env } from './env.js';

let isConnecting = false;

/**
 * Connect to MongoDB Atlas or local MongoDB instance
 */
export const connectDB = async (customUri = null) => {
  const uri = customUri || env.MONGODB_URI;

  if (!uri || !uri.trim()) {
    if (env.NODE_ENV !== 'test') {
      console.warn('[Database] MONGODB_URI is not defined. Running without persistent database connection.');
    }
    return null;
  }

  // Reuse existing active connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (isConnecting) {
    return mongoose.connection;
  }

  try {
    isConnecting = true;
    
    // Sanitize logging to hide username/password credentials completely
    const sanitizedHost = uri.includes('@')
      ? uri.split('@')[1].split('/')[0].split('?')[0]
      : 'localhost';
    console.log(`[Database] Connecting to MongoDB Atlas host: ${sanitizedHost}...`);

    const conn = await mongoose.connect(uri.trim(), {
      dbName: 'careerai',
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });

    console.log(`[Database] MongoDB Connected successfully: host=${conn.connection.host}, database=${conn.connection.name}`);
    isConnecting = false;
    return conn;
  } catch (error) {
    isConnecting = false;
    console.error(`[Database] MongoDB Connection Failed: ${error.message}`);
    if (env.NODE_ENV === 'production') {
      throw error;
    }
    return null;
  }
};

/**
 * Disconnect from MongoDB (for testing and graceful shutdown)
 */
export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[Database] MongoDB Disconnected cleanly.');
  }
};

export default { connectDB, disconnectDB };
