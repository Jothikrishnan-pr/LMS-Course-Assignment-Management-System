const { z } = require('zod');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const password = z.string().min(8, 'Password must be at least 8 characters').max(72);
const email = z.string().trim().toLowerCase().email();
const optionalText = (max) => z.string().trim().max(max).optional();

exports.register = z.object({ name: z.string().trim().min(2).max(100), email, password });
exports.login = z.object({ email, password: z.string().min(1) });
exports.refresh = z.object({ refreshToken: z.string().min(10) });

exports.createUser = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  password,
  role: z.enum(['ADMIN', 'TRAINER', 'STUDENT']),
});
exports.updateUser = z
  .object({
    name: z.string().trim().min(2).max(100),
    email,
    password,
    role: z.enum(['ADMIN', 'TRAINER', 'STUDENT']),
    isActive: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'At least one field is required');

exports.course = z.object({
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().min(10).max(2000),
  trainerId: objectId.optional(), // only used when an ADMIN creates a course
});
exports.courseUpdate = exports.course.omit({ trainerId: true }).partial().refine((v) => Object.keys(v).length > 0, 'At least one field is required');

exports.assignment = z.object({
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().min(5).max(5000),
  dueDate: z.coerce.date({ invalid_type_error: 'Invalid due date' }),
  maxMarks: z.number({ invalid_type_error: 'maxMarks must be a number' }).positive().max(10000),
});
exports.assignmentUpdate = exports.assignment.partial().refine((v) => Object.keys(v).length > 0, 'At least one field is required');

exports.submit = z.object({
  content: z.string().trim().min(1, 'Submission content is required').max(10000),
  fileUrl: z.string().trim().url().max(500).optional(),
});

exports.evaluate = z.object({
  marks: z.number({ required_error: 'marks is required', invalid_type_error: 'marks must be a number' }).min(0, 'Marks cannot be negative'),
  feedback: optionalText(2000),
  status: z.enum(['SUBMITTED', 'EVALUATED']).default('EVALUATED'),
});

exports.listQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  q: z.string().trim().max(100).optional(),
  role: z.enum(['ADMIN', 'TRAINER', 'STUDENT']).optional(),
  mine: z.enum(['true', 'false']).optional(),
  status: z.enum(['SUBMITTED', 'EVALUATED']).optional(),
  assignmentId: objectId.optional(),
  courseId: objectId.optional(),
  action: z.string().trim().max(50).optional(),
}).passthrough();
