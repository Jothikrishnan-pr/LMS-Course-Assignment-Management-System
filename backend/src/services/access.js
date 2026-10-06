const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Assignment = require('../models/Assignment');
const ApiError = require('../utils/ApiError');

exports.getCourseOr404 = async (id) => {
  const course = await Course.findById(id);
  if (!course) throw new ApiError(404, 'Course not found', 'COURSE_NOT_FOUND');
  return course;
};

exports.getAssignmentOr404 = async (id) => {
  const assignment = await Assignment.findById(id);
  if (!assignment) throw new ApiError(404, 'Assignment not found', 'ASSIGNMENT_NOT_FOUND');
  return assignment;
};

// ADMIN may manage any course; a TRAINER only the ones they own.
exports.canManageCourse = (user, course) =>
  user.role === 'ADMIN' || (user.role === 'TRAINER' && String(course.trainer) === String(user._id));

exports.assertCanManageCourse = (user, course) => {
  if (!exports.canManageCourse(user, course)) {
    throw new ApiError(403, 'You can only manage your own courses', 'NOT_COURSE_OWNER');
  }
};

exports.isEnrolled = async (studentId, courseId) => !!(await Enrollment.exists({ student: studentId, course: courseId }));

// Course ids a user is "attached" to: enrolled courses (student), owned courses (trainer), null = all (admin).
exports.accessibleCourseIds = async (user) => {
  if (user.role === 'ADMIN') return null;
  if (user.role === 'TRAINER') return Course.find({ trainer: user._id }).distinct('_id');
  return Enrollment.find({ student: user._id }).distinct('course');
};
