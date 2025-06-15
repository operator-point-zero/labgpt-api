

const crypto = require('crypto');
const { interpretLabText } = require('../services/openaiService');
const Test = require('../models/test'); // Import the Test model
const User = require('../models/user'); // Import the User model

// AES-256-CBC + HMAC encryption
function encrypt(text, password) {
  try {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(16);

    const encKey = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');
    const hmacKey = crypto.pbkdf2Sync(password + 'hmac', salt, 10000, 32, 'sha256');

    const cipher = crypto.createCipheriv('aes-256-cbc', encKey, iv);
    cipher.setAutoPadding(true);
    let encrypted = cipher.update(text, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    const hmac = crypto.createHmac('sha256', hmacKey);
    hmac.update(salt);
    hmac.update(iv);
    hmac.update(encrypted);
    const authTag = hmac.digest();

    const result = Buffer.concat([salt, iv, authTag, encrypted]);
    return result.toString('base64');
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

// AES-256-CBC + HMAC decryption
function decrypt(encryptedData, password) {
  try {
    const data = Buffer.from(encryptedData, 'base64');

    if (data.length < 64) {
      throw new Error('Invalid encrypted data length');
    }

    const salt = data.subarray(0, 16);
    const iv = data.subarray(16, 32);
    const authTag = data.subarray(32, 64);
    const encrypted = data.subarray(64);

    const encKey = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');
    const hmacKey = crypto.pbkdf2Sync(password + 'hmac', salt, 10000, 32, 'sha256');

    const hmac = crypto.createHmac('sha256', hmacKey);
    hmac.update(salt);
    hmac.update(iv);
    hmac.update(encrypted);
    const expectedTag = hmac.digest();

    if (!crypto.timingSafeEqual(authTag, expectedTag)) {
      throw new Error('Authentication failed - data may be tampered');
    }

    const decipher = crypto.createDecipheriv('aes-256-cbc', encKey, iv);
    decipher.setAutoPadding(true);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Controller to process and interpret lab results
 */
exports.interpretLabResults = async (req, res) => {
  try {
    const { encryptedLabText, clientId, testType: clientReportedTestType, user_id } = req.body;

    if (!encryptedLabText || !clientId || !user_id) {
      return res.status(400).json({ error: 'Missing required data (encryptedLabText, clientId, or user_id)' });
    }

    console.log(`[${new Date().toISOString()}] Received request for clientId: ${clientId.substring(0, 8)}...`);
    console.log(`[${new Date().toISOString()}] Received request for user_id: ${user_id}`);
    console.log(`[${new Date().toISOString()}] Received encrypted data length: ${encryptedLabText.length}`);
    if (clientReportedTestType) {
      console.log(`[${new Date().toISOString()}] Client reported test type: ${clientReportedTestType}`);
    }

    // Check user exists and has remaining interpretations
    let user;
    try {
      user = await User.findById(user_id);
      if (!user) {
        console.log(`[${new Date().toISOString()}] User not found: ${user_id}`);
        return res.status(404).json({
          error: 'User not found',
          message: 'The specified user does not exist'
        });
      }

      // Check if user has remaining interpretations
      if (user.singleLabInterpretationsRemaining <= 0) {
        console.log(`[${new Date().toISOString()}] User has no remaining interpretations: ${user_id}`);
        return res.status(403).json({
          error: 'No interpretations remaining',
          message: 'You have no remaining lab interpretations. Please upgrade your plan or purchase more credits.',
          remainingInterpretations: user.singleLabInterpretationsRemaining
        });
      }

      console.log(`[${new Date().toISOString()}] User ${user_id} has ${user.singleLabInterpretationsRemaining} interpretations remaining`);
    } catch (userError) {
      console.error(`[${new Date().toISOString()}] Error checking user:`, userError);
      return res.status(500).json({
        error: 'User verification failed',
        message: 'Failed to verify user credentials'
      });
    }

    // Decrypt lab text
    let labText;
    try {
      labText = decrypt(encryptedLabText, clientId);
      console.log(`[${new Date().toISOString()}] Decryption successful, text length: ${labText.length}`);
    } catch (decryptError) {
      console.error(`[${new Date().toISOString()}] Decryption error: ${decryptError.message}`);
      return res.status(400).json({
        error: 'Failed to decrypt data',
        details: decryptError.message
      });
    }

    // Interpret lab text with OpenAI
    let actualTestType, interpretation, isValidTest;
    try {
      const result = await interpretLabText(labText.trim());
      actualTestType = result.testType;
      interpretation = result.interpretation;
      isValidTest = result.isValidTest;
      
      console.log(`[${new Date().toISOString()}] Analysis completed. Detected test type: ${actualTestType}, isValidTest: ${isValidTest}`);
    } catch (aiError) {
      console.error(`[${new Date().toISOString()}] Error from OpenAI service:`, aiError);
      return res.status(502).json({
        error: 'Interpretation service failed',
        message: aiError.message || 'Unknown error from AI service',
      });
    }

    // Check if this is a valid lab test
    if (!isValidTest) {
      console.log(`[${new Date().toISOString()}] Invalid test detected`);
      return res.status(422).json({
        error: 'Invalid lab test',
        message: 'The uploaded content does not appear to be a valid lab test result. Please upload a clear image of your lab test results.',
        testType: 'Unknown',
        isValidTest: false,
        explanation: interpretation,
        timestamp: req.requestTimestamp || new Date().toISOString(),
      });
    }

    // Decrypt and process successful - now decrement user's remaining interpretations
    try {
      const updatedUser = await User.findByIdAndUpdate(
        user_id,
        { 
          $inc: { singleLabInterpretationsRemaining: -1 },
          updatedAt: new Date()
        },
        { new: true }
      );
      
      if (!updatedUser) {
        console.error(`[${new Date().toISOString()}] Failed to update user ${user_id} - user not found during update`);
        // Continue with the process even if user update fails, but log the error
      } else {
        console.log(`[${new Date().toISOString()}] User ${user_id} interpretations decremented. Remaining: ${updatedUser.singleLabInterpretationsRemaining}`);
      }
    } catch (updateError) {
      console.error(`[${new Date().toISOString()}] Failed to update user interpretations:`, updateError);
      // Continue with the process even if user update fails, but log the error
      // You might want to implement a retry mechanism or queue this for later processing
    }

    // Encrypt the interpretation (only for valid tests)
    const encryptedResponse = encrypt(interpretation, clientId);
    console.log(`[${new Date().toISOString()}] Response encrypted`);

    // Save test type and timestamp to DB (without clientId or userId)
    try {
      await Test.create({
        testType: actualTestType,
        timestamp: new Date()
      });
      console.log(`[${new Date().toISOString()}] Test saved: ${actualTestType}`);
    } catch (dbError) {
      console.error(`[${new Date().toISOString()}] Failed to save test to DB:`, dbError);
    }

    // Return response for valid tests
    res.status(200).json({
      testType: actualTestType,
      encryptedInterpretation: encryptedResponse,
      isValidTest: true,
      remainingInterpretations: user.singleLabInterpretationsRemaining - 1, // Show the updated count
      timestamp: req.requestTimestamp || new Date().toISOString(),
    });

  } catch (error) {
    const reqClientId = req.body && req.body.clientId ? req.body.clientId.substring(0,8)+'...' : 'unknown';
    const reqUserId = req.body && req.body.user_id ? req.body.user_id : 'unknown';
    console.error(`[${new Date().toISOString()}] Unexpected error interpreting lab results for clientId: ${reqClientId}, user_id: ${reqUserId}:`, error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred'
    });
  }
};