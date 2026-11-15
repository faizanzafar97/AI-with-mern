const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();

app.use(express.json({ limit: '20kb' }));
app.use(cookieParser());

const authRoutes = require('./routes/auth.routes');
const interviewRoutes = require('./routes/interview.routes');
app.use('/api/auth', authRoutes);
app.use('/api/interviews', interviewRoutes);

app.use('/api', (req, res) => {
  return res.status(404).json({ message: 'API endpoint not found' });
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ message: 'Request body must be valid JSON' });
  }
  if (error.status === 413) {
    return res.status(413).json({ message: 'Request body is too large.' });
  }

  console.error('Unhandled request error:', error.message);
  return res.status(500).json({ message: 'Internal server error' });
});

module.exports = app;
