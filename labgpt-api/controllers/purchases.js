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
// const express = require('express');
// const router = express.Router();
// const User = require('../models/user'); // Adjust path to your User model
// const Transaction = require('../models/transactions'); // NEW: Import the Transaction model

// // Endpoint for updating user after a successful purchase
// // WARNING: This endpoint does NOT use an authentication token.
// // Ensure you have other strong security measures in place (e.g., webhook verification, rate limiting)
// // or use this only for testing/development with proper understanding of the risks.
// router.post('/purchase-success', async (req, res) => {
//   const { userId, purchaseType, transactionDetails } = req.body;

//   if (!userId || !purchaseType || !transactionDetails) {
//     return res.status(400).json({ message: 'Missing required purchase data.' });
//   }

//   // Basic validation for transactionDetails based on purchaseType
//   if (purchaseType === 'subscription' && (!transactionDetails.transactionId || !transactionDetails.amount || !transactionDetails.startDate || !transactionDetails.expiryDate || !transactionDetails.packageType)) {
//       return res.status(400).json({ message: 'Missing required subscription details in transactionDetails.' });
//   }
//   if (purchaseType === 'lifetime' && (!transactionDetails.transactionId || !transactionDetails.amount)) {
//       // For lifetime, ensure transactionId and amount are present for the transaction record
//       return res.status(400).json({ message: 'Missing required lifetime transaction details (transactionId, amount).' });
//   }


//   try {
//     const user = await User.findById(userId);

//     if (!user) {
//       return res.status(404).json({ message: 'User not found.' });
//     }

//     let transactionRecordData = {
//         userId: userId,
//         transactionId: transactionDetails.transactionId,
//         amount: transactionDetails.amount,
//         purchaseType: purchaseType,
//         purchaseDate: new Date() // The time the transaction was recorded on the backend
//     };

//     if (purchaseType === 'lifetime') {
//       // Update for lifetime purchase
//       user.lifetimeAccess = 1; // Set to 1 for lifetime access
//     } else if (purchaseType === 'subscription') {
//       // Update for subscription purchase
//       const { transactionId, amount, startDate, expiryDate, packageType } = transactionDetails;

//       user.subscription.isSubscribed = true;
//       user.subscription.transactionId = transactionId;
//       user.subscription.amount = amount;
//       user.subscription.startDate = new Date(startDate);
//       user.subscription.expiryDate = new Date(expiryDate);
//       user.subscription.packageType = packageType;

//       // Add subscription-specific data to the transaction record
//       transactionRecordData.subscriptionStartDate = new Date(startDate);
//       transactionRecordData.subscriptionExpiryDate = new Date(expiryDate);
//       transactionRecordData.purchaseType = packageType; // Overwrite purchaseType for subscription types
//     } else {
//       return res.status(400).json({ message: 'Invalid purchase type.' });
//     }

//     // Save the updated user document
//     await user.save();

//     // NEW: Create and save the transaction record
//     const newTransaction = new Transaction(transactionRecordData);
//     await newTransaction.save();

//     res.status(200).json({
//       message: 'User profile and transaction recorded successfully.',
//       user,
//       transaction: newTransaction
//     });

//   } catch (error) {
//     // Handle potential duplicate transactionId errors gracefully
//     if (error.code === 11000) { // MongoDB duplicate key error code
//         return res.status(409).json({ message: 'Transaction ID already recorded.' });
//     }
//     console.error('Error updating user or recording transaction:', error);
//     res.status(500).json({ message: 'Server error during purchase update or transaction recording.' });
//   }
// });

// module.exports = router;

// const express = require('express');
// const router = express.Router();
// const User = require('../models/user'); // Adjust path to your User model
// const Transaction = require('../models/transactions'); // Import the Transaction model

// // Endpoint for updating user after a successful purchase
// // WARNING: This endpoint does NOT use an authentication token.
// // Ensure you have other strong security measures in place (e.g., webhook verification, rate limiting)
// // or use this only for testing/development with proper understanding of the risks.
// router.post('/purchase-success', async (req, res) => {
//   const { userId, purchaseType, transactionDetails } = req.body;

//   // 1. Basic Request Body Validation
//   if (!userId || !purchaseType || !transactionDetails) {
//     return res.status(400).json({ message: 'Missing required purchase data (userId, purchaseType, transactionDetails).' });
//   }

//   // 2. Validate essential transactionDetails for ALL purchase types
//   // transactionId and amount are always required for the new Transaction collection entry.
//   if (!transactionDetails.transactionId || typeof transactionDetails.amount === 'undefined' || transactionDetails.amount === null) {
//       return res.status(400).json({ message: 'Missing essential transaction details (transactionId, amount) in transactionDetails.' });
//   }

//   // 3. Specific validation for subscription type
//   if (purchaseType === 'subscription') {
//       if (!transactionDetails.startDate || !transactionDetails.expiryDate || !transactionDetails.packageType) {
//           return res.status(400).json({ message: 'Missing required subscription-specific details (startDate, expiryDate, packageType) for subscription purchaseType.' });
//       }
//   } else if (purchaseType === 'lifetime') {
//       // No extra fields required for lifetime beyond transactionId and amount,
//       // which are already checked above.
//   } else {
//       // If purchaseType is neither 'lifetime' nor 'subscription'
//       return res.status(400).json({ message: 'Invalid purchaseType. Must be "lifetime" or "subscription".' });
//   }


