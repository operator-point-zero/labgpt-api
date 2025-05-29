const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: String,
  profilePicture: String,
  provider: { type: String, enum: ['google', 'apple'], required: true },
  providerId: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
