const express = require('express');
const router = express.Router();
const cookieParser = require('cookie-parser');
const {
  register,
  token,
  refresh,
  logout,
  getProfile,
  checkUsername,
  revokeUserSessions,
  changePassword,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');

// Use cookie parser for refresh tokens
router.use(cookieParser());

// Authentication endpoints - Token-based authentication
router.post('/register/', register);
router.post('/token/', token);
router.post('/refresh/', refresh);
router.post('/logout/', auth, logout);

// Profile and user management
router.get('/me/', auth, getProfile);
router.patch('/me/', auth, getProfile);
router.post('/change-password/', auth, changePassword);

// Username checking
router.post('/check-username/', checkUsername);

// Password reset
router.post('/forgot-password/', forgotPassword);
router.post('/reset-password/', resetPassword);

// Admin only endpoints
router.post('/revoke/:userId/', auth, requireAdmin, revokeUserSessions);

module.exports = router;
