// server.js
require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Import middleware
const middleware = require('./middleware');

// Import routes
const labRoutes = require('./routes/labRoutes');
const healthRoutes = require('./routes/healthRoutes');

// Apply middleware
middleware(app);

// Use routes
app.use('/api/labs', labRoutes);
app.use('/api/health', healthRoutes);

app.get('/', (req, res) => {
  res.send('🧪 LabGPT API is up and running!');
});

// For backward compatibility
app.use('/interpret', (req, res) => {
  // Forward to the new endpoint
  req.url = '/';
  labRoutes(req, res);
});

app.use('/health', (req, res) => {
  // Forward to the new endpoint
  req.url = '/';
  healthRoutes(req, res);
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});