import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { registerSchema, loginSchema } from '../validators/authValidators.js';
import { generateToken, setAuthCookie, clearAuthCookie } from '../utils/token.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

const BCRYPT_SALT_ROUNDS = 10;

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user account and initialize HttpOnly cookie session
 * @access  Public
 */
export const register = async (req, res, next) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      const details = validation.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        issue: issue.message,
      }));
      return sendError(res, 400, 'VALIDATION_ERROR', 'Input validation failed', details);
    }

    const { fullName, email, password } = validation.data;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendError(
        res,
        409,
        'EMAIL_ALREADY_EXISTS',
        'An account with this email address already exists.'
      );
    }

    // Hash password securely with bcrypt
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Create new User record
    const user = await User.create({
      fullName,
      email,
      passwordHash,
    });

    // Generate JWT and set HttpOnly session cookie
    const token = generateToken(user);
    setAuthCookie(res, token);

    return sendSuccess(
      res,
      201,
      { user: user.toJSON() },
      'Account created successfully.'
    );
  } catch (error) {
    // Handle MongoDB duplicate key error race condition safely
    if (error.code === 11000) {
      return sendError(
        res,
        409,
        'EMAIL_ALREADY_EXISTS',
        'An account with this email address already exists.'
      );
    }
    next(error);
  }
};

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user credentials and set HttpOnly cookie session
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      const details = validation.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        issue: issue.message,
      }));
      return sendError(res, 400, 'VALIDATION_ERROR', 'Input validation failed', details);
    }

    const { email, password } = validation.data;

    // Retrieve user and explicitly select passwordHash
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      return sendError(
        res,
        401,
        'INVALID_CREDENTIALS',
        'Invalid email or password'
      );
    }

    // Compare passwords with constant-time bcrypt verification
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return sendError(
        res,
        401,
        'INVALID_CREDENTIALS',
        'Invalid email or password'
      );
    }

    // Generate JWT and set HttpOnly session cookie
    const token = generateToken(user);
    setAuthCookie(res, token);

    return sendSuccess(
      res,
      200,
      { user: user.toJSON() },
      'Signed in successfully.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Clear session cookie and invalidate client state
 * @access  Public / Authenticated
 */
export const logout = (req, res) => {
  clearAuthCookie(res);
  return sendSuccess(res, 200, {}, 'Successfully logged out.');
};

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get currently authenticated user identity
 * @access  Protected
 */
export const getMe = (req, res) => {
  return sendSuccess(res, 200, { user: req.user.toJSON() });
};

export default { register, login, logout, getMe };
