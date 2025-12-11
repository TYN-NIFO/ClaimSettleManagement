import mongoose from 'mongoose';
import { getNextLeaveSequence } from '../services/counterService.js';

const LeaveSchema = new mongoose.Schema({
  // Leave identification
  leaveId: {
    type: String,
    unique: true,
    required: false  // Auto-generated in pre-save hook
  },
  
  // Employee information
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Leave details
  type: {
    type: String,
    enum: ['Business Trip', 'WFH', 'Planned Leave', 'Unplanned Leave', 'OD', 'Permission', 'Flexi'],
    required: true
  },
  
  startDate: {
    type: Date,
    required: true
  },
  
  endDate: {
    type: Date,
    required: true
  },
  
  isFullDay: {
    type: Boolean,
    default: true
  },
  
  hours: {
    type: Number,
    min: 0,
    max: 24,
    default: null,
    validate: {
      validator: function(value) {
        // Hours is required only for Permission type
        if (this.type === 'Permission') {
          return value !== null && value !== undefined && value > 0;
        }
        // For other types, hours should be null
        return value === null || value === undefined;
      },
      message: 'Hours is required for Permission type and should be null for other types'
    }
  },
  
  reason: {
    type: String,
    trim: true,
    default: ''
  },
  
  // Status and approval
  status: {
    type: String,
    enum: ['submitted', 'approved', 'rejected'],
    default: 'submitted'
  },
  
  approval: {
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: ''
    }
  },
  
  // Timezone for accurate date handling
  timezone: {
    type: String,
    default: 'Asia/Kolkata'
  },
  
  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
LeaveSchema.index({ employeeId: 1, startDate: -1 });
LeaveSchema.index({ status: 1, createdAt: -1 });
LeaveSchema.index({ 'approval.approvedBy': 1 });
LeaveSchema.index({ startDate: 1, endDate: 1 });
LeaveSchema.index({ type: 1 });

// Virtual for calculating leave duration in days
LeaveSchema.virtual('durationInDays').get(function() {
  if (this.type === 'Permission' && this.hours) {
    return this.hours / 8; // Permission hours converted to days
  }
  
  const start = new Date(this.startDate);
  const end = new Date(this.endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
  
  return diffDays;
});

// Pre-save middleware to generate leaveId and validate
LeaveSchema.pre('save', async function(next) {
  if (!this.leaveId) {
    try {
      const seq = await getNextLeaveSequence();
      const year = new Date().getFullYear();
      this.leaveId = `leave_${year}_${String(seq).padStart(5, '0')}`;
    } catch (error) {
      console.error('Error generating leave ID:', error);
      return next(new Error('Failed to generate leave ID'));
    }
  }
  
  // Validation: endDate should be >= startDate
  if (this.endDate < this.startDate) {
    const error = new Error('End date cannot be before start date');
    error.name = 'ValidationError';
    return next(error);
  }
  
  // For single day leaves, ensure startDate equals endDate
  if (this.startDate.toDateString() === this.endDate.toDateString()) {
    this.endDate = this.startDate;
  }
  
  next();
});

// Static method to get CTO/CEO emails
LeaveSchema.statics.getApprovers = function() {
  return ['velan@theyellow.network', 'gg@theyellownetwork.com'];
};

// Instance method to check if user can edit this leave
LeaveSchema.methods.canEdit = function(userId) {
  return this.employeeId.toString() === userId.toString() && this.status === 'submitted';
};

// Instance method to check if user can delete this leave
LeaveSchema.methods.canDelete = function(userId) {
  return this.employeeId.toString() === userId.toString() && this.status === 'submitted';
};

// Instance method to check if user can approve this leave
LeaveSchema.methods.canApprove = function(userEmail) {
  const approvers = ['velan@theyellow.network', 'gg@theyellownetwork.com'];
  return approvers.includes(userEmail) && this.status === 'submitted';
};

// Instance method to get public JSON (for employee view)
LeaveSchema.methods.toPublicJSON = function() {
  const leave = this.toObject({ virtuals: true });
  return {
    ...leave,
    durationInDays: this.durationInDays
  };
};

export default mongoose.model('Leave', LeaveSchema);