//   try {
//     // Find the user by ID
//     const user = await User.findById(userId);

//     if (!user) {
//       return res.status(404).json({ message: 'User not found.' });
//     }

//     // Prepare data for the new Transaction document
//     let transactionRecordData = {
//         userId: userId,
//         transactionId: transactionDetails.transactionId,
//         amount: transactionDetails.amount,
//         // The purchaseType for the transaction record will be more specific (e.g., 'monthly', 'annual')
//         // or 'lifetime' as provided in the initial request.
//         purchaseType: purchaseType,
//         purchaseDate: new Date() // The time the transaction was recorded on the backend
//     };

//     // Update user document based on purchase type
//     if (purchaseType === 'lifetime') {
//       user.lifetimeAccess = 1; // Set to 1 for lifetime access
//       // No additional fields for transactionRecordData needed specific to lifetime here.

//     } else if (purchaseType === 'subscription') {
//       user.subscription.isSubscribed = true;
//       user.subscription.transactionId = transactionDetails.transactionId; // Store latest transaction ID on user
//       user.subscription.amount = transactionDetails.amount;
//       user.subscription.startDate = new Date(transactionDetails.startDate);
//       user.subscription.expiryDate = new Date(transactionDetails.expiryDate);
//       user.subscription.packageType = transactionDetails.packageType; // e.g., 'monthly', 'annual'

//       // Add subscription-specific data to the transaction record
//       transactionRecordData.subscriptionStartDate = new Date(transactionDetails.startDate);
//       transactionRecordData.subscriptionExpiryDate = new Date(transactionDetails.expiryDate);
//       // For subscriptions, set the transaction's purchaseType to the specific packageType (e.g., 'monthly', 'annual')
//       transactionRecordData.purchaseType = transactionDetails.packageType;

//     }

//     // Save the updated user document
//     await user.save();

//     // Create and save the new transaction record
//     const newTransaction = new Transaction(transactionRecordData);
//     await newTransaction.save();

//     // Respond with success
//     res.status(200).json({
//       message: 'User profile and transaction recorded successfully.',
//       user: user, // Send back the updated user object
//       transaction: newTransaction // Send back the newly created transaction object
//     });

//   } catch (error) {
//     // Handle specific MongoDB duplicate key error (code 11000) for transactionId
//     // This prevents re-recording the same transaction if the client retries the request
//     if (error.code === 11000 && error.keyPattern && error.keyPattern.transactionId === 1) {
//         console.warn(`Duplicate transaction ID detected for userId: ${userId}, transactionId: ${transactionDetails.transactionId}`);
//         return res.status(409).json({ message: 'Transaction ID already recorded. This purchase may have been processed previously.' });
//     }
//     console.error('Error during purchase update or transaction recording:', error);
//     res.status(500).json({ message: 'Server error during purchase update or transaction recording. Please try again later.' });
//   }
// });

// module.exports = router;

// routes/purchaseRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Transaction = require('../models/transactions');

router.post('/purchase-success', async (req, res) => {
  const { userId, purchaseType, transactionDetails } = req.body;

  if (!userId || !purchaseType || !transactionDetails) {
    return res.status(400).json({ message: 'Missing required purchase data (userId, purchaseType, transactionDetails).' });
  }

  if (!transactionDetails.transactionId || typeof transactionDetails.amount === 'undefined' || transactionDetails.amount === null) {
      return res.status(400).json({ message: 'Missing essential transaction details (transactionId, amount) in transactionDetails.' });
  }

  if (purchaseType === 'subscription') {
      if (!transactionDetails.startDate || !transactionDetails.expiryDate || !transactionDetails.packageType) {
          return res.status(400).json({ message: 'Missing required subscription-specific details (startDate, expiryDate, packageType) for subscription purchaseType.' });
      }
  } else if (purchaseType === 'single_interpretation_credit') { // RENAMED TO BE MORE EXPLICIT
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
        purchaseType: purchaseType, // This will be 'single_interpretation_credit' or 'subscription'
        purchaseDate: new Date()
    };

    if (purchaseType === 'single_interpretation_credit') {
      // NEW: Increment the count for single lab interpretations
      user.singleLabInterpretationsRemaining += 1;
      // You could also add other details to transactionRecordData if needed for this specific purchase
      // e.g., transactionRecordData.itemPurchased = "Single Lab Interpretation Credit";

    } else if (purchaseType === 'subscription') {
      user.subscription.isSubscribed = true;
      user.subscription.transactionId = transactionDetails.transactionId;
      user.subscription.amount = transactionDetails.amount;
      user.subscription.startDate = new Date(transactionDetails.startDate);
      user.subscription.expiryDate = new Date(transactionDetails.expiryDate);
      user.subscription.packageType = transactionDetails.packageType;

      transactionRecordData.subscriptionStartDate = new Date(transactionDetails.startDate);
      transactionRecordData.subscriptionExpiryDate = new Date(transactionDetails.expiryDate);
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