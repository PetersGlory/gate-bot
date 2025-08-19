const jwt = require('jsonwebtoken');
const User = require('../models/User');

class SessionManager {
  generateToken(userId) {
    return jwt.sign(
      { userId: userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
  }

  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (!user || !user.isActive) {
        return null;
      }

      return user;
    } catch (error) {
      return null;
    }
  }

  async getUserSession(whatsappId) {
    try {
      const user = await User.findOne({ whatsappId: whatsappId, isActive: true });
      return user;
    } catch (error) {
      return null;
    }
  }
}

module.exports = new SessionManager();