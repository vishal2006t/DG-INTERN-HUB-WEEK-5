const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');

const router = express.Router();

// ========================================================
// @route   GET /api/users/profile
// @desc    Get current logged in user's profile
// @access  Private (Protected)
// ========================================================
router.get('/profile', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
      });
    }

    res.status(200).json({
      success: true,
      user: user.toJSON(),
      activityLog: user.activityLog,
    });
  } catch (error) {
    next(error);
  }
});

// ========================================================
// @route   PUT /api/users/profile
// @desc    Update profile details (Name & Avatar)
// @access  Private (Protected)
// ========================================================
router.put(
  '/profile',
  protect,
  [
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Name cannot be empty')
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters')
      .escape(),
    body('avatar')
      .optional()
      .isString()
      .withMessage('Invalid avatar identifier'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          message: errors.array()[0].msg,
        });
      }

      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      if (req.body.name) user.name = req.body.name;
      if (req.body.avatar) user.avatar = req.body.avatar;

      await user.save();
      await user.logActivity('Profile Details Updated', req);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully!',
        user: user.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// ========================================================
// @route   PUT /api/users/change-password
// @desc    Change password with current password verification
// @access  Private (Protected)
// ========================================================
router.put(
  '/change-password',
  protect,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long')
      .matches(/[A-Z]/)
      .withMessage('New password must contain at least one uppercase letter')
      .matches(/[a-z]/)
      .withMessage('New password must contain at least one lowercase letter')
      .matches(/[0-9]/)
      .withMessage('New password must contain at least one number')
      .matches(/[@$!%*?&#^()_\-+={}[\]:;"'<>,.|/~`]/)
      .withMessage('New password must contain at least one special character'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          message: errors.array()[0].msg,
        });
      }

      const { currentPassword, newPassword } = req.body;

      // Select password to verify
      const user = await User.findById(req.user._id).select('+password');
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Check current password
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Current password does not match our records.',
        });
      }

      // Update password (pre-save hook will hash)
      user.password = newPassword;
      await user.save();
      await user.logActivity('Password Changed Successfully', req);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully! Please use your new password next time you login.',
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
