// // controllers/labController.js
// const { interpretLabText } = require('../services/openaiService');

// /**
//  * Process and interpret lab results
//  */
// exports.interpretLabResults = async (req, res) => {
//   try {
//     const { labText, testType } = req.body;
    
//     // Input validation
//     if (!labText) {
//       return res.status(400).json({ error: 'Lab text is required' });
//     }
    
//     if (!testType) {
//       return res.status(400).json({ error: 'Test type is required' });
//     }
    
//     // Get the interpretation from OpenAI
//     const interpretation = await interpretLabText(labText, testType);
    
//     // Return the interpretation
//     res.json({
//       testType,
//       interpretation,
//       timestamp: req.requestTimestamp || new Date().toISOString()
//     });
    
//   } catch (error) {
//     console.error('Error interpreting lab results:', error);
//     res.status(500).json({ 
//       error: 'Failed to interpret lab results',
//       message: error.message 
//     });
//   }
// };

// controllers/labController.js
const { interpretLabText } = require('../services/openaiService');

/**
 * Process and interpret lab results
 */
exports.interpretLabResults = async (req, res) => {
  try {
    const { labText, testType } = req.body;

    // Input validation
    if (!labText || typeof labText !== 'string' || !labText.trim()) {
      return res.status(400).json({ error: 'Valid labText is required.' });
    }

    if (!testType || typeof testType !== 'string' || !testType.trim()) {
      return res.status(400).json({ error: 'Valid testType is required.' });
    }

    // Get the interpretation from OpenAI
    let interpretation;
    try {
      interpretation = await interpretLabText(labText.trim(), testType.trim());
    } catch (aiError) {
      console.error('Error from OpenAI service:', aiError);
      return res.status(502).json({
        error: 'Interpretation service failed',
        message: aiError.message || 'Unknown error from AI service',
      });
    }

    // Success response
    res.status(200).json({
      testType,
      interpretation,
      timestamp: req.requestTimestamp || new Date().toISOString(),
    });

  } catch (error) {
    // Catch-all for unexpected issues
    console.error('Unexpected error interpreting lab results:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred'
    });
  }
};
