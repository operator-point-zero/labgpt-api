# Server Logging Guide

## Overview
The server now has comprehensive file logging. All logs are automatically saved to files and can be accessed via API endpoints or by reading files directly.

## Log Files Location
- **Path**: `./logs/` directory in the project root
- **File naming**: `app-YYYY-MM-DD.log` (creates a new file each day)
- **Format**: `[ISO-TIMESTAMP] [LEVEL] message`

## How to Access Logs

### 1. Read Logs via API Endpoints

#### Get today's full log file:
```bash
curl http://localhost:3000/api/logs
```

#### Get last N lines (default 100):
```bash
curl http://localhost:3000/api/logs/tail/50
```
Returns the last 50 lines of today's log.

#### List all log files:
```bash
curl http://localhost:3000/api/logs/files
```
Shows all available log files with dates and sizes.

#### Get a specific log file:
```bash
curl http://localhost:3000/api/logs/file/app-2026-02-13.log
```

### 2. Read Logs Directly from File System

Navigate to the project and check:
```bash
cd /Users/mac/Desktop/Projects/LabGPT\ backend/labgpt-api
ls -la logs/
cat logs/app-2026-02-13.log
```

Or use `tail` to follow logs in real-time:
```bash
tail -f logs/app-2026-02-13.log
```

## Log Levels

The logs contain different levels of messages:

| Level | Color | Usage |
|-------|-------|-------|
| INFO | Blue | General information |
| ERROR | Red | Errors and exceptions |
| WARN | Yellow | Warnings |
| DEBUG | Gray | Debug info (only if DEBUG=true) |
| REQUEST | Cyan | HTTP request logging |
| VALIDATION | Green | Input validation details |

## What Gets Logged

### Automatically Logged:
- ✅ All HTTP requests (method, URL, status code, duration)
- ✅ All errors and exceptions
- ✅ Input validation failures
- ✅ Authentication issues
- ✅ Database operations
- ✅ External API calls (OpenAI)

### Example Log Output:
```
[2026-02-13T10:15:23.456Z] [INFO] Server started on port 3000
[2026-02-13T10:15:24.123Z] [REQUEST] POST /api/labs - 400 125ms
[2026-02-13T10:15:24.125Z] [VALIDATION] /api/labs validation failed
{
  "error": "user_id is required and must be a string",
  "received": "undefined"
}
[2026-02-13T10:15:25.789Z] [ERROR] Database connection error
{
  "message": "Connection refused",
  "code": "ECONNREFUSED"
}
```

## Using the Logger in Code

The logger is already integrated throughout the app, but if you need to log in a specific place:

```javascript
const logger = require('./services/logger');

// Log different levels
logger.info('User creation successful', { userId: '123' });
logger.error('Failed to process request', { error: 'Timeout' });
logger.warn('High memory usage detected', { usage: '85%' });
logger.debug('Debug info', { value: 'test' });

// Log requests
logger.request('POST', '/api/labs', 400, 'Validation failed');

// Log validation failures
logger.validation('Missing field', { field: 'user_id', received: null });
```

## Finding Your Specific Error

To find where your "400 error" is coming from:

### Option 1: Check the API endpoint
```bash
curl http://localhost:3000/api/logs/tail/200
```
Look for lines containing:
- `[VALIDATION ERROR]`
- `[VALIDATION FAILED]`
- `user_id`
- `400`

### Option 2: Tail the log file in terminal
```bash
tail -f logs/app-$(date +%Y-%m-%d).log | grep -i "validation\|error\|400"
```

### Option 3: Search for specific errors
```bash
grep "user_id\|encryptedLabText\|clientId" logs/app-2026-02-13.log
```

## Log Retention

- Logs are created daily with a new file each day
- Old logs older than 7 days can be cleaned up (manually or via cleanup function)
- Each log file is typically 1-10 MB depending on traffic

## Quick Troubleshooting

### Q: No logs appearing?
**A:** Check that:
1. The `logs/` directory exists: `ls -la logs/`
2. The server is running: `ps aux | grep node`
3. Check file permissions: `ls -l logs/app-*.log`

### Q: Logs are too verbose?
**A:** Set `DEBUG=false` in your `.env` file to reduce debug output.

### Q: Want to see logs in real-time while testing?
**A:** Run these in separate terminals:
```bash
# Terminal 1 - Run server
npm start

# Terminal 2 - Follow logs
tail -f logs/app-$(date +%Y-%m-%d).log
```

### Q: Want to clear old logs?
**A:** The logger automatically cleans logs older than 7 days on startup. You can also manually delete:
```bash
rm logs/app-2026-01-*.log
```

---

## Getting Help

When reporting an error, include:
1. The request that failed
2. The relevant log lines from `/api/logs/tail/50`
3. The exact 400 error message from the response
4. Your Flutter/client code snippet

This helps debug issues quickly!
