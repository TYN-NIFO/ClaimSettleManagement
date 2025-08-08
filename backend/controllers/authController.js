const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const AuditLog = require('../models/AuditLog');

// Generate access token
const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

// Generate refresh token
const generateRefreshToken = () => {
  return uuidv4();
};

// Set refresh token cookie
const setRefreshTokenCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });
};

// Create audit log entry
const createAuditLog = async (userId, action, resource, details = {}) => {
  try {
    await AuditLog.create({
      userId,
      action,
      resource,
      details
    });
  } catch (error) {
    console.error('Audit log creation failed:', error);
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    if (!user.checkPassword(password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken();
    const jti = uuidv4();
    const family = uuidv4();

    // Store refresh token
    await RefreshToken.create({
      userId: user._id,
      tokenHash: RefreshToken.hashToken(refreshToken),
      jti,
      family,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Set refresh token cookie
    setRefreshTokenCookie(res, refreshToken);

    // Create audit log
    await createAuditLog(user._id, 'LOGIN', 'AUTH', { ipAddress: req.ip });

    res.json({
      user: user.toPublicJSON(),
      accessToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Refresh token
const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    // Find refresh token in database
    const tokenDoc = await RefreshToken.findOne({
      jti: req.body.jti,
      isRevoked: false,
      expiresAt: { $gt: new Date() }
    });

    if (!tokenDoc || !tokenDoc.verifyToken(refreshToken)) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Get user
    const user = await User.findById(tokenDoc.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken();
    const newJti = uuidv4();

    // Revoke old token and create new one
    tokenDoc.isRevoked = true;
    await tokenDoc.save();

    await RefreshToken.create({
      userId: user._id,
      tokenHash: RefreshToken.hashToken(newRefreshToken),
      jti: newJti,
      family: tokenDoc.family, // Same family for rotation
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    // Set new refresh token cookie
    setRefreshTokenCookie(res, newRefreshToken);

    res.json({
      user: user.toPublicJSON(),
      accessToken: newAccessToken,
      jti: newJti
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
};

// Logout
const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (refreshToken) {
      // Revoke refresh token
      await RefreshToken.updateMany(
        { tokenHash: RefreshToken.hashToken(refreshToken) },
        { isRevoked: true }
      );
    }

    // Clear cookie
    res.clearCookie('refreshToken');

    // Create audit log
    if (req.user) {
      await createAuditLog(req.user._id, 'LOGOUT', 'AUTH', { ipAddress: req.ip });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

// Revoke all sessions for a user (admin only)
const revokeUserSessions = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Revoke all refresh tokens for the user
    await RefreshToken.updateMany(
      { userId },
      { isRevoked: true }
    );

    // Create audit log
    await createAuditLog(req.user._id, 'REVOKE_SESSIONS', 'USER', { 
      targetUserId: userId,
      ipAddress: req.ip 
    });

    res.json({ message: 'All sessions revoked successfully' });
  } catch (error) {
    console.error('Revoke sessions error:', error);
    res.status(500).json({ error: 'Failed to revoke sessions' });
  }
};

module.exports = {
  login,
  refresh,
  logout,
  revokeUserSessions
};
