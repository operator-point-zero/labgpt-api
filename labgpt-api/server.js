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

// Create router files for these if they don't exist, or comment them out for now
const authRoutes = require('../labgpt-api/controllers/auth');
const feedbackRoutes = require('../labgpt-api/controllers/feedback'); 
// const emailRoutes = require('../labgpt-api/controllers/emailResults');
const purchaseRoutes = require('../labgpt-api/controllers/purchases'); 
const checkSubscription = require('../labgpt-api/controllers/checkPurchasesStatus'); 


// Apply middleware
middleware(app);

// Use routes
app.use('/api/labs', labRoutes);
app.use('/api/health', healthRoutes);

// Comment these out until you create proper router files
app.use('/api/auth', authRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/checkStatus', checkSubscription);

// app.use('/api/email', emailRoutes);

app.get('/', (req, res) => {
  res.send('🧪 LabGPT API is up and running!');
});

// Backward compatibility
app.use('/interpret', (req, res, next) => {
  req.url = req.url.replace('/interpret', '/api/labs');
  labRoutes(req, res, next);
});

app.use('/health', (req, res, next) => {
  req.url = req.url.replace('/health', '/api/health');
  healthRoutes(req, res, next);
});


// Start the server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});