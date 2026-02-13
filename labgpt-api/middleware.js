// middleware.js
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const authMiddleware = require('./middleware/authMiddleware');
const url = require('url');
const cookieParser = require('cookie-parser');
const logger = require('./services/logger');

module.exports = (app) => {
  // Enable CORS for all routes
  app.use(cors());
  
  // Parse JSON request bodies with increased limit for encrypted data
  app.use(bodyParser.json({ limit: '10mb' }));
  // Parse URL-encoded bodies
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
  // Parse cookies for refresh token handling
  app.use(cookieParser());
  
  // Log HTTP requests with Morgan (to console and file)
  if (process.env.NODE_ENV !== 'test') {
    // Custom morgan format that logs to file
    morgan.token('body', (req) => {
      if (req.method === 'POST' || req.method === 'PUT') {
        return JSON.stringify(req.body).substring(0, 100); // First 100 chars
      }
      return '';
    });
    
    app.use(morgan('dev'));
    // Also log to file using custom middleware
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.request(req.method, req.originalUrl, res.statusCode, `${duration}ms`);
      });
      next();
    });
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
  
  // Error handling middleware - logs errors to file
  app.use((err, req, res, next) => {
    logger.error('Unhandled error', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip
    });
    
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
      requestId: req.requestId || 'unknown'
    });
  });
};