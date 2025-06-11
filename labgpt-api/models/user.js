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
// const mongoose = require('mongoose');

// const userSchema = new mongoose.Schema({
//   username: {
//     type: String,
//     required: true,
//     unique: true
//   },
//   email: {
//     type: String,
//     required: true,
//     unique: true
//   },
//   password: { // Hash this in a real app!
//     type: String,
//     required: true
//   },
//   // NEW: Track remaining single lab interpretations
//   singleLabInterpretationsRemaining: {
//     type: Number,
//     default: 0
//   },
//   subscription: {
//     isSubscribed: {
//       type: Boolean,
//       default: false
//     },
//     transactionId: { // Latest transaction ID for the subscription
//       type: String
//     },
//     amount: {
//       type: Number
//     },
//     startDate: {
//       type: Date
//     },
//     expiryDate: {
//       type: Date
//     },
//     packageType: { // e.g., 'monthly', 'annual'
//       type: String
//     }
//   }
// }, {
//   timestamps: true // Adds createdAt and updatedAt
// });

// module.exports = mongoose.model('User', userSchema);
// models/User.js (Please ensure your file looks like this)
// const mongoose = require('mongoose');

// const userSchema = new mongoose.Schema({
//   username: {
//     type: String,
//     // REMOVE 'required: true'
//     unique: true,
//     sparse: true // Important for unique indexes on optional fields
//   },
//   email: {
//     type: String,
//     required: true, // Email is still likely required for most users
//     unique: true
//   },
//   password: { // Remember to hash passwords in a real app!
//     type: String,
//     // REMOVE 'required: true'
//   },
//   // Fields from your OAuth user:
//   name: String, // Likely 'name' is part of your OAuth profile
//   profilePicture: String,
//   provider: String, // e.g., 'google'
//   providerId: String, // The unique ID from the OAuth provider

//   // Fields for your app's specific access:
//   singleLabInterpretationsRemaining: {
//     type: Number,
//     default: 0
//   },
//   subscription: {
//     isSubscribed: {
//       type: Boolean,
//       default: false
//     },
//     transactionId: String,
//     amount: Number,
//     startDate: Date,
//     expiryDate: Date,
//     packageType: String
//   }
// }, {
//   timestamps: true // Adds createdAt and updatedAt automatically
// });

// module.exports = mongoose.model('User', userSchema);

// models/User.js
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