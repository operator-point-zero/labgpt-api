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

// const crypto = require('crypto');
// const { interpretLabText } = require('../services/openaiService');

// // Simple decrypt function
// function decrypt(encryptedData, iv, key) {
//   try {
//     const algorithm = 'aes-256-cbc';
//     const keyBuffer = Buffer.from(key, 'base64');
//     const ivBuffer = Buffer.from(iv, 'base64');
//     const encryptedBuffer = Buffer.from(encryptedData, 'base64');
    
//     const decipher = crypto.createDecipheriv(algorithm, keyBuffer, ivBuffer);
//     let decrypted = decipher.update(encryptedBuffer, null, 'utf8');
//     decrypted += decipher.final('utf8');
    
//     return decrypted;
//   } catch (error) {
//     console.error('Decryption details:', { encryptedData, iv, key });
//     throw new Error(`Decryption failed: ${error.message}`);
//   }
// }

// // Simple encrypt function
// function encrypt(text, key) {
//   const algorithm = 'aes-256-cbc';
//   const keyBuffer = Buffer.from(key, 'base64');
//   const iv = crypto.randomBytes(16);
  
//   const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
//   let encrypted = cipher.update(text, 'utf8');
//   encrypted = Buffer.concat([encrypted, cipher.final()]);
  
//   return {
//     data: encrypted.toString('base64'),
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

// const crypto = require('crypto');
// const { interpretLabText } = require('../services/openaiService');

// // Simple decrypt function using XOR
// function decrypt(encryptedData, key) {
//   try {
//     const encryptedBytes = Buffer.from(encryptedData, 'base64');
//     const keyBytes = Buffer.from(key, 'utf8');
//     const decrypted = [];
    
//     for (let i = 0; i < encryptedBytes.length; i++) {
//       decrypted.push(encryptedBytes[i] ^ keyBytes[i % keyBytes.length]);
//     }
    
//     return Buffer.from(decrypted).toString('utf8');
//   } catch (error) {
//     throw new Error(`Decryption failed: ${error.message}`);
//   }
// }

// // Simple encrypt function using XOR
// function encrypt(text, key) {
//   const textBytes = Buffer.from(text, 'utf8');
//   const keyBytes = Buffer.from(key, 'utf8');
//   const encrypted = [];
  
//   for (let i = 0; i < textBytes.length; i++) {
//     encrypted.push(textBytes[i] ^ keyBytes[i % keyBytes.length]);
//   }
  
//   return Buffer.from(encrypted).toString('base64');
// }

// /**
//  * Process and interpret lab results with encryption
//  */
// exports.interpretLabResults = async (req, res) => {
//   try {
//     const { encryptedLabText, encryptionKey, testType } = req.body;

//     // Input validation
//     if (!encryptedLabText || !encryptionKey) {
//       return res.status(400).json({ error: 'Missing encryption data' });
//     }

//     if (!testType || typeof testType !== 'string' || !testType.trim()) {
//       return res.status(400).json({ error: 'Valid testType is required.' });
//     }

//     // Decrypt the lab text
//     let labText;
//     try {
//       labText = decrypt(encryptedLabText, encryptionKey);
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
//       encryptedInterpretation: encryptedResponse,
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

// // XOR decrypt function
// function decrypt(encryptedData, key) {
//   try {
//     const encryptedBytes = Buffer.from(encryptedData, 'base64');
//     const keyBytes = Buffer.from(key, 'utf8');
//     const decrypted = [];

//     for (let i = 0; i < encryptedBytes.length; i++) {
//       decrypted.push(encryptedBytes[i] ^ keyBytes[i % keyBytes.length]);
//     }

//     return Buffer.from(decrypted).toString('utf8');
//   } catch (error) {
//     throw new Error(`Decryption failed: ${error.message}`);
//   }
// }

// // XOR encrypt function
// function encrypt(text, key) {
//   const textBytes = Buffer.from(text, 'utf8');
//   const keyBytes = Buffer.from(key, 'utf8');
//   const encrypted = [];

