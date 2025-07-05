const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
  testType: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Test', testSchema);
