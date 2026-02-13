// const express = require('express');
// const router = express.Router();
// const User = require('../models/user');
// const nodemailer = require('nodemailer');
// const path = require('path');
// const { generateAccessToken, generateRefreshToken, hashToken } = require('../services/authService');
// require('dotenv').config();

// // Setup Nodemailer for Webmail SMTP
// const transporter = nodemailer.createTransport({
//   host: 'labmate.docspace.co.ke',
//   port: 465,
//   secure: true,
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
//         // Grant a single free lab interpretation to new users
//         singleLabInterpretationsRemaining: 1
//       });

//       isNewUser = true;

//       // --- MODIFIED: The mailOptions object now includes embedded attachments ---
//       await transporter.sendMail({
//         from: `"Labmate Team" <${process.env.EMAIL_USER}>`,
//         to: email,
//         subject: 'Welcome to Labmate – Your AI-Powered Medical Lab Assistant',
//         html: `
//           <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
//             <div style="text-align: center; margin-bottom: 20px;">
//               <img src="cid:labmatelogo" alt="Labmate Logo" style="max-width: 120px;" />
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
//               To help you hit the ground running, we’ve added <strong>1 free lab interpretation credit</strong> to your account. No sign-up fees, no catches.
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
//         `,
//         // --- ADDED: This section attaches the logo file to the email ---
//         attachments: [{
//           filename: 'labmatelogo.png',
//           // Constructs the correct path from your routes folder to the assets folder
//           path: path.join(__dirname, '..', 'assets', 'labmatelogo.png'),
//           cid: 'labmatelogo' // This ID is referenced in the HTML `<img>` tag's src
//         }]
//       });
      
//     }

//     // Issue tokens
//     const accessToken = generateAccessToken(user._id.toString());
//     const rawRefreshToken = generateRefreshToken();
//     const refreshHash = hashToken(rawRefreshToken);

//     // store hashed refresh token on user
//     user.refreshTokens = user.refreshTokens || [];
//     user.refreshTokens.push({ tokenHash: refreshHash });
//     await user.save();

//     // Set refresh token cookie (httpOnly)
//     const cookieOptions = {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: 'lax',
//       path: '/api/auth'
//     };
//     res.cookie('refreshToken', rawRefreshToken, cookieOptions);

//     res.status(200).json({
//       message: isNewUser ? 'New user created and authenticated' : 'User authenticated',
//       user,
//       accessToken
//     });

//   } catch (err) {
//     console.error('OAuth error:', err);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // POST /api/auth/refresh
// router.post('/refresh', async (req, res) => {
//   try {
//     const incoming = req.cookies?.refreshToken || req.body.refreshToken;
//     if (!incoming) return res.status(401).json({ message: 'Refresh token missing' });

//     const incomingHash = hashToken(incoming);
//     const user = await User.findOne({ 'refreshTokens.tokenHash': incomingHash });
//     if (!user) return res.status(401).json({ message: 'Invalid refresh token' });

//     // rotate refresh token: remove the old one and issue a new one
//     user.refreshTokens = user.refreshTokens.filter(rt => rt.tokenHash !== incomingHash);
//     const newRaw = generateRefreshToken();
//     const newHash = hashToken(newRaw);
//     user.refreshTokens.push({ tokenHash: newHash });
//     await user.save();

//     const accessToken = generateAccessToken(user._id.toString());

//     const cookieOptions = {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: 'lax',
//       path: '/api/auth'
//     };
//     res.cookie('refreshToken', newRaw, cookieOptions);

//     return res.json({ accessToken });
//   } catch (err) {
//     console.error('Refresh error', err);
//     return res.status(500).json({ message: 'Server error' });
//   }
// });

// // POST /api/auth/logout
// router.post('/logout', async (req, res) => {
//   try {
//     const incoming = req.cookies?.refreshToken || req.body.refreshToken;
//     if (!incoming) {
//       // clear cookie anyway
//       res.clearCookie('refreshToken', { path: '/api/auth' });
//       return res.json({ message: 'Logged out' });
//     }

//     const incomingHash = hashToken(incoming);
//     const user = await User.findOne({ 'refreshTokens.tokenHash': incomingHash });
//     if (user) {
//       user.refreshTokens = user.refreshTokens.filter(rt => rt.tokenHash !== incomingHash);
//       await user.save();
//     }

//     res.clearCookie('refreshToken', { path: '/api/auth' });
//     return res.json({ message: 'Logged out' });
//   } catch (err) {
//     console.error('Logout error', err);
//     return res.status(500).json({ message: 'Server error' });
//   }
// });

