const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  getClaims,
  getClaimById,
  createClaim,
  approveClaim,
  financeApprove,
  markAsPaid,
  uploadAttachment,
  getClaimStats
} = require('../controllers/claimController');
const auth = require('../middleware/auth');
const { requireEmployee, requireSupervisor, requireFinanceManager, canAccessClaim } = require('../middleware/rbac');
const { body } = require('express-validator');

// Validation rules for claim creation
const claimValidation = [
  body('employeeId').isMongoId().withMessage('Valid employee ID is required'),
  body('category').trim().isLength({ min: 1 }).withMessage('Category is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
];

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// GET /api/claims - Get claims based on user role
router.get('/', auth, getClaims);

// GET /api/claims/stats - Get claim statistics
router.get('/stats', auth, getClaimStats);

// GET /api/claims/:id - Get claim by ID
router.get('/:id', auth, canAccessClaim, getClaimById);

// POST /api/claims - Create new claim
router.post('/', auth, requireEmployee, claimValidation, createClaim);

// POST /api/claims/:id/approve - Approve/reject claim (supervisor)
router.post('/:id/approve', auth, requireSupervisor, canAccessClaim, approveClaim);

// POST /api/claims/:id/finance-approve - Finance manager approval
router.post('/:id/finance-approve', auth, requireFinanceManager, canAccessClaim, financeApprove);

// POST /api/claims/:id/mark-paid - Mark claim as paid (supervisor)
router.post('/:id/mark-paid', auth, requireSupervisor, canAccessClaim, markAsPaid);

// POST /api/claims/:id/upload - Upload attachment
router.post('/:id/upload', auth, canAccessClaim, upload.single('file'), uploadAttachment);

module.exports = router;
