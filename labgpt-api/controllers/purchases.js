

// const express = require('express');
// const router = express.Router();
// const User = require('../models/user');
// const Transaction = require('../models/transactions');

// // Helper function to calculate subscription dates based on package type
// function calculateSubscriptionDates(packageType) {
//   const startDate = new Date();
//   const expiryDate = new Date();
  
//   switch (packageType.toLowerCase()) {
//     case 'weekly':
//       expiryDate.setDate(startDate.getDate() + 7);
//       break;
//     case 'monthly':
//       expiryDate.setMonth(startDate.getMonth() + 1);
//       break;
//     case 'quarterly':
//       expiryDate.setMonth(startDate.getMonth() + 3);
//       break;
//     case 'semi-annual':
//     case 'semiannual':
//       expiryDate.setMonth(startDate.getMonth() + 6);
//       break;
//     case 'annual':
//     case 'yearly':
//       expiryDate.setFullYear(startDate.getFullYear() + 1);
//       break;
//     default:
//       throw new Error(`Invalid package type: ${packageType}. Supported types: weekly, monthly, quarterly, semi-annual, annual`);
//   }
  
//   return { startDate, expiryDate };
// }

// router.post('/purchase-success', async (req, res) => {
//   const { userId, purchaseType, transactionDetails } = req.body;

//   if (!userId || !purchaseType || !transactionDetails) {
//     return res.status(400).json({ message: 'Missing required purchase data (userId, purchaseType, transactionDetails).' });
//   }

//   if (!transactionDetails.transactionId || typeof transactionDetails.amount === 'undefined' || transactionDetails.amount === null) {
//       return res.status(400).json({ message: 'Missing essential transaction details (transactionId, amount) in transactionDetails.' });
//   }

//   if (purchaseType === 'subscription') {
//       if (!transactionDetails.packageType) {
//           return res.status(400).json({ message: 'Missing required packageType for subscription purchaseType.' });
//       }
//   } else if (purchaseType === 'single_interpretation_credit') {
//       // No extra fields required for this type beyond transactionId and amount,
//       // which are already checked above.
//   } else {
//       return res.status(400).json({ message: 'Invalid purchaseType. Must be "single_interpretation_credit" or "subscription".' });
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
//         purchaseDate: new Date()
//     };

//     if (purchaseType === 'single_interpretation_credit') {
//       // Increment the count for single lab interpretations
//       user.singleLabInterpretationsRemaining += 4;

//     } else if (purchaseType === 'subscription') {
//       // Calculate start and expiry dates based on package type
//       let subscriptionDates;
      
//       try {
//         subscriptionDates = calculateSubscriptionDates(transactionDetails.packageType);
//       } catch (error) {
//         return res.status(400).json({ message: error.message });
//       }

//       user.subscription.isSubscribed = true;
//       user.subscription.transactionId = transactionDetails.transactionId;
//       user.subscription.amount = transactionDetails.amount;
//       user.subscription.startDate = subscriptionDates.startDate;
//       user.subscription.expiryDate = subscriptionDates.expiryDate;
//       user.subscription.packageType = transactionDetails.packageType;

//       transactionRecordData.subscriptionStartDate = subscriptionDates.startDate;
//       transactionRecordData.subscriptionExpiryDate = subscriptionDates.expiryDate;
//       transactionRecordData.purchaseType = transactionDetails.packageType; // e.g., 'monthly', 'annual'
//     }

//     await user.save();
//     const newTransaction = new Transaction(transactionRecordData);
//     await newTransaction.save();

//     res.status(200).json({
//       message: 'User profile and transaction recorded successfully.',
//       user: user,
//       transaction: newTransaction
//     });

//   } catch (error) {
//     if (error.code === 11000 && error.keyPattern && error.keyPattern.transactionId === 1) {
//         console.warn(`Duplicate transaction ID detected for userId: ${userId}, transactionId: ${transactionDetails.transactionId}`);
//         return res.status(409).json({ message: 'Transaction ID already recorded. This purchase may have been processed previously.' });
//     }
//     console.error('Error during purchase update or transaction recording:', error);
//     res.status(500).json({ message: 'Server error during purchase update or transaction recording. Please try again later.' });
//   }
// });

