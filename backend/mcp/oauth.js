import express from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { mcpAuthRouter, getOAuthProtectedResourceMetadataUrl } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { InvalidClientMetadataError, InvalidGrantError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import User from '../models/User.js';
import { OAuthClient, OAuthCode, OAuthRefreshToken, hashOAuthSecret } from '../models/OAuth.js';
import { generateAccessToken, createAuditLog } from '../controllers/authController.js';
import { renderLoginPage } from './loginPage.js';

// OAuth 2.1 authorization server for the MCP connector. Users sign in with
// their existing YDesk email and password; there is no sign-up. Access tokens
// are the same JWTs the web app uses, so /mcp and every API route accept them.

const CODE_TTL_MS = 5 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PENDING_SIGN_IN_TTL = '10m';

// Where a sign-in may send the user back to: Claude's hosted callback and
// localhost (Claude Code, MCP Inspector). Add more with MCP_OAUTH_REDIRECT_URIS.
const ALLOWED_REDIRECT_PATTERNS = [
  /^https:\/\/claude\.ai\/api\/mcp\/auth_callback$/,
  /^https:\/\/claude\.com\/api\/mcp\/auth_callback$/,
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/
];
const extraRedirectUris = (process.env.MCP_OAUTH_REDIRECT_URIS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const isAllowedRedirect = (uri) =>
  extraRedirectUris.includes(uri) || ALLOWED_REDIRECT_PATTERNS.some((rx) => rx.test(uri));

const redirectWith = (uri, params) => {
  const url = new URL(uri);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }
  return url.href;
};

const clientsStore = {
  async getClient(clientId) {
    const record = await OAuthClient.findOne({ clientId }).lean();
    return record?.client;
  },

  async registerClient(client) {
    const rejected = client.redirect_uris.filter((uri) => !isAllowedRedirect(uri));
    if (rejected.length > 0) {
      console.warn('MCP OAuth: rejected client registration, redirect URIs not allowed:', rejected);
      throw new InvalidClientMetadataError(`Redirect URI not allowed: ${rejected.join(', ')}`);
    }
    await OAuthClient.create({ clientId: client.client_id, client });
    return client;
  }
};

async function activeUser(userId) {
  const user = await User.findById(userId);
  if (!user || !user.isActive) throw new InvalidGrantError('User not found or inactive');
  return user;
}

async function issueTokens(user, clientId) {
  const accessToken = generateAccessToken(user);
  const refreshToken = crypto.randomBytes(32).toString('hex');
  await OAuthRefreshToken.create({
    tokenHash: hashOAuthSecret(refreshToken),
    clientId,
    userId: user._id,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
  });

  const { exp } = jwt.decode(accessToken);
  return {
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: exp - Math.floor(Date.now() / 1000),
    refresh_token: refreshToken
  };
}

const provider = {
  clientsStore,

  // Shows the YDesk sign-in page. The validated request travels through the
  // form as a short-lived signed token, so nothing is stored until sign-in.
  async authorize(client, params, res) {
    const request = jwt.sign({
      type: 'oauth_pending',
      clientId: client.client_id,
      clientName: client.client_name,
      redirectUri: params.redirectUri,
      codeChallenge: params.codeChallenge,
      state: params.state
    }, process.env.JWT_SECRET, { expiresIn: PENDING_SIGN_IN_TTL });

    res.send(renderLoginPage({
      clientName: client.client_name,
      request,
      cancelUrl: redirectWith(params.redirectUri, { error: 'access_denied', state: params.state })
    }));
  },

  async challengeForAuthorizationCode(client, code) {
    const record = await OAuthCode.findOne({ codeHash: hashOAuthSecret(code), clientId: client.client_id });
    if (!record) throw new InvalidGrantError('Invalid authorization code');
    return record.codeChallenge;
  },

  async exchangeAuthorizationCode(client, code, _codeVerifier, redirectUri) {
    const record = await OAuthCode.findOneAndDelete({ codeHash: hashOAuthSecret(code), clientId: client.client_id });
    if (!record || record.expiresAt < new Date()) throw new InvalidGrantError('Invalid or expired authorization code');
    if (redirectUri && redirectUri !== record.redirectUri) throw new InvalidGrantError('redirect_uri does not match');
    return issueTokens(await activeUser(record.userId), client.client_id);
  },

  // Refresh tokens are single-use: each refresh replaces the old one.
  async exchangeRefreshToken(client, refreshToken) {
    const record = await OAuthRefreshToken.findOneAndDelete({ tokenHash: hashOAuthSecret(refreshToken), clientId: client.client_id });
    if (!record || record.expiresAt < new Date()) throw new InvalidGrantError('Invalid or expired refresh token');
    return issueTokens(await activeUser(record.userId), client.client_id);
  },

  async revokeToken(client, { token }) {
    await OAuthRefreshToken.deleteOne({ tokenHash: hashOAuthSecret(token), clientId: client.client_id });
  }
};

const signInLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many sign-in attempts. Please try again later.'
});

async function handleSignIn(req, res) {
  let pending;
  try {
    pending = jwt.verify(req.body.request || '', process.env.JWT_SECRET);
    if (pending.type !== 'oauth_pending') throw new Error('Wrong token type');
  } catch {
    return res.status(400).send(renderLoginPage({ expired: true }));
  }

  const cancelUrl = redirectWith(pending.redirectUri, { error: 'access_denied', state: pending.state });
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = email ? await User.findOne({ email }) : null;

  if (!user || !user.isActive || !user.checkPassword(String(req.body.password || ''))) {
    return res.status(401).send(renderLoginPage({
      clientName: pending.clientName,
      request: req.body.request,
      email,
      error: 'Invalid email or password.',
      cancelUrl
    }));
  }

  const code = crypto.randomBytes(32).toString('hex');
  await OAuthCode.create({
    codeHash: hashOAuthSecret(code),
    clientId: pending.clientId,
    userId: user._id,
    codeChallenge: pending.codeChallenge,
    redirectUri: pending.redirectUri,
    expiresAt: new Date(Date.now() + CODE_TTL_MS)
  });

  user.lastLoginAt = new Date();
  await user.save();
  await createAuditLog(user._id, 'MCP_OAUTH_AUTHORIZE', 'AUTH', {
    clientId: pending.clientId,
    clientName: pending.clientName,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.redirect(302, redirectWith(pending.redirectUri, { code, state: pending.state }));
}

// Mount at the app root: serves /.well-known/* discovery, /authorize, /token,
// /register, /revoke and the sign-in form POST at /oauth/login.
export function createMcpOAuth(baseUrl) {
  const mcpUrl = new URL('/mcp', baseUrl);
  const router = express.Router();

  router.use(mcpAuthRouter({
    provider,
    issuerUrl: new URL(baseUrl),
    resourceServerUrl: mcpUrl,
    resourceName: 'YDesk Claims',
    // Claude registers and refreshes from shared server IPs, so allow more
    // than the SDK's per-IP defaults.
    clientRegistrationOptions: { rateLimit: { max: 200 } },
    tokenOptions: { rateLimit: { max: 300 } }
  }));

  router.post('/oauth/login', signInLimiter, async (req, res) => {
    try {
      await handleSignIn(req, res);
    } catch (error) {
      console.error('MCP OAuth sign-in error:', error);
      if (!res.headersSent) res.status(500).send('Sign-in failed. Please try again.');
    }
  });

  return { router, resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(mcpUrl) };
}
