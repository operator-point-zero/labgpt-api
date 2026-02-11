const { verifyAccessToken } = require('../services/authService');
const User = require('../models/user');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authorization token required' });
  }

  const payload = verifyAccessToken(token);
  if (!payload || !payload.sub) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  try {
    const user = await User.findById(payload.sub).select('-password -refreshTokens');
    if (!user) return res.status(401).json({ message: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

module.exports = authMiddleware;
