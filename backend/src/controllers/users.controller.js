const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const audit = require('../utils/audit');
const { parsePagination, buildMeta, escapeRegex } = require('../utils/pagination');

exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }
  const [data, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json({ success: true, data, meta: buildMeta(page, limit, total) });
});

exports.create = asyncHandler(async (req, res) => {
  if (await User.exists({ email: req.body.email })) throw new ApiError(409, 'Email already registered', 'EMAIL_EXISTS');
  const user = await User.create(req.body);
  audit(req.user, 'USER_CREATED', 'User', user._id, { role: user.role });
  res.status(201).json({ success: true, data: user });
});

exports.update = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  if (String(user._id) === String(req.user._id) && (req.body.role || req.body.isActive === false)) {
    throw new ApiError(400, 'You cannot change your own role or deactivate yourself', 'SELF_MODIFY');
  }
  if (req.body.email && req.body.email !== user.email && (await User.exists({ email: req.body.email }))) {
    throw new ApiError(409, 'Email already registered', 'EMAIL_EXISTS');
  }
  Object.assign(user, req.body);
  await user.save();
  if (req.body.isActive === false) await RefreshToken.deleteMany({ user: user._id });
  audit(req.user, 'USER_UPDATED', 'User', user._id, { fields: Object.keys(req.body).filter((k) => k !== 'password') });
  res.json({ success: true, data: user });
});

exports.remove = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) throw new ApiError(400, 'You cannot delete yourself', 'SELF_MODIFY');
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  await RefreshToken.deleteMany({ user: user._id });
  audit(req.user, 'USER_DELETED', 'User', user._id, { email: user.email });
  res.json({ success: true, message: 'User deleted' });
});
