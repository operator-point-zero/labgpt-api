
require('dotenv').config();
const express = require('express');
const connectDB = require('../labgpt-api/services/db'); // ✅ MongoDB connection
const app = express();
const port = process.env.PORT || 3000;

// Connect to MongoDB
connectDB(); // ✅ Call the DB connection function

// Import middleware
const middleware = require('./middleware');

// Import routes
const labRoutes = require('./routes/labRoutes');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('../labgpt-api/controllers/auth');
const feedbackRoutes = require('../labgpt-api/controllers/feedback');


// Apply middleware
middleware(app);

// Use routes
app.use('/api/labs', labRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/feedback', feedbackRoutes);


app.get('/', (req, res) => {
  res.send('🧪 LabGPT API is up and running!');
});

// Backward compatibility
app.use('/interpret', (req, res) => {
  req.url = '/';
  labRoutes(req, res);
});

app.use('/health', (req, res) => {
  req.url = '/';
  healthRoutes(req, res);
});

// Start the server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
