const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Transaction = require('../models/transactions');
const nodemailer = require('nodemailer');
const path = require('path'); // <-- ADDED: To handle file paths
require('dotenv').config();

// SMTP configuration and testing logic (no changes here)
console.log('=== SMTP Configuration Debug ===');
console.log('BILLING_USER:', process.env.BILLING_USER);
console.log('BILLING_PASS exists:', !!process.env.BILLING_PASS);
console.log('BILLING_PASS length:', process.env.BILLING_PASS?.length || 0);

const smtpConfigs = [
  {
    name: 'Config 1 - Provider Recommended SSL (465)',
    config: {
      host: 'labmate.docspace.co.ke',
      port: 465,
      secure: true,
      auth: {
        user: process.env.BILLING_USER,
        pass: process.env.BILLING_PASS
      }
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

let transporter;

(async () => {
  try {
    transporter = await findWorkingSMTPConfig();
    console.log('SMTP transporter initialized successfully');
  } catch (error) {
    console.error('Failed to initialize SMTP transporter:', error.message);
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

async function sendEmailWithRetry(mailOptions, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Email attempt ${attempt}/${maxRetries}`);
      await transporter.verify();
      console.log('SMTP connection verified');
      const result = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return result;
    } catch (error) {
      console.log(`Email attempt ${attempt} failed:`, error.message);
      if (attempt === maxRetries) throw error;
      if (error.code === 'EAUTH' && attempt < maxRetries) {
        console.log('Attempting to reinitialize SMTP transporter...');
        try {
          transporter = await findWorkingSMTPConfig();
        } catch (reinitError) {
          console.log('Failed to reinitialize transporter:', reinitError.message);
        }
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
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

    let emailBody = '';
    let subject = '';

    if (purchaseType === 'single_interpretation_credit') {
      user.singleLabInterpretationsRemaining += 4;
    
      subject = '🎉 Thank You for Your Purchase – 4 More Interpretations Added';
      emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="cid:labmatelogo" alt="Labmate Logo" style="max-width: 120px;" />
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
            <img src="cid:labmatelogo" alt="Labmate Logo" style="max-width: 120px;" />
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

    await user.save();

    // MODIFIED: mailOptions now includes the attachments array.
    const mailOptions = {
      from: `"Labmate Team" <${process.env.BILLING_USER}>`,
      to: user.email,
      subject: subject,
      html: emailBody, // Using the generated email body directly
      attachments: [{
        filename: 'labmatelogo.png',
        path: path.join(__dirname, '..', 'assets', 'labmatelogo.png'),
        cid: 'labmatelogo' // This ID is referenced by the `<img>` tag
      }]
    };

    try {
      await sendEmailWithRetry(mailOptions);
      console.log('Confirmation email sent successfully to:', user.email);
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError.message);
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

router.get('/test-email', async (req, res) => {
  try {
    const testEmail = {
      from: `"Labmate Team" <${process.env.BILLING_USER}>`,
      to: process.env.BILLING_USER,
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