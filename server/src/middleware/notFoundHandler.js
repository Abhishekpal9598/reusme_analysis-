import { sendError } from '../utils/apiResponse.js';

export const notFoundHandler = (req, res, next) => {
  return sendError(
    res,
    404,
    'ROUTE_NOT_FOUND',
    `Cannot ${req.method} ${req.originalUrl}`
  );
};
