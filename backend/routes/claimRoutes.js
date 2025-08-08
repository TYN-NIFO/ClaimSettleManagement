import express from 'express';
import multer from 'multer';
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
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Max 10 files per request
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
    claimData.policyVersion = policy.version;

    // Compute totals
    const totals = computeClaimTotals(claimData);
    claimData.totalsByHead = totals.totalsByHead;
    claimData.grandTotal = totals.grandTotal;
    claimData.netPayable = totals.netPayable;

    // Validate against policy
    const violations = validateAgainstPolicy(claimData, policy);
    claimData.violations = violations;

    // Check if there are hard errors that prevent submission
    const hardErrors = violations.filter(v => v.level === 'error');
    if (hardErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        violations: hardErrors,
        message: 'Claim has validation errors that must be fixed before submission'
      });
    }

    const claim = new Claim(claimData);
    await claim.save();

    // Create audit log
    await createAuditLog(req.user._id, 'claim_created', `Claim ${claim._id} created`, req.ip, req.get('User-Agent'));

    res.status(201).json({
      success: true,
      message: 'Claim created successfully',
      claimId: claim._id,
      violations: violations.filter(v => v.level === 'warn'), // Only return warnings
      claim
    });
  } catch (error) {
    console.error('Claim creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create claim',
      details: error.message
    });
  }
});

/**
 * POST /api/claims/:id/files
 * Upload files for a specific line item
 */
router.post('/:id/files', auth, upload.array('files', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const { lineItemId, labels } = req.body; // labels is array of document labels

    const claim = await Claim.findById(id);
    if (!claim) {
      return res.status(404).json({
        success: false,
        error: 'Claim not found'
      });
    }

    // Check if user can modify this claim
    if (claim.employeeId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to modify this claim'
      });
    }

    // Check if claim can be modified
    if (!['submitted', 'rejected'].includes(claim.status)) {
      return res.status(400).json({
        success: false,
        error: 'Claim cannot be modified in current status'
      });
    }

    const lineItem = claim.lineItems.id(lineItemId);
    if (!lineItem) {
      return res.status(404).json({
        success: false,
        error: 'Line item not found'
      });
    }

    const uploadedFiles = [];
    const labelArray = labels ? JSON.parse(labels) : [];

    // Process uploaded files
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const label = labelArray[i] || 'supporting_doc';

      try {
        const fileInfo = await storageService.save(file);
        fileInfo.label = label;

        lineItem.attachments.push(fileInfo);
        uploadedFiles.push(fileInfo);
      } catch (fileError) {
        console.error('File upload error:', fileError);
        // Continue with other files
      }
    }

    await claim.save();

    res.json({
      success: true,
      message: 'Files uploaded successfully',
      uploadedFiles
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload files',
      details: error.message
    });
  }
});

/**
 * GET /api/claims
 * Get claims with role-based filtering
 */
router.get('/', auth, async (req, res) => {
  try {
    const { status, category, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    // Role-based filtering
    if (req.user.role === 'employee') {
      query.employeeId = req.user._id;
    } else if (req.user.role === 'supervisor') {
      // Supervisors see claims from their team members
      // This would need to be enhanced based on your team structure
      query.status = { $in: ['submitted', 'approved', 'rejected'] };
    } else if (req.user.role === 'finance_manager') {
      query.status = { $in: ['approved', 'finance_approved', 'paid'] };
    }
    // Admin sees all claims

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    const claims = await Claim.find(query)
      .populate('employeeId', 'name email')
      .populate('supervisorApproval.approvedBy', 'name email')
      .populate('financeApproval.approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Claim.countDocuments(query);

    res.json({
      success: true,
      claims,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Claims get error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get claims',
      details: error.message
    });
  }
});

/**
 * GET /api/claims/:id
 * Get a specific claim
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id)
      .populate('employeeId', 'name email')
      .populate('supervisorApproval.approvedBy', 'name email')
      .populate('financeApproval.approvedBy', 'name email')
      .populate('payment.paidBy', 'name email');

    if (!claim) {
      return res.status(404).json({
        success: false,
        error: 'Claim not found'
      });
    }

    // Check if user can view this claim
    if (req.user.role === 'employee' && claim.employeeId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this claim'
      });
    }

    res.json({
      success: true,
      claim
    });
  } catch (error) {
    console.error('Claim get error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get claim',
      details: error.message
    });
  }
});

/**
 * PATCH /api/claims/:id
 * Update a claim (only if status allows)
 */
router.patch('/:id', auth, async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id);
    if (!claim) {
      return res.status(404).json({
        success: false,
        error: 'Claim not found'
      });
    }

    // Check if user can modify this claim
    if (claim.employeeId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to modify this claim'
      });
    }

    // Check if claim can be modified
    if (!['submitted', 'rejected'].includes(claim.status)) {
      return res.status(400).json({
        success: false,
        error: 'Claim cannot be modified in current status'
      });
    }

    const updateData = req.body;

    // Get current policy for validation
    const policy = await getCurrentPolicy();
    updateData.policyVersion = policy.version;

    // Compute totals
    const totals = computeClaimTotals({ ...claim.toObject(), ...updateData });
    updateData.totalsByHead = totals.totalsByHead;
    updateData.grandTotal = totals.grandTotal;
    updateData.netPayable = totals.netPayable;

    // Validate against policy
    const violations = validateAgainstPolicy({ ...claim.toObject(), ...updateData }, policy);
    updateData.violations = violations;

    // Check if there are hard errors
    const hardErrors = violations.filter(v => v.level === 'error');
    if (hardErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        violations: hardErrors,
        message: 'Claim has validation errors that must be fixed before submission'
      });
    }

    const updatedClaim = await Claim.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('employeeId', 'name email');

    res.json({
      success: true,
      message: 'Claim updated successfully',
      violations: violations.filter(v => v.level === 'warn'),
      claim: updatedClaim
    });
  } catch (error) {
    console.error('Claim update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update claim',
      details: error.message
    });
  }
});

