
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    // Remove 'required: true' if it was here.
    unique: true,
    sparse: true // This is important for unique indexes on optional fields.
  },
  email: {
    type: String,
    required: true, // Email is almost always required.
    unique: true
  },
  password: {
    type: String,
    // Remove 'required: true' if it was here.
  },
  name: String, // Likely comes from Google/Apple profile.
  profilePicture: String,
  provider: String, // 'google' or 'apple'.
  providerId: String, // The ID from the OAuth provider.

  // Your app-specific access fields:
  singleLabInterpretationsRemaining: {
    type: Number,
    default: 0
  },
  subscription: {
    isSubscribed: {
      type: Boolean,
      default: false
    },
    transactionId: String,
    amount: Number,
    startDate: Date,
    expiryDate: Date,
    packageType: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);