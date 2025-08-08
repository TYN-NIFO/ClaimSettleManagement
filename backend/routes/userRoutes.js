import express from 'express';
const router = express.Router();
import rateLimit from 'express-rate-limit';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deactivateUser,
  resetPassword,
  getSupervisors
} from '../controllers/userController.js';
import { auth } from '../middleware/auth.js';
import { requireAdmin, canAccessUser } from '../middleware/rbac.js';
import { body } from 'express-validator';

// Rate limiter for user creation - DISABLED FOR NOW
// const createUserLimiter = rateLimit({
//   windowMs: 60 * 1000, // 1 minute
//   max: 5, // limit each IP to 5 user creation requests per minute
//   message: {
//     error: 'Too many user creation requests',
//     message: 'Please wait a moment before creating another user.'
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// Validation rules
const userValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('role').isIn(['employee', 'supervisor', 'finance_manager', 'admin']).withMessage('Valid role is required'),
  body('supervisorLevel').optional().isInt({ min: 1, max: 2 }).withMessage('Supervisor level must be 1 or 2'),
  body('department').optional().trim().isLength({ min: 1 }).withMessage('Department must not be empty')
];

const passwordValidation = [
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

// GET /users - Get all users (with filters)
router.get('/', auth, requireAdmin, getUsers);

// GET /users/supervisors - Get supervisors for assignment
router.get('/supervisors', auth, requireAdmin, getSupervisors);

// GET /users/:id - Get user by ID
router.get('/:id', auth, canAccessUser, getUserById);

// POST /users - Create new user (admin only)
router.post('/', auth, requireAdmin, userValidation, createUser);

// PATCH /users/:id - Update user
router.patch('/:id', auth, canAccessUser, userValidation, updateUser);

// PATCH /users/:id/deactivate - Deactivate user (admin only)
router.patch('/:id/deactivate', auth, requireAdmin, deactivateUser);

// PATCH /users/:id/reset-password - Reset user password (admin only)
router.patch('/:id/reset-password', auth, requireAdmin, passwordValidation, resetPassword);

export default router;