/**
 * POST /api/claims/:id/approve
 * Approve or reject a claim (Supervisor)
 */
router.post('/:id/approve', auth, rbac(['supervisor', 'admin']), async (req, res) => {
  try {
    const { action, reason, notes } = req.body;
    const { id } = req.params;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be "approve" or "reject"'
      });
    }

    if (action === 'reject' && !reason) {
      return res.status(400).json({
        success: false,
        error: 'Reason is required when rejecting a claim'
      });
    }

    const claim = await Claim.findById(id);
    if (!claim) {
      return res.status(404).json({
        success: false,
        error: 'Claim not found'
      });
    }

    // Check if claim can be approved
    if (claim.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        error: 'Claim is not in a state that can be approved'
      });
    }

    // Update supervisor approval
    claim.supervisorApproval = {
      approvedBy: req.user._id,
      approvedAt: new Date(),
      status: action,
      reason: action === 'reject' ? reason : undefined,
      notes
    };

    // Update claim status
    claim.status = action === 'approve' ? 'approved' : 'rejected';

    await claim.save();

    // Create audit log
    await createAuditLog(
      req.user._id,
      `claim_${action}d`,
      `Claim ${claim._id} ${action}d by supervisor`,
      req.ip,
      req.get('User-Agent')
    );

    res.json({
      success: true,
      message: `Claim ${action}d successfully`,
      claim
    });
  } catch (error) {
    console.error('Claim approval error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process claim approval',
      details: error.message
    });
  }
});

/**
 * POST /api/claims/:id/finance
 * Finance approval (Finance Manager)
 */
router.post('/:id/finance', auth, rbac(['finance_manager', 'admin']), async (req, res) => {
  try {
    const { action, reason, notes } = req.body;
    const { id } = req.params;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be "approve" or "reject"'
      });
    }

    if (action === 'reject' && !reason) {
      return res.status(400).json({
        success: false,
        error: 'Reason is required when rejecting a claim'
      });
    }

    const claim = await Claim.findById(id);
    if (!claim) {
      return res.status(404).json({
        success: false,
        error: 'Claim not found'
      });
    }

    // Check if claim can be finance approved
    if (claim.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Claim must be approved by supervisor before finance approval'
      });
    }

    // Update finance approval
    claim.financeApproval = {
      approvedBy: req.user._id,
      approvedAt: new Date(),
      status: action,
      reason: action === 'reject' ? reason : undefined,
      notes
    };

    // Update claim status
    claim.status = action === 'approve' ? 'finance_approved' : 'rejected';

    await claim.save();

    // Create audit log
    await createAuditLog(
      req.user._id,
      `claim_finance_${action}d`,
      `Claim ${claim._id} finance ${action}d`,
      req.ip,
      req.get('User-Agent')
    );

    res.json({
      success: true,
      message: `Claim finance ${action}d successfully`,
      claim
    });
  } catch (error) {
    console.error('Finance approval error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process finance approval',
      details: error.message
    });
  }
});

/**
 * POST /api/claims/:id/pay
 * Mark claim as paid (Finance Manager)
 */
router.post('/:id/pay', auth, rbac(['finance_manager', 'admin']), async (req, res) => {
  try {
    const { channel, reference } = req.body;
    const { id } = req.params;

    if (!channel) {
      return res.status(400).json({
        success: false,
        error: 'Payment channel is required'
      });
    }

    const claim = await Claim.findById(id);
    if (!claim) {
      return res.status(404).json({
        success: false,
        error: 'Claim not found'
      });
    }

    // Check if claim can be paid
    if (claim.status !== 'finance_approved') {
      return res.status(400).json({
        success: false,
        error: 'Claim must be finance approved before payment'
      });
    }

    // Update payment info
    claim.payment = {
      paidBy: req.user._id,
      paidAt: new Date(),
      channel,
      reference
    };

    claim.status = 'paid';

    await claim.save();

    // Create audit log
    await createAuditLog(
      req.user._id,
      'claim_paid',
      `Claim ${claim._id} marked as paid via ${channel}`,
      req.ip,
      req.get('User-Agent')
    );

    res.json({
      success: true,
      message: 'Claim marked as paid successfully',
      claim
    });
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark claim as paid',
      details: error.message
    });
  }
});

/**
 * DELETE /api/claims/:id
 * Delete a claim (only if not submitted or by admin)
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id);
    if (!claim) {
      return res.status(404).json({
        success: false,
        error: 'Claim not found'
      });
    }

    // Check if user can delete this claim
    const canDelete = req.user.role === 'admin' || 
                     (claim.employeeId.toString() === req.user._id.toString() && 
                      claim.status === 'submitted');

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this claim'
      });
    }

    // Delete associated files
    for (const lineItem of claim.lineItems) {
      for (const attachment of lineItem.attachments) {
        try {
          await storageService.remove(attachment.storageKey);
        } catch (fileError) {
          console.error('File deletion error:', fileError);
        }
      }
    }

    await Claim.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Claim deleted successfully'
    });
  } catch (error) {
    console.error('Claim deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete claim',
      details: error.message
    });
  }
});

export default router;
