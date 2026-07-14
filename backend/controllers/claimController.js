import Claim from '../models/Claim.js';
import User from '../models/User.js';
import Policy from '../models/Policy.js';
import AuditLog from '../models/AuditLog.js';
import { validationResult } from 'express-validator';

// Create audit log entry
const createAuditLog = async (userId, action, resource, details = {}) => {
  try {
    await AuditLog.create({
      userId,
      action,
      resource,
      details
    });
  } catch (error) {
    console.error('Audit log creation failed:', error);
  }
};

// Get claims based on user role
const getClaims = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 10 } = req.query;
    const user = req.user;
    const filter = {};

    console.log('🔍 getClaims called with:', {
      userRole: user.role,
      userEmail: user.email,
      queryParams: req.query
    });

    // Apply status and category filters
    if (status) filter.status = status;
    if (category) filter.category = category;

    // Role-based filtering
    if (user.role === 'employee') {
      filter.employeeId = user._id;
      console.log('👤 Employee filter:', filter);
    }
    // Finance managers, executives, and admins see ALL claims (no filter applied)
    console.log('🔍 Final filter:', filter);

    const claims = await Claim.find(filter)
      .populate('employeeId', 'name email')
      .populate('financeApproval.approvedBy', 'name email')
      .populate('payment.paidBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Claim.countDocuments(filter);

    console.log('📊 Results:', {
      claimsFound: claims.length,
      totalCount: count,
      userRole: user.role
    });

    res.json({
      claims,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      totalClaims: count
    });
  } catch (error) {
    console.error('Get claims error:', error);
    res.status(500).json({ error: 'Failed to fetch claims' });
  }
};

// Get claim by ID
const getClaimById = async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id)
      .populate('employeeId', 'name email department')
      .populate('financeApproval.approvedBy', 'name email')
      .populate('payment.paidBy', 'name email');

    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    // Generate S3 URLs for attachments that are missing the url field
    const S3_BUCKET = process.env.AWS_S3_BUCKET_NAME || 'tyn-claims-app-storage-prod';
    const S3_REGION = process.env.AWS_REGION || 'us-east-1';

    const fixAttachments = (attachments) => {
      if (!attachments || !Array.isArray(attachments)) return attachments;
      return attachments.map(att => {
        if (!att.url && att.storageKey) {
          return {
            ...att,
            url: `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${att.storageKey}`
          };
        }
        return att;
      });
    };

    // Convert to plain object and stringify ObjectIds for safe frontend comparison
    const claimObj = JSON.parse(JSON.stringify(claim.toObject()));

    // Fix top-level attachments
    claimObj.attachments = fixAttachments(claimObj.attachments);

    // Fix line item attachments
    if (claimObj.lineItems) {
      claimObj.lineItems = claimObj.lineItems.map(item => ({
        ...item,
        attachments: fixAttachments(item.attachments)
      }));
    }

    res.json(claimObj);
  } catch (error) {
    console.error('Get claim error:', error);
    res.status(500).json({ error: 'Failed to fetch claim' });
  }
};

