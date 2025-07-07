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
// const express = require('express');
// const router = express.Router();
// const User = require('../models/user');
// const nodemailer = require('nodemailer');
// require('dotenv').config(); // Ensure this is called in your main app if not here

// // Setup Nodemailer for Webmail SMTP
// const transporter = nodemailer.createTransport({
//   host: 'labmate.docspace.co.ke', // Replace with your webmail SMTP host
//   port: 465, // Use 587 if not using SSL
//   secure: true, // true for port 465 (SSL), false for 587 (TLS)
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS
//   }
// });

// // POST /api/auth/oauth
// router.post('/oauth', async (req, res) => {
//   const { email, name, profilePicture, provider, providerId } = req.body;

//   if (!email || !provider || !providerId) {
//     return res.status(400).json({ message: 'Missing required fields.' });
//   }

//   try {
//     let user = await User.findOne({ email, provider });

//     let isNewUser = false;
//     if (!user) {
//       user = await User.create({
//         email,
//         name,
//         profilePicture,
//         provider,
//         providerId,
//       });

//       isNewUser = true;

   

//       await transporter.sendMail({
//         from: `"Labmate Team" <${process.env.EMAIL_USER}>`,
//         to: email,
//         subject: 'Welcome to Labmate – Your AI-Powered Medical Lab Assistant',
//         html: `
//           <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
//             <div style="text-align: center; margin-bottom: 20px;">
//               <img src="https://labmate.docspace.co.ke/labmatelogo.png" alt="Labmate Logo" style="max-width: 120px;" />
//             </div>
      
//             <h2 style="color: #2c3e50;">Hey ${name || 'there'}, welcome to Labmate! 👋</h2>
            
//             <p style="font-size: 16px; color: #333;">
//               We’re genuinely thrilled to have you with us. Labmate is your private, AI-powered assistant for making sense of medical lab results — quickly, securely, and in plain English.
//             </p>
      
//             <h3 style="color: #2c3e50;">🔬 Why Labmate?</h3>
//             <ul style="color: #333; font-size: 15px; padding-left: 20px;">
//               <li>✔️ Instant, accurate interpretations of blood tests and ultrasound reports</li>
//               <li>✔️ Upload photos or PDFs with ease</li>
//               <li>✔️ Friendly explanations without the jargon</li>
//               <li>✔️ Option to email results as a beautiful, professional PDF</li>
//               <li>✔️ Built with <strong>privacy by design</strong> — no names or personal details are stored</li>
//             </ul>
      
//             <h3 style="color: #2c3e50;">🎁 Get Started – It’s On Us</h3>
//             <p style="font-size: 16px; color: #333;">
//               To help you hit the ground running, your first <strong>2 lab interpretations are completely free</strong>. No sign-up fees, no catches.
//             </p>
      
//             <h3 style="color: #2c3e50;">🔒 Your Privacy Matters</h3>
//             <p style="font-size: 16px; color: #333;">
//               Your health data stays yours. Labmate automatically removes patient identifiers and encrypts everything end to end.
//             </p>
      
//             <p style="font-size: 16px; color: #333;">
//               Need help or have a question? Just reply to this email or reach us at 
//               <a href="mailto:support@labmate.docspace.co.ke" style="color: #007bff;">support@labmate.docspace.co.ke</a>.
//             </p>
      
//             <p style="font-size: 16px; color: #333; margin-top: 30px;">
//               Welcome again — we're here to help you take charge of your health 💙
//             </p>
      
//             <p style="font-size: 15px; color: #777; margin-top: 20px;">— The Labmate Team</p>
//           </div>
//         `
//       });
      
//     }

//     res.status(200).json({
//       message: isNewUser ? 'New user created and authenticated' : 'User authenticated',
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
const path = require('path'); // <-- ADDED: To handle file paths
require('dotenv').config();

// Setup Nodemailer for Webmail SMTP
const transporter = nodemailer.createTransport({
  host: 'labmate.docspace.co.ke',
  port: 465,
  secure: true,
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

      // --- MODIFIED: The mailOptions object now includes embedded attachments ---
      await transporter.sendMail({
        from: `"Labmate Team" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Welcome to Labmate – Your AI-Powered Medical Lab Assistant',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="cid:labmatelogo" alt="Labmate Logo" style="max-width: 120px;" />
            </div>
      
            <h2 style="color: #2c3e50;">Hey ${name || 'there'}, welcome to Labmate! 👋</h2>
            
            <p style="font-size: 16px; color: #333;">
              We’re genuinely thrilled to have you with us. Labmate is your private, AI-powered assistant for making sense of medical lab results — quickly, securely, and in plain English.
            </p>
      
            <h3 style="color: #2c3e50;">🔬 Why Labmate?</h3>
            <ul style="color: #333; font-size: 15px; padding-left: 20px;">
              <li>✔️ Instant, accurate interpretations of blood tests and ultrasound reports</li>
              <li>✔️ Upload photos or PDFs with ease</li>
              <li>✔️ Friendly explanations without the jargon</li>
              <li>✔️ Option to email results as a beautiful, professional PDF</li>
              <li>✔️ Built with <strong>privacy by design</strong> — no names or personal details are stored</li>
            </ul>
      
            <h3 style="color: #2c3e50;">🎁 Get Started – It’s On Us</h3>
            <p style="font-size: 16px; color: #333;">
              To help you hit the ground running, your first <strong>2 lab interpretations are completely free</strong>. No sign-up fees, no catches.
            </p>
      
            <h3 style="color: #2c3e50;">🔒 Your Privacy Matters</h3>
            <p style="font-size: 16px; color: #333;">
              Your health data stays yours. Labmate automatically removes patient identifiers and encrypts everything end to end.
            </p>
      
            <p style="font-size: 16px; color: #333;">
              Need help or have a question? Just reply to this email or reach us at 
              <a href="mailto:support@labmate.docspace.co.ke" style="color: #007bff;">support@labmate.docspace.co.ke</a>.
            </p>
      
            <p style="font-size: 16px; color: #333; margin-top: 30px;">
              Welcome again — we're here to help you take charge of your health 💙
            </p>
      
            <p style="font-size: 15px; color: #777; margin-top: 20px;">— The Labmate Team</p>
          </div>
        `,
        // --- ADDED: This section attaches the logo file to the email ---
        attachments: [{
          filename: 'labmatelogo.png',
          // Constructs the correct path from your routes folder to the assets folder
          path: path.join(__dirname, '..', 'assets', 'labmatelogo.png'),
          cid: 'labmatelogo' // This ID is referenced in the HTML `<img>` tag's src
        }]
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
