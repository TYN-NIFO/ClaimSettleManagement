const mongoose = require('mongoose');

const policySchema = new mongoose.Schema({
  approvalMode: {
    type: String,
    enum: ['both', 'any'],
    default: 'both',
    required: true
  },
  claimCategories: [{
    type: String,
    trim: true
  }],
  maxAmountBeforeFinanceManager: {
    type: Number,
    default: 10000,
    min: 0
  },
  allowedFileTypes: [{
    type: String,
    trim: true
  }],
  maxFileSizeMB: {
    type: Number,
    default: 10,
    min: 1
  },
  payoutChannels: [{
    type: String,
    trim: true
  }],
  autoAssignSupervisors: {
    type: Boolean,
    default: false
  },
  claimRetentionDays: {
    type: Number,
    default: 365,
    min: 30
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Ensure only one policy document exists
policySchema.index({}, { unique: true });

module.exports = mongoose.model('Policy', policySchema);
