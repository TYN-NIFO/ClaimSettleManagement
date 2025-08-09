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
    } else if (user.role === 'supervisor') {
      // Get assigned employees
      const assignedEmployees = await User.find({
        $or: [
          { assignedSupervisor1: user._id },
          { assignedSupervisor2: user._id }
        ]
      }).select('_id');
      
      console.log('👥 Supervisor assigned employees:', assignedEmployees.length);
      
      // If supervisor has assigned employees, filter by them
      if (assignedEmployees.length > 0) {
        filter.employeeId = { $in: assignedEmployees.map(emp => emp._id) };
        console.log('👥 Supervisor filter with assigned employees:', filter);
      } else {
        // If no employees assigned, show all claims that need supervisor approval
        filter.status = { $in: ['submitted', 's1_approved', 's2_approved', 'both_approved'] };
        console.log('👥 Supervisor filter without assigned employees:', filter);
      }
    } else if (user.role === 'finance_manager') {
      // Finance managers see all claims that need finance approval or are finance approved
      filter.status = { $in: ['both_approved', 'finance_approved', 'paid'] };
      console.log('💰 Finance manager filter:', filter);
    }
    // Admin can see all claims (no filter applied)
    console.log('🔍 Final filter:', filter);

    const claims = await Claim.find(filter)
      .populate('employeeId', 'name email')
      .populate('createdBy', 'name email')
      .populate('paid.paidBy', 'name email')
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
    await claim.addTimelineEntry(user._id, 'CREATED', 'Claim submitted');

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

// Approve/reject claim by supervisor
const approveClaim = async (req, res) => {
  try {
    const { action, notes } = req.body;
    const user = req.user;
    const claim = req.claim;

    console.log('🔍 approveClaim called with:', {
      action,
      notes,
      userRole: user.role,
      userSupervisorLevel: user.supervisorLevel,
      claimId: claim._id,
      claimStatus: claim.status
    });

    if (user.role !== 'supervisor') {
      return res.status(403).json({ error: 'Only supervisors can approve claims' });
    }

    // Check if claim can be approved
    if (claim.status === 'rejected') {
      return res.status(400).json({ error: 'Cannot approve a rejected claim' });
    }

    // Default to supervisor level 1 if not set
    const supervisorLevel = user.supervisorLevel || 1;
    
    if (!claim.canBeApprovedBySupervisor(supervisorLevel)) {
      return res.status(400).json({ error: 'Claim cannot be approved at this stage' });
    }

    const policy = await Policy.findOne();
    if (!policy) {
      return res.status(500).json({ error: 'System policy not configured' });
    }

    if (action === 'approve') {
      if (supervisorLevel === 1) {
        claim.status = 's1_approved';
        claim.approvals.supervisor1At = new Date();
        claim.notes.supervisor = notes || '';
        
        // Check if both supervisors approved or policy allows single approval
        const User = (await import('../models/User.js')).default;
        const employee = await User.findById(claim.employeeId);
        if (policy.approvalMode === 'any' || !employee?.assignedSupervisor2) {
          claim.status = 'both_approved';
        }
      } else if (supervisorLevel === 2) {
        claim.status = 's2_approved';
        claim.approvals.supervisor2At = new Date();
        claim.notes.supervisor = notes || '';
        
        // Check if both supervisors approved
        if (claim.approvals.supervisor1At) {
          claim.status = 'both_approved';
        } else {
          // If no supervisor level 1 approval, check if policy allows single approval
          const User = (await import('../models/User.js')).default;
          const employee = await User.findById(claim.employeeId);
          if (policy.approvalMode === 'any' || !employee?.assignedSupervisor1) {
            claim.status = 'both_approved';
          }
        }
      }

      await claim.addTimelineEntry(user._id, 'APPROVED', `Approved by ${user.name}`);
    } else if (action === 'reject') {
      claim.status = 'rejected';
      claim.notes.rejectionReason = notes || 'Rejected by supervisor';
      await claim.addTimelineEntry(user._id, 'REJECTED', `Rejected by ${user.name}: ${notes}`);
    }

    await claim.save();

    console.log('✅ Claim updated successfully:', {
      claimId: claim._id,
      newStatus: claim.status,
      approvals: claim.approvals
    });

    // Create audit log
    await createAuditLog(user._id, 'APPROVE_CLAIM', 'CLAIM', {
      claimId: claim._id,
      action,
      supervisorLevel: supervisorLevel
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

    console.log('✅ Finance claim updated successfully:', {
      claimId: claim._id,
      newStatus: claim.status,
      approvals: claim.approvals
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

// Mark claim as paid
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

export {
  getClaims,
  getClaimById,
  createClaim,
  approveClaim,
  financeApprove,
  markAsPaid,
  uploadAttachment,
  getClaimStats
};
