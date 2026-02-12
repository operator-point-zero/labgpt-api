// middleware.js
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const authMiddleware = require('./middleware/authMiddleware');
const url = require('url');
const cookieParser = require('cookie-parser');

module.exports = (app) => {
  // Enable CORS for all routes
  app.use(cors());
  
  // Parse JSON request bodies
  app.use(bodyParser.json());
  // Parse cookies for refresh token handling
  app.use(cookieParser());
  
  // Log HTTP requests
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }
  
  // Add request timestamp
  app.use((req, res, next) => {
    req.requestTimestamp = new Date().toISOString();
    next();
  });

  // Rate limiter - global (customize via env)
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_WINDOW_MS) || 60 * 1000, // 1 minute
    max: parseInt(process.env.RATE_MAX) || 60, // limit each IP to 60 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use(limiter);

  // Protect all routes except a small whitelist
  const whitelist = [
    '/api/auth',
    '/api/health',
    '/api/pdf',
    '/api/status',    // ✅ ADD THIS
    '/ping',          
    '/'
  ];

  app.use((req, res, next) => {
    // allow if path starts with any whitelist entry
    const pathname = url.parse(req.originalUrl || req.url).pathname;
    const allowed = whitelist.some(p => pathname === p || pathname.startsWith(p + '/'));
    if (allowed) return next();
    return authMiddleware(req, res, next);
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