const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate, validateId } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimit');
const v = require('../validators');
const auth = require('../controllers/auth.controller');
const users = require('../controllers/users.controller');
const courses = require('../controllers/courses.controller');
const assignments = require('../controllers/assignments.controller');
const submissions = require('../controllers/submissions.controller');
const audit = require('../controllers/audit.controller');

const { ADMIN, TRAINER, STUDENT } = { ADMIN: 'ADMIN', TRAINER: 'TRAINER', STUDENT: 'STUDENT' };
const query = validate(v.listQuery, 'query');

// ---- Auth (public, rate limited) ----
router.post('/auth/register', authLimiter, validate(v.register), auth.register);
router.post('/auth/login', authLimiter, validate(v.login), auth.login);
router.post('/auth/refresh', authLimiter, validate(v.refresh), auth.refresh);
router.post('/auth/logout', auth.logout);

// Everything below requires a valid access token.
router.use(authenticate);
router.get('/auth/me', auth.me);

// ---- Users (admin) ----
router.get('/users', authorize(ADMIN), query, users.list);
router.post('/users', authorize(ADMIN), validate(v.createUser), users.create);
router.put('/users/:id', authorize(ADMIN), validateId('id'), validate(v.updateUser), users.update);
router.delete('/users/:id', authorize(ADMIN), validateId('id'), users.remove);

// ---- Courses ----
router.get('/courses', query, courses.list);
router.get('/courses/mine', query, courses.mine); // must be declared before /courses/:id
router.post('/courses', authorize(TRAINER, ADMIN), validate(v.course), courses.create);
router.get('/courses/:id', validateId('id'), courses.getOne);
router.put('/courses/:id', authorize(TRAINER, ADMIN), validateId('id'), validate(v.courseUpdate), courses.update);
router.delete('/courses/:id', authorize(TRAINER, ADMIN), validateId('id'), courses.remove);

// ---- Enrollment ----
router.post('/courses/:courseId/enroll', authorize(STUDENT), validateId('courseId'), courses.enroll);
router.get('/courses/:courseId/enrollments', authorize(TRAINER, ADMIN), validateId('courseId'), courses.enrollments);

// ---- Assignments ----
router.post('/courses/:courseId/assignments', authorize(TRAINER, ADMIN), validateId('courseId'), validate(v.assignment), assignments.create);
router.get('/courses/:courseId/assignments', validateId('courseId'), assignments.listByCourse);
router.get('/assignments', query, assignments.list);
router.get('/assignments/:id', validateId('id'), assignments.getOne);
router.put('/assignments/:id', authorize(TRAINER, ADMIN), validateId('id'), validate(v.assignmentUpdate), assignments.update);
router.delete('/assignments/:id', authorize(TRAINER, ADMIN), validateId('id'), assignments.remove);

// ---- Submissions ----
router.post('/assignments/:assignmentId/submit', authorize(STUDENT), validateId('assignmentId'), validate(v.submit), submissions.submit);
router.get('/assignments/:assignmentId/submissions', authorize(TRAINER, ADMIN), validateId('assignmentId'), submissions.listByAssignment);
router.get('/submissions', query, submissions.list);
router.get('/submissions/:id', validateId('id'), submissions.getOne);
router.put('/submissions/:id/evaluate', authorize(TRAINER, ADMIN), validateId('id'), validate(v.evaluate), submissions.evaluate);

// ---- Audit history (admin) ----
router.get('/audit', authorize(ADMIN), query, audit.list);

module.exports = router;
