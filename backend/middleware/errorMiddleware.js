// Handle 404 for unhandled API routes
const notFound = (req, res, next) => {
  const error = new Error(`API endpoint not found: ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Global error handling middleware
const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  // Custom handling for MongoDB duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `An account with this ${field} already exists.`,
    });
  }

  // Custom handling for Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({
      success: false,
      message: messages.join(', '),
    });
  }

  // CastError (e.g. invalid MongoDB ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Resource not found with specified ID: ${err.value}`,
    });
  }

  // Database Connection / Network errors (protect credentials from client exposure)
  if (
    err.name === 'MongoServerSelectionError' ||
    err.name === 'MongooseServerSelectionError' ||
    err.name === 'MongoNetworkError' ||
    err.name === 'MongoTimeoutError' ||
    (err.message && (err.message.includes('MONGODB_URI') || err.message.includes('Database connection failed')))
  ) {
    return res.status(500).json({
      success: false,
      error: 'Database connection failed',
      message: 'Database connection failed',
    });
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || 'An unexpected internal server error occurred.',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = { notFound, errorHandler };
