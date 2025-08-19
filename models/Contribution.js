const mongoose = require('mongoose');

const contributionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  cycle: {
    type: Number,
    required: true
  },
  week: {
    type: Number,
    required: true
  },
  transactionReference: {
    type: String,
    required: true,
    unique: true
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'card', 'ussd'],
    default: 'bank_transfer'
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending'
  },
  paidAt: {
    type: Date
  }
}, {
  timestamps: true
});

contributionSchema.index({ user: 1, group: 1, cycle: 1, week: 1 }, { unique: true });

module.exports = mongoose.model('Contribution', contributionSchema);