// module.exports = router;

const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Transaction = require('../models/transactions');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Setup Nodemailer with Webmail SMTP
const transporter = nodemailer.createTransport({
  host: 'labmate.docspace.co.ke', // Replace with your actual SMTP host
  port: 465, // Use 587 if TLS
  secure: true,
  auth: {
    user: process.env.BILLING_USER,
    pass: process.env.BILLING_PASS
  }
});

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
      throw new Error(`Invalid package type: ${packageType}.`);
  }

  return { startDate, expiryDate };
}

router.post('/purchase-success', async (req, res) => {
  const { userId, purchaseType, transactionDetails } = req.body;

  if (!userId || !purchaseType || !transactionDetails) {
    return res.status(400).json({ message: 'Missing required purchase data (userId, purchaseType, transactionDetails).' });
  }

  if (!transactionDetails.transactionId || typeof transactionDetails.amount === 'undefined' || transactionDetails.amount === null) {
    return res.status(400).json({ message: 'Missing essential transaction details (transactionId, amount).' });
  }

  if (purchaseType === 'subscription' && !transactionDetails.packageType) {
    return res.status(400).json({ message: 'Missing required packageType for subscription.' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    let transactionRecordData = {
      userId,
      transactionId: transactionDetails.transactionId,
      amount: transactionDetails.amount,
      purchaseType,
      purchaseDate: new Date()
    };

    let emailBody = '';
    let subject = '';

    if (purchaseType === 'single_interpretation_credit') {
      user.singleLabInterpretationsRemaining += 4;

      subject = '🎉 Thank You for Your Purchase – 4 More Interpretations Added';
      emailBody = `
        <p>Hi ${user.name || ''},</p>
        <p>Thanks for your purchase! We've added <strong>4 more lab interpretation credits</strong> to your account.</p>
        <p>Use them anytime to get private, AI-powered insights from your lab tests.</p>
        <p>Need help? Just reply to this email or reach us at <a href="mailto:support@labmate.docspace.co.ke">support@labmate.docspace.co.ke</a>.</p>
        <p>— The Labmate Team</p>
      `;

    } else if (purchaseType === 'subscription') {
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
      transactionRecordData.purchaseType = transactionDetails.packageType;

      subject = `✅ You're Subscribed – ${transactionDetails.packageType} Plan Activated`;
      emailBody = `
        <p>Hi ${user.name || ''},</p>
        <p>Welcome aboard! You've successfully subscribed to Labmate on the <strong>${transactionDetails.packageType}</strong> plan.</p>
        <ul>
          <li><strong>Start Date:</strong> ${subscriptionDates.startDate.toDateString()}</li>
          <li><strong>Expiry Date:</strong> ${subscriptionDates.expiryDate.toDateString()}</li>
        </ul>
        <p>During your subscription, enjoy:</p>
        <ul>
          <li>🔬 Unlimited lab and imaging interpretations</li>
          <li>🔒 Strong encryption and privacy-first design</li>
          <li>📤 PDF export and email delivery of reports</li>
        </ul>
        <p>Need help or have questions? Just reply to this email or reach out to us at <a href="mailto:support@labmate.docspace.co.ke">support@labmate.docspace.co.ke</a>.</p>
        <p>— The Labmate Team</p>
      `;
    }

    await user.save();
    const newTransaction = new Transaction(transactionRecordData);
    await newTransaction.save();

    // Send confirmation email
    await transporter.sendMail({
      from: `"Labmate Team" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
          ${emailBody}
        </div>
      `
    });

    res.status(200).json({
      message: 'User profile and transaction recorded successfully.',
      user,
      transaction: newTransaction
    });

  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.transactionId === 1) {
      console.warn(`Duplicate transaction ID: ${transactionDetails.transactionId}`);
      return res.status(409).json({ message: 'Transaction already recorded.' });
    }

    console.error('Error in /purchase-success:', error);
    res.status(500).json({ message: 'Server error during purchase processing.' });
  }
});

module.exports = router;
