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
    
    // Accept PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
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

    // Set initial status based on user role hierarchy
    if (req.user.role === 'finance_manager') {
      // Finance managers' claims skip both supervisor and finance approval
      claimData.status = 'finance_approved';
      claimData.supervisorApproval = {
        approvedBy: req.user._id,
        approvedAt: new Date(),
        status: 'approved',
        notes: 'Auto-approved: Claim created by Finance Manager'
      };
      claimData.financeApproval = {
        approvedBy: req.user._id,
        approvedAt: new Date(),
        status: 'approved',
        notes: 'Auto-approved: Claim created by Finance Manager'
      };
    } else if (req.user.role === 'supervisor') {
      // Supervisors' claims skip supervisor approval, go to finance stage
      claimData.status = 'approved';
      claimData.supervisorApproval = {
        approvedBy: req.user._id,
        approvedAt: new Date(),
        status: 'approved',
        notes: 'Auto-approved: Claim created by Supervisor'
      };
    } else if (req.user.role === 'admin') {
      // Admin claims can go directly to finance approved
      claimData.status = 'finance_approved';
      claimData.supervisorApproval = {
        approvedBy: req.user._id,
        approvedAt: new Date(),
        status: 'approved',
        notes: 'Auto-approved: Claim created by Admin'
      };
      claimData.financeApproval = {
        approvedBy: req.user._id,
        approvedAt: new Date(),
        status: 'approved',
        notes: 'Auto-approved: Claim created by Admin'
      };
    }
    // For employees, default status 'submitted' is used

    const claim = new Claim(claimData);
    await claim.save();

    // Create audit log
    // Create appropriate audit message based on role
    let auditMessage, successMessage;
    
    if (req.user.role === 'finance_manager') {
      auditMessage = `Claim ${claim._id} created and auto-approved to finance stage by Finance Manager`;
      successMessage = 'Claim created and auto-approved to finance stage successfully';
    } else if (req.user.role === 'supervisor') {
      auditMessage = `Claim ${claim._id} created and auto-approved to finance review by Supervisor`;
      successMessage = 'Claim created and auto-approved for finance review successfully';
    } else if (req.user.role === 'admin') {
      auditMessage = `Claim ${claim._id} created and auto-approved to finance stage by Admin`;
      successMessage = 'Claim created and auto-approved to finance stage successfully';
    } else {
      auditMessage = `Claim ${claim._id} created`;
      successMessage = 'Claim created successfully';
    }
    
    await createAuditLog(req.user._id, 'claim_created', auditMessage, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
      
    res.status(201).json({
      success: true,
      message: successMessage,
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
router.post('/:id/files', auth, (req, res, next) => {
  upload.array('files', 10)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err);
      return res.status(400).json({
        success: false,
        error: 'File upload error',
        details: err.message
      });
    } else if (err) {
      console.error('File upload error:', err);
      return res.status(400).json({
        success: false,
        error: 'File upload error',
        details: err.message
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    console.log('File upload request received:', {
      claimId: req.params.id,
      lineItemId: req.body.lineItemId,
      filesCount: req.files ? req.files.length : 0,
      body: req.body
    });

    const { id } = req.params;
    const { lineItemId, labels } = req.body; // labels is array of document labels

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files were uploaded'
      });
    }

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
    // Allow file uploads for claims that are in initial states or rejected
    // This includes auto-approved claims that were just created
    const allowedStatuses = ['submitted', 'rejected', 'approved', 'finance_approved', 's1_approved', 's2_approved', 'both_approved'];
    console.log('Claim status check:', {
      claimId: claim._id,
      claimStatus: claim.status,
      allowedStatuses: allowedStatuses,
      isAllowed: allowedStatuses.includes(claim.status)
    });
    
    if (!allowedStatuses.includes(claim.status)) {
      return res.status(400).json({
        success: false,
        error: 'Claim cannot be modified in current status',
        details: `Claim status: ${claim.status}, Allowed statuses: ${allowedStatuses.join(', ')}`
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
    const failedFiles = [];
    const labelArray = labels ? JSON.parse(labels) : [];

    // Process uploaded files
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const label = labelArray[i] || 'supporting_doc';

      console.log(`Processing file ${i + 1}:`, {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        label: label
      });

      try {
        const fileInfo = await storageService.save(file);
        fileInfo.label = label;

        lineItem.attachments.push(fileInfo);
        uploadedFiles.push(fileInfo);
        
        console.log(`File ${file.originalname} uploaded successfully:`, fileInfo);
      } catch (fileError) {
        console.error(`File upload error for ${file.originalname}:`, fileError);
        failedFiles.push({
          filename: file.originalname,
          error: fileError.message
        });
      }
    }

    await claim.save();

    const response = {
      success: true,
      message: `Files uploaded successfully. ${uploadedFiles.length} files uploaded, ${failedFiles.length} failed.`,
      uploadedFiles,
      failedFiles
    };

    console.log('File upload response:', response);
    res.json(response);
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
 * POST /api/claims/test-upload
 * Test file upload endpoint for debugging
 */
router.post('/test-upload', upload.array('files', 1), async (req, res) => {
  try {
    console.log('Test upload request received');
    console.log('Files:', req.files);
    console.log('Body:', req.body);
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }
    
    const file = req.files[0];
    console.log('Test file details:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      bufferLength: file.buffer ? file.buffer.length : 0
    });
    
    res.json({
      success: true,
      message: 'Test upload successful',
      file: {
        name: file.originalname,
        type: file.mimetype,
        size: file.size
      }
    });
  } catch (error) {
    console.error('Test upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Test upload failed',
      details: error.message
    });
  }
});

/**
 * GET /api/claims/stats
 * Get claim statistics
 */
router.get('/stats', auth, async (req, res) => {
  try {
    let query = {};

    // Role-based filtering for stats
    if (req.user.role === 'employee') {
      query.employeeId = req.user._id;
    } else if (req.user.role === 'supervisor') {
      // Supervisors see stats for claims they can approve
      query.status = { $in: ['submitted', 'approved', 'rejected'] };
    } else if (req.user.role === 'finance_manager') {
      query.status = { $in: ['approved', 'finance_approved', 'paid'] };
    }
    // Admin sees all stats

    // Get counts by status
    const statusCounts = await Claim.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$grandTotal' }
        }
      }
    ]);

    // Get total counts
    const totalClaims = await Claim.countDocuments(query);
    const totalAmount = await Claim.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);

    // Get recent claims (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentClaims = await Claim.countDocuments({
      ...query,
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Format the response
    const stats = {
      totalClaims,
      totalAmount: totalAmount[0]?.total || 0,
      recentClaims,
      byStatus: {}
    };

    // Convert status counts to object format
    statusCounts.forEach(item => {
      stats.byStatus[item._id] = {
        count: item.count,
        totalAmount: item.totalAmount
      };
    });

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Claims stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get claim stats',
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
      // Supervisors see all claims they need to manage
      // Show submitted (for approval), approved/rejected (for tracking)
      query.status = { $in: ['submitted', 'approved', 'rejected'] };
    } else if (req.user.role === 'finance_manager') {
      // Finance managers see all claims for complete oversight
      // No status filter - they can see all claim statuses
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
    // Allow file uploads for claims that are in initial states or rejected
    // This includes auto-approved claims that were just created
    const allowedStatuses = ['submitted', 'rejected', 'approved', 'finance_approved'];
    if (!allowedStatuses.includes(claim.status)) {
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
      status: action === 'approve' ? 'approved' : 'rejected',
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
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
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
      status: action === 'approve' ? 'approved' : 'rejected',
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
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
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
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
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
 * GET /api/claims/files/debug
 * Debug endpoint to list all files in the database
 */
router.get('/files/debug', auth, async (req, res) => {
  try {
    // Allow admin and supervisor access to this debug endpoint
    if (req.user.role !== 'admin' && req.user.role !== 'supervisor') {
      return res.status(403).json({
        success: false,
        error: 'Admin or supervisor access required'
      });
    }
    
    const claims = await Claim.find({});
    const allFiles = [];
    
    claims.forEach(claim => {
      if (claim.lineItems && Array.isArray(claim.lineItems)) {
        claim.lineItems.forEach((lineItem, lineItemIndex) => {
          if (lineItem.attachments && Array.isArray(lineItem.attachments)) {
            lineItem.attachments.forEach(attachment => {
              if (attachment && attachment.storageKey) {
                allFiles.push({
                  claimId: claim._id,
                  lineItemIndex,
                  storageKey: attachment.storageKey,
                  name: attachment.name,
                  size: attachment.size
                });
              }
            });
          }
        });
      }
    });
    
    res.json({
      success: true,
      totalFiles: allFiles.length,
      files: allFiles
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get debug info',
      details: error.message
    });
  }
});

/**
 * GET /api/files/:storageKey
 * Serve uploaded files
 */
router.get('/files/:storageKey', auth, async (req, res) => {
  try {
    const { storageKey } = req.params;
    
    console.log('File serving request for storageKey:', storageKey);
    
    // Find the file in the database by checking all claims
    // Use a more specific query to find the exact attachment
    const claim = await Claim.findOne({
      'lineItems.attachments': {
        $elemMatch: {
          'storageKey': storageKey
        }
      }
    });
    
    console.log('Claim found:', claim ? claim._id : 'No claim found');
    
    if (!claim) {
      return res.status(404).json({
        success: false,
        error: 'File not found in database'
      });
    }
    
    // Find the specific attachment
    let attachment = null;
    let lineItemIndex = -1;
    
    for (let i = 0; i < claim.lineItems.length; i++) {
      const lineItem = claim.lineItems[i];
      attachment = lineItem.attachments.find(att => att.storageKey === storageKey);
      if (attachment) {
        lineItemIndex = i;
        break;
      }
    }
    
    console.log('Attachment found:', attachment ? attachment.name : 'No attachment found');
    
    if (!attachment) {
      return res.status(404).json({
        success: false,
        error: 'File not found in claim attachments'
      });
    }
    
    // Check if user can access this file
    if (claim.employeeId.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin' && 
        req.user.role !== 'supervisor' && 
        req.user.role !== 'finance_manager') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this file'
      });
    }
    
    // Get file path
    const filePath = path.join(process.cwd(), 'uploads', storageKey);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found on disk'
      });
    }
    
    // Set headers
    res.setHeader('Content-Type', attachment.mime || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${attachment.name}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('File serving error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to serve file',
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
