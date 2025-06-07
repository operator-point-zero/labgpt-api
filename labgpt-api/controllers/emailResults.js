require('dotenv').config();
const express = require('express');
const connectDB = require('../labgpt-api/services/db'); // ✅ MongoDB connection
const app = express();
const port = process.env.PORT || 3000;

// Connect to MongoDB
connectDB(); // ✅ Call the DB connection function

// Import middleware
const middleware = require('./middleware');

// Import routes (these should be Express routers)
const labRoutes = require('./routes/labRoutes');
const healthRoutes = require('./routes/healthRoutes');

// Import controller modules (these are likely objects with methods)
const authController = require('../labgpt-api/controllers/auth');
const feedbackController = require('../labgpt-api/controllers/feedback');
const emailResultsController = require('../labgpt-api/controllers/emailResults');

// Apply middleware
middleware(app);

// Use proper router routes
app.use('/api/labs', labRoutes);
app.use('/api/health', healthRoutes);

// For controllers, we need to create router instances and define routes
const authRouter = express.Router();
const feedbackRouter = express.Router();
const emailRouter = express.Router();

// Auth routes - adjust these based on your auth controller's actual methods
if (authController.login) authRouter.post('/login', authController.login);
if (authController.register) authRouter.post('/register', authController.register);
if (authController.verify) authRouter.get('/verify', authController.verify);
if (authController.logout) authRouter.post('/logout', authController.logout);

// Feedback routes - adjust these based on your feedback controller's actual methods
if (feedbackController.create) feedbackRouter.post('/', feedbackController.create);
if (feedbackController.getAll) feedbackRouter.get('/', feedbackController.getAll);
if (feedbackController.getById) feedbackRouter.get('/:id', feedbackController.getById);
if (feedbackController.update) feedbackRouter.put('/:id', feedbackController.update);
if (feedbackController.delete) feedbackRouter.delete('/:id', feedbackController.delete);

// Email routes - adjust these based on your email controller's actual methods
if (emailResultsController.sendEmail) emailRouter.post('/send', emailResultsController.sendEmail);
if (emailResultsController.generatePdf) emailRouter.post('/generate-pdf', emailResultsController.generatePdf);
if (emailResultsController.getResults) emailRouter.get('/results', emailResultsController.getResults);

// Apply the routers
app.use('/api/auth', authRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/emailResults', emailRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.send('🧪 LabGPT API is up and running!');
});

// Backward compatibility routes - properly handle these
app.use('/interpret', (req, res, next) => {
  // Redirect to the new API endpoint
  req.url = req.url.replace('/interpret', '/api/labs');
  labRoutes(req, res, next);
});

app.use('/email', (req, res, next) => {
  // Handle email requests - redirect to appropriate email endpoint
  if (req.method === 'POST' && req.path === '/') {
    // Assuming this is for PDF generation
    emailResultsController.generatePdf(req, res, next);
  } else {
    res.status(404).json({ error: 'Email endpoint not found' });
  }
});

app.use('/health', (req, res, next) => {
  // Redirect to the new health API endpoint
  req.url = req.url.replace('/health', '/api/health');
  healthRoutes(req, res, next);
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('💥 Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    availableEndpoints: [
      'GET / - API status',
      'POST /api/labs - Lab analysis',
      'GET /api/health - Health check',
      'POST /api/auth/login - User login',
      'POST /api/auth/register - User registration',
      'POST /api/feedback - Submit feedback',
      'POST /api/emailResults/generate-pdf - Generate PDF',
      '// Backward compatibility:',
      'POST /interpret - Lab analysis (deprecated)',
      'POST /email - Email services (deprecated)',
      'GET /health - Health check (deprecated)'
    ]
  });
});

// Graceful shutdown
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
  console.log(`📍 Available at: http://localhost:${port}`);
  console.log('📋 API Endpoints:');
  console.log('  🧪 POST /api/labs - Lab analysis');
  console.log('  💓 GET /api/health - Health check');
  console.log('  🔐 POST /api/auth/* - Authentication');
  console.log('  💬 POST /api/feedback - Feedback');
  console.log('  📧 POST /api/emailResults/* - Email services');
  console.log('');
  console.log('🔄 Backward compatibility routes still available');
});