const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Please log in first.',
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: Administrator role required to perform this action.',
      roleRequired: 'admin',
      userRole: req.user.role,
    });
  }

  next();
};

module.exports = { adminOnly };
