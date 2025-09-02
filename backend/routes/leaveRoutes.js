import express from 'express';
import {
  createLeave,
  getUserLeaves,
  getPendingLeaves,
  approveLeave,
  updateLeave,
  deleteLeave,
  getLeaveAnalytics,
  getTodayLeaves,
  getLeavesByDateRange,
  createBulkLeaves
} from '../controllers/leaveController.js';
import { auth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';

const router = express.Router();

// Validation schemas
const createLeaveSchema = {
  type: {
    in: ['body'],
    isIn: {
      options: ['Business Trip', 'WFH', 'Planned Leave', 'Unplanned Leave', 'OD', 'Permission', 'Flexi'],
      errorMessage: 'Invalid leave type. Must be one of: Business Trip, WFH, Planned Leave, Unplanned Leave, OD, Permission, Flexi'
    }
  },
  startDate: {
    in: ['body'],
    notEmpty: {
      errorMessage: 'Start date is required'
    },
    isISO8601: {
      errorMessage: 'Start date must be a valid date'
    }
  },
  endDate: {
    in: ['body'],
    notEmpty: {
      errorMessage: 'End date is required'
    },
    isISO8601: {
      errorMessage: 'End date must be a valid date'
    }
  },
  hours: {
    in: ['body'],
    optional: true,
    isFloat: {
      options: { min: 0.5, max: 24 },
      errorMessage: 'Hours must be between 0.5 and 24'
    }
  },
  reason: {
    in: ['body'],
    optional: true,
    isLength: {
      options: { max: 500 },
      errorMessage: 'Reason must not exceed 500 characters'
    }
  },
  timezone: {
    in: ['body'],
    optional: true,
    isLength: {
      options: { min: 1, max: 50 },
      errorMessage: 'Timezone must be between 1 and 50 characters'
    }
  }
};

const updateLeaveSchema = {
  ...createLeaveSchema,
  type: {
    ...createLeaveSchema.type,
    optional: true
  },
  startDate: {
    ...createLeaveSchema.startDate,
    optional: true
  },
  endDate: {
    ...createLeaveSchema.endDate,
    optional: true
  }
};

const approveLeaveSchema = {
  action: {
    in: ['body'],
    isIn: {
      options: ['approve', 'reject'],
      errorMessage: 'Action must be either "approve" or "reject"'
    }
  },
  notes: {
    in: ['body'],
    optional: true,
    isLength: {
      options: { max: 500 },
      errorMessage: 'Notes must not exceed 500 characters'
    }
  },
  rejectionReason: {
    in: ['body'],
    optional: true,
    isLength: {
      options: { max: 500 },
      errorMessage: 'Rejection reason must not exceed 500 characters'
    }
  }
};

const querySchema = {
  year: {
    in: ['query'],
    optional: true,
    isInt: {
      options: { min: 2020, max: 2030 },
      errorMessage: 'Year must be between 2020 and 2030'
    }
  },
  month: {
    in: ['query'],
    optional: true,
    isInt: {
      options: { min: 1, max: 12 },
      errorMessage: 'Month must be between 1 and 12'
    }
  },
  status: {
    in: ['query'],
    optional: true,
    isIn: {
      options: ['submitted', 'approved', 'rejected'],
      errorMessage: 'Invalid status'
    }
  },
  type: {
    in: ['query'],
    optional: true,
    isIn: {
      options: ['Business Trip', 'WFH', 'Planned Leave', 'Unplanned Leave', 'OD', 'Permission', 'Flexi'],
      errorMessage: 'Invalid leave type. Must be one of: Business Trip, WFH, Planned Leave, Unplanned Leave, OD, Permission, Flexi'
    }
  },
  page: {
    in: ['query'],
    optional: true,
    isInt: {
      options: { min: 1 },
      errorMessage: 'Page must be a positive integer'
    }
  },
  limit: {
    in: ['query'],
    optional: true,
    isInt: {
      options: { min: 1, max: 100 },
      errorMessage: 'Limit must be between 1 and 100'
    }
  }
};

// All routes require authentication
router.use(auth);

// POST /api/leaves - Create a new leave request
router.post('/', validateRequest(createLeaveSchema), createLeave);

// GET /api/leaves - Get user's leave requests with filtering and pagination
router.get('/', validateRequest(querySchema), getUserLeaves);

// GET /api/leaves/pending - Get pending leave requests (CTO/CEO only)
router.get('/pending', validateRequest(querySchema), getPendingLeaves);

// GET /api/leaves/analytics - Get organization-wide leave analytics (CTO/CEO only)
router.get('/analytics', validateRequest(querySchema), getLeaveAnalytics);

// GET /api/leaves/today - Get today's leave status
router.get('/today', getTodayLeaves);

// GET /api/leaves/by-date-range - Get leaves within a date range
router.get('/by-date-range', getLeavesByDateRange);

// POST /api/leaves/bulk - Bulk upload leave data (CTO/CEO only)
router.post('/bulk', createBulkLeaves);

// PUT /api/leaves/:leaveId - Update a leave request (only if submitted)
router.put('/:leaveId', validateRequest(updateLeaveSchema), updateLeave);

// POST /api/leaves/:leaveId/approve - Approve or reject a leave request (CTO/CEO only)
router.post('/:leaveId/approve', validateRequest(approveLeaveSchema), approveLeave);

// DELETE /api/leaves/:leaveId - Delete a leave request (only if submitted)
router.delete('/:leaveId', deleteLeave);

export default router;