const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  uid: String,
  name: String,
  type: { type: String, enum: ['feedback', 'bug', 'feature'], default: 'feedback' },
  title: String,
  description: String,
  includeDeviceInfo: Boolean,
  timestamp: Date,
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
