

const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Transaction = require('../models/transactions');

// Helper function to calculate subscription dates based on package type
function calculateSubscriptionDates(packageType) {
  const startDate = new Date();
  const expiryDate = new Date();
  
  switch (packageType.toLowerCase()) {
    case 'weekly':
      expiryDate.setDate(startDate.getDate() + 7);
      break;
    case 'monthly':
      expiryDate.setMonth(startDate.getMonth() + 1);
      break;
    case 'quarterly':
      expiryDate.setMonth(startDate.getMonth() + 3);
      break;
    case 'semi-annual':
    case 'semiannual':
      expiryDate.setMonth(startDate.getMonth() + 6);
      break;
    case 'annual':
    case 'yearly':
      expiryDate.setFullYear(startDate.getFullYear() + 1);
      break;
    default:
      throw new Error(`Invalid package type: ${packageType}. Supported types: weekly, monthly, quarterly, semi-annual, annual`);
  }
  
  return { startDate, expiryDate };
}

router.post('/purchase-success', async (req, res) => {
  const { userId, purchaseType, transactionDetails } = req.body;

  if (!userId || !purchaseType || !transactionDetails) {
    return res.status(400).json({ message: 'Missing required purchase data (userId, purchaseType, transactionDetails).' });
  }

  if (!transactionDetails.transactionId || typeof transactionDetails.amount === 'undefined' || transactionDetails.amount === null) {
      return res.status(400).json({ message: 'Missing essential transaction details (transactionId, amount) in transactionDetails.' });
  }

  if (purchaseType === 'subscription') {
      if (!transactionDetails.packageType) {
          return res.status(400).json({ message: 'Missing required packageType for subscription purchaseType.' });
      }
  } else if (purchaseType === 'single_interpretation_credit') {
      // No extra fields required for this type beyond transactionId and amount,
      // which are already checked above.
  } else {
      return res.status(400).json({ message: 'Invalid purchaseType. Must be "single_interpretation_credit" or "subscription".' });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    let transactionRecordData = {
        userId: userId,
        transactionId: transactionDetails.transactionId,
        amount: transactionDetails.amount,
        purchaseType: purchaseType,
        purchaseDate: new Date()
    };

    if (purchaseType === 'single_interpretation_credit') {
      // Increment the count for single lab interpretations
      user.singleLabInterpretationsRemaining += 1;

    } else if (purchaseType === 'subscription') {
      // Calculate start and expiry dates based on package type
      let subscriptionDates;
      
      try {
        subscriptionDates = calculateSubscriptionDates(transactionDetails.packageType);
      } catch (error) {
        return res.status(400).json({ message: error.message });
      }

      user.subscription.isSubscribed = true;
      user.subscription.transactionId = transactionDetails.transactionId;
      user.subscription.amount = transactionDetails.amount;
      user.subscription.startDate = subscriptionDates.startDate;
      user.subscription.expiryDate = subscriptionDates.expiryDate;
      user.subscription.packageType = transactionDetails.packageType;

      transactionRecordData.subscriptionStartDate = subscriptionDates.startDate;
      transactionRecordData.subscriptionExpiryDate = subscriptionDates.expiryDate;
      transactionRecordData.purchaseType = transactionDetails.packageType; // e.g., 'monthly', 'annual'
    }

    await user.save();
    const newTransaction = new Transaction(transactionRecordData);
    await newTransaction.save();

    res.status(200).json({
      message: 'User profile and transaction recorded successfully.',
      user: user,
      transaction: newTransaction
    });

  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.transactionId === 1) {
        console.warn(`Duplicate transaction ID detected for userId: ${userId}, transactionId: ${transactionDetails.transactionId}`);
        return res.status(409).json({ message: 'Transaction ID already recorded. This purchase may have been processed previously.' });
    }
    console.error('Error during purchase update or transaction recording:', error);
    res.status(500).json({ message: 'Server error during purchase update or transaction recording. Please try again later.' });
  }
});

module.exports = router;