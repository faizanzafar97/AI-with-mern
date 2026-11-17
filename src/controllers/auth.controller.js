const userModel = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Blacklist = require('../models/blacklist.model');
const PasswordReset = require('../models/password-reset.model');
const { sendPasswordResetEmail } = require('../services/email.service');

const SESSION_DURATION_MS = 60 * 60 * 1000;
const RESET_DURATION_MS = 30 * 60 * 1000;
const RESET_RESPONSE = 'If an account exists for that email, password reset instructions will be sent.';

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  };
}

function setSessionCookie(res, userId, sessionVersion = 0) {
  const token = jwt.sign({ id: userId, ver: sessionVersion }, process.env.JWT_SECRET, { expiresIn: '1h' });
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
    setSessionCookie(res, user._id, user.sessionVersion);

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
    const user = await userModel.findOne({ email }).select('+password +sessionVersion');
    const passwordIsValid = user && await bcrypt.compare(password, user.password);
    if (!passwordIsValid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    setSessionCookie(res, user._id, user.sessionVersion);
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

async function forgotPassword(req, res) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!validEmail(email)) return res.status(400).json({ message: 'Enter a valid email address.' });

  const deliveryConfigured = Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RESET_EMAIL_FROM?.trim());
  if (process.env.NODE_ENV === 'production' && !deliveryConfigured) {
    return res.status(503).json({ message: 'Password reset email is not configured. Please contact the administrator.' });
  }

  try {
    const user = await userModel.findOne({ email }).select('_id name email');
    if (!user) return res.status(200).json({ message: RESET_RESPONSE });

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await PasswordReset.deleteMany({ userId: user._id });
    await PasswordReset.create({
      userId: user._id,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_DURATION_MS),
    });

    const appUrl = (process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const resetUrl = `${appUrl}/?resetToken=${encodeURIComponent(token)}`;
    if (deliveryConfigured) {
      try {
        await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });
      } catch (error) {
        await PasswordReset.deleteOne({ tokenHash });
        console.error('Password reset email failed:', error.code || error.message);
        return res.status(503).json({ message: 'Password reset email could not be sent. Please try again later.' });
      }
    } else {
      // Local development only: surface a short-lived link so reset can be tried without an email account.
      console.info('Development password reset link:', resetUrl);
      return res.status(200).json({ message: RESET_RESPONSE, resetUrl });
    }

    return res.status(200).json({ message: RESET_RESPONSE });
  } catch (error) {
    console.error('Forgot password error:', error.message);
    return res.status(500).json({ message: 'Could not start password reset. Please try again.' });
  }
}

async function resetPassword(req, res) {
  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!/^[a-f0-9]{64}$/i.test(token)) return res.status(400).json({ message: 'This password reset link is invalid or expired.' });
  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ message: 'Password must be at least 8 characters and no more than 72 bytes.' });
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const reset = await PasswordReset.findOne({ tokenHash, expiresAt: { $gt: new Date() } });
    if (!reset) return res.status(400).json({ message: 'This password reset link is invalid or expired.' });

    const user = await userModel.findById(reset.userId).select('+password +sessionVersion');
    if (!user) {
      await PasswordReset.deleteMany({ userId: reset.userId });
      return res.status(400).json({ message: 'This password reset link is invalid or expired.' });
    }

    user.password = await bcrypt.hash(password, 12);
    user.sessionVersion = (user.sessionVersion || 0) + 1;
    await user.save();
    await PasswordReset.deleteMany({ userId: user._id });
    return res.status(200).json({ message: 'Password updated. Sign in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error.message);
    return res.status(500).json({ message: 'Could not reset your password. Please try again.' });
  }
}

async function changePassword(req, res) {
  const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
  const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
  if (newPassword.length < 8 || Buffer.byteLength(newPassword, 'utf8') > 72) {
    return res.status(400).json({ message: 'New password must be at least 8 characters and no more than 72 bytes.' });
  }
  if (!currentPassword || Buffer.byteLength(currentPassword, 'utf8') > 72) {
    return res.status(400).json({ message: 'Enter your current password.' });
  }

  try {
    const user = await userModel.findById(req.user.id).select('+password +sessionVersion');
    if (!user) return res.status(401).json({ message: 'Your account is no longer available. Sign in again.' });
    if (!await bcrypt.compare(currentPassword, user.password)) {
      return res.status(400).json({ message: 'Your current password is incorrect.' });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.sessionVersion = (user.sessionVersion || 0) + 1;
    await user.save();
    setSessionCookie(res, user._id, user.sessionVersion);
    return res.status(200).json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Change password error:', error.message);
    return res.status(500).json({ message: 'Could not change your password. Please try again.' });
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

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  changePassword,
  logoutUser,
};
