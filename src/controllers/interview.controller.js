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

  let generatedQuestions;
  try {
    generatedQuestions = await generateQuestions({ role, level, focus });
  } catch (error) {
    return sendAIError(res, error);
  }

  try {
    const interview = await Interview.create({
      userId: req.user.id,
      role,
      level,
      focus,
      questions: generatedQuestions.map(({ text, competency }) => ({ prompt: text, competency })),
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
    console.error('Could not save interview:', error.message);
    return res.status(500).json({ message: 'The interview could not be saved. Please try again.' });
  }
}

async function completeInterview(interview, res, feedback = null) {
  try {
    const transcript = interview.questions.map((question) => ({
      question: question.prompt,
      competency: question.competency,
      answer: question.answer,
      answerScore: question.evaluation.score,
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
      ...(feedback ? { feedback } : {}),
      result: {
        interviewId: interview.id,
        role: interview.role,
        level: interview.level,
        focus: interview.focus,
        questions: interview.questions.map((question) => ({
          prompt: question.prompt,
          answer: question.answer,
          evaluation: question.evaluation,
        })),
        summary,
      },
    });
  } catch (error) {
    if (error.code === 'AI_NOT_CONFIGURED' || error.status) return sendAIError(res, error);
    console.error('Could not complete interview:', error.message);
    return res.status(500).json({ message: 'The interview summary could not be saved. Please try again.' });
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

  let interview;
  try {
    interview = await Interview.findOne({ _id: req.params.id, userId: req.user.id });
  } catch (error) {
    console.error('Could not load interview:', error.message);
    return res.status(500).json({ message: 'The interview could not be loaded. Please try again.' });
  }

  if (!interview) {
    return res.status(404).json({ message: 'Interview not found.' });
  }
  if (interview.status !== 'in_progress') {
    return res.status(409).json({ message: 'This interview is already complete.' });
  }

  const questionIndex = interview.questions.findIndex((question) => !question.answer);
  if (questionIndex === -1) {
    return completeInterview(interview, res);
  }

  const currentQuestion = interview.questions[questionIndex];
  let evaluation;
  try {
    evaluation = await evaluateAnswer({
      role: interview.role,
      level: interview.level,
      focus: interview.focus,
      question: currentQuestion.prompt,
      competency: currentQuestion.competency,
      answer,
    });
  } catch (error) {
    return sendAIError(res, error);
  }

  currentQuestion.answer = answer;
  currentQuestion.evaluation = evaluation;

  try {
    await interview.save();
  } catch (error) {
    if (error.name === 'VersionError') {
      return res.status(409).json({ message: 'This answer was already submitted. Refresh the interview and continue.' });
    }
    console.error('Could not save interview answer:', error.message);
    return res.status(500).json({ message: 'Your answer could not be saved. Please try again.' });
  }

  const nextQuestionIndex = questionIndex + 1;
  if (nextQuestionIndex < interview.questions.length) {
    return res.status(200).json({
      completed: false,
      feedback: evaluation,
      question: interview.questions[nextQuestionIndex].prompt,
      questionNumber: nextQuestionIndex + 1,
      totalQuestions: interview.questions.length,
    });
  }

  return completeInterview(interview, res, evaluation);
}

module.exports = { startInterview, submitAnswer };
