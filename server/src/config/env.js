import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server/.env regardless of invocation Cwd
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config(); // fallback to current working directory if present


export const DEV_FALLBACK_JWT_SECRET = 'careerai_development_jwt_secret_min_32_bytes_safe_fallback';

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(5000),
    CLIENT_URL: z.string().url().default('http://localhost:5173'),
    MONGODB_URI: z.string().optional(),
    GEMINI_API_KEY: z.string().trim().optional(),
    GEMINI_MODEL: z.string().default('gemini-3.8-flash'),
    GEMINI_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
    JWT_SECRET: z.string().min(16).default(DEV_FALLBACK_JWT_SECRET),
    JWT_EXPIRES_IN: z.string().default('7d'),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      if (!data.JWT_SECRET || data.JWT_SECRET.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_SECRET'],
          message: 'JWT_SECRET is required in production.',
        });
      } else if (data.JWT_SECRET === DEV_FALLBACK_JWT_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_SECRET'],
          message: 'JWT_SECRET cannot use the development fallback in production.',
        });
      } else if (data.JWT_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_SECRET'],
          message: 'JWT_SECRET must be at least 32 characters in production.',
        });
      }

      if (!data.MONGODB_URI || !data.MONGODB_URI.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['MONGODB_URI'],
          message: 'MONGODB_URI is required in production.',
        });
      }
    }
  });

export function validateEnv(rawEnv = process.env) {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    const formattedErrors = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    return {
      success: false,
      error: result.error,
      formattedErrors,
    };
  }
  return {
    success: true,
    data: Object.freeze(result.data),
  };
}

const validation = validateEnv(process.env);

if (!validation.success) {
  console.error(`\x1b[31m[Environment Validation Error]\x1b[0m\n${validation.formattedErrors}`);
  throw new Error('Invalid environment configuration. Please check your .env file.');
}

export const env = validation.data;

