require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { connectDB } = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const User = require('./models/User');

// Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB().then(async () => {
  // Ensure default admin exists if database is brand new
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      console.log('⚡ No admin detected. Auto-provisioning initial administrator account...');
      const defaultAdmin = new User({
        name: process.env.ADMIN_NAME || 'System Administrator',
        email: (process.env.ADMIN_EMAIL || 'admin@secureauth.io').toLowerCase(),
        password: process.env.ADMIN_PASSWORD || 'Admin@Secure2026!',
        role: 'admin',
        avatar: 'shield-cyan',
        lastLogin: new Date(),
      });
      await defaultAdmin.save();
      await defaultAdmin.logActivity('System Auto-Provisioned Admin');
      console.log(`🛡️  Initial Admin created: ${defaultAdmin.email} / ${process.env.ADMIN_PASSWORD || 'Admin@Secure2026!'}`);
    }
  } catch (initErr) {
    console.warn('Admin auto-init check warning:', initErr.message);
  }
});

// ==========================================
// Security Middlewares
// ==========================================

// Helmet HTTP Security Headers with custom Content Security Policy (CSP)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// Cross-Origin Resource Sharing
app.use(cors());

// Request Body Parsers with size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// ==========================================
// Static Frontend Files
// ==========================================
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Clean URL rewrites for SPA/HTML navigation
app.get('/login', (req, res) => res.sendFile(path.join(frontendPath, 'login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(frontendPath, 'signup.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(frontendPath, 'dashboard.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(frontendPath, 'admin.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(frontendPath, 'profile.html')));
app.get('/access-denied', (req, res) => res.sendFile(path.join(frontendPath, '404.html')));

// ==========================================
// REST API Routes
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    system: 'SecureAuth Engine v1.0.0',
    timestamp: new Date(),
    uptime: process.uptime(),
  });
});

// Handle undefined API routes
app.use('/api/*', notFound);

// Global Error Handler for API
app.use(errorHandler);

// Catch-all frontend fallback for 404
app.get('*', (req, res) => {
  res.status(404).sendFile(path.join(frontendPath, '404.html'));
});

// Start Server// Start Server only when running locally/Docker
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🔒 SecureAuth Server running on: http://localhost:${PORT}`);
    console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📁 Frontend served from: ${frontendPath}`);
    console.log(`======================================================\n`);
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
    });
  });
}

module.exports = app;