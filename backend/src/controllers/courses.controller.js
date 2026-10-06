const Course = require('../models/Course');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const audit = require('../utils/audit');
const { parsePagination, buildMeta, escapeRegex } = require('../utils/pagination');
const { getCourseOr404, assertCanManageCourse } = require('../services/access');

exports.create = asyncHandler(async (req, res) => {
  const { title, description, trainerId } = req.body;
  let trainer = req.user._id;
  if (req.user.role === 'ADMIN') {
    if (!trainerId) throw new ApiError(400, 'trainerId is required when an admin creates a course', 'VALIDATION_ERROR');
    const t = await User.findOne({ _id: trainerId, role: 'TRAINER' });
    if (!t) throw new ApiError(400, 'trainerId must belong to a trainer', 'VALIDATION_ERROR');
    trainer = t._id;
  }
  const course = await Course.create({ title, description, trainer });
  audit(req.user, 'COURSE_CREATED', 'Course', course._id, { title });
  res.status(201).json({ success: true, data: course });
});

// All roles can browse courses. Supports search (?q=), ?mine=true (trainer), pagination.
exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), 'i');
    filter.$or = [{ title: rx }, { description: rx }];
  }
  if (req.query.mine === 'true' && req.user.role === 'TRAINER') filter.trainer = req.user._id;

  const [courses, total] = await Promise.all([
    Course.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('trainer', 'name email').lean(),
    Course.countDocuments(filter),
  ]);

  let data = courses;
  if (req.user.role === 'STUDENT') {
    const enrolled = new Set((await Enrollment.find({ student: req.user._id, course: { $in: courses.map((c) => c._id) } }).distinct('course')).map(String));
    data = courses.map((c) => ({ ...c, isEnrolled: enrolled.has(String(c._id)) }));
  }
  res.json({ success: true, data, meta: buildMeta(page, limit, total) });
});

// "My courses": enrolled courses (student), owned courses (trainer), all (admin).
exports.mine = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  let filter = {};
  if (req.user.role === 'STUDENT') filter = { _id: { $in: await Enrollment.find({ student: req.user._id }).distinct('course') } };
  if (req.user.role === 'TRAINER') filter = { trainer: req.user._id };
  const [data, total] = await Promise.all([
    Course.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('trainer', 'name email'),
    Course.countDocuments(filter),
  ]);
  res.json({ success: true, data, meta: buildMeta(page, limit, total) });
});

exports.getOne = asyncHandler(async (req, res) => {
  const course = await (await getCourseOr404(req.params.id)).populate('trainer', 'name email');
  const enrolledCount = await Enrollment.countDocuments({ course: course._id });
  const data = { ...course.toObject(), enrolledCount };
  if (req.user.role === 'STUDENT') data.isEnrolled = !!(await Enrollment.exists({ student: req.user._id, course: course._id }));
  res.json({ success: true, data });
});

exports.update = asyncHandler(async (req, res) => {
  const course = await getCourseOr404(req.params.id);
  assertCanManageCourse(req.user, course);
  Object.assign(course, req.body);
  await course.save();
  audit(req.user, 'COURSE_UPDATED', 'Course', course._id);
  res.json({ success: true, data: course });
});

exports.remove = asyncHandler(async (req, res) => {
  const course = await getCourseOr404(req.params.id);
  assertCanManageCourse(req.user, course);
  // Cascade delete dependent data so no orphans remain.
  await Promise.all([
    Assignment.deleteMany({ course: course._id }),
    Submission.deleteMany({ course: course._id }),
    Enrollment.deleteMany({ course: course._id }),
  ]);
  await course.deleteOne();
  audit(req.user, 'COURSE_DELETED', 'Course', course._id, { title: course.title });
  res.json({ success: true, message: 'Course deleted' });
});

exports.enroll = asyncHandler(async (req, res) => {
  const course = await getCourseOr404(req.params.courseId);
  if (await Enrollment.exists({ student: req.user._id, course: course._id })) {
    throw new ApiError(409, 'You are already enrolled in this course', 'ALREADY_ENROLLED');
  }
  try {
    const enrollment = await Enrollment.create({ student: req.user._id, course: course._id });
    audit(req.user, 'COURSE_ENROLLED', 'Course', course._id);
    res.status(201).json({ success: true, data: enrollment });
  } catch (err) {
    // Race condition: two concurrent requests passed the check; the unique index catches the second.
    if (err.code === 11000) throw new ApiError(409, 'You are already enrolled in this course', 'ALREADY_ENROLLED');
    throw err;
  }
});

exports.enrollments = asyncHandler(async (req, res) => {
  const course = await getCourseOr404(req.params.courseId);
  assertCanManageCourse(req.user, course);
  const data = await Enrollment.find({ course: course._id }).populate('student', 'name email').sort({ createdAt: -1 });
  res.json({ success: true, data });
});
