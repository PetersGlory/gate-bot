const mongoose = require('mongoose');

const rotationSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
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
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  payoutDate: {
    type: Date
  },
  transactionReference: {
    type: String
  }
}, {
  timestamps: true
});

rotationSchema.index({ group: 1, cycle: 1, week: 1 }, { unique: true });

module.exports = mongoose.model('Rotation', rotationSchema);