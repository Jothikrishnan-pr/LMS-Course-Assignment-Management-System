// Creates demo users + sample data. Run: npm run seed
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Course = require('../models/Course');
const Assignment = require('../models/Assignment');

(async () => {
  await connectDB();
  const accounts = [
    { name: 'Admin User', email: 'admin@lms.com', password: 'Admin@123', role: 'ADMIN' },
    { name: 'Tina Trainer', email: 'trainer@lms.com', password: 'Trainer@123', role: 'TRAINER' },
    { name: 'Tom Trainer', email: 'trainer2@lms.com', password: 'Trainer@123', role: 'TRAINER' },
    { name: 'Sam Student', email: 'student@lms.com', password: 'Student@123', role: 'STUDENT' },
  ];
  const users = {};
  for (const a of accounts) users[a.email] = (await User.findOne({ email: a.email })) || (await User.create(a));

  if (!(await Course.exists({ trainer: users['trainer@lms.com']._id }))) {
    const course = await Course.create({ title: 'Node.js Fundamentals', description: 'Learn Node.js, Express and MongoDB from scratch.', trainer: users['trainer@lms.com']._id });
    await Assignment.create({ course: course._id, title: 'Build a REST API', description: 'Create a CRUD API with Express and MongoDB.', dueDate: new Date(Date.now() + 14 * 864e5), maxMarks: 100, createdBy: users['trainer@lms.com']._id });
    await Course.create({ title: 'React for Beginners', description: 'Components, hooks, routing and state management.', trainer: users['trainer2@lms.com']._id });
  }
  console.log('Seeded. Logins: admin@lms.com / Admin@123, trainer@lms.com / Trainer@123, student@lms.com / Student@123');
  await mongoose.disconnect();
})();
