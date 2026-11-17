const mongoose = require('mongoose');

const evaluationSchema = new mongoose.Schema({
  score: { type: Number, min: 1, max: 5, required: true },
  strengths: { type: [String], required: true },
  improvements: { type: [String], required: true },
  advice: { type: String, required: true },
}, { _id: false });

const questionSchema = new mongoose.Schema({
  prompt: { type: String, required: true },
  competency: { type: String, default: '' },
  answer: { type: String, default: '' },
  isFollowUp: { type: Boolean, default: false },
  evaluation: { type: evaluationSchema, default: undefined },
}, { _id: false });

const summarySchema = new mongoose.Schema({
  score: { type: Number, min: 1, max: 5, required: true },
  overview: { type: String, required: true },
  strengths: { type: [String], required: true },
  improvements: { type: [String], required: true },
  nextSteps: { type: [String], required: true },
}, { _id: false });

const interviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role: { type: String, required: true, trim: true, maxlength: 100 },
  level: { type: String, required: true, trim: true, maxlength: 50 },
  focus: { type: String, required: true, trim: true, maxlength: 100 },
  mode: { type: String, enum: ['text', 'voice'], default: 'text' },
  includeFollowUps: { type: Boolean, default: false },
  status: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress', index: true },
  questions: { type: [questionSchema], required: true },
  summary: { type: summarySchema, default: undefined },
  completedAt: { type: Date, default: null },
}, { timestamps: true, optimisticConcurrency: true });

module.exports = mongoose.model('Interview', interviewSchema);
