

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

// const express = require('express');
// const router = express.Router();
// const User = require('../models/user');
// const Transaction = require('../models/transactions');
// const nodemailer = require('nodemailer');
// require('dotenv').config();

// // Setup Nodemailer with Webmail SMTP
// const transporter = nodemailer.createTransport({
//   host: 'labmate.docspace.co.ke', // Replace with your actual SMTP host
//   port: 465, // Use 587 if TLS
//   secure: true,
//   auth: {
//     user: process.env.BILLING_USER,
//     pass: process.env.BILLING_PASS
//   }
// });

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
//       throw new Error(`Invalid package type: ${packageType}.`);
//   }

//   return { startDate, expiryDate };
// }

// router.post('/purchase-success', async (req, res) => {
//   const { userId, purchaseType, transactionDetails } = req.body;

//   if (!userId || !purchaseType || !transactionDetails) {
//     return res.status(400).json({ message: 'Missing required purchase data (userId, purchaseType, transactionDetails).' });
//   }

//   if (!transactionDetails.transactionId || typeof transactionDetails.amount === 'undefined' || transactionDetails.amount === null) {
//     return res.status(400).json({ message: 'Missing essential transaction details (transactionId, amount).' });
//   }

//   if (purchaseType === 'subscription' && !transactionDetails.packageType) {
//     return res.status(400).json({ message: 'Missing required packageType for subscription.' });
//   }

//   try {
//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ message: 'User not found.' });

//     let transactionRecordData = {
//       userId,
//       transactionId: transactionDetails.transactionId,
//       amount: transactionDetails.amount,
//       purchaseType,
//       purchaseDate: new Date()
//     };

//     let emailBody = '';
//     let subject = '';

//     if (purchaseType === 'single_interpretation_credit') {
//       user.singleLabInterpretationsRemaining += 4;

//       subject = '🎉 Thank You for Your Purchase – 4 More Interpretations Added';
//       emailBody = `
//         <p>Hi ${user.name || ''},</p>
//         <p>Thanks for your purchase! We've added <strong>4 more lab interpretation credits</strong> to your account.</p>
//         <p>Use them anytime to get private, AI-powered insights from your lab tests.</p>
//         <p>Need help? Just reply to this email or reach us at <a href="mailto:support@labmate.docspace.co.ke">support@labmate.docspace.co.ke</a>.</p>
//         <p>— The Labmate Team</p>
//       `;

//     } else if (purchaseType === 'subscription') {
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
//       transactionRecordData.purchaseType = transactionDetails.packageType;

//       subject = `✅ You're Subscribed – ${transactionDetails.packageType} Plan Activated`;
//       emailBody = `
//         <p>Hi ${user.name || ''},</p>
//         <p>Welcome aboard! You've successfully subscribed to Labmate on the <strong>${transactionDetails.packageType}</strong> plan.</p>
//         <ul>
//           <li><strong>Start Date:</strong> ${subscriptionDates.startDate.toDateString()}</li>
//           <li><strong>Expiry Date:</strong> ${subscriptionDates.expiryDate.toDateString()}</li>
//         </ul>
//         <p>During your subscription, enjoy:</p>
//         <ul>
//           <li>🔬 Unlimited lab and imaging interpretations</li>
//           <li>🔒 Strong encryption and privacy-first design</li>
//           <li>📤 PDF export and email delivery of reports</li>
//         </ul>
//         <p>Need help or have questions? Just reply to this email or reach out to us at <a href="mailto:support@labmate.docspace.co.ke">support@labmate.docspace.co.ke</a>.</p>
//         <p>— The Labmate Team</p>
//       `;
//     }

//     await user.save();
//     const newTransaction = new Transaction(transactionRecordData);
//     await newTransaction.save();

//     // Send confirmation email
//     await transporter.sendMail({
//       from: `"Labmate Team" <${process.env.EMAIL_USER}>`,
//       to: user.email,
//       subject: subject,
//       html: `
//         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
//           ${emailBody}
//         </div>
//       `
//     });

//     res.status(200).json({
//       message: 'User profile and transaction recorded successfully.',
//       user,
//       transaction: newTransaction
//     });

