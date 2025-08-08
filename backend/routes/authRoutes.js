const express = require('express');
const router = express.Router();
const cookieParser = require('cookie-parser');
const {
  login,
  refresh,
  logout,
  revokeUserSessions
} = require('../controllers/authController');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');

// Use cookie parser for refresh tokens
router.use(cookieParser());

// POST /auth/login - User login
router.post('/login', login);

// POST /auth/refresh - Refresh access token
router.post('/refresh', refresh);

// POST /auth/logout - User logout
router.post('/logout', auth, logout);

// POST /auth/revoke/:userId - Revoke all sessions for a user (admin only)
router.post('/revoke/:userId', auth, requireAdmin, revokeUserSessions);

module.exports = router;
