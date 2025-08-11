import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { auth } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import Claim from '../models/Claim.js';
import { validateAgainstPolicy, computeClaimTotals, getCurrentPolicy } from '../services/policyValidation.js';
import storageService from '../services/storage.js';
import { createAuditLog } from '../controllers/authController.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 4 * 1024 * 1024, // 4MB limit for Vercel free tier compatibility
    files: 10, // Max 10 files per request
    fieldSize: 4 * 1024 * 1024 // 4MB field size limit
  },
  fileFilter: (req, file, cb) => {
    console.log('Multer processing file:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    // Accept PDF files and image files
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPEG, JPG, and PNG files are allowed'), false);
    }
  }
});

/**
 * POST /api/claims
 * Create a new claim with line items
 */
router.post('/', auth, async (req, res) => {
  try {
    const claimData = req.body;
    claimData.employeeId = req.user._id;

    // Get current policy
    const policy = await getCurrentPolicy();
    if (!policy) {
      return res.status(500).json({ error: 'System policy not configured' });
    }

    // Validate claim against policy
    const validation = await validateAgainstPolicy(claimData, policy);
    const hardErrors = validation.violations.filter(v => v.level === 'error');
    
    if (hardErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        violations: hardErrors,
        message: 'Claim has validation errors that must be fixed before submission'
      });
    }

    // Compute totals
    const totals = await computeClaimTotals(claimData, policy);
    claimData.grandTotal = totals.grandTotal;
    claimData.netPayable = totals.netPayable;

    // Create claim
    const claim = new Claim(claimData);
    await claim.save();

    // Create audit log
    await createAuditLog(req.user._id, 'CREATE_CLAIM', 'CLAIM', {
      claimId: claim._id,
      employeeId: claimData.employeeId,
      grandTotal: claimData.grandTotal,
      category: claimData.category
    });

    res.status(201).json(claim);
  } catch (error) {
    console.error('Create claim error:', error);
    res.status(500).json({ error: 'Failed to create claim' });
  }
});

/**
 * GET /api/claims
 * Get claims based on user role
 */
router.get('/', auth, async (req, res) => {
  try {
    const { status, category, page = 1, limit = 10 } = req.query;
    const user = req.user;
    const filter = {};

    // Apply status and category filters
    if (status) filter.status = status;
    if (category) filter.category = category;

    // Role-based filtering
    if (user.role === 'employee') {
      filter.employeeId = user._id;
    } else if (user.role === 'supervisor') {
      // Supervisors see claims from their assigned employees
      const assignedEmployees = await User.find({
        $or: [
          { assignedSupervisor1: user._id },
          { assignedSupervisor2: user._id }
        ]
      }).select('_id');
      filter.employeeId = { $in: assignedEmployees.map(emp => emp._id) };
    }
    // Admin and Finance Manager can see all claims (no filter applied)

    const claims = await Claim.find(filter)
      .populate('employeeId', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Claim.countDocuments(filter);

    res.json({
      claims,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Get claims error:', error);
    res.status(500).json({ error: 'Failed to fetch claims' });
  }
});

/**
 * GET /api/claims/:id
 * Get a specific claim
 */
router.get('/:id', auth, rbac(['employee', 'supervisor', 'finance_manager', 'admin']), async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id)
      .populate('employeeId', 'name email')
      .populate('createdBy', 'name email');

    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    res.json(claim);
  } catch (error) {
    console.error('Get claim error:', error);
    res.status(500).json({ error: 'Failed to fetch claim' });
  }
});

/**
 * POST /api/claims/:id/approve
 * Approve/reject claim by supervisor
 */
router.post('/:id/approve', auth, rbac(['supervisor']), async (req, res) => {
  try {
    const { action, notes, rejectionReason } = req.body;
    const claim = await Claim.findById(req.params.id);

    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    if (action === 'approve') {
      claim.status = 'approved';
      claim.supervisorApproval = {
        status: 'approved',
        approvedBy: req.user._id,
        approvedAt: new Date(),
        notes: notes || ''
      };
    } else if (action === 'reject') {
      claim.status = 'rejected';
      claim.supervisorApproval = {
        status: 'rejected',
        approvedBy: req.user._id,
        approvedAt: new Date(),
        reason: rejectionReason || notes || 'Rejected by supervisor',
        notes: notes || ''
      };
    }

    await claim.save();

    // Create audit log
    await createAuditLog(req.user._id, 'APPROVE_CLAIM', 'CLAIM', {
      claimId: claim._id,
      action,
      notes: notes || '',
      rejectionReason: rejectionReason || ''
    });

    res.json(claim);
  } catch (error) {
    console.error('Approve claim error:', error);
    res.status(500).json({ error: 'Failed to approve claim' });
  }
});

