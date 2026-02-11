const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'please-set-a-strong-secret';
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m';

function generateAccessToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: ACCESS_EXPIRES });
}

function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashToken
};
