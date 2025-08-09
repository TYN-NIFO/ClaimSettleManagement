import express from 'express';
const router = express.Router();
import cookieParser from 'cookie-parser';
import {
  register,
  token,
  refresh,
  logout,
  getProfile,
  checkUsername,
  revokeUserSessions,
  changePassword,
  forgotPassword,
  resetPassword,
  uploadAvatar
} from '../controllers/authController.js';
import { auth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';

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
router.post('/avatar/', auth, uploadAvatar);

// Username checking
router.post('/check-username/', checkUsername);

// Password reset
router.post('/forgot-password/', forgotPassword);
router.post('/reset-password/', resetPassword);

// Admin only endpoints
router.post('/revoke/:userId/', auth, requireAdmin, revokeUserSessions);

export default router;
