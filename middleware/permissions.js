const logger = require('../utils/logger');

const permissions = (requiredPermission) => {
  return (req, res, next) => {
    try {
      const admin = req.adminUser;
      
      if (!admin) {
        return res.status(401).json({ error: 'Admin authentication required' });
      }

      // Super admins have all permissions
      if (admin.role === 'super_admin') {
        return next();
      }

      // Check if admin has the required permission
      if (!admin.permissions.includes(requiredPermission)) {
        return res.status(403).json({ 
          error: `Permission denied. Required permission: ${requiredPermission}` 
        });
      }

      next();
    } catch (error) {
      logger.error('Permission check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

module.exports = permissions;
