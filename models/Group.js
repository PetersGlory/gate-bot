const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  contributionAmount: {
    type: Number,
    required: true
  },
  frequency: {
    type: String,
    enum: ['weekly', 'monthly'],
    default: 'weekly'
  },
  maxMembers: {
    type: Number,
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  currentCycle: {
    type: Number,
    default: 1
  },
  startDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  totalContributions: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

groupSchema.methods.addMember = function(userId) {
  if (this.members.length >= this.maxMembers) {
    throw new Error('Group is full');
  }
  
  const existingMember = this.members.find(member => 
    member.user.toString() === userId.toString()
  );
  
  if (existingMember) {
    throw new Error('User is already a member of this group');
  }
  
  this.members.push({ user: userId });
  return this.save();
};

groupSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(member => 
    member.user.toString() !== userId.toString()
  );
  return this.save();
};

module.exports = mongoose.model('Group', groupSchema);