// // routes/purchaseRoutes.js
// const express = require('express');
// const router = express.Router();
// const User = require('../models/user'); // Adjust path to your User model

// // Endpoint for updating user after a successful purchase
// // WARNING: This endpoint does NOT use an authentication token.
// // Ensure you have other strong security measures in place (e.g., webhook verification, rate limiting)
// // or use this only for testing/development with proper understanding of the risks.
// router.post('/purchase-success', async (req, res) => {
//   const { userId, purchaseType, transactionDetails } = req.body;

//   if (!userId || !purchaseType || !transactionDetails) {
//     return res.status(400).json({ message: 'Missing required purchase data.' });
//   }

//   try {
//     const user = await User.findById(userId);

//     if (!user) {
//       return res.status(404).json({ message: 'User not found.' });
//     }

//     if (purchaseType === 'lifetime') {
//       // Update for lifetime purchase
//       user.lifetimeAccess = 1; // Set to 1 for lifetime access
//     } else if (purchaseType === 'subscription') {
//       // Update for subscription purchase
//       const { transactionId, amount, startDate, expiryDate, packageType } = transactionDetails;

//       if (!transactionId || !amount || !startDate || !expiryDate || !packageType) {
//         return res.status(400).json({ message: 'Missing required subscription details.' });
//       }

//       user.subscription.isSubscribed = true;
//       user.subscription.transactionId = transactionId;
//       user.subscription.amount = amount;
//       user.subscription.startDate = new Date(startDate);
//       user.subscription.expiryDate = new Date(expiryDate);
//       user.subscription.packageType = packageType;

//     } else {
//       return res.status(400).json({ message: 'Invalid purchase type.' });
//     }

//     await user.save();
//     res.status(200).json({ message: 'User profile updated successfully.', user });

//   } catch (error) {
//     console.error('Error updating user purchase:', error);
//     res.status(500).json({ message: 'Server error during purchase update.' });
//   }
// });

// module.exports = router;

// routes/purchaseRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/user'); // Adjust path to your User model
const Transaction = require('../models/transactions'); // NEW: Import the Transaction model

// Endpoint for updating user after a successful purchase
// WARNING: This endpoint does NOT use an authentication token.
// Ensure you have other strong security measures in place (e.g., webhook verification, rate limiting)
// or use this only for testing/development with proper understanding of the risks.
router.post('/purchase-success', async (req, res) => {
  const { userId, purchaseType, transactionDetails } = req.body;

  if (!userId || !purchaseType || !transactionDetails) {
    return res.status(400).json({ message: 'Missing required purchase data.' });
  }

  // Basic validation for transactionDetails based on purchaseType
  if (purchaseType === 'subscription' && (!transactionDetails.transactionId || !transactionDetails.amount || !transactionDetails.startDate || !transactionDetails.expiryDate || !transactionDetails.packageType)) {
      return res.status(400).json({ message: 'Missing required subscription details in transactionDetails.' });
  }
  if (purchaseType === 'lifetime' && (!transactionDetails.transactionId || !transactionDetails.amount)) {
      // For lifetime, ensure transactionId and amount are present for the transaction record
      return res.status(400).json({ message: 'Missing required lifetime transaction details (transactionId, amount).' });
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
        purchaseDate: new Date() // The time the transaction was recorded on the backend
    };

    if (purchaseType === 'lifetime') {
      // Update for lifetime purchase
      user.lifetimeAccess = 1; // Set to 1 for lifetime access
    } else if (purchaseType === 'subscription') {
      // Update for subscription purchase
      const { transactionId, amount, startDate, expiryDate, packageType } = transactionDetails;

      user.subscription.isSubscribed = true;
      user.subscription.transactionId = transactionId;
      user.subscription.amount = amount;
      user.subscription.startDate = new Date(startDate);
      user.subscription.expiryDate = new Date(expiryDate);
      user.subscription.packageType = packageType;

      // Add subscription-specific data to the transaction record
      transactionRecordData.subscriptionStartDate = new Date(startDate);
      transactionRecordData.subscriptionExpiryDate = new Date(expiryDate);
      transactionRecordData.purchaseType = packageType; // Overwrite purchaseType for subscription types
    } else {
      return res.status(400).json({ message: 'Invalid purchase type.' });
    }

    // Save the updated user document
    await user.save();

    // NEW: Create and save the transaction record
    const newTransaction = new Transaction(transactionRecordData);
    await newTransaction.save();

    res.status(200).json({
      message: 'User profile and transaction recorded successfully.',
      user,
      transaction: newTransaction
    });

  } catch (error) {
    // Handle potential duplicate transactionId errors gracefully
    if (error.code === 11000) { // MongoDB duplicate key error code
        return res.status(409).json({ message: 'Transaction ID already recorded.' });
    }
    console.error('Error updating user or recording transaction:', error);
    res.status(500).json({ message: 'Server error during purchase update or transaction recording.' });
  }
});

module.exports = router;