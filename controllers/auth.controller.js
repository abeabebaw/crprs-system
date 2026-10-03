const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { createAuditLog } = require('../utils/audit');

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ 
        message: 'Username and password are required',
        errors: {
          username: !username ? 'Username is required' : undefined,
          password: !password ? 'Password is required' : undefined
        }
      });
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || req.ip;

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        username,
        isActive: true
      }
    });

    if (!user) {
      await prisma.loginAttempt.create({
        data: { username, ipAddress: ip, success: false }
      }).catch(() => {});

      await createAuditLog({
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'USER',
        reason: `User not found or inactive: ${username}`,
        req
      });

      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await prisma.loginAttempt.create({
        data: { username, ipAddress: ip, success: false }
      }).catch(() => {});

      await createAuditLog({
        userId: user.id,
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'USER',
        entityId: user.id,
        reason: 'Incorrect password entered',
        req
      });

      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isOnline: true,
        lastLogin: new Date()
      }
    });

    // Record successful login attempt
    await prisma.loginAttempt.create({
      data: { username, ipAddress: ip, success: true }
    }).catch(() => {});

    // Generate token
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role, 
        fullName: user.fullName 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    // Record audit event
    await createAuditLog({
      userId: user.id,
      action: 'AUTH_LOGIN_SUCCESS',
      entityType: 'USER',
      entityId: user.id,
      newValue: { username: user.username, role: user.role },
      req
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { isOnline: false }
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'AUTH_LOGOUT',
      entityType: 'USER',
      entityId: req.user.id,
      req
    });

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        message: 'Current password and new password are required',
        errors: {
          currentPassword: !currentPassword ? 'Current password is required' : undefined,
          newPassword: !newPassword ? 'New password is required' : undefined
        }
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: 'New password must be at least 6 characters long' 
      });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { passwordHash: true }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      await createAuditLog({
        userId: req.user.id,
        action: 'AUTH_PASSWORD_CHANGE_FAILED',
        entityType: 'USER',
        entityId: req.user.id,
        reason: 'Current password incorrect',
        req
      });
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hash = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: hash }
    });

    await createAuditLog({
      userId: req.user.id,
      action: 'AUTH_PASSWORD_CHANGE_SUCCESS',
      entityType: 'USER',
      entityId: req.user.id,
      req
    });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        lastLogin: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error('Get user error:', err);
    next(err);
  }
};