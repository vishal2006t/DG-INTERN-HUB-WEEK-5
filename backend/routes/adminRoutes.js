const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');
const User = require('../models/User');

const router = express.Router();

// Apply both auth and admin authorization to all routes in this file
router.use(protect);
router.use(adminOnly);

// ========================================================
// @route   GET /api/admin/users
// @desc    Get all users with search and filter capabilities
// @access  Private (Admin Only)
// ========================================================
router.get('/users', async (req, res, next) => {
  try {
    const { search, role, sort = '-createdAt' } = req.query;

    const query = {};

    // Filter by role if specified
    if (role && ['user', 'admin'].includes(role)) {
      query.role = role;
    }

    // Search by name or email
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: searchRegex }, { email: searchRegex }];
    }

    const users = await User.find(query).sort(sort).select('-password');
    const totalUsers = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      total: totalUsers,
      users,
    });
  } catch (error) {
    next(error);
  }
});

// ========================================================
// @route   DELETE /api/admin/users/:id
// @desc    Delete a user account by ID
// @access  Private (Admin Only)
// ========================================================
router.delete('/users/:id', async (req, res, next) => {
  try {
    const targetUserId = req.params.id;

    // Security Rule: Admins cannot delete their own active account
    if (req.user._id.toString() === targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Security Violation: You cannot delete your own administrator account.',
      });
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found or already deleted.',
      });
    }

    await User.findByIdAndDelete(targetUserId);

    res.status(200).json({
      success: true,
      message: `User account "${user.name}" (${user.email}) has been permanently deleted.`,
    });
  } catch (error) {
    next(error);
  }
});

// ========================================================
// @route   PATCH /api/admin/users/:id/role
// @desc    Promote or demote a user's role
// @access  Private (Admin Only)
// ========================================================
router.patch('/users/:id/role', async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const { role } = req.body;

    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role provided. Allowed roles are "user" or "admin".',
      });
    }

    // Security Rule: Admin cannot demote themselves
    if (req.user._id.toString() === targetUserId && role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Security Violation: You cannot demote your own administrator privileges.',
      });
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    user.role = role;
    await user.save();

    res.status(200).json({
      success: true,
      message: `Role for ${user.name} successfully updated to "${role}".`,
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
});

// ========================================================
// @route   GET /api/admin/analytics
// @desc    Get dashboard analytics metrics
// @access  Private (Admin Only)
// ========================================================
router.get('/analytics', async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const adminCount = await User.countDocuments({ role: 'admin' });
    const standardUserCount = await User.countDocuments({ role: 'user' });

    // Recent 24h registrations
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const newUsersLast24h = await User.countDocuments({ createdAt: { $gte: oneDayAgo } });

    // Active in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeUsersLast7Days = await User.countDocuments({ lastLogin: { $gte: sevenDaysAgo } });

    // Recent 5 users
    const recentUsers = await User.find().sort('-createdAt').limit(5).select('name email role createdAt lastLogin');

    res.status(200).json({
      success: true,
      analytics: {
        totalUsers,
        adminCount,
        standardUserCount,
        newUsersLast24h,
        activeUsersLast7Days,
        recentUsers,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
