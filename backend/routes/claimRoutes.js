import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { auth } from '../middleware/auth.js';
import { rbac, canAccessClaim } from '../middleware/rbac.js';
import Claim from '../models/Claim.js';
import User from '../models/User.js';
import { validateAgainstPolicy, computeClaimTotals, getCurrentPolicy } from '../services/policyValidation.js';
import storageService from '../services/storage.js';
import { createAuditLog } from '../controllers/authController.js';
import { approveClaim, financeApprove, markAsPaid } from '../controllers/claimController.js';

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
 * Create a new claim with line items and file uploads
 */
router.post('/', auth, upload.array('files', 50), async (req, res) => {
  try {
    const claimData = JSON.parse(req.body.claimData || '{}');
    const fileMapping = JSON.parse(req.body.fileMapping || '{}');
    claimData.employeeId = req.user._id;

    console.log('Claim creation request:', {
      body: req.body,
      processedData: claimData,
      user: req.user._id,
      userObject: req.user
    });

    // Get current policy
    const policy = await getCurrentPolicy();
    if (!policy) {
      return res.status(500).json({ error: 'System policy not configured' });
    }

    console.log('Policy loaded:', {
      categories: policy.claimCategories,
      policyId: policy._id,
      categoriesLength: policy.claimCategories?.length,
      firstCategory: policy.claimCategories?.[0],
      lastCategory: policy.claimCategories?.[policy.claimCategories?.length - 1]
    });

    // Validate claim against policy
    const validation = await validateAgainstPolicy(claimData, policy);
    const hardErrors = validation.violations.filter(v => v.level === 'error');
    
    console.log('Validation result:', {
      violations: validation.violations,
      hardErrors: hardErrors,
      hardErrorsCount: hardErrors.length,
      claimCategory: claimData.category,
      claimBusinessUnit: claimData.businessUnit
    });
    
    if (hardErrors.length > 0) {
      console.log('Validation failed with errors:', hardErrors);
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
    claimData.createdBy = req.user._id;

    console.log('Final claim data before creation:', {
      employeeId: claimData.employeeId,
      createdBy: claimData.createdBy,
      category: claimData.category,
      businessUnit: claimData.businessUnit,
      userId: req.user._id
    });

    // Process uploaded files and attach to line items
    if (req.files && req.files.length > 0) {
      console.log('Processing uploaded files:', req.files.length);
      
      for (const file of req.files) {
        try {
          // Store file using storage service
          const result = await storageService.save(file);
          const attachment = {
            fileId: result.fileId,
            name: file.originalname,
            size: file.size,
            mime: file.mimetype,
            storageKey: result.storageKey,
            label: 'supporting_doc'
          };

          // Find which line item this file belongs to based on file mapping
          const lineItemIndex = fileMapping[file.originalname] || 0;
          if (claimData.lineItems && claimData.lineItems[lineItemIndex]) {
            if (!claimData.lineItems[lineItemIndex].attachments) {
              claimData.lineItems[lineItemIndex].attachments = [];
            }
            claimData.lineItems[lineItemIndex].attachments.push(attachment);
          }
        } catch (fileError) {
          console.error('Error processing file:', file.originalname, fileError);
          // Continue processing other files
        }
      }
    }

    // Create claim
    const claim = new Claim(claimData);
    await claim.save();

    // Create audit log
    await createAuditLog(req.user._id, 'CREATE_CLAIM', 'CLAIM', {
      claimId: claim._id,
      employeeId: claimData.employeeId,
      grandTotal: claimData.grandTotal,
      category: claimData.category,
      filesUploaded: req.files ? req.files.length : 0
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

    console.log('\n=== CLAIMS API DEBUG ===');
    console.log('User:', { id: user._id, name: user.name, email: user.email, role: user.role });
    console.log('Query params:', { status, category, page, limit });

    // Apply status and category filters
    if (status) filter.status = status;
    if (category) filter.category = category;

    // Role-based filtering
    if (user.role === 'employee') {
      filter.employeeId = user._id;
      console.log('Employee filter applied:', filter);
    } else if (user.role === 'supervisor') {
      // Supervisors see claims from their assigned employees AND their own claims
      const assignedEmployees = await User.find({
        $or: [
          { assignedSupervisor1: user._id },
          { assignedSupervisor2: user._id }
        ]
      }).select('_id name email');
      
      console.log('Assigned employees found:', assignedEmployees);
      
      const assignedEmployeeIds = assignedEmployees.map(emp => emp._id);
      assignedEmployeeIds.push(user._id); // Include their own claims
      
      console.log('Employee IDs in filter:', assignedEmployeeIds);
      
      filter.employeeId = { $in: assignedEmployeeIds };
      console.log('Supervisor filter applied:', JSON.stringify(filter, null, 2));
    } else if (user.role === 'finance_manager') {
      // Finance managers see all claims - they need to see their own claims and all claims that need their attention
      // No filter applied - they can see everything
      console.log('Finance manager - no filter applied');
    }
    // Admin can see all claims (no filter applied)

    console.log('Final filter:', JSON.stringify(filter, null, 2));

    const claims = await Claim.find(filter)
      .populate('employeeId', 'name email')
      .populate('supervisorApproval.approvedBy', 'name email')
      .populate('financeApproval.approvedBy', 'name email')
      .populate('payment.paidBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    console.log('Claims found:', claims.length);
    claims.forEach((claim, index) => {
      console.log(`${index + 1}. Claim ID: ${claim._id}, Employee: ${claim.employeeId?.name} (${claim.employeeId?.email}), Status: ${claim.status}`);
    });

    const count = await Claim.countDocuments(filter);
    console.log('Total count with filter:', count);

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
 * GET /api/claims/stats
 * Get claim statistics
 */
router.get('/stats', auth, async (req, res) => {
  try {
    const user = req.user;
    const filter = {};

    // Role-based filtering
    if (user.role === 'employee') {
      filter.employeeId = user._id;
    } else if (user.role === 'supervisor') {
      const assignedEmployees = await User.find({
        $or: [
          { assignedSupervisor1: user._id },
          { assignedSupervisor2: user._id }
        ]
      }).select('_id');
      const assignedEmployeeIds = assignedEmployees.map(emp => emp._id);
      assignedEmployeeIds.push(user._id); // Include their own claims
      filter.employeeId = { $in: assignedEmployeeIds };
    }
    // Finance managers and admins can see all claims (no filter applied)

    const stats = await Claim.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$grandTotal' }
        }
      }
    ]);

    const totalClaims = await Claim.countDocuments(filter);
    const totalAmount = await Claim.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$grandTotal' } } }
    ]);

    res.json({
      statusStats: stats,
      totalClaims,
      totalAmount: totalAmount[0]?.total || 0
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
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
      .populate('supervisorApproval.approvedBy', 'name email')
      .populate('financeApproval.approvedBy', 'name email')
      .populate('payment.paidBy', 'name email');

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
 * PATCH /api/claims/:id
 * Update an existing claim with file support
 */
router.patch('/:id', auth, upload.array('files', 50), async (req, res) => {
  try {
    const claimId = req.params.id;
    const user = req.user;

    // Parse form data if files are included
    let updateData;
    let fileMapping = {};
    
    if (req.files && req.files.length > 0) {
      updateData = JSON.parse(req.body.claimData || '{}');
      fileMapping = JSON.parse(req.body.fileMapping || '{}');
    } else {
      updateData = req.body;
    }

    // Find the existing claim
    const existingClaim = await Claim.findById(claimId);
    if (!existingClaim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    // Check permissions - only allow updates if:
    // 1. User is the claim owner and claim is in editable state
    // 2. User is admin
    // 3. User is supervisor and claim is from assigned employee
    const canEdit = 
      user.role === 'admin' ||
      (existingClaim.employeeId.toString() === user._id.toString() && 
       ['submitted', 'rejected'].includes(existingClaim.status)) ||
      (user.role === 'supervisor' && ['submitted', 'rejected'].includes(existingClaim.status));

    if (!canEdit) {
      return res.status(403).json({ 
        error: 'Cannot edit claim in current status or insufficient permissions' 
      });
    }

    // Get current policy for validation
    const policy = await getCurrentPolicy();
    if (!policy) {
      return res.status(500).json({ error: 'System policy not configured' });
    }

    // Validate updated claim against policy
    const validation = await validateAgainstPolicy(updateData, policy);
    const hardErrors = validation.violations.filter(v => v.level === 'error');
    
    if (hardErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        violations: hardErrors,
        message: 'Claim has validation errors that must be fixed before submission'
      });
    }

    // Compute new totals
    const totals = await computeClaimTotals(updateData, policy);
    updateData.grandTotal = totals.grandTotal;
    updateData.netPayable = totals.netPayable;

    // Process new uploaded files and REPLACE existing attachments for line items
    if (req.files && req.files.length > 0) {
      console.log('Processing uploaded files for update (replacing existing):', req.files.length);
      
      for (const file of req.files) {
        try {
          // Store file using storage service
          const result = await storageService.save(file);
          const attachment = {
            fileId: result.fileId,
            name: file.originalname,
            size: file.size,
            mime: file.mimetype,
            storageKey: result.storageKey,
            label: 'supporting_doc'
          };

          // Find which line item this file belongs to based on file mapping
          const lineItemIndex = fileMapping[file.originalname] || 0;
          if (updateData.lineItems && updateData.lineItems[lineItemIndex]) {
            // REPLACE existing attachments instead of adding to them
            updateData.lineItems[lineItemIndex].attachments = [attachment];
            console.log(`Replaced attachment for line item ${lineItemIndex} with ${file.originalname}`);
          }
        } catch (fileError) {
          console.error('Error processing file during update:', file.originalname, fileError);
          // Continue processing other files
        }
      }
    }

    // Reset status to 'submitted' if claim was previously rejected and is being updated
    if (existingClaim.status === 'rejected') {
      updateData.status = 'submitted';
      // Clear previous approval/rejection data
      updateData.supervisorApproval = {
        status: 'pending'
      };
      updateData.financeApproval = {
        status: 'pending'
      };
    }

    // Update the claim
    const updatedClaim = await Claim.findByIdAndUpdate(
      claimId,
      {
        ...updateData,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).populate('employeeId', 'name email')
     .populate('supervisorApproval.approvedBy', 'name email')
     .populate('financeApproval.approvedBy', 'name email')
     .populate('payment.paidBy', 'name email');

    // Create audit log
    await createAuditLog(user._id, 'UPDATE_CLAIM', 'CLAIM', {
      claimId: updatedClaim._id,
      changes: Object.keys(updateData),
      filesUploaded: req.files ? req.files.length : 0,
      statusChanged: existingClaim.status !== updatedClaim.status
    });

    res.json(updatedClaim);
  } catch (error) {
    console.error('Update claim error:', error);
    res.status(500).json({ error: 'Failed to update claim' });
  }
});

/**
 * POST /api/claims/:id/approve
 * Approve/reject claim by supervisor
 */
router.post('/:id/approve', auth, rbac(['supervisor']), canAccessClaim, async (req, res) => {
  try {
    // Set the claim in req object for the controller
    req.claim = req.claim || await Claim.findById(req.params.id);
    if (!req.claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    
    // Call the controller function
    await approveClaim(req, res);
  } catch (error) {
    console.error('Approve claim error:', error);
    res.status(500).json({ error: 'Failed to approve claim', details: error?.message || 'Unknown error' });
  }
});

/**
 * POST /api/claims/:id/finance-approve
 * Approve/reject claim by finance manager
 */
router.post('/:id/finance-approve', auth, rbac(['finance_manager']), canAccessClaim, async (req, res) => {
  try {
    // Set the claim in req object for the controller
    req.claim = req.claim || await Claim.findById(req.params.id);
    if (!req.claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    
    // Call the controller function
    await financeApprove(req, res);
  } catch (error) {
    console.error('Finance approve claim error:', error);
    res.status(500).json({ error: 'Failed to approve claim', details: error?.message || 'Unknown error' });
  }
});

/**
 * POST /api/claims/:id/mark-paid
 * Mark claim as paid
 */
router.post('/:id/mark-paid', auth, rbac(['finance_manager', 'admin']), async (req, res) => {
  try {
    // Set the claim in req object for the controller
    req.claim = await Claim.findById(req.params.id);
    if (!req.claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    
    // Call the controller function
    await markAsPaid(req, res);
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
    const result = await storageService.save(req.file);
    const fileKey = result.storageKey;

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

/**
 * DELETE /api/claims/:id
 * Delete a claim (with role-based permissions)
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const claimId = req.params.id;
    const user = req.user;

    // Find the claim
    const claim = await Claim.findById(claimId);
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    // Check permissions based on role and claim status
    let canDelete = false;
    let reason = '';

    if (user.role === 'admin') {
      canDelete = true;
      reason = 'Admin can delete any claim';
    } else if (user.role === 'employee') {
      // Employees can delete their own claims if not yet approved
      if (claim.employeeId.toString() === user._id.toString()) {
        if (['submitted', 'rejected'].includes(claim.status)) {
          canDelete = true;
          reason = 'Employee can delete own claim before approval';
        } else {
          reason = `Cannot delete claim with status: ${claim.status}`;
        }
      } else {
        reason = 'Can only delete own claims';
      }
    } else if (user.role === 'supervisor') {
      // Supervisors can only delete their own claims (not claims from assigned employees)
      if (claim.employeeId.toString() === user._id.toString()) {
        if (['submitted', 'rejected'].includes(claim.status)) {
          canDelete = true;
          reason = 'Supervisor can delete own claim before approval';
        } else {
          reason = `Cannot delete claim with status: ${claim.status}`;
        }
      } else {
        reason = 'Can only delete own claims';
      }
    } else if (user.role === 'finance_manager') {
      // Finance managers can only delete their own claims (not claims from other employees)
      if (claim.employeeId.toString() === user._id.toString()) {
        if (['submitted', 'rejected'].includes(claim.status)) {
          canDelete = true;
          reason = 'Finance manager can delete own claim before approval';
        } else {
          reason = `Cannot delete claim with status: ${claim.status}`;
        }
      } else {
        reason = 'Can only delete own claims';
      }
    }

    if (!canDelete) {
      return res.status(403).json({ 
        error: 'Permission denied', 
        reason: reason 
      });
    }

    // Delete associated files from storage
    if (claim.lineItems && claim.lineItems.length > 0) {
      for (const lineItem of claim.lineItems) {
        if (lineItem.attachments && lineItem.attachments.length > 0) {
          for (const attachment of lineItem.attachments) {
            try {
              await storageService.remove(attachment.storageKey);
              console.log(`Deleted file: ${attachment.storageKey}`);
            } catch (fileError) {
              console.error(`Failed to delete file ${attachment.storageKey}:`, fileError);
              // Continue with claim deletion even if file deletion fails
            }
          }
        }
      }
    }

    // Delete the claim
    await Claim.findByIdAndDelete(claimId);

    // Create audit log
    await createAuditLog(user._id, 'DELETE_CLAIM', 'CLAIM', {
      claimId: claimId,
      employeeId: claim.employeeId,
      category: claim.category,
      grandTotal: claim.grandTotal,
      status: claim.status,
      reason: reason
    });

    console.log(`Claim ${claimId} deleted by ${user.role} ${user.name} - ${reason}`);

    res.json({ 
      success: true, 
      message: 'Claim deleted successfully',
      reason: reason
    });
  } catch (error) {
    console.error('Delete claim error:', error);
    res.status(500).json({ error: 'Failed to delete claim' });
  }
});

/**
 * GET /api/claims/debug-policy
 * Debug endpoint to check current policy
 */
router.get('/debug-policy', auth, async (req, res) => {
  try {
    const policy = await getCurrentPolicy();
    const { validCategories, validBusinessUnits } = await import('../lib/categoryMaster.js');
    
    res.json({
      policy: {
        id: policy._id,
        categories: policy.claimCategories,
        categoriesCount: policy.claimCategories?.length
      },
      categoryMaster: {
        categories: validCategories,
        categoriesCount: validCategories.length,
        businessUnits: validBusinessUnits
      },
      matches: {
        categoriesMatch: JSON.stringify(policy.claimCategories) === JSON.stringify(validCategories)
      }
    });
  } catch (error) {
    console.error('Debug policy error:', error);
    res.status(500).json({ error: 'Failed to get policy debug info' });
  }
});

// Middleware to check file access permissions
const canAccessFile = async (req, res, next) => {
  const { storageKey } = req.params;
  const user = req.user;

  try {
    // Find the claim that contains this file
    const claim = await Claim.findOne({
      'lineItems.attachments.storageKey': storageKey
    });

    if (!claim) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Admin can access all files
    if (user.role === 'admin') {
      req.claim = claim;
      return next();
    }

    // Employee can only access files from their own claims
    if (user.role === 'employee' && claim.employeeId.toString() === user._id.toString()) {
      req.claim = claim;
      return next();
    }

    // Supervisor can access files from claims of assigned employees
    if (user.role === 'supervisor') {
      const assignedEmployees = await User.find({
        $or: [
          { assignedSupervisor1: user._id },
          { assignedSupervisor2: user._id }
        ]
      }).select('_id');
      
      const employeeIds = assignedEmployees.map(emp => emp._id.toString());
      if (employeeIds.includes(claim.employeeId.toString())) {
        req.claim = claim;
        return next();
      }
    }

    // Finance manager can access files from all claims for complete oversight
    if (user.role === 'finance_manager') {
      // Finance managers should have access to all claim files for complete oversight
      req.claim = claim;
      return next();
    }

    return res.status(403).json({ error: 'Access denied to this file' });
  } catch (error) {
    console.error('Error in canAccessFile:', error);
    res.status(500).json({ error: 'Error checking file access' });
  }
};

/**
 * GET /api/claims/files/:storageKey
 * Serve uploaded files with proper access control
 */
router.get('/files/:storageKey', auth, canAccessFile, async (req, res) => {
  try {
    const { storageKey } = req.params;
    
    // Get file info and stream
    const fileInfo = await storageService.getInfo(storageKey);
    const fileStream = await storageService.getStream(storageKey);
    
    // Set appropriate headers
    res.setHeader('Content-Type', fileInfo.mime);
    res.setHeader('Content-Length', fileInfo.size);
    res.setHeader('Content-Disposition', `inline; filename="${storageKey}"`);
    
    // Pipe the file stream to response
    fileStream.pipe(res);
  } catch (error) {
    console.error('File serve error:', error);
    res.status(404).json({ error: 'File not found' });
  }
});

export default router;
