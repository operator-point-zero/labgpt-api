const express = require('express');
const router = express.Router();
const User = require('../models/user');

// POST /api/auth/oauth
router.post('/oauth', async (req, res) => {
  const { email, name, profilePicture, provider, providerId } = req.body;

  if (!email || !provider || !providerId) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  try {
    let user = await User.findOne({ email, provider });

    if (!user) {
      user = await User.create({
        email,
        name,
        profilePicture,
        provider,
        providerId,
      });
    }

    res.status(200).json({
      message: 'User authenticated',
      user,
    });

  } catch (err) {
    console.error('OAuth error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
