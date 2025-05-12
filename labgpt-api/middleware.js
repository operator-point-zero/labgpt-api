// middleware.js
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');

module.exports = (app) => {
  // Enable CORS for all routes
  app.use(cors());
  
  // Parse JSON request bodies
  app.use(bodyParser.json());
  
  // Log HTTP requests
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }
  
  // Add request timestamp
  app.use((req, res, next) => {
    req.requestTimestamp = new Date().toISOString();
    next();
  });
  
  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  });
};