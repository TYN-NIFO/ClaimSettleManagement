import mongoose from 'mongoose';
import crypto from 'crypto';

// OAuth state for the MCP connector (Claude, etc.). Codes and refresh tokens
// are stored only as SHA-256 hashes and expire automatically via TTL indexes.

export const hashOAuthSecret = (value) =>
  crypto.createHash('sha256').update(value).digest('hex');

// Dynamically registered OAuth clients (RFC 7591). `client` is the full
// registration record returned to the client.
const oauthClientSchema = new mongoose.Schema({
  clientId: { type: String, required: true, unique: true },
  client: { type: mongoose.Schema.Types.Mixed, required: true }
}, {
  timestamps: true
});

const oauthCodeSchema = new mongoose.Schema({
  codeHash: { type: String, required: true, unique: true },
  clientId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  codeChallenge: { type: String, required: true },
  redirectUri: { type: String, required: true },
  expiresAt: { type: Date, required: true }
});
oauthCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const oauthRefreshTokenSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true },
  clientId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true }
}, {
  timestamps: true
});
oauthRefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
oauthRefreshTokenSchema.index({ userId: 1 });

export const OAuthClient = mongoose.model('OAuthClient', oauthClientSchema);
export const OAuthCode = mongoose.model('OAuthCode', oauthCodeSchema);
export const OAuthRefreshToken = mongoose.model('OAuthRefreshToken', oauthRefreshTokenSchema);