// Create new claim
const createClaim = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Extract data from processed claimData (set by route)
    const {
      employeeId,
      businessUnit,
      category,
      advances,
      lineItems,
      grandTotal,
      netPayable,
      createdBy
    } = req.body;

    const user = req.user;

    // Employee assignment validation is handled in the route
    // The route already sets employeeId = req.user._id for employees

    // Totals are already calculated by the route
    // Use the pre-calculated values from the route

    // Initialize claim with common fields (using pre-calculated values from route)
    const claimData = {
      employeeId,
      createdBy: createdBy || user._id,
      businessUnit,
      category,
      advances,
      lineItems,
      grandTotal,
      netPayable
      // Status will be set based on user role below
    };

    console.log('🔍 User creating claim:', {
      userId: user._id,
      userEmail: user.email,
      userRole: user.role
    });

    // Set status based on user role
    if (user.email === 'finance@theyellow.network') {
      console.log('🔧 Setting up finance manager claim with finance_approved status');
      claimData.status = 'finance_approved';
      claimData.financeApproval = {
        status: 'approved',
        approvedBy: user._id,
        approvedAt: new Date(),
        notes: 'Auto-approved as created by finance manager'
      };
      console.log('✅ Claim data after finance manager setup:', {
        status: claimData.status,
        financeApproval: claimData.financeApproval
      });
    }
    // Special handling for executive (gg) claims
    else if (user.email === 'gg@theyellownetwork.com') {
      claimData.status = 'done';
    }
    // Default status for all other users
    else {
      claimData.status = 'submitted';
    }

    // Create claim with final data
    console.log('📝 Final claim data before save:', {
      status: claimData.status,
      financeApproval: claimData.financeApproval,
      executiveApproval: claimData.executiveApproval,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });

    const claim = new Claim(claimData);

    console.log('📝 Claim instance before save:', {
      status: claim.status,
      financeApproval: claim.financeApproval,
    });
    await claim.save();
    console.log('✅ Claim after save:', {
      status: claim.status,
      financeApproval: claim.financeApproval,
      _id: claim._id
    });

    // Create audit log
    await createAuditLog(user._id, 'CREATE_CLAIM', 'CLAIM', {
      claimId: claim._id,
      employeeId,
      grandTotal,
      category,
      status: claim.status,
      autoApproved: claim.status !== 'submitted'
    });

    res.status(201).json(claim);
  } catch (error) {
    console.error('Create claim error:', error);
    res.status(500).json({ error: 'Failed to create claim' });
  }
};



// Finance manager approval (FIRST APPROVAL)
const financeApprove = async (req, res) => {
  try {
    const { action, notes, reason } = req.body;
    const user = req.user;
    const claim = req.claim;

    console.log('🔍 financeApprove called with:', {
      action,
      notes,
      userRole: user.role,
      claimId: claim._id,
      claimStatus: claim.status
    });

    if (user.role !== 'finance_manager') {
      return res.status(403).json({ error: 'Only finance managers can approve claims' });
    }

    // Check if claim is ready for finance approval (FIRST APPROVAL)
    if (claim.status !== 'submitted') {
      return res.status(400).json({ error: 'Claim not ready for finance approval' });
    }

    if (action === 'approve') {
      claim.status = 'finance_approved';
      claim.financeApproval = {
        status: 'approved',
        approvedBy: user._id,
        approvedAt: new Date(),
        notes: notes || ''
      };
    } else if (action === 'reject') {
      claim.status = 'rejected';
      claim.financeApproval = {
        status: 'rejected',
        approvedBy: user._id,
        approvedAt: new Date(),
        reason: reason || notes || 'Rejected by finance manager',
        notes: notes || ''
      };
    }

    await claim.save();

    console.log('✅ Finance claim updated successfully:', {
      claimId: claim._id,
      newStatus: claim.status,
      financeApproval: claim.financeApproval
    });

    // Create audit log
    await createAuditLog(user._id, 'FINANCE_APPROVE', 'CLAIM', {
      claimId: claim._id,
      action
    });

    res.json(claim);
  } catch (error) {
    console.error('Finance approve error:', error);
    res.status(500).json({ error: 'Failed to approve claim' });
  }
};

