import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const COOKIE_NAME = 'token';
export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Generate signed JWT for authenticated user identity
 */
export const generateToken = (user) => {
  const payload = {
    userId: user._id ? user._id.toString() : user.id,
    email: user.email,
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
};

/**
 * Verify JWT token
 */
export const verifyToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};

/**
 * Return standardized authentication cookie options based on environment and topology
 */
export const getAuthCookieOptions = (customEnv = env) => {
  const isProduction = customEnv.NODE_ENV === 'production';
  const sameSite = customEnv.COOKIE_SAMESITE || 'lax';

  const options = {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    path: '/',
  };

  if (customEnv.COOKIE_DOMAIN) {
    options.domain = customEnv.COOKIE_DOMAIN;
  }

  return options;
};

/**
 * Attach HttpOnly JWT session cookie to Express response
 */
export const setAuthCookie = (res, token) => {
  res.cookie(COOKIE_NAME, token, {
    ...getAuthCookieOptions(),
    maxAge: SEVEN_DAYS_MS,
  });
};

/**
 * Clear authentication cookie upon logout
 * Uses matching attributes (path, httpOnly, secure, sameSite, domain) to ensure browser cleanly evicts cookie
 */
export const clearAuthCookie = (res) => {
  res.clearCookie(COOKIE_NAME, getAuthCookieOptions());
};

export default { generateToken, verifyToken, getAuthCookieOptions, setAuthCookie, clearAuthCookie, COOKIE_NAME, SEVEN_DAYS_MS };

