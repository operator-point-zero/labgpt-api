const express = require('express');
const router = express.Router();
const Feedback = require('../models/feedback');

router.post('/', async (req, res) => {
  try {
    const {
      uid,
      name,
      type,
      title,
      description,
      includeDeviceInfo,
      timestamp
    } = req.body;

    if (!type || !title || !description) {
      return res.status(400).json({ error: 'type, title, and description are required.' });
    }

    const feedback = new Feedback({
      uid,
      name,
      type,
      title,
      description,
      includeDeviceInfo,
      timestamp
    });

    await feedback.save();

    res.status(201).json({ message: 'Feedback received successfully.' });
  } catch (err) {
    console.error('Error saving feedback:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