//   } catch (error) {
//     if (error.code === 11000 && error.keyPattern?.transactionId === 1) {
//       console.warn(`Duplicate transaction ID: ${transactionDetails.transactionId}`);
//       return res.status(409).json({ message: 'Transaction already recorded.' });
//     }

//     console.error('Error in /purchase-success:', error);
//     res.status(500).json({ message: 'Server error during purchase processing.' });
//   }
// });

// module.exports = router;
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Transaction = require('../models/transactions');
const nodemailer = require('nodemailer');
require('dotenv').config();

// First, let's add some debugging to verify credentials
console.log('=== SMTP Configuration Debug ===');
console.log('BILLING_USER:', process.env.BILLING_USER);
console.log('BILLING_PASS exists:', !!process.env.BILLING_PASS);
console.log('BILLING_PASS length:', process.env.BILLING_PASS?.length || 0);

// Try multiple SMTP configurations based on your provider's settings
const smtpConfigs = [
  {
    name: 'Config 1 - Provider Recommended SSL (465)',
    config: {
      host: 'labmate.docspace.co.ke', // Exact host from your provider
      port: 465,                      // Exact port from your provider
      secure: true,                   // SSL/TLS as recommended
      auth: {
        user: process.env.BILLING_USER,
        pass: process.env.BILLING_PASS
      }
      // Removed tls.rejectUnauthorized - let's use default SSL behavior first
    }
  },
  {
    name: 'Config 2 - Provider SSL with TLS fallback',
    config: {
      host: 'labmate.docspace.co.ke',
      port: 465,
      secure: true,
      auth: {
        user: process.env.BILLING_USER,
        pass: process.env.BILLING_PASS
      },
      tls: {
        rejectUnauthorized: false,
        servername: 'labmate.docspace.co.ke'
      }
    }
  },
  {
    name: 'Config 3 - Legacy SSL setup',
    config: {
      host: 'labmate.docspace.co.ke',
      port: 465,
      secure: true,
      auth: {
        user: process.env.BILLING_USER,
        pass: process.env.BILLING_PASS
      },
      tls: {
        rejectUnauthorized: false,
        ciphers: 'SSLv3'
      }
    }
  },
  {
    name: 'Config 4 - Alternative STARTTLS',
    config: {
      host: 'labmate.docspace.co.ke',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.BILLING_USER,
        pass: process.env.BILLING_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    }
  }
];

// Function to test SMTP configurations
async function findWorkingSMTPConfig() {
  for (const { name, config } of smtpConfigs) {
    try {
      console.log(`Testing ${name}...`);
      const testTransporter = nodemailer.createTransport(config);
      await testTransporter.verify();
      console.log(`✅ ${name} - Connection successful!`);
      return testTransporter;
    } catch (error) {
      console.log(`❌ ${name} - Failed:`, error.message);
    }
  }
  throw new Error('No working SMTP configuration found');
}

// Initialize transporter (will be set after testing)
let transporter;

