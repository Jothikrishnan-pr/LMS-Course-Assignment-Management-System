const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const audit = require('../utils/audit');
const env = require('../config/env');

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

async function issueTokens(user) {
  const accessToken = jwt.sign({ sub: user.id, role: user.role }, env.jwtAccessSecret, { expiresIn: env.accessTtl });
  const refreshToken = jwt.sign({ sub: user.id, jti: crypto.randomUUID() }, env.jwtRefreshSecret, {
    expiresIn: `${env.refreshTtlDays}d`,
  });
  await RefreshToken.create({
    user: user._id,
    tokenHash: sha256(refreshToken),
    expiresAt: new Date(Date.now() + env.refreshTtlDays * 86400 * 1000),
  });
  return { accessToken, refreshToken };
}

// Public registration always creates a STUDENT. Trainers/Admins are created by an Admin.
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.exists({ email })) throw new ApiError(409, 'Email already registered', 'EMAIL_EXISTS');
  const user = await User.create({ name, email, password, role: 'STUDENT' });
  audit(user, 'USER_REGISTERED', 'User', user._id);
  res.status(201).json({ success: true, data: { user, ...(await issueTokens(user)) } });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  // Same message for unknown email / wrong password to avoid user enumeration.
  if (!user || !(await user.comparePassword(password))) throw new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  if (!user.isActive) throw new ApiError(403, 'Account is deactivated', 'ACCOUNT_DISABLED');
  audit(user, 'USER_LOGIN', 'User', user._id);
  res.json({ success: true, data: { user, ...(await issueTokens(user)) } });
});

// Refresh-token rotation: each refresh token is single-use. Re-using one revokes all sessions.
exports.refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  let payload;
  try {
    payload = jwt.verify(refreshToken, env.jwtRefreshSecret);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
  }
  const stored = await RefreshToken.findOneAndDelete({ tokenHash: sha256(refreshToken) });
  if (!stored) {
    await RefreshToken.deleteMany({ user: payload.sub });
    throw new ApiError(401, 'Refresh token already used or revoked', 'INVALID_REFRESH_TOKEN');
  }
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw new ApiError(401, 'User not available', 'INVALID_REFRESH_TOKEN');
  res.json({ success: true, data: { user, ...(await issueTokens(user)) } });
});

exports.logout = asyncHandler(async (req, res) => {
  if (req.body.refreshToken) await RefreshToken.deleteOne({ tokenHash: sha256(req.body.refreshToken) });
  res.json({ success: true, message: 'Logged out' });
});

exports.me = (req, res) => res.json({ success: true, data: req.user });
