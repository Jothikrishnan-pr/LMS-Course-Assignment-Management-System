const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');

// Validate req[source] against a zod schema and replace it with the parsed (sanitised) value.
exports.validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return next(new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', details));
  }
  if (source === 'query') Object.defineProperty(req, 'query', { value: result.data, writable: true });
  else req[source] = result.data;
  next();
};

// Rejects malformed ObjectIds in route params with a clean 400 instead of a CastError.
exports.validateId = (...params) => (req, _res, next) => {
  for (const p of params) {
    if (!mongoose.isValidObjectId(req.params[p])) {
      return next(new ApiError(400, `Invalid ${p}`, 'INVALID_ID'));
    }
  }
  next();
};
