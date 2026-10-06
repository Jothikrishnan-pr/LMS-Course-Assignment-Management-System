const ApiError = require('../utils/ApiError');

exports.notFound = (req, _res, next) => next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`, 'NOT_FOUND'));

// Central error handler: converts every known error type into a consistent JSON shape.
// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, _req, res, _next) => {
  let status = err.status || 500;
  let message = err.message;
  let code = err.code;
  let details = err.details;

  if (err.name === 'CastError') { status = 400; code = 'INVALID_ID'; message = `Invalid ${err.path}`; }
  else if (err.name === 'ValidationError') {
    status = 400; code = 'VALIDATION_ERROR'; message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.code === 11000) {
    status = 409; code = 'DUPLICATE'; message = `Duplicate value for: ${Object.keys(err.keyPattern || {}).join(', ')}`;
  } else if (err.type === 'entity.parse.failed') { status = 400; code = 'BAD_JSON'; message = 'Malformed JSON body'; }
  else if (['JsonWebTokenError', 'TokenExpiredError'].includes(err.name)) { status = 401; code = 'INVALID_TOKEN'; message = 'Invalid or expired token'; }

  if (status >= 500) {
    console.error(err);
    message = 'Internal server error';
    code = 'INTERNAL_ERROR';
  }
  res.status(status).json({ success: false, message, code, ...(details && { details }) });
};
