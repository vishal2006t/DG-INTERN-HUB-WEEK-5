const { connectDB } = require('../backend/config/db');
const app = require('../backend/server');

module.exports = async (req, res) => {
  try {
    // 1. Ensure active MongoDB Atlas connection before handling request
    await connectDB();

    // 2. Ensure initial administrator is provisioned if database is brand new
    if (typeof app.ensureDefaultAdmin === 'function') {
      await app.ensureDefaultAdmin();
    }

    // 3. Pass request to Express application
    return app(req, res);
  } catch (error) {
    console.error('Database connection failed in Vercel handler:', error.message);
    return res.status(500).json({
      error: 'Database connection failed',
    });
  }
};