// Mark claim as paid (AFTER FINANCE APPROVAL)
const markAsPaid = async (req, res) => {
  try {
    const { channel } = req.body;
    const user = req.user;
    const claim = req.claim;

    console.log('🔍 markAsPaid called with:', {
      channel,
      userRole: user.role,
      claimStatus: claim.status
    });

    if (user.role !== 'finance_manager' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Only finance managers can mark claims as paid' });
    }

    // Check if claim is ready for payment (AFTER FINANCE APPROVAL)
    if (claim.status !== 'finance_approved') {
      return res.status(400).json({ error: 'Claim must be finance approved before marking as paid' });
    }

    const policy = await Policy.findOne();
    if (!policy) {
      return res.status(500).json({ error: 'System policy not configured' });
    }

    if (!policy.payoutChannels.includes(channel)) {
      return res.status(400).json({ error: 'Invalid payout channel' });
    }

    claim.payment = {
      paidBy: user._id,
      paidAt: new Date(),
      channel: channel || 'manual'
    };
    claim.status = 'paid';

    // await claim.addTimelineEntry(user._id, 'PAID', `Marked as paid via ${channel} by ${user.name}`);
    await claim.save();

    // Create audit log
    await createAuditLog(user._id, 'MARK_PAID', 'CLAIM', {
      claimId: claim._id,
      channel
    });

    console.log('✅ Claim marked as paid successfully:', {
      claimId: claim._id,
      channel,
      paidBy: user.name
    });

    res.json(claim);
  } catch (error) {
    console.error('❌ Mark as paid error:', error);
    res.status(500).json({ error: 'Failed to mark claim as paid' });
  }
};

// Upload attachment
const uploadAttachment = async (req, res) => {
  try {
    const claim = req.claim;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const policy = await Policy.findOne();
    if (!policy) {
      return res.status(500).json({ error: 'System policy not configured' });
    }

    // Validate file type
    const fileExtension = file.originalname.split('.').pop().toLowerCase();
    if (!policy.allowedFileTypes.includes(fileExtension)) {
      return res.status(400).json({ error: 'File type not allowed' });
    }

    // Validate file size
    if (file.size > policy.maxFileSizeMB * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds limit' });
    }

    const attachment = {
      url: `/uploads/${file.filename}`,
      name: file.originalname,
      mime: file.mimetype,
      size: file.size,
      uploadedAt: new Date()
    };

    claim.attachments.push(attachment);
    await claim.save();

    // await claim.addTimelineEntry(req.user._id, 'ATTACHMENT_ADDED', `Added attachment: ${file.originalname}`);

    res.json(attachment);
  } catch (error) {
    console.error('Upload attachment error:', error);
    res.status(500).json({ error: 'Failed to upload attachment' });
  }
};

// Get claim statistics
const getClaimStats = async (req, res) => {
  try {
    const user = req.user;
    const filter = {};

    // Role-based filtering
    if (user.role === 'employee') {
      filter.employeeId = user._id;
    }

    const stats = await Claim.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const totalClaims = await Claim.countDocuments(filter);
    const totalAmount = await Claim.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$amount' } } }
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
};

// Download proxy — fetches S3 file server-side and streams to browser (avoids CORS)
const downloadProxy = async (req, res) => {
  try {
    const { url, filename } = req.query;
    if (!url) return res.status(400).json({ error: 'url param required' });
    const S3_BUCKET = process.env.AWS_S3_BUCKET_NAME || 'tyn-claims-app-storage-prod';
    const S3_REGION = process.env.AWS_REGION || 'us-east-1';
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname !== `${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com`) {
      return res.status(403).json({ error: 'URL not allowed' });
    }
    const s3Res = await fetch(url);
    if (!s3Res.ok) return res.status(s3Res.status).json({ error: 'S3 fetch failed' });
    const contentType = s3Res.headers.get('content-type') || 'application/octet-stream';
    const safe = (filename || 'download').replace(/[^\w. -]/g, '_');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${safe}"`);
    const reader = s3Res.body.getReader();
    const pump = async () => { const {done,value} = await reader.read(); if(done){res.end();return;} res.write(Buffer.from(value)); return pump(); };
    await pump();
  } catch (error) {
    console.error('Download proxy error:', error);
    res.status(500).json({ error: 'Download failed' });
  }
};

export {
  getClaims,
  getClaimById,
  createClaim,
  financeApprove,
  markAsPaid,
  uploadAttachment,
  getClaimStats,
  downloadProxy
};