//   for (let i = 0; i < textBytes.length; i++) {
//     encrypted.push(textBytes[i] ^ keyBytes[i % keyBytes.length]);
//   }

//   return Buffer.from(encrypted).toString('base64');
// }

// /**
//  * Controller to process and interpret lab results
//  */
// exports.interpretLabResults = async (req, res) => {
//   try {
//     const { encryptedLabText, encryptionKey } = req.body;

//     if (!encryptedLabText || !encryptionKey) {
//       return res.status(400).json({ error: 'Missing encryption data' });
//     }

//     // Decrypt lab text
//     let labText;
//     try {
//       labText = decrypt(encryptedLabText, encryptionKey);
//     } catch (decryptError) {
//       console.error('Decryption error:', decryptError);
//       return res.status(400).json({ error: 'Failed to decrypt data' });
//     }

//     // Interpret lab text with OpenAI
//     let testType, interpretation;
//     try {
//       const result = await interpretLabText(labText.trim());
//       testType = result.testType;
//       interpretation = result.interpretation;
//     } catch (aiError) {
//       console.error('Error from OpenAI service:', aiError);
//       return res.status(502).json({
//         error: 'Interpretation service failed',
//         message: aiError.message || 'Unknown error from AI service',
//       });
//     }

//     // Encrypt the interpretation
//     const encryptedResponse = encrypt(interpretation, encryptionKey);

//     // Return response
//     res.status(200).json({
//       testType,
//       encryptedInterpretation: encryptedResponse,
//       timestamp: req.requestTimestamp || new Date().toISOString(),
//     });

//   } catch (error) {
//     console.error('Unexpected error interpreting lab results:', error);
//     res.status(500).json({
//       error: 'Internal server error',
//       message: error.message || 'An unexpected error occurred'
//     });
//   }
// };
// const crypto = require('crypto');
// const { interpretLabText } = require('../services/openaiService');

// // AES-256-GCM encryption function
// function encrypt(text, password) {
//   try {
//     // Generate a random salt and IV
//     const salt = crypto.randomBytes(32);
//     const iv = crypto.randomBytes(16);
    
//     // Derive key from password using PBKDF2
//     const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    
//     // Create cipher
//     const cipher = crypto.createCipher('aes-256-gcm', key);
//     cipher.setAAD(Buffer.from('lab-data')); // Additional authenticated data
    
//     // Encrypt
//     let encrypted = cipher.update(text, 'utf8');
//     encrypted = Buffer.concat([encrypted, cipher.final()]);
    
//     // Get authentication tag
//     const authTag = cipher.getAuthTag();
    
//     // Combine salt + iv + authTag + encrypted data
//     const result = Buffer.concat([salt, iv, authTag, encrypted]);
    
//     return result.toString('base64');
//   } catch (error) {
//     throw new Error(`Encryption failed: ${error.message}`);
//   }
// }

// // AES-256-GCM decryption function
// function decrypt(encryptedData, password) {
//   try {
//     const data = Buffer.from(encryptedData, 'base64');
    
//     // Extract components
//     const salt = data.subarray(0, 32);
//     const iv = data.subarray(32, 48);
//     const authTag = data.subarray(48, 64);
//     const encrypted = data.subarray(64);
    
//     // Derive key from password
//     const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    
//     // Create decipher
//     const decipher = crypto.createDecipher('aes-256-gcm', key);
//     decipher.setAAD(Buffer.from('lab-data'));
//     decipher.setAuthTag(authTag);
    
//     // Decrypt
//     let decrypted = decipher.update(encrypted);
//     decrypted = Buffer.concat([decrypted, decipher.final()]);
    
//     return decrypted.toString('utf8');
//   } catch (error) {
//     throw new Error(`Decryption failed: ${error.message}`);
//   }
// }

// /**
//  * Controller to process and interpret lab results
//  */
// exports.interpretLabResults = async (req, res) => {
//   try {
//     const { encryptedLabText, clientId } = req.body;
    
//     if (!encryptedLabText || !clientId) {
//       return res.status(400).json({ error: 'Missing required data' });
//     }
    
