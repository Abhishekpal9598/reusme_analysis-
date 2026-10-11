import { env } from '../config/env.js';

// In-memory store for tracking failed login attempts per normalized email
const loginAttempts = new Map();

// Periodic cleanup of stale entries every 15 minutes
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;
const MAX_ENTRY_AGE_MS = 60 * 60 * 1000; // 1 hour

let cleanupTimer = null;
if (typeof setInterval !== 'undefined') {
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [email, record] of loginAttempts.entries()) {
      if (now - record.lastAttempt > MAX_ENTRY_AGE_MS && now >= record.lockUntil) {
        loginAttempts.delete(email);
      }
    }
  }, CLEANUP_INTERVAL_MS);
  if (cleanupTimer && cleanupTimer.unref) {
    cleanupTimer.unref(); // Do not hold Node process open in test runs
  }
}

/**
 * Calculates exponential backoff in seconds based on attempts.
 * After threshold (e.g. 5 failed attempts):
 * 5 attempts -> 2^(0) * 15 = 15s
 * 6 attempts -> 2^(1) * 15 = 30s
 * 7 attempts -> 2^(2) * 15 = 60s
 * 8 attempts -> 2^(3) * 15 = 120s
 * ... capped at 900s (15 minutes).
 *
 * @param {number} attempts
 * @param {number} [threshold]
 * @returns {number} backoff in seconds
 */
export const calculateBackoffSeconds = (attempts, threshold = env.RATE_LIMIT_ACCOUNT_MAX) => {
  if (attempts < threshold) return 0;
  const exponent = attempts - threshold;
  const backoff = Math.pow(2, exponent) * 15;
  return Math.min(900, backoff);
};

/**
 * Check if an account is currently rate-limited by progressive backoff.
 *
 * @param {string} email
 * @returns {{ isLocked: boolean, remainingSeconds: number, attempts: number }}
 */
export const getAccountLockStatus = (email) => {
  if (!email || typeof email !== 'string') {
    return { isLocked: false, remainingSeconds: 0, attempts: 0 };
  }
  const key = email.trim().toLowerCase();
  const record = loginAttempts.get(key);
  if (!record) {
    return { isLocked: false, remainingSeconds: 0, attempts: 0 };
  }

  const now = Date.now();
  if (record.lockUntil && record.lockUntil > now) {
    const remainingSeconds = Math.ceil((record.lockUntil - now) / 1000);
    return { isLocked: true, remainingSeconds, attempts: record.attempts };
  }

  return { isLocked: false, remainingSeconds: 0, attempts: record.attempts };
};

/**
 * Record a failed authentication attempt and update lockout window if threshold is met.
 *
 * @param {string} email
 * @returns {{ attempts: number, isLocked: boolean, remainingSeconds: number }}
 */
export const recordFailedLogin = (email) => {
  if (!email || typeof email !== 'string') {
    return { attempts: 0, isLocked: false, remainingSeconds: 0 };
  }
  const key = email.trim().toLowerCase();
  const now = Date.now();
  const threshold = env.RATE_LIMIT_ACCOUNT_MAX;

  const existing = loginAttempts.get(key) || { attempts: 0, lastAttempt: now, lockUntil: 0 };
  const attempts = existing.attempts + 1;
  const backoffSeconds = calculateBackoffSeconds(attempts, threshold);
  const lockUntil = backoffSeconds > 0 ? now + backoffSeconds * 1000 : 0;

  loginAttempts.set(key, {
    attempts,
    lastAttempt: now,
    lockUntil,
  });

  return {
    attempts,
    isLocked: backoffSeconds > 0,
    remainingSeconds: backoffSeconds,
  };
};

/**
 * Record a successful authentication attempt and clear lockout record.
 *
 * @param {string} email
 */
export const recordSuccessfulLogin = (email) => {
  if (!email || typeof email !== 'string') return;
  const key = email.trim().toLowerCase();
  loginAttempts.delete(key);
};

/**
 * Reset all tracked login attempts (useful for testing).
 */
export const clearLoginAttempts = () => {
  loginAttempts.clear();
};
