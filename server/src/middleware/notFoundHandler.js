import { sendError } from '../utils/apiResponse.js';

export const notFoundHandler = (req, res, next) => {
  const safePath = (req.originalUrl || req.url || '').split('?')[0];
  return sendError(
    res,
    404,
    'ROUTE_NOT_FOUND',
    `Cannot ${req.method} ${safePath}`
  );
};
