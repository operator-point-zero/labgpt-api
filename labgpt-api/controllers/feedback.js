const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/feedback_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Feedback Schema
const feedbackSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String
  },
  type: {
    type: String,
    required: true,
    enum: ['feedback', 'bug', 'feature', 'general']
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  includeDeviceInfo: {
    type: Boolean,
    default: false
  },
  deviceInfo: {
    platform: String,
    version: String,
    model: String,
    manufacturer: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

// Feedback submission endpoint
app.post('/api/feedback', async (req, res) => {
  try {
    const {
      uid,
      name,
      email,
      type,
      title,
      description,
      includeDeviceInfo,
      deviceInfo,
      timestamp
    } = req.body;

    // Basic validation
    if (!uid || !name || !type || !title || !description) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'uid, name, type, title, and description are required'
      });
    }

    // Create new feedback document
    const feedback = new Feedback({
      uid,
      name,
      email,
      type,
      title,
      description,
      includeDeviceInfo: includeDeviceInfo || false,
      deviceInfo: includeDeviceInfo ? deviceInfo : undefined,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });

    // Save to database
    const savedFeedback = await feedback.save();

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      id: savedFeedback._id
    });

  } catch (error) {
    console.error('Error saving feedback:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation error',
        message: error.message
      });
    }

    // Handle other errors
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to save feedback'
    });
  }
});

// Get all feedback (optional - for admin dashboard)
app.get('/api/feedback', async (req, res) => {
  try {
    const { page = 1, limit = 10, type, uid } = req.query;
    
    const filter = {};
    if (type) filter.type = type;
    if (uid) filter.uid = uid;

    const feedback = await Feedback.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Feedback.countDocuments(filter);

    res.json({
      feedback,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch feedback'
    });
  }
});

// Get feedback by ID
app.get('/api/feedback/:id', async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    
    if (!feedback) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Feedback not found'
      });
    }

    res.json(feedback);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch feedback'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});