//     // Use clientId as password (in production, derive from secure session)
//     const password = clientId;
    
//     // Decrypt lab text
//     let labText;
//     try {
//       labText = decrypt(encryptedLabText, password);
//     } catch (decryptError) {
//       console.error('Decryption error:', decryptError);
//       return res.status(400).json({ error: 'Failed to decrypt data' });
//     }
    
//     // Interpret lab text with OpenAI
//     let testType, interpretation;
//     try {
//       const result = await interpretLabText(labText.trim());
//       testType = result.testType;
//       interpretation = result.interpretation;
//     } catch (aiError) {
//       console.error('Error from OpenAI service:', aiError);
//       return res.status(502).json({
//         error: 'Interpretation service failed',
//         message: aiError.message || 'Unknown error from AI service',
//       });
//     }
    
//     // Encrypt the interpretation
//     const encryptedResponse = encrypt(interpretation, password);
    
//     // Return response
//     res.status(200).json({
//       testType,
//       encryptedInterpretation: encryptedResponse,
//       timestamp: req.requestTimestamp || new Date().toISOString(),
//     });
    
//   } catch (error) {
//     console.error('Unexpected error interpreting lab results:', error);
//     res.status(500).json({
//       error: 'Internal server error',
//       message: error.message || 'An unexpected error occurred'
//     });
//   }
// };
const crypto = require('crypto');
const { interpretLabText } = require('../services/openaiService');

// AES-256-GCM encryption function
function encrypt(text, password) {
  try {
    // Generate a random salt and IV
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12); // GCM uses 12-byte IV
    
    // Derive key from password using PBKDF2
    const key = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');
    
    // Create cipher
    const cipher = crypto.createCipher('aes-256-gcm', key);
    cipher.setAAD(Buffer.from(''));
    
    // Encrypt
    let encrypted = cipher.update(text, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    // Combine salt + iv + authTag + encrypted data
    const result = Buffer.concat([salt, iv, authTag, encrypted]);
    
    return result.toString('base64');
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

// AES-256-GCM decryption function
function decrypt(encryptedData, password) {
  try {
    const data = Buffer.from(encryptedData, 'base64');
    
    // Extract components
    const salt = data.subarray(0, 16);
    const iv = data.subarray(16, 28);
    const authTag = data.subarray(28, 44);
    const encrypted = data.subarray(44);
    
    // Derive key from password
    const key = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');
    
    // Create decipher
    const decipher = crypto.createDecipher('aes-256-gcm', key);
    decipher.setAAD(Buffer.from(''));
    decipher.setAuthTag(authTag);
    
    // Decrypt
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Controller to process and interpret lab results
 */
exports.interpretLabResults = async (req, res) => {
  try {
    const { encryptedLabText, clientId } = req.body;
    
    if (!encryptedLabText || !clientId) {
      return res.status(400).json({ error: 'Missing required data' });
    }
    
    console.log('Received clientId:', clientId);
    console.log('Received encrypted data length:', encryptedLabText.length);
    
    // Decrypt lab text
    let labText;
    try {
      labText = decrypt(encryptedLabText, clientId);
      console.log('Decryption successful, text length:', labText.length);
    } catch (decryptError) {
      console.error('Decryption error:', decryptError.message);
      return res.status(400).json({ 
        error: 'Failed to decrypt data',
        details: decryptError.message 
      });
    }
    
    // Interpret lab text with OpenAI
    let testType, interpretation;
    try {
      const result = await interpretLabText(labText.trim());
      testType = result.testType;
      interpretation = result.interpretation;
    } catch (aiError) {
      console.error('Error from OpenAI service:', aiError);
      return res.status(502).json({
        error: 'Interpretation service failed',
        message: aiError.message || 'Unknown error from AI service',
      });
    }
    
    // Encrypt the interpretation
    const encryptedResponse = encrypt(interpretation, clientId);
    
    // Return response
    res.status(200).json({
      testType,
      encryptedInterpretation: encryptedResponse,
      timestamp: req.requestTimestamp || new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Unexpected error interpreting lab results:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred'
    });
  }
};