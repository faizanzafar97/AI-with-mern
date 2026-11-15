const mongoose = require('mongoose');
const Interview = require('../models/interview.model');
const { generateQuestions, evaluateAnswer, summarizeInterview } = require('../services/ai.service');

const allowedLevels = new Set(['Student', 'Early career', 'Mid-level', 'Senior']);

function sendAIError(res, error) {
  if (error.code === 'AI_NOT_CONFIGURED') {
    return res.status(503).json({ message: 'AI is not configured. Add OPENAI_API_KEY to the backend .env file.' });
  }

  if (error.status === 401 || error.status === 403) {
    console.error('AI provider rejected the configured credentials.');
    return res.status(503).json({ message: 'The AI service credentials are invalid or do not have access.' });
  }

  if (error.status === 429) {
    return res.status(503).json({ message: 'The AI service is busy or its usage limit was reached. Please try again later.' });
  }

  console.error('AI request failed:', error.message);
  return res.status(502).json({ message: 'The AI service could not complete this request. Please try again.' });
}

async function startInterview(req, res) {
  const role = typeof req.body.role === 'string' ? req.body.role.trim() : '';
  const level = typeof req.body.level === 'string' ? req.body.level.trim() : '';
  const focus = typeof req.body.focus === 'string' ? req.body.focus.trim() : '';

  if (role.length < 2 || role.length > 100 || !allowedLevels.has(level) || focus.length < 2 || focus.length > 100) {
    return res.status(400).json({ message: 'Provide a valid role, experience level, and focus area.' });
  }

  try {
    const generatedQuestions = await generateQuestions({ role, level, focus });
    const interview = await Interview.create({
      userId: req.user.id,
      role,
      level,
      focus,
      questions: generatedQuestions.map(({ text }) => ({ prompt: text })),
    });

    return res.status(201).json({
      interviewId: interview.id,
      role: interview.role,
      level: interview.level,
      focus: interview.focus,
      question: interview.questions[0].prompt,
      questionNumber: 1,
      totalQuestions: interview.questions.length,
    });
  } catch (error) {
    return sendAIError(res, error);
  }
}

async function submitAnswer(req, res) {
  const answer = typeof req.body.answer === 'string' ? req.body.answer.trim() : '';
  if (answer.length < 5 || answer.length > 6000) {
    return res.status(400).json({ message: 'Your answer must be between 5 and 6000 characters.' });
  }

  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'Interview not found.' });
  }

  try {
    const interview = await Interview.findOne({ _id: req.params.id, userId: req.user.id });
    if (!interview) {
      return res.status(404).json({ message: 'Interview not found.' });
    }
    if (interview.status !== 'in_progress') {
      return res.status(409).json({ message: 'This interview is already complete.' });
    }

    const questionIndex = interview.questions.findIndex((question) => !question.answer);
    if (questionIndex === -1) {
      return res.status(409).json({ message: 'There are no unanswered questions in this interview.' });
    }

    const currentQuestion = interview.questions[questionIndex];
    const evaluation = await evaluateAnswer({
      role: interview.role,
      level: interview.level,
      focus: interview.focus,
      question: currentQuestion.prompt,
      answer,
    });

    currentQuestion.answer = answer;
    currentQuestion.evaluation = evaluation;

    const nextQuestionIndex = questionIndex + 1;
    if (nextQuestionIndex < interview.questions.length) {
      await interview.save();
      return res.status(200).json({
        completed: false,
        feedback: evaluation,
        question: interview.questions[nextQuestionIndex].prompt,
        questionNumber: nextQuestionIndex + 1,
        totalQuestions: interview.questions.length,
      });
    }

    const transcript = interview.questions.map((question, index) => ({
      question: question.prompt,
      answer: index === questionIndex ? answer : question.answer,
      answerScore: index === questionIndex ? evaluation.score : question.evaluation.score,
    }));
    const summary = await summarizeInterview({
      role: interview.role,
      level: interview.level,
      focus: interview.focus,
      transcript,
    });

    interview.summary = summary;
    interview.status = 'completed';
    interview.completedAt = new Date();
    await interview.save();

    return res.status(200).json({
      completed: true,
      feedback: evaluation,
      result: {
        interviewId: interview.id,
        role: interview.role,
        level: interview.level,
        focus: interview.focus,
        questions: interview.questions.map((question, index) => ({
          prompt: question.prompt,
          answer: index === questionIndex ? answer : question.answer,
          evaluation: index === questionIndex ? evaluation : question.evaluation,
        })),
        summary,
      },
    });
  } catch (error) {
    return sendAIError(res, error);
  }
}

module.exports = { startInterview, submitAnswer };
