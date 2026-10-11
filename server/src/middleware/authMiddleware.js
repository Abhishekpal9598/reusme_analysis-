import { verifyToken } from '../utils/token.js';
import { sendError } from '../utils/apiResponse.js';
import { User } from '../models/User.js';

export const authMiddleware = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check HttpOnly cookie
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // 2. Fallback to Authorization Header (Bearer token)
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return sendError(
        res,
        401,
        'UNAUTHORIZED',
        'Authentication required. Please sign in to access this resource.'
      );
    }

    // 3. Verify JWT signature and expiration
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return sendError(res, 401, 'TOKEN_EXPIRED', 'Session expired. Please sign in again.');
      }
      return sendError(res, 401, 'INVALID_TOKEN', 'Invalid authentication token.');
    }

    // 4. Verify user exists in database
    const user = await User.findById(decoded.userId);
    if (!user) {
      return sendError(res, 401, 'USER_NOT_FOUND', 'The user belonging to this session no longer exists.');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export default authMiddleware;
