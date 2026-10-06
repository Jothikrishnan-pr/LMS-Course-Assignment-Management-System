const Submission = require('../models/Submission');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const audit = require('../utils/audit');
const { parsePagination, buildMeta } = require('../utils/pagination');
const { getCourseOr404, getAssignmentOr404, assertCanManageCourse, canManageCourse, isEnrolled, accessibleCourseIds } = require('../services/access');

const populate = [
  { path: 'assignment', select: 'title dueDate maxMarks' },
  { path: 'student', select: 'name email' },
  { path: 'course', select: 'title' },
];

exports.submit = asyncHandler(async (req, res) => {
  const assignment = await getAssignmentOr404(req.params.assignmentId);

  // 1. Student must be enrolled in the assignment's course (checked on the backend).
  if (!(await isEnrolled(req.user._id, assignment.course))) {
    throw new ApiError(403, 'You must be enrolled in the course to submit this assignment', 'NOT_ENROLLED');
  }
  // 2. Deadline check.
  if (new Date() > assignment.dueDate) throw new ApiError(400, 'The due date for this assignment has passed', 'DUE_DATE_PASSED');
  // 3. One submission per student per assignment.
  if (await Submission.exists({ assignment: assignment._id, student: req.user._id })) {
    throw new ApiError(409, 'You have already submitted this assignment', 'ALREADY_SUBMITTED');
  }
  try {
    const submission = await Submission.create({
      assignment: assignment._id,
      course: assignment.course,
      student: req.user._id,
      content: req.body.content,
      fileUrl: req.body.fileUrl,
    });
    audit(req.user, 'ASSIGNMENT_SUBMITTED', 'Submission', submission._id, { assignment: assignment._id });
    res.status(201).json({ success: true, data: submission });
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, 'You have already submitted this assignment', 'ALREADY_SUBMITTED');
    throw err;
  }
});

// Submissions for one assignment (course owner trainer / admin only).
exports.listByAssignment = asyncHandler(async (req, res) => {
  const assignment = await getAssignmentOr404(req.params.assignmentId);
  assertCanManageCourse(req.user, await getCourseOr404(assignment.course));
  const data = await Submission.find({ assignment: assignment._id }).populate(populate).sort({ submittedAt: -1 });
  res.json({ success: true, data });
});

// Student: own submissions only. Trainer: submissions in own courses. Admin: all.
exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};
  if (req.user.role === 'STUDENT') filter.student = req.user._id;
  else {
    const ids = await accessibleCourseIds(req.user);
    if (ids) filter.course = { $in: ids };
  }
  if (req.query.status) filter.status = req.query.status;
  if (req.query.assignmentId) filter.assignment = req.query.assignmentId;
  const [data, total] = await Promise.all([
    Submission.find(filter).populate(populate).sort({ submittedAt: -1 }).skip(skip).limit(limit),
    Submission.countDocuments(filter),
  ]);
  res.json({ success: true, data, meta: buildMeta(page, limit, total) });
});

exports.getOne = asyncHandler(async (req, res) => {
  const submission = await Submission.findById(req.params.id).populate(populate);
  if (!submission) throw new ApiError(404, 'Submission not found', 'SUBMISSION_NOT_FOUND');
  if (req.user.role === 'STUDENT') {
    if (String(submission.student._id) !== String(req.user._id)) throw new ApiError(403, "You cannot access another student's submission", 'FORBIDDEN');
  } else assertCanManageCourse(req.user, await getCourseOr404(submission.course._id));
  res.json({ success: true, data: submission });
});

exports.evaluate = asyncHandler(async (req, res) => {
  const submission = await Submission.findById(req.params.id);
  if (!submission) throw new ApiError(404, 'Submission not found', 'SUBMISSION_NOT_FOUND');
  const course = await getCourseOr404(submission.course);
  if (!canManageCourse(req.user, course)) throw new ApiError(403, 'You can only evaluate submissions in your own courses', 'NOT_COURSE_OWNER');
  const assignment = await getAssignmentOr404(submission.assignment);

  const { marks, feedback, status } = req.body;
  if (marks > assignment.maxMarks) {
    throw new ApiError(400, `Marks cannot exceed the maximum of ${assignment.maxMarks}`, 'INVALID_MARKS');
  }
  Object.assign(submission, { marks, feedback, status });
  submission.evaluatedBy = req.user._id;
  submission.evaluatedAt = new Date();
  await submission.save();
  audit(req.user, 'SUBMISSION_EVALUATED', 'Submission', submission._id, { marks, status });
  res.json({ success: true, data: submission });
});
