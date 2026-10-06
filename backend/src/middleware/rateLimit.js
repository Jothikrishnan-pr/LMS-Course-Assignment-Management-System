const rateLimit = require('express-rate-limit');

const make = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message, code: 'RATE_LIMITED' },
  });

exports.apiLimiter = make(15 * 60 * 1000, 500, 'Too many requests, please try again later');
exports.authLimiter = make(15 * 60 * 1000, 30, 'Too many authentication attempts, please try again later');
