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
// const { interpretLabText } = require('../services/openaiService');

// /**
//  * Process and interpret lab results
//  */
// exports.interpretLabResults = async (req, res) => {
//   try {
//     const { labText, testType } = req.body;

//     // Input validation
//     if (!labText || typeof labText !== 'string' || !labText.trim()) {
//       return res.status(400).json({ error: 'Valid labText is required.' });
//     }

//     if (!testType || typeof testType !== 'string' || !testType.trim()) {
//       return res.status(400).json({ error: 'Valid testType is required.' });
//     }

//     // Get the interpretation from OpenAI
//     let interpretation;
//     try {
//       interpretation = await interpretLabText(labText.trim(), testType.trim());
//     } catch (aiError) {
//       console.error('Error from OpenAI service:', aiError);
//       return res.status(502).json({
//         error: 'Interpretation service failed',
//         message: aiError.message || 'Unknown error from AI service',
//       });
//     }

//     // Success response
//     res.status(200).json({
//       testType,
//       interpretation,
//       timestamp: req.requestTimestamp || new Date().toISOString(),
//     });

//   } catch (error) {
//     // Catch-all for unexpected issues
//     console.error('Unexpected error interpreting lab results:', error);
//     res.status(500).json({ 
//       error: 'Internal server error',
//       message: error.message || 'An unexpected error occurred'
//     });
//   }
// };
// const crypto = require('crypto');
// const { interpretLabText } = require('../services/openaiService');

// // Simple decrypt function
// function decrypt(encryptedData, iv, key) {
//   const algorithm = 'aes-256-cbc';
//   const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), Buffer.from(iv, 'base64'));
  
//   let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
//   decrypted += decipher.final('utf8');
  
//   return decrypted;
// }

// // Simple encrypt function
// function encrypt(text, key) {
//   const algorithm = 'aes-256-cbc';
//   const iv = crypto.randomBytes(16);
//   const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
  
//   let encrypted = cipher.update(text, 'utf8', 'base64');
//   encrypted += cipher.final('base64');
  
//   return {
//     data: encrypted,
//     iv: iv.toString('base64')
//   };
// }

// /**
//  * Process and interpret lab results with encryption
//  */
// exports.interpretLabResults = async (req, res) => {
//   try {
//     const { encryptedLabText, iv, encryptionKey, testType } = req.body;

//     // Input validation
//     if (!encryptedLabText || !iv || !encryptionKey) {
//       return res.status(400).json({ error: 'Missing encryption data' });
//     }

//     if (!testType || typeof testType !== 'string' || !testType.trim()) {
//       return res.status(400).json({ error: 'Valid testType is required.' });
//     }

//     // Decrypt the lab text
//     let labText;
//     try {
//       labText = decrypt(encryptedLabText, iv, encryptionKey);
//     } catch (decryptError) {
//       console.error('Decryption error:', decryptError);
//       return res.status(400).json({ error: 'Failed to decrypt data' });
//     }

//     // Get the interpretation from OpenAI
//     let interpretation;
//     try {
//       interpretation = await interpretLabText(labText.trim(), testType.trim());
//     } catch (aiError) {
//       console.error('Error from OpenAI service:', aiError);
//       return res.status(502).json({
//         error: 'Interpretation service failed',
//         message: aiError.message || 'Unknown error from AI service',
//       });
//     }

//     // Encrypt the response
//     const encryptedResponse = encrypt(interpretation, encryptionKey);

//     // Success response
//     res.status(200).json({
//       testType,
//       encryptedInterpretation: encryptedResponse.data,
//       iv: encryptedResponse.iv,
//       timestamp: req.requestTimestamp || new Date().toISOString(),
//     });

//   } catch (error) {
//     // Catch-all for unexpected issues
//     console.error('Unexpected error interpreting lab results:', error);
//     res.status(500).json({
//       error: 'Internal server error',
//       message: error.message || 'An unexpected error occurred'
//     });
//   }
// };

const crypto = require('crypto');
const { interpretLabText } = require('../services/openaiService');

// Simple decrypt function
function decrypt(encryptedData, iv, key) {
  try {
    const algorithm = 'aes-256-cbc';
    const keyBuffer = Buffer.from(key, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');
    const encryptedBuffer = Buffer.from(encryptedData, 'base64');
    
    const decipher = crypto.createDecipheriv(algorithm, keyBuffer, ivBuffer);
    let decrypted = decipher.update(encryptedBuffer, null, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption details:', { encryptedData, iv, key });
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

// Simple encrypt function
function encrypt(text, key) {
  const algorithm = 'aes-256-cbc';
  const keyBuffer = Buffer.from(key, 'base64');
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
  let encrypted = cipher.update(text, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  return {
    data: encrypted.toString('base64'),
    iv: iv.toString('base64')
  };
}

/**
 * Process and interpret lab results with encryption
 */
exports.interpretLabResults = async (req, res) => {
  try {
    const { encryptedLabText, iv, encryptionKey, testType } = req.body;

    // Input validation
    if (!encryptedLabText || !iv || !encryptionKey) {
      return res.status(400).json({ error: 'Missing encryption data' });
    }

    if (!testType || typeof testType !== 'string' || !testType.trim()) {
      return res.status(400).json({ error: 'Valid testType is required.' });
    }

    // Decrypt the lab text
    let labText;
    try {
      labText = decrypt(encryptedLabText, iv, encryptionKey);
    } catch (decryptError) {
      console.error('Decryption error:', decryptError);
      return res.status(400).json({ error: 'Failed to decrypt data' });
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

    // Encrypt the response
    const encryptedResponse = encrypt(interpretation, encryptionKey);

    // Success response
    res.status(200).json({
      testType,
      encryptedInterpretation: encryptedResponse.data,
      iv: encryptedResponse.iv,
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