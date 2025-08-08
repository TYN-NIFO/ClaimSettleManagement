const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
  claimNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  claimantName: {
    type: String,
    required: true,
    trim: true
  },
  claimType: {
    type: String,
    required: true,
    enum: ['Property', 'Liability', 'Health', 'Auto', 'Other']
  },
  claimAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    required: true,
    enum: ['Pending', 'Under Review', 'Approved', 'Rejected', 'Settled'],
    default: 'Pending'
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  incidentDate: {
    type: Date,
    required: true
  },
  filedDate: {
    type: Date,
    default: Date.now
  },
  settlementAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  settlementDate: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  documents: [{
    fileName: String,
    fileUrl: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for better query performance
claimSchema.index({ claimNumber: 1 });
claimSchema.index({ status: 1 });
claimSchema.index({ filedDate: -1 });

module.exports = mongoose.model('Claim', claimSchema);
