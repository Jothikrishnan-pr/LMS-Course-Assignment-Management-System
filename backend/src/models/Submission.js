const mongoose = require('mongoose');

const STATUSES = ['SUBMITTED', 'EVALUATED'];

const submissionSchema = new mongoose.Schema(
  {
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, required: true, trim: true, maxlength: 10000 },
    fileUrl: { type: String, trim: true },
    status: { type: String, enum: STATUSES, default: 'SUBMITTED', index: true },
    marks: { type: Number, min: 0 },
    feedback: { type: String, trim: true, maxlength: 2000 },
    submittedAt: { type: Date, default: Date.now },
    evaluatedAt: Date,
    evaluatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// One submission per student per assignment.
submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('Submission', submissionSchema);
module.exports.STATUSES = STATUSES;
