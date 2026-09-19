const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Helper to generate signed JWT
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    process.env.JWT_SECRET || 'secureauth_default_secret',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    }
  );
};

// Rate limiter for login: max 10 attempts per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts from this IP. Please wait 15 minutes before trying again.',
  },
});

// Rate limiter for signup: max 10 signups per hour per IP
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many accounts created from this IP. Please try again after an hour.',
  },
});

// ========================================================
// @route   POST /api/auth/signup
// @desc    Register a new user (Strictly role='user')
// @access  Public
// ========================================================
router.post(
  '/signup',
  signupLimiter,
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Full Name is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters')
      .escape(), // Prevent XSS

    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email address is required')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),

    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter')
      .matches(/[a-z]/)
      .withMessage('Password must contain at least one lowercase letter')
      .matches(/[0-9]/)
      .withMessage('Password must contain at least one number')
      .matches(/[@$!%*?&#^()_\-+={}[\]:;"'<>,.|/~`]/)
      .withMessage('Password must contain at least one special character'),

    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Passwords do not match');
        }
        return true;
      }),
  ],
  async (req, res, next) => {
    try {
      // Validate input fields
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map((err) => ({ field: err.path, message: err.msg })),
          message: errors.array()[0].msg,
        });
      }

      const { name, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email address already exists. Please login.',
        });
      }

      // Explicitly enforce role='user' - prevents privilege escalation from client payload
      const user = new User({
        name,
        email,
        password,
        role: 'user',
        avatar: 'shield-cyan',
      });

      await user.save();

      // Log activity
      await user.logActivity('Account Created (Signup)', req);

      // Generate JWT
      const token = generateToken(user);

      res.status(201).json({
        success: true,
        message: 'Account created successfully! Welcome to SecureAuth.',
        token,
        user: user.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// ========================================================
// @route   POST /api/auth/login
// @desc    Authenticate user & return JWT token
// @access  Public
// ========================================================
router.post(
  '/login',
  loginLimiter,
  [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email address is required')
      .isEmail()
      .withMessage('Please enter a valid email')
      .normalizeEmail(),

    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map((err) => ({ field: err.path, message: err.msg })),
          message: errors.array()[0].msg,
        });
      }

      const { email, password } = req.body;

      // Find user and explicitly select password (which is select: false)
      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials. Please check your email and password.',
        });
      }

      // Compare password with bcrypt
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials. Please check your email and password.',
        });
      }

      // Update last login timestamp & log activity
      user.lastLogin = new Date();
      await user.save();
      await user.logActivity('User Logged In', req);

      // Generate JWT
      const token = generateToken(user);

      res.status(200).json({
        success: true,
        message: 'Authentication successful. Welcome back!',
        token,
        user: user.toJSON(),
      });
    } catch (error) {
      next(error);
    }
  }
);

// ========================================================
// @route   POST /api/auth/logout
// @desc    Logout user & record activity
// @access  Protected / Public
// ========================================================
router.post('/logout', async (req, res, next) => {
  try {
    // If authorization header is provided, log the event
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      const token = req.headers.authorization.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secureauth_default_secret');
        const user = await User.findById(decoded.id);
        if (user) {
          await user.logActivity('User Logged Out', req);
        }
      } catch {
        // Ignore token decode errors on logout
      }
    }

    res.status(200).json({
      success: true,
      message: 'Successfully logged out.',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
