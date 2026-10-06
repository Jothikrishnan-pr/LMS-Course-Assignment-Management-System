const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { jwtAccessSecret } = require('../config/env');

// Authentication: verifies the access token and loads the current user from the DB
// (so deactivated/deleted users are rejected immediately).
exports.authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw new ApiError(401, 'Authentication required', 'NO_TOKEN');

  let payload;
  try {
    payload = jwt.verify(token, jwtAccessSecret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') throw new ApiError(401, 'Access token expired', 'TOKEN_EXPIRED');
    throw new ApiError(401, 'Invalid authentication token', 'INVALID_TOKEN');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw new ApiError(401, 'User no longer exists or is deactivated', 'INVALID_TOKEN');
  req.user = user;
  next();
});

// Authorization: restricts a route to the given roles.
exports.authorize = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ApiError(403, 'You do not have permission to perform this action', 'FORBIDDEN'));
  }
  next();
};
