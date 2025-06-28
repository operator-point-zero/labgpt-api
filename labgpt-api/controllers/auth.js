// const express = require('express');
// const router = express.Router();
// const User = require('../models/user');

// // POST /api/auth/oauth
// router.post('/oauth', async (req, res) => {
//   const { email, name, profilePicture, provider, providerId } = req.body;

//   if (!email || !provider || !providerId) {
//     return res.status(400).json({ message: 'Missing required fields.' });
//   }

//   try {
//     let user = await User.findOne({ email, provider });

//     if (!user) {
//       user = await User.create({
//         email,
//         name,
//         profilePicture,
//         provider,
//         providerId,
//       });
//     }

//     res.status(200).json({
//       message: 'User authenticated',
//       user,
//     });

//   } catch (err) {
//     console.error('OAuth error:', err);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// module.exports = router;
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const nodemailer = require('nodemailer');
require('dotenv').config(); // Ensure this is called in your main app if not here

// Setup Nodemailer for Webmail SMTP
const transporter = nodemailer.createTransport({
  host: 'labmate.docspace.co.ke', // Replace with your webmail SMTP host
  port: 465, // Use 587 if not using SSL
  secure: true, // true for port 465 (SSL), false for 587 (TLS)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// POST /api/auth/oauth
router.post('/oauth', async (req, res) => {
  const { email, name, profilePicture, provider, providerId } = req.body;

  if (!email || !provider || !providerId) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  try {
    let user = await User.findOne({ email, provider });

    let isNewUser = false;
    if (!user) {
      user = await User.create({
        email,
        name,
        profilePicture,
        provider,
        providerId,
      });

      isNewUser = true;

      // Send Welcome Email
      await transporter.sendMail({
        from: `"Labmate Team" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Welcome to Labmate – Your AI-Powered Medical Lab Assistant',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
            <h2 style="color: #2c3e50;">Hi ${name || 'there'}, welcome to Labmate!</h2>
            <p style="font-size: 16px; color: #333;">
              We're excited to have you on board 🎉. Labmate is your private, AI-powered assistant for understanding your lab test and imaging report results — anytime, anywhere.
            </p>

            <h3 style="color: #2c3e50;">🔬 Why Labmate?</h3>
            <ul style="color: #333; font-size: 15px;">
              <li>✔️ Instant, accurate interpretations of blood tests and ultrasound reports</li>
              <li>✔️ Simple and secure uploads via photo or PDF</li>
              <li>✔️ Clear explanations in plain English, not medical jargon</li>
              <li>✔️ Option to email results as a beautifully formatted PDF</li>
              <li>✔️ Built with <strong>privacy by design</strong> — no identifying information is ever stored</li>
            </ul>

            <h3 style="color: #2c3e50;">🎁 On the House</h3>
            <p style="font-size: 16px; color: #333;">
              To get you started, your first <strong>2 lab interpretations are completely free</strong>. No strings attached.
            </p>

            <h3 style="color: #2c3e50;">🔒 Privacy Comes First</h3>
            <p style="font-size: 16px; color: #333;">
              Labmate is designed to protect your health data. We automatically remove patient names and personal details, and encrypt all communication between your device and our AI backend.
            </p>

            <p style="font-size: 16px; color: #333;">
              If you ever need support, just reply to this email or reach us at <a href="mailto:support@labmate.docspace.co.ke">support@labmate.docspace.co.ke</a>.
            </p>

            <p style="font-size: 16px; color: #333;">
              Welcome again, and thank you for choosing Labmate 🙌
            </p>

            <p style="font-size: 15px; color: #777; margin-top: 30px;">— The Labmate Team</p>
          </div>
        `
      });
    }

    res.status(200).json({
      message: isNewUser ? 'New user created and authenticated' : 'User authenticated',
      user,
    });

  } catch (err) {
    console.error('OAuth error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
