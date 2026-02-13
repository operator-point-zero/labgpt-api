const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Get today's date for log file naming
function getLogFileName() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `app-${year}-${month}-${day}.log`;
}

// Format log message with timestamp
function formatLogMessage(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const dataStr = data ? `\n${JSON.stringify(data, null, 2)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}\n`;
}

// Write to file
function writeToFile(level, message, data = null) {
  try {
    const logFile = path.join(logsDir, getLogFileName());
    const logMessage = formatLogMessage(level, message, data);
    fs.appendFileSync(logFile, logMessage, 'utf8');
  } catch (err) {
    console.error('Error writing to log file:', err.message);
  }
}

// Main logger object
const logger = {
  info: (message, data = null) => {
    console.log(`[INFO] ${message}`, data || '');
    writeToFile('info', message, data);
  },

  error: (message, data = null) => {
    console.error(`[ERROR] ${message}`, data || '');
    writeToFile('error', message, data);
  },

  warn: (message, data = null) => {
    console.warn(`[WARN] ${message}`, data || '');
    writeToFile('warn', message, data);
  },

  debug: (message, data = null) => {
    if (process.env.DEBUG === 'true') {
      console.log(`[DEBUG] ${message}`, data || '');
      writeToFile('debug', message, data);
    }
  },

  request: (method, url, statusCode, message = '') => {
    const logMsg = `${method} ${url} - ${statusCode} ${message}`;
    console.log(`[REQUEST] ${logMsg}`);
    writeToFile('request', logMsg);
  },

  validation: (type, details) => {
    const message = `[VALIDATION] ${type}`;
    console.log(message, details);
    writeToFile('validation', message, details);
  },

  // Get log file path for access
  getLogFilePath: () => path.join(logsDir, getLogFileName()),

  // Get log file contents
  getLogContents: () => {
    try {
      const logFile = logger.getLogFilePath();
      if (fs.existsSync(logFile)) {
        return fs.readFileSync(logFile, 'utf8');
      }
      return 'No logs yet for today.';
    } catch (err) {
      return `Error reading log file: ${err.message}`;
    }
  },

  // Get all log files
  getAllLogFiles: () => {
    try {
      if (!fs.existsSync(logsDir)) {
        return [];
      }
      return fs.readdirSync(logsDir)
        .filter(file => file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(logsDir, file),
          created: fs.statSync(path.join(logsDir, file)).mtime
        }))
        .sort((a, b) => b.created - a.created);
    } catch (err) {
      return [];
    }
  },

  // Get specific log file contents
  getLogFile: (filename) => {
    try {
      const logFile = path.join(logsDir, filename);
      // Security: ensure the path is within logsDir
      if (!logFile.startsWith(logsDir)) {
        throw new Error('Invalid log file path');
      }
      if (fs.existsSync(logFile)) {
        return fs.readFileSync(logFile, 'utf8');
      }
      return `Log file not found: ${filename}`;
    } catch (err) {
      return `Error reading log file: ${err.message}`;
    }
  },

  // Get last N lines from log file
  getLastLines: (n = 100) => {
    try {
      const logFile = logger.getLogFilePath();
      if (!fs.existsSync(logFile)) {
        return 'No logs yet for today.';
      }
      const content = fs.readFileSync(logFile, 'utf8');
      const lines = content.split('\n');
      return lines.slice(-n).join('\n');
    } catch (err) {
      return `Error reading log file: ${err.message}`;
    }
  },

  // Clear old logs (keep last N days)
  clearOldLogs: (daysToKeep = 7) => {
    try {
      if (!fs.existsSync(logsDir)) {
        return;
      }
      const now = Date.now();
      const files = fs.readdirSync(logsDir);
      
      files.forEach(file => {
        const filePath = path.join(logsDir, file);
        const stat = fs.statSync(filePath);
        const fileAge = now - stat.mtime.getTime();
        const daysOld = fileAge / (1000 * 60 * 60 * 24);
        
        if (daysOld > daysToKeep) {
          fs.unlinkSync(filePath);
          console.log(`Deleted old log file: ${file}`);
        }
      });
    } catch (err) {
      console.error('Error clearing old logs:', err.message);
    }
  }
};

module.exports = logger;
