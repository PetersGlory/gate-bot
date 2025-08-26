const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const logger = require('../utils/logger');

const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.adminId).select('-password');
    
    if (!admin || !admin.isActive) {
      return res.status(401).json({ error: 'Invalid token or admin not active' });
    }

    req.admin = decoded;
    req.adminUser = admin;
    next();
  } catch (error) {
    logger.error('Admin auth error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = adminAuth;
