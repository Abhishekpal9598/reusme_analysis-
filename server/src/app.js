import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { corsOptions } from './config/cors.js';
import v1Routes from './routes/index.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';
import { mongoSanitizeMiddleware } from './middleware/mongoSanitizeMiddleware.js';
import { globalRateLimiter } from './middleware/rateLimitMiddleware.js';
import { requestLogger } from './utils/logger.js';
import { sendSuccess } from './utils/apiResponse.js';

const app = express();

// 1. Correlation ID and Request Logging
app.use(requestLogger);

// 2. Security Headers
app.use(helmet());

// 2. CORS Policy
app.use(cors(corsOptions));

// 3. Body & Cookie Parsers with strict size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// 4. NoSQL Operator & Dotted Path Injection Protection
app.use(mongoSanitizeMiddleware);

// Root endpoint
app.get('/', (req, res) => {
  return sendSuccess(
    res,
    200,
    {
      health: '/api/v1/health',
      apiVersion: 'v1',
    },
    'Welcome to CareerAI API'
  );
});

// 5. Global API Rate Limiter
app.use('/api/v1', globalRateLimiter);

// 6. API Routes
app.use('/api/v1', v1Routes);

// 7. 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
