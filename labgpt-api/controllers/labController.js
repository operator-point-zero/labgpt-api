const crypto = require('crypto');
const { interpretLabText } = require('../services/openaiService'); // Assuming this path is correct

// AES-256-CBC + HMAC encryption
function encrypt(text, password) {
  try {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(16); // IV is generated here

    // Derive keys using PBKDF2
    const encKey = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');
    const hmacKey = crypto.pbkdf2Sync(password + 'hmac', salt, 10000, 32, 'sha256');

    // Encrypt using AES-256-CBC
    // MODIFIED LINE: Use createCipheriv and pass the iv
    const cipher = crypto.createCipheriv('aes-256-cbc', encKey, iv);
    cipher.setAutoPadding(true); // PKCS7 padding by default with true
    let encrypted = cipher.update(text, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // Create HMAC for authentication
    const hmac = crypto.createHmac('sha256', hmacKey);
    hmac.update(salt);
    hmac.update(iv);
    hmac.update(encrypted);
    const authTag = hmac.digest();

    // Combine: salt(16) + iv(16) + authTag(32) + encrypted
    const result = Buffer.concat([salt, iv, authTag, encrypted]);

    return result.toString('base64');
  } catch (error) {
    console.error('Encryption failed:', error); // Added console.error for better logging
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

// AES-256-CBC + HMAC decryption
function decrypt(encryptedData, password) {
  try {
    const data = Buffer.from(encryptedData, 'base64');

    if (data.length < 64) { // 16 (salt) + 16 (iv) + 32 (authTag)
      throw new Error('Invalid encrypted data length');
    }

    // Extract components
    const salt = data.subarray(0, 16);
    const iv = data.subarray(16, 32); // IV is extracted here
    const authTag = data.subarray(32, 64);
    const encrypted = data.subarray(64);

    // Derive keys
    const encKey = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');
    const hmacKey = crypto.pbkdf2Sync(password + 'hmac', salt, 10000, 32, 'sha256');

    // Verify HMAC
    const hmac = crypto.createHmac('sha256', hmacKey);
    hmac.update(salt);
    hmac.update(iv);
    hmac.update(encrypted);
    const expectedTag = hmac.digest();

    if (!crypto.timingSafeEqual(authTag, expectedTag)) {
      throw new Error('Authentication failed - data may be tampered');
    }

    // Decrypt
    // MODIFIED LINE: Use createDecipheriv and pass the iv
    const decipher = crypto.createDecipheriv('aes-256-cbc', encKey, iv);
    decipher.setAutoPadding(true); // Ensure padding is handled
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption failed:', error); // Added console.error for better logging
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Controller to process and interpret lab results
 */
exports.interpretLabResults = async (req, res) => {
  try {
    const { encryptedLabText, clientId, testType: clientReportedTestType } = req.body; // Added testType from client

    if (!encryptedLabText || !clientId) {
      return res.status(400).json({ error: 'Missing required data (encryptedLabText or clientId)' });
    }

    console.log(`[${new Date().toISOString()}] Received request for clientId: ${clientId.substring(0, 8)}...`);
    console.log(`[${new Date().toISOString()}] Received encrypted data length: ${encryptedLabText.length}`);
    if (clientReportedTestType) {
        console.log(`[${new Date().toISOString()}] Client reported test type: ${clientReportedTestType}`);
    }


    // Decrypt lab text
    let labText;
    try {
      labText = decrypt(encryptedLabText, clientId);
      console.log(`[${new Date().toISOString()}] Decryption successful for clientId: ${clientId.substring(0, 8)}..., text length: ${labText.length}`);
    } catch (decryptError) {
      console.error(`[${new Date().toISOString()}] Decryption error for clientId: ${clientId.substring(0, 8)}...: ${decryptError.message}`);
      return res.status(400).json({
        error: 'Failed to decrypt data',
        details: decryptError.message
      });
    }

    // Interpret lab text with OpenAI
    let actualTestType, interpretation;
    try {
      // You might want to pass clientReportedTestType to interpretLabText if it's useful
      const result = await interpretLabText(labText.trim());
      actualTestType = result.testType; // This is the type detected by interpretLabText
      interpretation = result.interpretation;
      console.log(`[${new Date().toISOString()}] Interpretation successful for clientId: ${clientId.substring(0, 8)}..., detected test type: ${actualTestType}`);
    } catch (aiError) {
      console.error(`[${new Date().toISOString()}] Error from OpenAI service for clientId: ${clientId.substring(0, 8)}...:`, aiError);
      return res.status(502).json({
        error: 'Interpretation service failed',
        message: aiError.message || 'Unknown error from AI service',
      });
    }

    // Encrypt the interpretation
    const encryptedResponse = encrypt(interpretation, clientId);
    console.log(`[${new Date().toISOString()}] Response encrypted for clientId: ${clientId.substring(0, 8)}...`);


    // Return response
    res.status(200).json({
      testType: actualTestType, // Send back the type determined by the backend
      encryptedInterpretation: encryptedResponse,
      timestamp: req.requestTimestamp || new Date().toISOString(),
    });

  } catch (error) {
    const reqClientId = req.body && req.body.clientId ? req.body.clientId.substring(0,8)+'...' : 'unknown';
    console.error(`[${new Date().toISOString()}] Unexpected error interpreting lab results for clientId: ${reqClientId}:`, error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred'
    });
  }
};