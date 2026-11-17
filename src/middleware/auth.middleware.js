const jwt = require('jsonwebtoken');
const Blacklist = require('../models/blacklist.model');
const userModel = require('../models/user.model');

async function requireAuth(req, res, next) {
  const bearerToken = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  const token = req.cookies?.token || bearerToken;

  if (!token) {
    return res.status(401).json({ message: 'Sign in to continue' });
  }

  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not configured');
    return res.status(500).json({ message: 'Authentication is not configured' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const isRevoked = await Blacklist.exists({ token });

    if (isRevoked) {
      return res.status(401).json({ message: 'Session has expired. Sign in again.' });
    }

    const user = await userModel.findById(payload.id).select('+sessionVersion').lean();
    if (!user || Number(payload.ver || 0) !== Number(user.sessionVersion || 0)) {
      return res.status(401).json({ message: 'Your session has expired. Sign in again.' });
    }

    req.user = { id: payload.id };
    req.authToken = token;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session is invalid or expired. Sign in again.' });
    }

    return next(error);
  }
}

module.exports = requireAuth;
