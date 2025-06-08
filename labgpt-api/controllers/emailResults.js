require('dotenv').config();
const express = require('express');
const connectDB = require('../services/db'); // ✅ MongoDB connection
const app = express();
const port = process.env.PORT || 3000;

// Connect to MongoDB
connectDB(); // ✅ Call the DB connection function

// Import middleware
const middleware = require('./middleware');

// Apply middleware first
middleware(app);

// Import routes (make sure these export Express routers)
const labRoutes = require('./routes/labRoutes');
const healthRoutes = require('./routes/healthRoutes');

// Import controllers (these should be individual route handlers)
const authController = require('../labgpt-api/controllers/auth');
const feedbackController = require('../labgpt-api/controllers/feedback');
const emailResultsController = require('../labgpt-api/controllers/emailResults');

// Use router-based routes
app.use('/api/labs', labRoutes);
app.use('/api/health', healthRoutes);

// For controllers that are functions, use them directly
// Make sure your controller files export proper Express routers
// If they don't, you'll need to check what they actually export
try {
  // Only use these if they are actual Express routers
  if (typeof authController === 'function' || (authController && authController.stack)) {
    app.use('/api/auth', authController);
  } else {
    console.warn('⚠️ Auth controller is not a proper Express router');
  }
  
  if (typeof feedbackController === 'function' || (feedbackController && feedbackController.stack)) {
    app.use('/api/feedback', feedbackController);
  } else {
    console.warn('⚠️ Feedback controller is not a proper Express router');
  }
  
  if (typeof emailResultsController === 'function' || (emailResultsController && emailResultsController.stack)) {
    app.use('/api/emailResults', emailResultsController);
  } else {
    console.warn('⚠️ Email results controller is not a proper Express router');
  }
} catch (error) {
  console.error('❌ Error setting up controller routes:', error.message);
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🧪 LabGPT API is up and running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      labs: '/api/labs',
      health: '/api/health',
      auth: '/api/auth',
      feedback: '/api/feedback',
      email: '/api/emailResults'
    }
  });
});

// Backward compatibility endpoints
app.post('/interpret', (req, res, next) => {
  // Forward to lab routes
  res.redirect(307, '/api/labs');
});

app.post('/email', (req, res, next) => {
  // Forward to email routes
  res.redirect(307, '/api/emailResults/generate-pdf');
});

app.get('/health', (req, res, next) => {
  // Forward to health routes
  res.redirect(307, '/api/health');
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('💥 Global error handler:', error);
  
  // Log the full error for debugging
  console.error('Error stack:', error.stack);
  
  res.status(error.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET / - API status',
      'POST /api/labs - Lab analysis',
      'GET /api/health - Health check',
      'POST /api/auth/* - Authentication endpoints',
      'POST /api/feedback - Submit feedback',
      'POST /api/emailResults/* - Email services'
    ]
  });
});

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📍 Local: http://localhost:${port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('📋 API Documentation available at: http://localhost:' + port);
});