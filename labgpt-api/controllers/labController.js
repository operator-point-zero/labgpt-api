// controllers/labController.js
const { interpretLabText } = require('../services/openaiService');

/**
 * Process and interpret lab results
 */
exports.interpretLabResults = async (req, res) => {
  try {
    const { labText, testType } = req.body;
    
    // Input validation
    if (!labText) {
      return res.status(400).json({ error: 'Lab text is required' });
    }
    
    if (!testType) {
      return res.status(400).json({ error: 'Test type is required' });
    }
    
    // Get the interpretation from OpenAI
    const interpretation = await interpretLabText(labText, testType);
    
    // Return the interpretation
    res.json({
      testType,
      interpretation,
      timestamp: req.requestTimestamp || new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error interpreting lab results:', error);
    res.status(500).json({ 
      error: 'Failed to interpret lab results',
      message: error.message 
    });
  }
};