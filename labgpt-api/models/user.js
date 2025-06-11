// const mongoose = require('mongoose');

// const userSchema = new mongoose.Schema({
//   email: { type: String, required: true, unique: true },
//   name: String,
//   profilePicture: String,
//   provider: { type: String, enum: ['google', 'apple'], required: true },
//   providerId: { type: String, required: true },
// }, { timestamps: true });

// module.exports = mongoose.model('User', userSchema);

// models/User.js (Example - adjust as per your actual schema)
// const mongoose = require('mongoose');

// const userSchema = new mongoose.Schema({
//   email: { type: String, required: true, unique: true },
//   name: { type: String },
//   profilePicture: { type: String },
//   provider: { type: String },
//   providerId: { type: String },
//   // New fields for purchase tracking
//   lifetimeAccess: {
//     type: Number,
//     default: 0 // 0 means no lifetime access, 1 means they have it
//   },
//   subscription: {
//     isSubscribed: { type: Boolean, default: false },
//     transactionId: { type: String },
//     amount: { type: Number },
//     startDate: { type: Date },
//     expiryDate: { type: Date },
//     packageType: { type: String } // e.g., 'monthly', 'annual'
//   },
//   createdAt: { type: Date, default: Date.now },
//   updatedAt: { type: Date, default: Date.now },
//   __v: { type: Number, default: 0 }
// });

// userSchema.pre('save', function(next) {
//   this.updatedAt = Date.now();
//   next();
// });

// module.exports = mongoose.model('User', userSchema);

// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: { // Hash this in a real app!
    type: String,
    required: true
  },
  // NEW: Track remaining single lab interpretations
  singleLabInterpretationsRemaining: {
    type: Number,
    default: 0
  },
  subscription: {
    isSubscribed: {
      type: Boolean,
      default: false
    },
    transactionId: { // Latest transaction ID for the subscription
      type: String
    },
    amount: {
      type: Number
    },
    startDate: {
      type: Date
    },
    expiryDate: {
      type: Date
    },
    packageType: { // e.g., 'monthly', 'annual'
      type: String
    }
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

module.exports = mongoose.model('User', userSchema);