const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * JWT Authentication Middleware
 * Verifies JWT token and adds user info to request
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    // No token provided - continue as guest
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      req.user = null;
    } else {
      req.user = user;
    }
    
    next();
  } catch (err) {
    // Invalid token - continue as guest
    req.user = null;
    next();
  }
}

/**
 * Optional authentication - continues regardless of token validity
 */
const optionalAuth = authenticateToken;

/**
 * Required authentication - returns 401 if no valid token
 */
async function requireAuth(req, res, next) {
  await authenticateToken(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    next();
  });
}

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAuth
};