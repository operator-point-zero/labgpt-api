require('dotenv').config();
const express = require('express');
const connectDB = require('./services/db');
const app = express();
const port = process.env.PORT || 3000;

// Import logger first
const logger = require('./services/logger');

// Connect to MongoDB
connectDB();

// Import middleware
const middleware = require('./middleware');
const authMiddleware = require('./middleware/authMiddleware');

// Import routes
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./controllers/auth');
const feedbackRoutes = require('./controllers/feedback'); 
const purchaseRoutes = require('./controllers/purchases'); 
const checkSubscription = require('./controllers/checkPurchasesStatus'); 

// Apply base middleware (body parser, cors, etc - NOT auth)
middleware(app);

// ============================================================================
// PUBLIC ROUTES (NO AUTH REQUIRED) - MUST BE BEFORE authMiddleware
// ============================================================================

app.get('/ping', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: '🧪 LabGPT API is alive yaaay!' 
  });
});

app.get('/api/status', (req, res) => {
  const mongoose = require('mongoose');
  
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const dbStatusCode = mongoose.connection.readyState;
  
  const envChecks = {
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    ENCRYPTION_SECRET: !!process.env.ENCRYPTION_SECRET && process.env.ENCRYPTION_SECRET !== 'CHANGE_THIS_IN_PRODUCTION',
    MONGODB_URI: !!process.env.MONGODB_URI,
    PORT: !!process.env.PORT,
    NODE_ENV: process.env.NODE_ENV || 'development',
  };
  
  const allEnvValid = Object.values(envChecks).every(Boolean);
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  const status = {
    status: dbStatus === 'connected' && allEnvValid ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: Math.floor(uptime),
      formatted: formatUptime(uptime),
    },
    database: {
      status: dbStatus,
      statusCode: dbStatusCode,
      statusText: getDbStatusText(dbStatusCode),
    },
    environment: {
      node_version: process.version,
      node_env: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 3000,
    },
    configuration: {
      openai_configured: envChecks.OPENAI_API_KEY,
      encryption_configured: envChecks.ENCRYPTION_SECRET,
      database_configured: envChecks.MONGODB_URI,
      all_valid: allEnvValid,
    },
    memory: {
      rss: formatBytes(memoryUsage.rss),
      heapTotal: formatBytes(memoryUsage.heapTotal),
      heapUsed: formatBytes(memoryUsage.heapUsed),
      external: formatBytes(memoryUsage.external),
    },
    version: '2.0.0',
  };
  
  if (!allEnvValid) {
    status.warnings = [];
    if (!envChecks.OPENAI_API_KEY) status.warnings.push('OPENAI_API_KEY not configured');
    if (!envChecks.ENCRYPTION_SECRET) status.warnings.push('ENCRYPTION_SECRET not configured or using default value');
    if (!envChecks.MONGODB_URI) status.warnings.push('MONGODB_URI not configured');
  }
  
  const httpStatus = status.status === 'healthy' ? 200 : 503;
  res.status(httpStatus).json(status);
});

app.get('/', (req, res) => {
  res.send('🧪 LabGPT API is up and running!');
});

// Public auth routes (login, register)
app.use('/api/auth', authRoutes);

// Public health routes
app.use('/api/health', healthRoutes);

// ============================================================================
// LOGGING ENDPOINTS (NO AUTH) - For debugging
// ============================================================================

// Get today's logs
app.get('/api/logs', (req, res) => {
  try {
    const logs = logger.getLogContents();
    res.header('Content-Type', 'text/plain');
    res.send(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve logs', message: err.message });
  }
});

// Get last N lines from logs
app.get('/api/logs/tail/:lines?', (req, res) => {
  try {
    const lines = parseInt(req.params.lines) || 100;
    const logs = logger.getLastLines(Math.min(lines, 500)); // Max 500 lines
    res.header('Content-Type', 'text/plain');
    res.send(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve logs', message: err.message });
  }
});

// List all log files
app.get('/api/logs/files', (req, res) => {
  try {
    const files = logger.getAllLogFiles();
    res.json({
      count: files.length,
      files: files.map(f => ({
        name: f.name,
        created: f.created,
        size: require('fs').statSync(f.path).size
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list log files', message: err.message });
  }
});

// Get specific log file
app.get('/api/logs/file/:filename', (req, res) => {
  try {
    const logs = logger.getLogFile(req.params.filename);
    res.header('Content-Type', 'text/plain');
    res.send(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve log file', message: err.message });
  }
});

// ============================================================================
// PROTECTED ROUTES (AUTH REQUIRED) - AFTER authMiddleware
// ============================================================================

// Apply auth middleware to all routes below this point
app.use(authMiddleware);

// Protected routes - these require authentication
app.use('/api/feedback', feedbackRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/checkStatus', checkSubscription);

// ============================================================================
// BACKWARD COMPATIBILITY
// ============================================================================

app.use('/health', (req, res, next) => {
  req.url = req.url.replace('/health', '/api/health');
  healthRoutes(req, res, next);
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);
  
  return parts.join(' ');
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function getDbStatusText(code) {
  const statuses = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized',
  };
  return statuses[code] || 'unknown';
}

// ============================================================================
// START SERVER
// ============================================================================

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📊 Status endpoint: http://localhost:${port}/api/status`);
  console.log(`🏓 Ping endpoint: http://localhost:${port}/ping`);
});