const express = require('express');
const router = express.Router();
const {
  getPolicy,
  updatePolicy
} = require('../controllers/policyController');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const { body } = require('express-validator');

// Validation rules
const policyValidation = [
  body('approvalMode').optional().isIn(['both', 'any']).withMessage('Approval mode must be "both" or "any"'),
  body('claimCategories').optional().isArray().withMessage('Claim categories must be an array'),
  body('maxAmountBeforeFinanceManager').optional().isFloat({ min: 0 }).withMessage('Max amount must be a positive number'),
  body('allowedFileTypes').optional().isArray().withMessage('Allowed file types must be an array'),
  body('maxFileSizeMB').optional().isFloat({ min: 1 }).withMessage('Max file size must be at least 1MB'),
  body('payoutChannels').optional().isArray().withMessage('Payout channels must be an array'),
  body('autoAssignSupervisors').optional().isBoolean().withMessage('Auto assign supervisors must be a boolean'),
  body('claimRetentionDays').optional().isInt({ min: 30 }).withMessage('Claim retention days must be at least 30')
];

// GET /policies - Get current policy
router.get('/', auth, getPolicy);

// PATCH /policies - Update policy (admin only)
router.patch('/', auth, requireAdmin, policyValidation, updatePolicy);

module.exports = router;
