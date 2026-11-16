const userModel = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Blacklist = require('../models/blacklist.model');

const SESSION_DURATION_MS = 60 * 60 * 1000;

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  };
}

function setSessionCookie(res, userId) {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.cookie('token', token, { ...cookieOptions(), maxAge: SESSION_DURATION_MS });
}

function normalizeCredentials(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) body = {};

  return {
    name: typeof body.name === 'string' ? body.name.trim() : '',
    email: typeof body.email === 'string' ? body.email.trim().toLowerCase() : '',
    password: typeof body.password === 'string' ? body.password : '',
  };
}

function validEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function handleAuthError(res, error, action) {
  if (error.code === 11000) {
    const duplicatedField = Object.keys(error.keyPattern || {})[0];
    return res.status(409).json({
      message: duplicatedField === 'name'
        ? 'That name is already in use. Please choose another.'
        : 'An account with this email already exists.',
    });
  }

  console.error(`${action} error:`, error.message);
  return res.status(500).json({ message: 'Internal server error' });
}

async function registerUser(req, res) {
  const { name, email, password } = normalizeCredentials(req.body);

  if (name.length < 2 || name.length > 60) {
    return res.status(400).json({ message: 'Name must be between 2 and 60 characters.' });
  }
  if (!validEmail(email)) {
    return res.status(400).json({ message: 'Enter a valid email address.' });
  }
  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ message: 'Password must be at least 8 characters and no more than 72 bytes.' });
  }
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not configured');
    return res.status(500).json({ message: 'Authentication is not configured.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await userModel.create({ name, email, password: hashedPassword });
    setSessionCookie(res, user._id);

    return res.status(201).json({
      message: 'User registered successfully',
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    return handleAuthError(res, error, 'Registration');
  }
}

async function loginUser(req, res) {
  const { email, password } = normalizeCredentials(req.body);
  if (!validEmail(email) || !password || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ message: 'Enter a valid email and password.' });
  }
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not configured');
    return res.status(500).json({ message: 'Authentication is not configured.' });
  }

  try {
    const user = await userModel.findOne({ email }).select('+password');
    const passwordIsValid = user && await bcrypt.compare(password, user.password);
    if (!passwordIsValid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    setSessionCookie(res, user._id);
    return res.status(200).json({
      message: 'Login successful',
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    return handleAuthError(res, error, 'Login');
  }
}

async function getCurrentUser(req, res) {
  try {
    const user = await userModel.findById(req.user.id).select('_id name email');
    if (!user) {
      return res.status(401).json({ message: 'Your account is no longer available. Sign in again.' });
    }

    return res.status(200).json({
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('Session restore error:', error.message);
    return res.status(500).json({ message: 'Could not restore your session. Please try again.' });
  }
}

async function logoutUser(req, res) {
  const token = req.authToken || req.cookies?.token;
  try {
    if (token) {
      const decoded = jwt.decode(token);
      const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + SESSION_DURATION_MS);
      await Blacklist.updateOne(
        { token },
        { $setOnInsert: { token, expiresAt } },
        { upsert: true },
      );
    }

    res.clearCookie('token', cookieOptions());
    return res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error.message);
    return res.status(500).json({ message: 'Could not end the session. Please try again.' });
  }
}

module.exports = { registerUser, loginUser, getCurrentUser, logoutUser };