// Test configurations on startup
(async () => {
  try {
    transporter = await findWorkingSMTPConfig();
    console.log('SMTP transporter initialized successfully');
  } catch (error) {
    console.error('Failed to initialize SMTP transporter:', error.message);
    // Create a fallback transporter for now
    transporter = nodemailer.createTransport({
      host: 'labmate.docspace.co.ke',
      port: 465,
      secure: true,
      auth: {
        user: process.env.BILLING_USER,
        pass: process.env.BILLING_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }
})();

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

// Enhanced email sending function with retry logic
async function sendEmailWithRetry(mailOptions, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Email attempt ${attempt}/${maxRetries}`);
      
      // Verify connection before sending
      await transporter.verify();
      console.log('SMTP connection verified');
      
      const result = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return result;
      
    } catch (error) {
      console.log(`Email attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // If it's an auth error, try to reinitialize transporter
      if (error.code === 'EAUTH' && attempt < maxRetries) {
        console.log('Attempting to reinitialize SMTP transporter...');
        try {
          transporter = await findWorkingSMTPConfig();
        } catch (reinitError) {
          console.log('Failed to reinitialize transporter:', reinitError.message);
        }
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// router.post('/purchase-success', async (req, res) => {
//   const { userId, purchaseType, transactionDetails } = req.body;

//   if (!userId || !purchaseType || !transactionDetails) {
//     return res.status(400).json({ message: 'Missing required purchase data (userId, purchaseType, transactionDetails).' });
//   }

//   if (!transactionDetails.transactionId || typeof transactionDetails.amount === 'undefined' || transactionDetails.amount === null) {
//     return res.status(400).json({ message: 'Missing essential transaction details (transactionId, amount).' });
//   }

//   if (purchaseType === 'subscription' && !transactionDetails.packageType) {
//     return res.status(400).json({ message: 'Missing required packageType for subscription.' });
//   }

//   try {
//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ message: 'User not found.' });

//     let transactionRecordData = {
//       userId,
//       transactionId: transactionDetails.transactionId,
//       amount: transactionDetails.amount,
//       purchaseType,
//       purchaseDate: new Date()
//     };

//     let emailBody = '';
//     let subject = '';

//     // if (purchaseType === 'single_interpretation_credit') {
//     //   user.singleLabInterpretationsRemaining += 4;

//     //   subject = '🎉 Thank You for Your Purchase – 4 More Interpretations Added';
//     //   emailBody = `
//     //     <p>Hi ${user.name || ''},</p>
//     //     <p>Thanks for your purchase! We've added <strong>4 more lab interpretation credits</strong> to your account.</p>
//     //     <p>Use them anytime to get private, AI-powered insights from your lab tests.</p>
//     //     <p>Need help? Just reply to this email or reach us at <a href="mailto:support@labmate.docspace.co.ke">support@labmate.docspace.co.ke</a>.</p>
//     //     <p>— The Labmate Team</p>
//     //   `;

//     // } else if (purchaseType === 'subscription') {
//     //   let subscriptionDates;
//     //   try {
//     //     subscriptionDates = calculateSubscriptionDates(transactionDetails.packageType);
//     //   } catch (error) {
//     //     return res.status(400).json({ message: error.message });
//     //   }

//     //   user.subscription.isSubscribed = true;
//     //   user.subscription.transactionId = transactionDetails.transactionId;
//     //   user.subscription.amount = transactionDetails.amount;
//     //   user.subscription.startDate = subscriptionDates.startDate;
//     //   user.subscription.expiryDate = subscriptionDates.expiryDate;
//     //   user.subscription.packageType = transactionDetails.packageType;

//     //   transactionRecordData.subscriptionStartDate = subscriptionDates.startDate;
//     //   transactionRecordData.subscriptionExpiryDate = subscriptionDates.expiryDate;
//     //   transactionRecordData.purchaseType = transactionDetails.packageType;

//     //   subject = `✅ You're Subscribed – ${transactionDetails.packageType} Plan Activated`;
//     //   emailBody = `
//     //     <p>Hi ${user.name || ''},</p>
//     //     <p>Welcome aboard! You've successfully subscribed to Labmate on the <strong>${transactionDetails.packageType}</strong> plan.</p>
//     //     <ul>
//     //       <li><strong>Start Date:</strong> ${subscriptionDates.startDate.toDateString()}</li>
//     //       <li><strong>Expiry Date:</strong> ${subscriptionDates.expiryDate.toDateString()}</li>
//     //     </ul>
//     //     <p>During your subscription, enjoy:</p>
//     //     <ul>
//     //       <li>🔬 Unlimited lab and imaging interpretations</li>
//     //       <li>🔒 Strong encryption and privacy-first design</li>
//     //       <li>📤 PDF export and email delivery of reports</li>
//     //     </ul>
//     //     <p>Need help or have questions? Just reply to this email or reach out to us at <a href="mailto:support@labmate.docspace.co.ke">support@labmate.docspace.co.ke</a>.</p>
//     //     <p>— The Labmate Team</p>
//     //   `;
//     // }

//     if (purchaseType === 'single_interpretation_credit') {
//       user.singleLabInterpretationsRemaining += 4;
    
//       subject = '🎉 Thank You for Your Purchase – 4 More Interpretations Added';
//       emailBody = `
//         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
//           <div style="text-align: center; margin-bottom: 20px;">
//             <img src="https://labmate.docspace.co.ke/labmatelogo.png" alt="Labmate Logo" style="max-width: 120px;" />
//           </div>
    
//           <h2 style="color: #2c3e50;">Hi ${user.name || 'there'},</h2>
//           <p style="font-size: 16px; color: #333;">
//             Thanks for your purchase! We've just added <strong>4 more lab interpretation credits</strong> to your account ✅
//           </p>
    
//           <p style="font-size: 16px; color: #333;">
//             You can use them anytime to privately interpret your lab results with AI-powered clarity.
//           </p>
    
//           <p style="font-size: 16px; color: #333;">
//             Need help? Just reply to this email or reach us at 
//             <a href="mailto:support@labmate.docspace.co.ke" style="color: #007bff;">support@labmate.docspace.co.ke</a>.
//           </p>
    
//           <p style="font-size: 15px; color: #777; margin-top: 30px;">— The Labmate Team</p>
//         </div>
//       `;
    
//     } else if (purchaseType === 'subscription') {
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
//       transactionRecordData.purchaseType = transactionDetails.packageType;
    
//       subject = `✅ You're Subscribed – ${transactionDetails.packageType} Plan Activated`;
//       emailBody = `
//         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
//           <div style="text-align: center; margin-bottom: 20px;">
//             <img src="https://labmate.docspace.co.ke/labmatelogo.png" alt="Labmate Logo" style="max-width: 120px;" />
//           </div>
    
//           <h2 style="color: #2c3e50;">Hi ${user.name || 'there'},</h2>
//           <p style="font-size: 16px; color: #333;">
//             Welcome aboard! You've successfully subscribed to Labmate on the <strong>${transactionDetails.packageType}</strong> plan 🎉
//           </p>
    
//           <ul style="font-size: 15px; color: #333; padding-left: 20px;">
//             <li><strong>Start Date:</strong> ${subscriptionDates.startDate.toDateString()}</li>
//             <li><strong>Expiry Date:</strong> ${subscriptionDates.expiryDate.toDateString()}</li>
//           </ul>
    
//           <p style="font-size: 16px; color: #333;">Here’s what you now have access to:</p>
//           <ul style="font-size: 15px; color: #333; padding-left: 20px;">
//             <li>🔬 Unlimited lab and imaging interpretations</li>
//             <li>🔒 Strong encryption and privacy-first design</li>
//             <li>📤 PDF export and email delivery of reports</li>
//           </ul>
    
//           <p style="font-size: 16px; color: #333;">
//             Need help? Just reply to this email or reach us at 
//             <a href="mailto:support@labmate.docspace.co.ke" style="color: #007bff;">support@labmate.docspace.co.ke</a>.
//           </p>
    
//           <p style="font-size: 15px; color: #777; margin-top: 30px;">— The Labmate Team</p>
//         </div>
//       `;
//     }
    

//     // Save user and transaction first
//     await user.save();
//     const newTransaction = new Transaction(transactionRecordData);
//     await newTransaction.save();

//     // Try to send email with retry logic
//     const mailOptions = {
//       from: `"Labmate Team" <${process.env.BILLING_USER}>`,
//       to: user.email,
//       subject: subject,
//       html: `
//         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
//           ${emailBody}
//         </div>
//       `
//     };

//     try {
//       await sendEmailWithRetry(mailOptions);
//       console.log('Confirmation email sent successfully to:', user.email);
//     } catch (emailError) {
//       console.error('Failed to send confirmation email:', emailError.message);
//       // Don't fail the entire request if email fails
//       // You might want to implement a queue system for failed emails
//     }

//     res.status(200).json({
//       message: 'User profile and transaction recorded successfully.',
//       user,
//       transaction: newTransaction
//     });

//   } catch (error) {
//     if (error.code === 11000 && error.keyPattern?.transactionId === 1) {
//       console.warn(`Duplicate transaction ID: ${transactionDetails.transactionId}`);
//       return res.status(409).json({ message: 'Transaction already recorded.' });
//     }

//     console.error('Error in /purchase-success:', error);
//     res.status(500).json({ message: 'Server error during purchase processing.' });
//   }
// });
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



    let emailBody = '';
    let subject = '';

    if (purchaseType === 'single_interpretation_credit') {
      user.singleLabInterpretationsRemaining += 4;
    
      subject = '🎉 Thank You for Your Purchase – 4 More Interpretations Added';
      emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://labmate.docspace.co.ke/labmatelogo.png" alt="Labmate Logo" style="max-width: 120px;" />
          </div>
    
          <h2 style="color: #2c3e50;">Hi ${user.name || 'there'},</h2>
          <p style="font-size: 16px; color: #333;">
            Thanks for your purchase! We've just added <strong>4 more lab interpretation credits</strong> to your account ✅
          </p>
    
          <p style="font-size: 16px; color: #333;">
            You can use them anytime to privately interpret your lab results with AI-powered clarity.
          </p>
    
          <p style="font-size: 16px; color: #333;">
            Need help? Just reply to this email or reach us at 
            <a href="mailto:support@labmate.docspace.co.ke" style="color: #007bff;">support@labmate.docspace.co.ke</a>.
          </p>
    
          <p style="font-size: 15px; color: #777; margin-top: 30px;">— The Labmate Team</p>
        </div>
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
    
      subject = `✅ You're Subscribed – ${transactionDetails.packageType} Plan Activated`;
      emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://labmate.docspace.co.ke/labmatelogo.png" alt="Labmate Logo" style="max-width: 120px;" />
          </div>
    
          <h2 style="color: #2c3e50;">Hi ${user.name || 'there'},</h2>
          <p style="font-size: 16px; color: #333;">
            Welcome aboard! You've successfully subscribed to Labmate on the <strong>${transactionDetails.packageType}</strong> plan 🎉
          </p>
    
          <ul style="font-size: 15px; color: #333; padding-left: 20px;">
            <li><strong>Start Date:</strong> ${subscriptionDates.startDate.toDateString()}</li>
            <li><strong>Expiry Date:</strong> ${subscriptionDates.expiryDate.toDateString()}</li>
          </ul>
    
          <p style="font-size: 16px; color: #333;">Here's what you now have access to:</p>
          <ul style="font-size: 15px; color: #333; padding-left: 20px;">
            <li>🔬 Unlimited lab and imaging interpretations</li>
            <li>🔒 Strong encryption and privacy-first design</li>
            <li>📤 PDF export and email delivery of reports</li>
          </ul>
    
          <p style="font-size: 16px; color: #333;">
            Need help? Just reply to this email or reach us at 
            <a href="mailto:support@labmate.docspace.co.ke" style="color: #007bff;">support@labmate.docspace.co.ke</a>.
          </p>
    
          <p style="font-size: 15px; color: #777; margin-top: 30px;">— The Labmate Team</p>
        </div>
      `;
    }

    // Save user changes
    await user.save();

    // Try to send email with retry logic
    const mailOptions = {
      from: `"Labmate Team" <${process.env.BILLING_USER}>`,
      to: user.email,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
          ${emailBody}
        </div>
      `
    };

    try {
      await sendEmailWithRetry(mailOptions);
      console.log('Confirmation email sent successfully to:', user.email);
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError.message);
      // Don't fail the entire request if email fails
      // You might want to implement a queue system for failed emails
    }

    res.status(200).json({
      message: 'User profile updated successfully.',
      user
    });

  } catch (error) {
    console.error('Error in /purchase-success:', error);
    res.status(500).json({ message: 'Server error during purchase processing.' });
  }
});

// Test endpoint to verify SMTP configuration
router.get('/test-email', async (req, res) => {
  try {
    const testEmail = {
      from: `"Labmate Team" <${process.env.BILLING_USER}>`,
      to: process.env.BILLING_USER, // Send to yourself for testing
      subject: 'SMTP Configuration Test',
      html: '<p>If you receive this email, your SMTP configuration is working correctly!</p>'
    };

    await sendEmailWithRetry(testEmail);
    res.json({ message: 'Test email sent successfully!' });
  } catch (error) {
    console.error('Test email failed:', error);
    res.status(500).json({ message: 'Test email failed', error: error.message });
  }
});

module.exports = router;