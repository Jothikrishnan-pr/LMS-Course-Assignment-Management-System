const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const audit = require('../utils/audit');
const { parsePagination, buildMeta, escapeRegex } = require('../utils/pagination');
const { getCourseOr404, getAssignmentOr404, assertCanManageCourse, isEnrolled, accessibleCourseIds } = require('../services/access');

// Attach the current student's submission (if any) so the UI can show status.
async function withMySubmission(user, assignments) {
  if (user.role !== 'STUDENT' || !assignments.length) return assignments;
  const subs = await Submission.find({ student: user._id, assignment: { $in: assignments.map((a) => a._id) } }).lean();
  const map = new Map(subs.map((s) => [String(s.assignment), s]));
  return assignments.map((a) => ({ ...a, mySubmission: map.get(String(a._id)) || null }));
}

exports.create = asyncHandler(async (req, res) => {
  const course = await getCourseOr404(req.params.courseId);
  assertCanManageCourse(req.user, course);
  const assignment = await Assignment.create({ ...req.body, course: course._id, createdBy: req.user._id });
  audit(req.user, 'ASSIGNMENT_CREATED', 'Assignment', assignment._id, { course: course._id });
  res.status(201).json({ success: true, data: assignment });
});

exports.listByCourse = asyncHandler(async (req, res) => {
  const course = await getCourseOr404(req.params.courseId);
  if (req.user.role === 'STUDENT') {
    if (!(await isEnrolled(req.user._id, course._id))) throw new ApiError(403, 'Enroll in this course to view its assignments', 'NOT_ENROLLED');
  } else assertCanManageCourse(req.user, course);
  const assignments = await Assignment.find({ course: course._id }).sort({ dueDate: 1 }).lean();
  res.json({ success: true, data: await withMySubmission(req.user, assignments) });
});

// All assignments visible to the user (student: enrolled courses, trainer: own courses, admin: all).
exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const ids = await accessibleCourseIds(req.user);
  const filter = ids ? { course: { $in: ids } } : {};
  if (req.query.courseId) filter.course = ids && !ids.map(String).includes(req.query.courseId) ? { $in: [] } : req.query.courseId;
  if (req.query.q) filter.title = new RegExp(escapeRegex(req.query.q), 'i');
  const [data, total] = await Promise.all([
    Assignment.find(filter).sort({ dueDate: 1 }).skip(skip).limit(limit).populate('course', 'title').lean(),
    Assignment.countDocuments(filter),
  ]);
  res.json({ success: true, data: await withMySubmission(req.user, data), meta: buildMeta(page, limit, total) });
});

async function loadWithAccess(req) {
  const assignment = await getAssignmentOr404(req.params.id);
  const course = await getCourseOr404(assignment.course);
  return { assignment, course };
}

exports.getOne = asyncHandler(async (req, res) => {
  const { assignment, course } = await loadWithAccess(req);
  if (req.user.role === 'STUDENT') {
    if (!(await isEnrolled(req.user._id, course._id))) throw new ApiError(403, 'Enroll in this course to view this assignment', 'NOT_ENROLLED');
  } else assertCanManageCourse(req.user, course);
  const [withSub] = await withMySubmission(req.user, [assignment.toObject()]);
  res.json({ success: true, data: withSub });
});

exports.update = asyncHandler(async (req, res) => {
  const { assignment, course } = await loadWithAccess(req);
  assertCanManageCourse(req.user, course);
  Object.assign(assignment, req.body);
  await assignment.save();
  audit(req.user, 'ASSIGNMENT_UPDATED', 'Assignment', assignment._id);
  res.json({ success: true, data: assignment });
});

exports.remove = asyncHandler(async (req, res) => {
  const { assignment, course } = await loadWithAccess(req);
  assertCanManageCourse(req.user, course);
  await Submission.deleteMany({ assignment: assignment._id });
  await assignment.deleteOne();
  audit(req.user, 'ASSIGNMENT_DELETED', 'Assignment', assignment._id);
  res.json({ success: true, message: 'Assignment deleted' });
});
