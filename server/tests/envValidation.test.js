import { describe, it, expect } from 'vitest';
import { validateEnv, DEV_FALLBACK_JWT_SECRET } from '../src/config/env.js';

describe('Environment Configuration Validation (env.js)', () => {
  describe('Development and Test Environments', () => {
    it('should validate successfully with minimal/default development configuration', () => {
      const result = validateEnv({
        NODE_ENV: 'development',
      });

      expect(result.success).toBe(true);
      expect(result.data.NODE_ENV).toBe('development');
      expect(result.data.JWT_SECRET).toBe(DEV_FALLBACK_JWT_SECRET);
      expect(result.data.PORT).toBe(5000);
      expect(result.data.CLIENT_URL).toBe('http://localhost:5173');
      expect(result.data.MONGODB_URI).toBeUndefined();
    });

    it('should validate successfully in test environment with fallbacks', () => {
      const result = validateEnv({
        NODE_ENV: 'test',
      });

      expect(result.success).toBe(true);
      expect(result.data.NODE_ENV).toBe('test');
      expect(result.data.JWT_SECRET).toBe(DEV_FALLBACK_JWT_SECRET);
    });

    it('should reject invalid CLIENT_URL format', () => {
      const result = validateEnv({
        NODE_ENV: 'development',
        CLIENT_URL: 'not-a-valid-url',
      });

      expect(result.success).toBe(false);
      expect(result.formattedErrors).toContain('CLIENT_URL');
    });
  });

  describe('Production Environment Security Enforcement', () => {
    const validProductionEnv = {
      NODE_ENV: 'production',
      PORT: '5000',
      CLIENT_URL: 'https://careerai.example.com',
      MONGODB_URI: 'mongodb+srv://produser:secret@cluster0.mongodb.net/careerai?retryWrites=true&w=majority',
      JWT_SECRET: 'production_super_secure_jwt_secret_key_with_at_least_32_characters',
    };

    it('should succeed when production configuration is fully valid and secure', () => {
      const result = validateEnv(validProductionEnv);

      expect(result.success).toBe(true);
      expect(result.data.NODE_ENV).toBe('production');
      expect(result.data.PORT).toBe(5000);
      expect(result.data.CLIENT_URL).toBe('https://careerai.example.com');
      expect(result.data.JWT_SECRET).toBe(validProductionEnv.JWT_SECRET);
      expect(result.data.MONGODB_URI).toBe(validProductionEnv.MONGODB_URI);
    });

    it('should reject production configuration when JWT_SECRET uses development fallback', () => {
      const result = validateEnv({
        ...validProductionEnv,
        JWT_SECRET: DEV_FALLBACK_JWT_SECRET,
      });

      expect(result.success).toBe(false);
      expect(result.formattedErrors).toContain('JWT_SECRET cannot use the development fallback in production');
    });

    it('should reject production configuration when JWT_SECRET is omitted', () => {
      const envWithoutSecret = { ...validProductionEnv };
      delete envWithoutSecret.JWT_SECRET;

      const result = validateEnv(envWithoutSecret);

      expect(result.success).toBe(false);
      expect(result.formattedErrors).toContain('JWT_SECRET cannot use the development fallback in production');
    });

    it('should reject production configuration when JWT_SECRET is shorter than 32 characters', () => {
      const result = validateEnv({
        ...validProductionEnv,
        JWT_SECRET: 'too_short_secret_under_32',
      });

      expect(result.success).toBe(false);
      expect(result.formattedErrors).toContain('JWT_SECRET must be at least 32 characters in production');
    });

    it('should reject production configuration when MONGODB_URI is missing', () => {
      const envWithoutMongo = { ...validProductionEnv };
      delete envWithoutMongo.MONGODB_URI;

      const result = validateEnv(envWithoutMongo);

      expect(result.success).toBe(false);
      expect(result.formattedErrors).toContain('MONGODB_URI is required in production');
    });

    it('should reject production configuration when MONGODB_URI is an empty string', () => {
      const result = validateEnv({
        ...validProductionEnv,
        MONGODB_URI: '   ',
      });

      expect(result.success).toBe(false);
      expect(result.formattedErrors).toContain('MONGODB_URI is required in production');
    });

    it('should never expose secret values in formatted error messages', () => {
      const sensitiveToken = 'sensitive_custom_token_12345';
      const result = validateEnv({
        ...validProductionEnv,
        JWT_SECRET: sensitiveToken, // < 32 chars
      });

      expect(result.success).toBe(false);
      expect(result.formattedErrors).not.toContain(sensitiveToken);
    });

    it('should default COOKIE_SAMESITE to lax and allow valid cookie options', () => {
      const result = validateEnv({
        ...validProductionEnv,
        COOKIE_SAMESITE: 'strict',
        COOKIE_DOMAIN: '.careerai.com',
      });

      expect(result.success).toBe(true);
      expect(result.data.COOKIE_SAMESITE).toBe('strict');
      expect(result.data.COOKIE_DOMAIN).toBe('.careerai.com');
    });

    it('should reject invalid COOKIE_SAMESITE values', () => {
      const result = validateEnv({
        ...validProductionEnv,
        COOKIE_SAMESITE: 'invalid_mode',
      });

      expect(result.success).toBe(false);
      expect(result.formattedErrors).toContain('COOKIE_SAMESITE');
    });
  });
});
