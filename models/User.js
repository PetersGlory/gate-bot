const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  whatsappId: {
    type: String,
    required: true,
    unique: true
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  bankDetails: {
    accountNumber: String,
    bankName: String,
    accountName: String
  },
  groups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  balance: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  registeredAt: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

userSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

module.exports = mongoose.model('User', userSchema);