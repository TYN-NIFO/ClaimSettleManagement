const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  attachments: [{
    url: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    mime: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['submitted', 's1_approved', 's2_approved', 'both_approved', 'finance_approved', 'paid', 'rejected'],
    default: 'submitted'
  },
  approvals: {
    supervisor1At: Date,
    supervisor2At: Date,
    financeManagerAt: Date
  },
  notes: {
    supervisor: String,
    financeManager: String,
    rejectionReason: String
  },
  paid: {
    isPaid: {
      type: Boolean,
      default: false
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    paidAt: Date,
    channel: String
  },
  timeline: [{
    at: {
      type: Date,
      default: Date.now
    },
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    action: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    }
  }]
}, {
  timestamps: true
});

// Indexes for efficient queries
claimSchema.index({ employeeId: 1 });
claimSchema.index({ status: 1 });
claimSchema.index({ createdAt: -1 });
claimSchema.index({ 'paid.isPaid': 1 });
claimSchema.index({ category: 1 });

// Method to add timeline entry
claimSchema.methods.addTimelineEntry = function(userId, action, message) {
  this.timeline.push({
    by: userId,
    action,
    message
  });
  return this.save();
};

// Method to check if claim can be approved by supervisor
claimSchema.methods.canBeApprovedBySupervisor = function(supervisorLevel) {
  if (this.status === 'rejected') return false;
  
  if (supervisorLevel === 1) {
    return this.status === 'submitted';
  } else if (supervisorLevel === 2) {
    return this.status === 's1_approved';
  }
  return false;
};

// Method to check if claim is ready for finance approval
claimSchema.methods.isReadyForFinance = function() {
  return this.status === 'both_approved' || this.status === 's1_approved';
};

module.exports = mongoose.model('Claim', claimSchema);
