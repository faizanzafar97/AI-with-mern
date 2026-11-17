const mongoose = require('mongoose');
const Interview = require('../models/interview.model');
const { generateQuestions, evaluateAnswer, summarizeInterview } = require('../services/ai.service');

const allowedLevels = new Set(['Student', 'Early career', 'Mid-level', 'Senior']);
const MAX_FOLLOW_UPS = 3;

async function listInterviews(req, res) {
  try {
    const interviews = await Interview.find({ userId: req.user.id })
      .select('role level focus mode includeFollowUps status summary createdAt completedAt')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({ interviews: interviews.map((interview) => ({
      id: String(interview._id),
      role: interview.role,
      level: interview.level,
      focus: interview.focus,
      mode: interview.mode || 'text',
      includeFollowUps: interview.includeFollowUps === true,
      status: interview.status,
      score: interview.summary?.score ?? null,
      createdAt: interview.createdAt,
      completedAt: interview.completedAt,
    })) });
  } catch (error) {
    console.error('Could not list interviews:', error.message);
    return res.status(500).json({ message: 'Interview history could not be loaded. Please try again.' });
  }
}

async function getInterview(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'Interview not found.' });
  }

  try {
    const interview = await Interview.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!interview) return res.status(404).json({ message: 'Interview not found.' });
    if (interview.status !== 'completed' || !interview.summary) {
      return res.status(409).json({ message: 'This practice session is not complete yet.' });
    }

    return res.status(200).json({
      result: {
        interviewId: String(interview._id),
        role: interview.role,
        level: interview.level,
        focus: interview.focus,
        mode: interview.mode || 'text',
        includeFollowUps: interview.includeFollowUps === true,
        questions: interview.questions.map((question) => ({
          prompt: question.prompt,
          answer: question.answer,
          evaluation: question.evaluation,
        })),
        summary: interview.summary,
      },
    });
  } catch (error) {
    console.error('Could not load interview:', error.message);
    return res.status(500).json({ message: 'This practice session could not be loaded. Please try again.' });
  }
}

function sendAIError(res, error) {
  if (error.code === 'AI_PROVIDER_CONFIG') {
    return res.status(500).json({ message: 'AI_PROVIDER must be set to "ollama" or "openai" in the backend .env file.' });
  }
  if (error.code === 'AI_PROVIDER_UNAVAILABLE') {
    return res.status(503).json({ message: 'Local AI is not running. Start Ollama, then try again.' });
  }
  if (error.code === 'AI_PROVIDER_TIMEOUT') {
    return res.status(504).json({ message: 'The local AI model took too long to respond. Try again or use a smaller model.' });
  }
  if (error.code === 'AI_MODEL_NOT_FOUND') {
    return res.status(503).json({ message: `The local AI model is missing. Run "ollama pull ${process.env.OLLAMA_MODEL || 'gemma4:e2b'}" and try again.` });
  }
  if (error.code === 'AI_PROVIDER_ERROR') {
    console.error('Local AI provider error:', error.message);
    return res.status(502).json({ message: 'The local AI service could not complete this request.' });
  }

  if (error.code === 'AI_NOT_CONFIGURED') {
    return res.status(503).json({ message: 'AI is not configured. Add OPENAI_API_KEY to the backend .env file.' });
  }

  if (error.status === 401 || error.status === 403) {
    console.error('AI provider rejected the configured credentials.');
    return res.status(503).json({ message: 'The AI service credentials are invalid or do not have access.' });
  }

  if (error.status === 429) {
    const providerError = error.error || {};
    const code = String(error.code || providerError.code || '').toLowerCase();
    const type = String(error.type || providerError.type || '').toLowerCase();
    const quotaCodes = new Set([
      'insufficient_quota',
      'credit_balance_exhausted',
      'billing_hard_limit_reached',
      'organization_spend_limit_exceeded',
      'project_spend_limit_exceeded',
      'organization_usage_limit_exceeded',
    ]);

    console.warn('OpenAI returned HTTP 429:', code || type || 'unclassified', error.request_id || '');
    if (quotaCodes.has(code) || type === 'insufficient_quota') {
      return res.status(503).json({
        message: 'The OpenAI API project has reached a billing or usage limit. Check its API credits and spend limits.',
      });
    }

    const retryAfter = error.headers?.get?.('retry-after');
    if (retryAfter && /^\d+(\.\d+)?$/.test(retryAfter)) res.set('Retry-After', retryAfter);
    return res.status(429).json({
      message: 'The OpenAI API rate limit was reached. Wait briefly, then try again. If this keeps happening, reduce request frequency or check the project rate limits.',
    });
  }

  if (error.status === 503) {
    console.warn('OpenAI model is temporarily unavailable:', error.code || error.request_id || '');
    return res.status(503).json({ message: 'The AI model is temporarily busy. Please try again shortly.' });
  }

  console.error('AI request failed:', error.message);
  return res.status(502).json({ message: 'The AI service could not complete this request. Please try again.' });
}

async function startInterview(req, res) {
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const role = typeof body.role === 'string' ? body.role.trim() : '';
  const level = typeof body.level === 'string' ? body.level.trim() : '';
  const focus = typeof body.focus === 'string' ? body.focus.trim() : '';
  const mode = body.mode === undefined ? 'text' : body.mode;
  const includeFollowUps = body.includeFollowUps === true;

  if (role.length < 2 || role.length > 100 || !allowedLevels.has(level) || focus.length < 2 || focus.length > 100
    || !['text', 'voice'].includes(mode)) {
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
      mode,
      includeFollowUps,
      questions: generatedQuestions.map(({ text, competency }) => ({ prompt: text, competency, isFollowUp: false })),
    });

    return res.status(201).json({
      interviewId: interview.id,
      role: interview.role,
      level: interview.level,
      focus: interview.focus,
      mode: interview.mode,
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
      mode: interview.mode || 'text',
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
        mode: interview.mode || 'text',
        includeFollowUps: interview.includeFollowUps === true,
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
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const answer = typeof body.answer === 'string' ? body.answer.trim() : '';
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
      allowFollowUp: interview.includeFollowUps === true
        && !currentQuestion.isFollowUp
        && interview.questions.filter((question) => question.isFollowUp).length < MAX_FOLLOW_UPS,
    });
  } catch (error) {
    return sendAIError(res, error);
  }

  currentQuestion.answer = answer;
  currentQuestion.evaluation = evaluation;
  const followUp = interview.includeFollowUps === true
    && !currentQuestion.isFollowUp
    && interview.questions.filter((question) => question.isFollowUp).length < MAX_FOLLOW_UPS
    ? evaluation.followUp
    : null;
  if (followUp) {
    interview.questions.splice(questionIndex + 1, 0, {
      prompt: followUp,
      competency: currentQuestion.competency,
      isFollowUp: true,
    });
  }

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

module.exports = { listInterviews, getInterview, startInterview, submitAnswer };
