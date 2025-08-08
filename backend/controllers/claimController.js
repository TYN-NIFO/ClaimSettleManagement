const Claim = require('../models/Claim');
const User = require('../models/User');
const Policy = require('../models/Policy');
const AuditLog = require('../models/AuditLog');
const { validationResult } = require('express-validator');

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

    // Apply status and category filters
    if (status) filter.status = status;
    if (category) filter.category = category;

    // Role-based filtering
    if (user.role === 'employee') {
      filter.employeeId = user._id;
    } else if (user.role === 'supervisor') {
      // Get assigned employees
      const assignedEmployees = await User.find({
        $or: [
          { assignedSupervisor1: user._id },
          { assignedSupervisor2: user._id }
        ]
      }).select('_id');
      
      // If supervisor has assigned employees, filter by them
      if (assignedEmployees.length > 0) {
        filter.employeeId = { $in: assignedEmployees.map(emp => emp._id) };
      } else {
        // If no employees assigned, return empty result
        return res.json({
          claims: [],
          totalPages: 0,
          currentPage: parseInt(page),
          totalClaims: 0
        });
      }
    } else if (user.role === 'finance_manager') {
      // Finance managers see approved claims and claims that need finance approval
      filter.status = { $in: ['both_approved', 'finance_approved', 'paid'] };
    }
    // Admin can see all claims (no filter applied)

    const claims = await Claim.find(filter)
      .populate('employeeId', 'name email')
      .populate('createdBy', 'name email')
      .populate('paid.paidBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Claim.countDocuments(filter);

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
      .populate('createdBy', 'name email')
      .populate('paid.paidBy', 'name email')
      .populate('timeline.by', 'name email');

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
      category,
      date,
      amount,
      description,
      attachments
    } = req.body;

    const user = req.user;

    // Validate employee assignment
    if (user.role === 'employee') {
      if (employeeId !== user._id.toString()) {
        return res.status(403).json({ error: 'You can only create claims for yourself' });
      }
    } else if (user.role === 'supervisor') {
      // Check if employee is assigned to this supervisor
      const assignedEmployees = await User.find({
        _id: employeeId,
        $or: [
          { assignedSupervisor1: user._id },
          { assignedSupervisor2: user._id }
        ]
      });

      if (assignedEmployees.length === 0) {
        return res.status(403).json({ error: 'Employee not assigned to you' });
      }
    }

    // Get policy for validation
    const policy = await Policy.findOne();
    if (!policy) {
      return res.status(500).json({ error: 'System policy not configured' });
    }

    // Validate category
    if (!policy.claimCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid claim category' });
    }

    // Create claim
    const claim = new Claim({
      employeeId,
      createdBy: user._id,
      category,
      date,
      amount,
      description,
      attachments: attachments || []
    });

    await claim.save();

    // Add timeline entry
    await claim.addTimelineEntry(user._id, 'CREATED', 'Claim submitted');

    // Create audit log
    await createAuditLog(user._id, 'CREATE_CLAIM', 'CLAIM', {
      claimId: claim._id,
      employeeId,
      amount,
      category
    });

    res.status(201).json(claim);
  } catch (error) {
    console.error('Create claim error:', error);
    res.status(500).json({ error: 'Failed to create claim' });
  }
};

