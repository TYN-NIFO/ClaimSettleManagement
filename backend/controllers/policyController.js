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

// Get current policy
const getPolicy = async (req, res) => {
  try {
    let policy = await Policy.findOne();
    
    if (!policy) {
      console.log('No policy found, creating default policy...');
      // Create default policy if none exists
      policy = new Policy({
        approvalMode: 'both',
        claimCategories: ['Travel', 'Healthcare', 'Office', 'Training', 'Other'],
        maxAmountBeforeFinanceManager: 10000,
        allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
        maxFileSizeMB: 10,
        payoutChannels: ['Bank Transfer', 'Cash', 'Check'],
        autoAssignSupervisors: false,
        claimRetentionDays: 365,
        updatedBy: req.user._id
      });
      await policy.save();
      console.log('Default policy created successfully');
    }

    console.log('Policy fetched:', {
      categories: policy.claimCategories,
      categoriesCount: policy.claimCategories.length
    });

    res.json(policy);
  } catch (error) {
    console.error('Get policy error:', error);
    res.status(500).json({ error: 'Failed to fetch policy' });
  }
};

// Update policy (admin only)
const updatePolicy = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      approvalMode,
      claimCategories,
      maxAmountBeforeFinanceManager,
      allowedFileTypes,
      maxFileSizeMB,
      payoutChannels,
      autoAssignSupervisors,
      claimRetentionDays
    } = req.body;

    let policy = await Policy.findOne();
    
    if (!policy) {
      policy = new Policy({
        updatedBy: req.user._id
      });
    }

    // Update policy fields
    if (approvalMode) policy.approvalMode = approvalMode;
    if (claimCategories) policy.claimCategories = claimCategories;
    if (maxAmountBeforeFinanceManager !== undefined) policy.maxAmountBeforeFinanceManager = maxAmountBeforeFinanceManager;
    if (allowedFileTypes) policy.allowedFileTypes = allowedFileTypes;
    if (maxFileSizeMB !== undefined) policy.maxFileSizeMB = maxFileSizeMB;
    if (payoutChannels) policy.payoutChannels = payoutChannels;
    if (autoAssignSupervisors !== undefined) policy.autoAssignSupervisors = autoAssignSupervisors;
    if (claimRetentionDays !== undefined) policy.claimRetentionDays = claimRetentionDays;

    policy.updatedBy = req.user._id;
    await policy.save();

    // Create audit log
    await createAuditLog(req.user._id, 'UPDATE_POLICY', 'POLICY', {
      changes: {
        approvalMode,
        claimCategories,
        maxAmountBeforeFinanceManager,
        allowedFileTypes,
        maxFileSizeMB,
        payoutChannels,
        autoAssignSupervisors,
        claimRetentionDays
      }
    });

    res.json(policy);
  } catch (error) {
    console.error('Update policy error:', error);
    res.status(500).json({ error: 'Failed to update policy' });
  }
};

export {
  getPolicy,
  updatePolicy
};
