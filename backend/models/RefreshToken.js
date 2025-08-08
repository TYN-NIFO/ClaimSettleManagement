import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const refreshTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tokenHash: {
    type: String,
    required: true
  },
  jti: {
    type: String,
    required: true,
    unique: true
  },
  family: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  isRevoked: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
refreshTokenSchema.index({ userId: 1 });
refreshTokenSchema.index({ family: 1 });
refreshTokenSchema.index({ isRevoked: 1 });

// Method to hash token
refreshTokenSchema.statics.hashToken = function(token) {
  return bcrypt.hashSync(token, 12);
};

// Method to verify token
refreshTokenSchema.methods.verifyToken = function(token) {
  return bcrypt.compareSync(token, this.tokenHash);
};

// TTL index to automatically delete expired tokens (jti field already has unique index)
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('RefreshToken', refreshTokenSchema);
