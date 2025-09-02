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

    res.json(claim);
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

    const {
      employeeId,
      businessUnit,
      category,
      advances,
      lineItems
    } = req.body;

    const user = req.user;

    // Validate employee assignment
    if (user.role === 'employee') {
      if (employeeId !== user._id.toString()) {
        return res.status(403).json({ error: 'You can only create claims for yourself' });
      }
    }

    // Get policy for validation
    const policy = await Policy.findOne();
    if (!policy) {
      return res.status(500).json({ error: 'System policy not configured' });
    }

    // Calculate totals using amountInINR for line items
    const grandTotal = lineItems.reduce((sum, item) => sum + (item.amountInINR || 0), 0);
    const advancesTotal = advances.reduce((sum, advance) => sum + (advance.amount || 0), 0);
    const netPayable = grandTotal - advancesTotal;

    // Create claim
    const claim = new Claim({
      employeeId,
      createdBy: user._id,
      businessUnit,
      category,
      advances,
      lineItems,
      grandTotal,
      netPayable
    });

    await claim.save();

    // Add timeline entry
    // await claim.addTimelineEntry(user._id, 'CREATED', 'Claim submitted');

    // Create audit log
    await createAuditLog(user._id, 'CREATE_CLAIM', 'CLAIM', {
      claimId: claim._id,
      employeeId,
      grandTotal,
      category
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

// Executive approval (FINAL APPROVAL)
const executiveApprove = async (req, res) => {
  try {
    const { action, notes, reason } = req.body;
    const user = req.user;
    const claim = req.claim;

    console.log('🔍 executiveApprove called with:', {
      action,
      notes,
      userRole: user.role,
      claimId: claim._id,
      claimStatus: claim.status
    });

    // Check if user is executive (CEO or CTO) - this is now handled by middleware
    // but we keep the check for additional security
    const isExecutive = user.email === 'velan@theyellow.network' || user.email === 'gg@theyellownetwork.com';
    if (!isExecutive) {
      return res.status(403).json({ error: 'Only executives can provide final approval' });
    }

    // Check if claim is ready for executive approval (FINAL APPROVAL)
    if (claim.status !== 'finance_approved') {
      return res.status(400).json({ error: 'Claim not ready for executive approval' });
    }

    if (action === 'approve') {
      claim.status = 'executive_approved';
      claim.executiveApproval = {
        status: 'approved',
        approvedBy: user._id,
        approvedAt: new Date(),
        notes: notes || ''
      };
    } else if (action === 'reject') {
      claim.status = 'rejected';
      claim.executiveApproval = {
        status: 'rejected',
        approvedBy: user._id,
        approvedAt: new Date(),
        reason: reason || notes || 'Rejected by executive',
        notes: notes || ''
      };
    }

    await claim.save();

    console.log('✅ Executive claim updated successfully:', {
      claimId: claim._id,
      newStatus: claim.status,
      executiveApproval: claim.executiveApproval
    });

    // Create audit log
    await createAuditLog(user._id, 'EXECUTIVE_APPROVE', 'CLAIM', {
      claimId: claim._id,
      action
    });

    res.json(claim);
  } catch (error) {
    console.error('Executive approve error:', error);
    res.status(500).json({ error: 'Failed to approve claim' });
  }
};

// Mark claim as paid (AFTER EXECUTIVE APPROVAL)
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

    // Check if claim is ready for payment (AFTER EXECUTIVE APPROVAL)
    if (claim.status !== 'executive_approved') {
      return res.status(400).json({ error: 'Claim must be executive approved before marking as paid' });
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

export {
  getClaims,
  getClaimById,
  createClaim,
  financeApprove,
  executiveApprove,
  markAsPaid,
  uploadAttachment,
  getClaimStats
};