// module.exports = router;
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const nodemailer = require('nodemailer');
const path = require('path');
const { generateAccessToken, generateRefreshToken, hashToken } = require('../services/authService');
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
    // Normalize email and provider for consistent matching
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedProvider = provider.toLowerCase().trim();

    console.log('[OAuth] Login attempt:', {
      email: normalizedEmail,
      provider: normalizedProvider,
      providerId: providerId.substring(0, 20) + '...'
    });

    // PRIORITY: Look up by providerId + provider (this is the unique ID from OAuth provider)
    let user = await User.findOne({
      provider: normalizedProvider,
      providerId: providerId
    });

    let isNewUser = false;
    
    if (!user) {
      // Fallback: Try finding by email + provider in case providerId changed
      user = await User.findOne({
        email: normalizedEmail,
        provider: normalizedProvider
      });

      if (!user) {
        // This is a truly new user - create them
        console.log('[OAuth] Creating new user:', normalizedEmail);
        user = await User.create({
          email: normalizedEmail,
          name,
          profilePicture,
          provider: normalizedProvider,
          providerId,
          // Grant a single free lab interpretation to new users
          singleLabInterpretationsRemaining: 1
        });

        isNewUser = true;

        // --- MODIFIED: The mailOptions object now includes embedded attachments ---
        await transporter.sendMail({
          from: `"Labmate Team" <${process.env.EMAIL_USER}>`,
          to: normalizedEmail,
          subject: 'Welcome to Labmate – Your AI-Powered Medical Lab Assistant',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
              <div style="text-align: center; margin-bottom: 20px;">
                <img src="cid:labmatelogo" alt="Labmate Logo" style="max-width: 120px;" />
              </div>
        
              <h2 style="color: #2c3e50;">Hey ${name || 'there'}, welcome to Labmate! 👋</h2>
            
            <p style="font-size: 16px; color: #333;">
              We're genuinely thrilled to have you with us. Labmate is your private, AI-powered assistant for making sense of medical lab results — quickly, securely, and in plain English.
            </p>
      
            <h3 style="color: #2c3e50;">🔬 Why Labmate?</h3>
            <ul style="color: #333; font-size: 15px; padding-left: 20px;">
              <li>✔️ Instant, accurate interpretations of blood tests and ultrasound reports</li>
              <li>✔️ Upload photos or PDFs with ease</li>
              <li>✔️ Friendly explanations without the jargon</li>
              <li>✔️ Option to email results as a beautiful, professional PDF</li>
              <li>✔️ Built with <strong>privacy by design</strong> — no names or personal details are stored</li>
            </ul>
      
            <h3 style="color: #2c3e50;">🎁 Get Started – It's On Us</h3>
            <p style="font-size: 16px; color: #333;">
              To help you hit the ground running, we've added <strong>1 free lab interpretation credit</strong> to your account. No sign-up fees, no catches.
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
      
    } else {
      // User already exists - just log them in
      console.log('[OAuth] Existing user logging in:', user.email);
      
      // Update user data in case they changed profile picture or name
      if (profilePicture && profilePicture !== user.profilePicture) {
        user.profilePicture = profilePicture;
      }
      if (name && name !== user.name) {
        user.name = name;
      }
      await user.save();
    }

    // Issue tokens
    const accessToken = generateAccessToken(user._id.toString());
    const rawRefreshToken = generateRefreshToken();
    const refreshHash = hashToken(rawRefreshToken);

    // store hashed refresh token on user
    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.push({ tokenHash: refreshHash });
    await user.save();

    // Set refresh token cookie (httpOnly)
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth'
    };
    res.cookie('refreshToken', rawRefreshToken, cookieOptions);

    // ✅ MODIFIED: Return refreshToken in response body for mobile clients
    res.status(200).json({
      message: 'User authenticated',
      user,
      accessToken,
      refreshToken: rawRefreshToken
    });

  } catch (err) {
    console.error('OAuth error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const incoming = req.cookies?.refreshToken || req.body.refreshToken;
    if (!incoming) return res.status(401).json({ message: 'Refresh token missing' });

    const incomingHash = hashToken(incoming);
    const user = await User.findOne({ 'refreshTokens.tokenHash': incomingHash });
    if (!user) return res.status(401).json({ message: 'Invalid refresh token' });

    // rotate refresh token: remove the old one and issue a new one
    user.refreshTokens = user.refreshTokens.filter(rt => rt.tokenHash !== incomingHash);
    const newRaw = generateRefreshToken();
    const newHash = hashToken(newRaw);
    user.refreshTokens.push({ tokenHash: newHash });
    await user.save();

    const accessToken = generateAccessToken(user._id.toString());

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth'
    };
    res.cookie('refreshToken', newRaw, cookieOptions);

    return res.json({ accessToken });
  } catch (err) {
    console.error('Refresh error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const incoming = req.cookies?.refreshToken || req.body.refreshToken;
    if (!incoming) {
      // clear cookie anyway
      res.clearCookie('refreshToken', { path: '/api/auth' });
      return res.json({ message: 'Logged out' });
    }

    const incomingHash = hashToken(incoming);
    const user = await User.findOne({ 'refreshTokens.tokenHash': incomingHash });
    if (user) {
      user.refreshTokens = user.refreshTokens.filter(rt => rt.tokenHash !== incomingHash);
      await user.save();
    }

    res.clearCookie('refreshToken', { path: '/api/auth' });
    return res.json({ message: 'Logged out' });
  } catch (err) {
    console.error('Logout error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;