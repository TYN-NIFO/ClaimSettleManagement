import express from 'express';
import { auth } from '../middleware/auth.js';
import { rbac } from '../middleware/rbac.js';
import Policy from '../models/Policy.js';
import { createDefaultPolicy } from '../services/policyValidation.js';

const router = express.Router();

/**
 * GET /api/policy/current
 * Get the current active policy
 */
router.get('/current', auth, async (req, res) => {
  try {
    let policy = await Policy.findOne().sort({ createdAt: -1 });
    
    if (!policy) {
      // Create default policy if none exists
      policy = await createDefaultPolicy();
    }

    res.json({
      success: true,
      policy
    });
  } catch (error) {
    console.error('Policy get error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get policy',
      details: error.message
    });
  }
});

/**
 * PUT /api/policy
 * Update or create policy (Admin only)
 */
router.put('/', auth, rbac(['admin']), async (req, res) => {
  try {
    const policyData = req.body;

    // Validate required fields
    if (!policyData.version) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: 'Version is required'
      });
    }

    if (!policyData.mealCaps || !policyData.lodgingCaps || !policyData.requiredDocuments) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: 'mealCaps, lodgingCaps, and requiredDocuments are required'
      });
    }

    // Create new policy version
    const policy = new Policy({
      ...policyData,
      updatedBy: req.user._id
    });

    await policy.save();

    res.json({
      success: true,
      message: 'Policy updated successfully',
      policy
    });
  } catch (error) {
    console.error('Policy update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update policy',
      details: error.message
    });
  }
});

/**
 * GET /api/policy/history
 * Get policy history (Admin only)
 */
router.get('/history', auth, rbac(['admin']), async (req, res) => {
  try {
    const policies = await Policy.find()
      .sort({ createdAt: -1 })
      .select('version createdAt updatedBy')
      .populate('updatedBy', 'name email');

    res.json({
      success: true,
      policies
    });
  } catch (error) {
    console.error('Policy history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get policy history',
      details: error.message
    });
  }
});

export default router;
