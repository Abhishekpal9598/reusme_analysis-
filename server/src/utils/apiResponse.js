/**
 * Standard API response envelope helpers
 */

export const sendSuccess = (res, statusCode = 200, data = {}, message = null, meta = null) => {
  const payload = {
    success: true,
    ...(message && { message }),
    data,
    ...(meta && { meta }),
    timestamp: new Date().toISOString(),
  };

  return res.status(statusCode).json(payload);
};

export const sendError = (res, statusCode = 500, code = 'INTERNAL_ERROR', message = 'An unexpected error occurred', details = []) => {
  const payload = {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
  };

  return res.status(statusCode).json(payload);
};
