// controllers/healthController.js

/**
 * Health check controller
 */
exports.checkHealth = (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: req.requestTimestamp || new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  };