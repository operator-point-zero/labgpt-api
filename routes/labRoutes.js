// routes/labRoutes.js
const express = require('express');
const router = express.Router();
const labController = require('../controllers/labController');

// Route for interpreting lab results
router.post('/', labController.interpretLabResults);

module.exports = router;