// Approve/reject claim by supervisor
const approveClaim = async (req, res) => {
  try {
    const { action, notes } = req.body;
    const user = req.user;
    const claim = req.claim;

    if (user.role !== 'supervisor') {
      return res.status(403).json({ error: 'Only supervisors can approve claims' });
    }

    if (!claim.canBeApprovedBySupervisor(user.supervisorLevel)) {
      return res.status(400).json({ error: 'Claim cannot be approved at this stage' });
    }

    const policy = await Policy.findOne();
    if (!policy) {
      return res.status(500).json({ error: 'System policy not configured' });
    }

    if (action === 'approve') {
      if (user.supervisorLevel === 1) {
        claim.status = 's1_approved';
        claim.approvals.supervisor1At = new Date();
        claim.notes.supervisor = notes || '';
        
        // Check if both supervisors approved or policy allows single approval
        if (policy.approvalMode === 'any' || !claim.assignedSupervisor2) {
          claim.status = 'both_approved';
        }
      } else if (user.supervisorLevel === 2) {
        claim.status = 's2_approved';
        claim.approvals.supervisor2At = new Date();
        claim.notes.supervisor = notes || '';
        
        // Check if both supervisors approved
        if (claim.status === 's1_approved') {
          claim.status = 'both_approved';
        }
      }

      await claim.addTimelineEntry(user._id, 'APPROVED', `Approved by ${user.name}`);
    } else if (action === 'reject') {
      claim.status = 'rejected';
      claim.notes.rejectionReason = notes || 'Rejected by supervisor';
      await claim.addTimelineEntry(user._id, 'REJECTED', `Rejected by ${user.name}: ${notes}`);
    }

    await claim.save();

    // Create audit log
    await createAuditLog(user._id, 'APPROVE_CLAIM', 'CLAIM', {
      claimId: claim._id,
      action,
      supervisorLevel: user.supervisorLevel
    });

    res.json(claim);
  } catch (error) {
    console.error('Approve claim error:', error);
    res.status(500).json({ error: 'Failed to approve claim' });
  }
};

// Finance manager approval
const financeApprove = async (req, res) => {
  try {
    const { action, notes } = req.body;
    const user = req.user;
    const claim = req.claim;

    if (user.role !== 'finance_manager') {
      return res.status(403).json({ error: 'Only finance managers can approve claims' });
    }

    if (!claim.isReadyForFinance()) {
      return res.status(400).json({ error: 'Claim not ready for finance approval' });
    }

    if (action === 'approve') {
      claim.status = 'finance_approved';
      claim.approvals.financeManagerAt = new Date();
      claim.notes.financeManager = notes || '';
      await claim.addTimelineEntry(user._id, 'FINANCE_APPROVED', `Approved by finance manager: ${user.name}`);
    } else if (action === 'reject') {
      claim.status = 'rejected';
      claim.notes.rejectionReason = notes || 'Rejected by finance manager';
      await claim.addTimelineEntry(user._id, 'FINANCE_REJECTED', `Rejected by finance manager: ${user.name}`);
    }

    await claim.save();

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

// Mark claim as paid
const markAsPaid = async (req, res) => {
  try {
    const { channel } = req.body;
    const user = req.user;
    const claim = req.claim;

    if (user.role !== 'supervisor') {
      return res.status(403).json({ error: 'Only supervisors can mark claims as paid' });
    }

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

    claim.paid = {
      isPaid: true,
      paidBy: user._id,
      paidAt: new Date(),
      channel
    };
    claim.status = 'paid';

    await claim.addTimelineEntry(user._id, 'PAID', `Marked as paid via ${channel} by ${user.name}`);
    await claim.save();

    // Create audit log
    await createAuditLog(user._id, 'MARK_PAID', 'CLAIM', {
      claimId: claim._id,
      channel
    });

    res.json(claim);
  } catch (error) {
    console.error('Mark as paid error:', error);
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

    await claim.addTimelineEntry(req.user._id, 'ATTACHMENT_ADDED', `Added attachment: ${file.originalname}`);

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
    } else if (user.role === 'supervisor') {
      const assignedEmployees = await User.find({
        $or: [
          { assignedSupervisor1: user._id },
          { assignedSupervisor2: user._id }
        ]
      }).select('_id');
      filter.employeeId = { $in: assignedEmployees.map(emp => emp._id) };
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

module.exports = {
  getClaims,
  getClaimById,
  createClaim,
  approveClaim,
  financeApprove,
  markAsPaid,
  uploadAttachment,
  getClaimStats
};