/**
 * POST /api/claims/:id/finance-approve
 * Approve/reject claim by finance manager
 */
router.post('/:id/finance-approve', auth, rbac(['finance_manager']), async (req, res) => {
  try {
    const { action, notes, rejectionReason } = req.body;
    const claim = await Claim.findById(req.params.id);

    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    if (claim.status !== 'approved') {
      return res.status(400).json({ error: 'Claim must be supervisor approved first' });
    }

    if (action === 'approve') {
      claim.status = 'finance_approved';
      claim.financeApproval = {
        status: 'approved',
        approvedBy: req.user._id,
        approvedAt: new Date(),
        notes: notes || ''
      };
    } else if (action === 'reject') {
      claim.status = 'rejected';
      claim.financeApproval = {
        status: 'rejected',
        approvedBy: req.user._id,
        approvedAt: new Date(),
        reason: rejectionReason || notes || 'Rejected by finance manager',
        notes: notes || ''
      };
    }

    await claim.save();

    // Create audit log
    await createAuditLog(req.user._id, 'FINANCE_APPROVE_CLAIM', 'CLAIM', {
      claimId: claim._id,
      action,
      notes: notes || '',
      rejectionReason: rejectionReason || ''
    });

    res.json(claim);
  } catch (error) {
    console.error('Finance approve claim error:', error);
    res.status(500).json({ error: 'Failed to approve claim' });
  }
});

/**
 * POST /api/claims/:id/mark-paid
 * Mark claim as paid
 */
router.post('/:id/mark-paid', auth, rbac(['finance_manager', 'admin']), async (req, res) => {
  try {
    const { channel } = req.body;
    const claim = await Claim.findById(req.params.id);

    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    if (claim.status !== 'finance_approved') {
      return res.status(400).json({ error: 'Claim must be finance approved first' });
    }

    claim.status = 'paid';
    claim.payment = {
      paidBy: req.user._id,
      paidAt: new Date(),
      channel: channel || 'manual'
    };

    await claim.save();

    // Create audit log
    await createAuditLog(req.user._id, 'MARK_PAID', 'CLAIM', {
      claimId: claim._id,
      channel: channel || 'manual'
    });

    res.json(claim);
  } catch (error) {
    console.error('Mark paid error:', error);
    res.status(500).json({ error: 'Failed to mark claim as paid' });
  }
});

/**
 * POST /api/claims/:id/upload
 * Upload attachment to claim
 */
router.post('/:id/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id);
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get current policy for file validation
    const policy = await getCurrentPolicy();
    if (!policy) {
      return res.status(500).json({ error: 'System policy not configured' });
    }

    // Validate file type
    const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
    if (!allowedExtensions.includes(fileExtension)) {
      return res.status(400).json({ error: 'File type not allowed. Only PDF, JPG, JPEG, and PNG files are allowed.' });
    }

    // Validate file size
    if (req.file.size > (policy.maxFileSizeMB || 10) * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds limit' });
    }

    // Store file using storage service
    const fileKey = await storageService.uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);

    const attachment = {
      fileId: fileKey,
      name: req.file.originalname,
      size: req.file.size,
      mime: req.file.mimetype,
      storageKey: fileKey,
      label: 'attachment'
    };

    claim.attachments.push(attachment);
    await claim.save();

    // Create audit log
    await createAuditLog(req.user._id, 'UPLOAD_ATTACHMENT', 'CLAIM', {
      claimId: claim._id,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });

    res.json(attachment);
  } catch (error) {
    console.error('Upload attachment error:', error);
    res.status(500).json({ error: 'Failed to upload attachment' });
  }
});

export default router;
