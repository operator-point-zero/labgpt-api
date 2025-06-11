// models/Transaction.js (UPDATED)
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId, // Reference to the User model
    ref: 'User',
    required: true
  },
  transactionId: { // Unique ID from payment gateway/RevenueCat
    type: String,
    required: true,
    unique: true
  },
  purchaseType: { // 'single_interpretation_credit', 'monthly', 'annual', etc.
    type: String,
    required: true,
    // --- THIS IS THE CRUCIAL CHANGE ---
    enum: ['single_interpretation_credit', 'monthly', 'annual', 'weekly', 'other'] // 'lifetime' was removed as it's now 'single_interpretation_credit'
  },
  amount: {
    type: Number,
    required: true
  },
  currency: { // Optional: You might want to store currency
    type: String,
    default: 'USD' // Or whatever your default currency is
  },
  purchaseDate: { // When the purchase actually happened
    type: Date,
    default: Date.now
  },
  subscriptionStartDate: { // For subscriptions
    type: Date
  },
  subscriptionExpiryDate: { // For subscriptions
    type: Date
  },
  // You can add more fields here like:
  // gatewayResponse: { type: Object }, // Full response from payment gateway
  // originalJson: { type: Object } // Original data from RevenueCat webhook (if used)
}, {
  timestamps: true // Adds createdAt and updatedAt timestamps automatically
});

// Create an index for faster lookups by userId and transactionId
transactionSchema.index({ userId: 1 });
transactionSchema.index({ transactionId: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);