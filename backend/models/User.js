import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  // Basic identity fields
  firstName: {
    type: String,
    trim: true,
    default: ''
  },
  lastName: {
    type: String,
    trim: true,
    default: ''
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['employee', 'supervisor', 'finance_manager', 'admin'],
    default: 'employee'
  },
  supervisorLevel: {
    type: Number,
    min: 1,
    max: 2,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedSupervisor1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedSupervisor2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastLoginAt: {
    type: Date
  },
  department: {
    type: String,
    trim: true
  },
  companyName: {
    type: String,
    trim: true,
    default: ''
  },
  companyUrl: {
    type: String,
    trim: true,
    default: ''
  },
  avatarUrl: {
    type: String,
    trim: true,
    default: ''
  },
  // Password reset fields
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ assignedSupervisor1: 1 });
userSchema.index({ assignedSupervisor2: 1 });
userSchema.index({ resetPasswordToken: 1 });

// Virtual for password (not stored)
userSchema.virtual('password').set(function(password) {
  this.passwordHash = bcrypt.hashSync(password, 12);
});

// Method to check password
userSchema.methods.checkPassword = function(password) {
  return bcrypt.compareSync(password, this.passwordHash);
};

// Method to get public profile
userSchema.methods.toPublicJSON = function() {
  const user = this.toObject();
  delete user.passwordHash;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpires;
  return user;
};

export default mongoose.model('User', userSchema);
