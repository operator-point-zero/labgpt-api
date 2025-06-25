

// const crypto = require('crypto');
// const { interpretLabText } = require('../services/openaiService');
// const Test = require('../models/test'); // Import the Test model
// const User = require('../models/user'); // Import the User model

// // AES-256-CBC + HMAC encryption
// function encrypt(text, password) {
//   try {
//     const salt = crypto.randomBytes(16);
//     const iv = crypto.randomBytes(16);

//     const encKey = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');
//     const hmacKey = crypto.pbkdf2Sync(password + 'hmac', salt, 10000, 32, 'sha256');

//     const cipher = crypto.createCipheriv('aes-256-cbc', encKey, iv);
//     cipher.setAutoPadding(true);
//     let encrypted = cipher.update(text, 'utf8');
//     encrypted = Buffer.concat([encrypted, cipher.final()]);

//     const hmac = crypto.createHmac('sha256', hmacKey);
//     hmac.update(salt);
//     hmac.update(iv);
//     hmac.update(encrypted);
//     const authTag = hmac.digest();

//     const result = Buffer.concat([salt, iv, authTag, encrypted]);
//     return result.toString('base64');
//   } catch (error) {
//     console.error('Encryption failed:', error);
//     throw new Error(`Encryption failed: ${error.message}`);
//   }
// }

// // AES-256-CBC + HMAC decryption
// function decrypt(encryptedData, password) {
//   try {
//     const data = Buffer.from(encryptedData, 'base64');

//     if (data.length < 64) {
//       throw new Error('Invalid encrypted data length');
//     }

//     const salt = data.subarray(0, 16);
//     const iv = data.subarray(16, 32);
//     const authTag = data.subarray(32, 64);
//     const encrypted = data.subarray(64);

//     const encKey = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');
//     const hmacKey = crypto.pbkdf2Sync(password + 'hmac', salt, 10000, 32, 'sha256');

//     const hmac = crypto.createHmac('sha256', hmacKey);
//     hmac.update(salt);
//     hmac.update(iv);
//     hmac.update(encrypted);
//     const expectedTag = hmac.digest();

//     if (!crypto.timingSafeEqual(authTag, expectedTag)) {
//       throw new Error('Authentication failed - data may be tampered');
//     }

//     const decipher = crypto.createDecipheriv('aes-256-cbc', encKey, iv);
//     decipher.setAutoPadding(true);
//     let decrypted = decipher.update(encrypted);
//     decrypted = Buffer.concat([decrypted, decipher.final()]);

//     return decrypted.toString('utf8');
//   } catch (error) {
//     console.error('Decryption failed:', error);
//     throw new Error(`Decryption failed: ${error.message}`);
//   }
// }

// /**
//  * Controller to process and interpret lab results
//  */
// exports.interpretLabResults = async (req, res) => {
//   try {
//     const { encryptedLabText, clientId, testType: clientReportedTestType, user_id } = req.body;

//     if (!encryptedLabText || !clientId || !user_id) {
//       return res.status(400).json({ error: 'Missing required data (encryptedLabText, clientId, or user_id)' });
//     }

//     console.log(`[${new Date().toISOString()}] Received request for clientId: ${clientId.substring(0, 8)}...`);
//     console.log(`[${new Date().toISOString()}] Received request for user_id: ${user_id}`);
//     console.log(`[${new Date().toISOString()}] Received encrypted data length: ${encryptedLabText.length}`);
//     if (clientReportedTestType) {
//       console.log(`[${new Date().toISOString()}] Client reported test type: ${clientReportedTestType}`);
//     }

//     // Check user exists and has remaining interpretations
//     let user;
//     try {
//       user = await User.findById(user_id);
//       if (!user) {
//         console.log(`[${new Date().toISOString()}] User not found: ${user_id}`);
//         return res.status(404).json({
//           error: 'User not found',
//           message: 'The specified user does not exist'
//         });
//       }

//       // Check if user has remaining interpretations
//       if (user.singleLabInterpretationsRemaining <= 0) {
//         console.log(`[${new Date().toISOString()}] User has no remaining interpretations: ${user_id}`);
//         return res.status(403).json({
//           error: 'No interpretations remaining',
//           message: 'You have no remaining lab interpretations. Please upgrade your plan or purchase more credits.',
//           remainingInterpretations: user.singleLabInterpretationsRemaining
//         });
//       }

//       console.log(`[${new Date().toISOString()}] User ${user_id} has ${user.singleLabInterpretationsRemaining} interpretations remaining`);
//     } catch (userError) {
//       console.error(`[${new Date().toISOString()}] Error checking user:`, userError);
//       return res.status(500).json({
//         error: 'User verification failed',
//         message: 'Failed to verify user credentials'
//       });
//     }

//     // Decrypt lab text
//     let labText;
//     try {
//       labText = decrypt(encryptedLabText, clientId);
//       console.log(`[${new Date().toISOString()}] Decryption successful, text length: ${labText.length}`);
//     } catch (decryptError) {
//       console.error(`[${new Date().toISOString()}] Decryption error: ${decryptError.message}`);
//       return res.status(400).json({
//         error: 'Failed to decrypt data',
//         details: decryptError.message
//       });
//     }

//     // Interpret lab text with OpenAI
//     let actualTestType, interpretation, isValidTest;
//     try {
//       const result = await interpretLabText(labText.trim());
//       actualTestType = result.testType;
//       interpretation = result.interpretation;
//       isValidTest = result.isValidTest;
      
//       console.log(`[${new Date().toISOString()}] Analysis completed. Detected test type: ${actualTestType}, isValidTest: ${isValidTest}`);
//     } catch (aiError) {
//       console.error(`[${new Date().toISOString()}] Error from OpenAI service:`, aiError);
//       return res.status(502).json({
//         error: 'Interpretation service failed',
//         message: aiError.message || 'Unknown error from AI service',
//       });
//     }

//     // Check if this is a valid lab test
//     if (!isValidTest) {
//       console.log(`[${new Date().toISOString()}] Invalid test detected`);
//       return res.status(422).json({
//         error: 'Invalid lab test',
//         message: 'The uploaded content does not appear to be a valid lab test result. Please upload a clear image of your lab test results.',
//         testType: 'Unknown',
//         isValidTest: false,
//         explanation: interpretation,
//         timestamp: req.requestTimestamp || new Date().toISOString(),
//       });
//     }

//     // Decrypt and process successful - now decrement user's remaining interpretations
//     try {
//       const updatedUser = await User.findByIdAndUpdate(
//         user_id,
//         { 
//           $inc: { singleLabInterpretationsRemaining: -1 },
//           updatedAt: new Date()
//         },
//         { new: true }
//       );
      
//       if (!updatedUser) {
//         console.error(`[${new Date().toISOString()}] Failed to update user ${user_id} - user not found during update`);
//         // Continue with the process even if user update fails, but log the error
//       } else {
//         console.log(`[${new Date().toISOString()}] User ${user_id} interpretations decremented. Remaining: ${updatedUser.singleLabInterpretationsRemaining}`);
//       }
//     } catch (updateError) {
//       console.error(`[${new Date().toISOString()}] Failed to update user interpretations:`, updateError);
//       // Continue with the process even if user update fails, but log the error
//       // You might want to implement a retry mechanism or queue this for later processing
//     }

//     // Encrypt the interpretation (only for valid tests)
//     const encryptedResponse = encrypt(interpretation, clientId);
//     console.log(`[${new Date().toISOString()}] Response encrypted`);

//     // Save test type and timestamp to DB (without clientId or userId)
//     try {
//       await Test.create({
//         testType: actualTestType,
//         timestamp: new Date()
//       });
//       console.log(`[${new Date().toISOString()}] Test saved: ${actualTestType}`);
//     } catch (dbError) {
//       console.error(`[${new Date().toISOString()}] Failed to save test to DB:`, dbError);
//     }

//     // Return response for valid tests
//     res.status(200).json({
//       testType: actualTestType,
//       encryptedInterpretation: encryptedResponse,
//       isValidTest: true,
//       remainingInterpretations: user.singleLabInterpretationsRemaining - 1, // Show the updated count
//       timestamp: req.requestTimestamp || new Date().toISOString(),
//     });

//   } catch (error) {
//     const reqClientId = req.body && req.body.clientId ? req.body.clientId.substring(0,8)+'...' : 'unknown';
//     const reqUserId = req.body && req.body.user_id ? req.body.user_id : 'unknown';
//     console.error(`[${new Date().toISOString()}] Unexpected error interpreting lab results for clientId: ${reqClientId}, user_id: ${reqUserId}:`, error);
//     res.status(500).json({
//       error: 'Internal server error',
//       message: error.message || 'An unexpected error occurred'
//     });
//   }
// };

// const crypto = require('crypto');
// const { interpretLabText } = require('../services/openaiService');
// const Test = require('../models/test'); // Import the Test model
// const User = require('../models/user'); // Import the User model

// // AES-256-CBC + HMAC encryption
// function encrypt(text, password) {
//   try {
//     const salt = crypto.randomBytes(16);
//     const iv = crypto.randomBytes(16);

//     const encKey = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');
//     const hmacKey = crypto.pbkdf2Sync(password + 'hmac', salt, 10000, 32, 'sha256');

//     const cipher = crypto.createCipheriv('aes-256-cbc', encKey, iv);
//     cipher.setAutoPadding(true);
//     let encrypted = cipher.update(text, 'utf8');
//     encrypted = Buffer.concat([encrypted, cipher.final()]);

//     const hmac = crypto.createHmac('sha256', hmacKey);
//     hmac.update(salt);
//     hmac.update(iv);
//     hmac.update(encrypted);
//     const authTag = hmac.digest();

//     const result = Buffer.concat([salt, iv, authTag, encrypted]);
//     return result.toString('base64');
//   } catch (error) {
//     console.error('Encryption failed:', error);
//     throw new Error(`Encryption failed: ${error.message}`);
//   }
// }

// // AES-256-CBC + HMAC decryption
// function decrypt(encryptedData, password) {
//   try {
//     const data = Buffer.from(encryptedData, 'base64');

//     if (data.length < 64) {
//       throw new Error('Invalid encrypted data length');
//     }

//     const salt = data.subarray(0, 16);
//     const iv = data.subarray(16, 32);
//     const authTag = data.subarray(32, 64);
//     const encrypted = data.subarray(64);

//     const encKey = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');
//     const hmacKey = crypto.pbkdf2Sync(password + 'hmac', salt, 10000, 32, 'sha256');

//     const hmac = crypto.createHmac('sha256', hmacKey);
//     hmac.update(salt);
//     hmac.update(iv);
//     hmac.update(encrypted);
//     const expectedTag = hmac.digest();

//     if (!crypto.timingSafeEqual(authTag, expectedTag)) {
//       throw new Error('Authentication failed - data may be tampered');
//     }

//     const decipher = crypto.createDecipheriv('aes-256-cbc', encKey, iv);
//     decipher.setAutoPadding(true);
//     let decrypted = decipher.update(encrypted);
//     decrypted = Buffer.concat([decrypted, decipher.final()]);

//     return decrypted.toString('utf8');
//   } catch (error) {
//     console.error('Decryption failed:', error);
//     throw new Error(`Decryption failed: ${error.message}`);
//   }
// }

// // Helper function to check subscription status
// function checkSubscriptionStatus(user) {
//   const now = new Date();
  
//   // Check if user has a subscription object
//   if (!user.subscription) {
//     return {
//       isValid: false,
//       reason: 'No subscription found'
//     };
//   }

//   // Check if subscription is active
//   if (!user.subscription.isSubscribed) {
//     return {
//       isValid: false,
//       reason: 'Subscription is not active'
//     };
//   }

//   // Check if subscription has expired
//   if (user.subscription.expiryDate && new Date(user.subscription.expiryDate) < now) {
//     return {
//       isValid: false,
//       reason: 'Subscription has expired',
//       expiryDate: user.subscription.expiryDate
//     };
//   }

//   return {
//     isValid: true,
//     packageType: user.subscription.packageType,
//     expiryDate: user.subscription.expiryDate
//   };
// }

// // Helper function to determine if user can proceed with interpretation
// function canProceedWithInterpretation(user) {
//   const subscriptionStatus = checkSubscriptionStatus(user);
//   const hasRemainingInterpretations = user.singleLabInterpretationsRemaining > 0;

//   // If user has remaining interpretations (pay-per-use), they can proceed
//   if (hasRemainingInterpretations) {
//     return {
//       canProceed: true,
//       useCredits: true,
//       reason: 'Using remaining lab interpretation credits'
//     };
//   }

//   // If no remaining interpretations, check subscription
//   if (subscriptionStatus.isValid) {
//     return {
//       canProceed: true,
//       useCredits: false,
//       reason: 'Active subscription allows unlimited interpretations',
//       subscriptionInfo: subscriptionStatus
//     };
//   }

//   // Neither credits nor valid subscription
//   return {
//     canProceed: false,
//     reason: 'No remaining interpretations and no active subscription',
//     subscriptionStatus: subscriptionStatus
//   };
// }

// /**
//  * Controller to process and interpret lab results
//  */
// exports.interpretLabResults = async (req, res) => {
//   try {
//     const { encryptedLabText, clientId, testType: clientReportedTestType, user_id } = req.body;

//     if (!encryptedLabText || !clientId || !user_id) {
//       return res.status(400).json({ error: 'Missing required data (encryptedLabText, clientId, or user_id)' });
//     }

//     console.log(`[${new Date().toISOString()}] Received request for clientId: ${clientId.substring(0, 8)}...`);
//     console.log(`[${new Date().toISOString()}] Received request for user_id: ${user_id}`);
//     console.log(`[${new Date().toISOString()}] Received encrypted data length: ${encryptedLabText.length}`);
//     if (clientReportedTestType) {
//       console.log(`[${new Date().toISOString()}] Client reported test type: ${clientReportedTestType}`);
//     }

//     // Check user exists and authorization to proceed
//     let user;
//     try {
//       user = await User.findById(user_id);
//       if (!user) {
//         console.log(`[${new Date().toISOString()}] User not found: ${user_id}`);
//         return res.status(404).json({
//           error: 'User not found',
//           message: 'The specified user does not exist'
//         });
//       }

//       // Check if user can proceed with interpretation
//       const authCheck = canProceedWithInterpretation(user);
      
//       if (!authCheck.canProceed) {
//         console.log(`[${new Date().toISOString()}] User cannot proceed: ${user_id} - ${authCheck.reason}`);
        
//         const responseData = {
//           error: 'Access denied',
//           message: 'You need either remaining lab interpretation credits or an active subscription to proceed.',
//           remainingInterpretations: user.singleLabInterpretationsRemaining,
//           subscriptionStatus: authCheck.subscriptionStatus
//         };

//         // Add specific guidance based on the situation
//         if (user.singleLabInterpretationsRemaining <= 0 && !authCheck.subscriptionStatus?.isValid) {
//           responseData.suggestion = 'Please purchase more interpretation credits or subscribe to a plan for unlimited interpretations.';
//         } else if (authCheck.subscriptionStatus?.reason === 'Subscription has expired') {
//           responseData.suggestion = 'Your subscription has expired. Please renew your subscription or purchase interpretation credits.';
//         }

//         return res.status(403).json(responseData);
//       }

//       console.log(`[${new Date().toISOString()}] User ${user_id} authorized: ${authCheck.reason}`);
//       console.log(`[${new Date().toISOString()}] Remaining interpretations: ${user.singleLabInterpretationsRemaining}`);
//       if (authCheck.subscriptionInfo) {
//         console.log(`[${new Date().toISOString()}] Subscription: ${authCheck.subscriptionInfo.packageType}, expires: ${authCheck.subscriptionInfo.expiryDate}`);
//       }

//     } catch (userError) {
//       console.error(`[${new Date().toISOString()}] Error checking user:`, userError);
//       return res.status(500).json({
//         error: 'User verification failed',
//         message: 'Failed to verify user credentials'
//       });
//     }

//     // Decrypt lab text
//     let labText;
//     try {
//       labText = decrypt(encryptedLabText, clientId);
//       console.log(`[${new Date().toISOString()}] Decryption successful, text length: ${labText.length}`);
//     } catch (decryptError) {
//       console.error(`[${new Date().toISOString()}] Decryption error: ${decryptError.message}`);
//       return res.status(400).json({
//         error: 'Failed to decrypt data',
//         details: decryptError.message
//       });
//     }

//     // Interpret lab text with OpenAI
//     let actualTestType, interpretation, isValidTest;
//     try {
//       const result = await interpretLabText(labText.trim());
//       actualTestType = result.testType;
//       interpretation = result.interpretation;
//       isValidTest = result.isValidTest;
      
//       console.log(`[${new Date().toISOString()}] Analysis completed. Detected test type: ${actualTestType}, isValidTest: ${isValidTest}`);
//     } catch (aiError) {
//       console.error(`[${new Date().toISOString()}] Error from OpenAI service:`, aiError);
//       return res.status(502).json({
//         error: 'Interpretation service failed',
//         message: aiError.message || 'Unknown error from AI service',
//       });
//     }

//     // Check if this is a valid lab test
//     if (!isValidTest) {
//       console.log(`[${new Date().toISOString()}] Invalid test detected`);
//       return res.status(422).json({
//         error: 'Invalid lab test',
//         message: 'The uploaded content does not appear to be a valid lab test result. Please upload a clear image of your lab test results.',
//         testType: 'Unknown',
//         isValidTest: false,
//         explanation: interpretation,
//         timestamp: req.requestTimestamp || new Date().toISOString(),
//       });
//     }

//     // Determine if we should decrement credits
//     const authCheck = canProceedWithInterpretation(user);
//     let shouldDecrementCredits = authCheck.useCredits;
//     let updatedRemainingInterpretations = user.singleLabInterpretationsRemaining;

//     // Decrement user's remaining interpretations only if using credits (not subscription)
//     if (shouldDecrementCredits) {
//       try {
//         const updatedUser = await User.findByIdAndUpdate(
//           user_id,
//           { 
//             $inc: { singleLabInterpretationsRemaining: -1 },
//             updatedAt: new Date()
//           },
//           { new: true }
//         );
        
//         if (!updatedUser) {
//           console.error(`[${new Date().toISOString()}] Failed to update user ${user_id} - user not found during update`);
//           // Continue with the process even if user update fails, but log the error
//         } else {
//           updatedRemainingInterpretations = updatedUser.singleLabInterpretationsRemaining;
//           console.log(`[${new Date().toISOString()}] User ${user_id} interpretations decremented. Remaining: ${updatedRemainingInterpretations}`);
//         }
//       } catch (updateError) {
//         console.error(`[${new Date().toISOString()}] Failed to update user interpretations:`, updateError);
//         // Continue with the process even if user update fails, but log the error
//       }
//     } else {
//       console.log(`[${new Date().toISOString()}] User ${user_id} using subscription - no credits decremented`);
//     }

//     // Encrypt the interpretation (only for valid tests)
//     const encryptedResponse = encrypt(interpretation, clientId);
//     console.log(`[${new Date().toISOString()}] Response encrypted`);

//     // Save test type and timestamp to DB (without clientId or userId)
//     try {
//       await Test.create({
//         testType: actualTestType,
//         timestamp: new Date()
//       });
//       console.log(`[${new Date().toISOString()}] Test saved: ${actualTestType}`);
//     } catch (dbError) {
//       console.error(`[${new Date().toISOString()}] Failed to save test to DB:`, dbError);
//     }

//     // Prepare response data
//     const responseData = {
//       testType: actualTestType,
//       encryptedInterpretation: encryptedResponse,
//       isValidTest: true,
//       remainingInterpretations: updatedRemainingInterpretations,
//       timestamp: req.requestTimestamp || new Date().toISOString(),
//     };

//     // Add subscription info if user has an active subscription
//     const currentSubscriptionStatus = checkSubscriptionStatus(user);
//     if (currentSubscriptionStatus.isValid) {
//       responseData.subscriptionInfo = {
//         isActive: true,
//         packageType: currentSubscriptionStatus.packageType,
//         expiryDate: currentSubscriptionStatus.expiryDate
//       };
//     }

//     // Add usage method info
//     responseData.usageMethod = shouldDecrementCredits ? 'credits' : 'subscription';

//     // Return response for valid tests
//     res.status(200).json(responseData);

//   } catch (error) {
//     const reqClientId = req.body && req.body.clientId ? req.body.clientId.substring(0,8)+'...' : 'unknown';
//     const reqUserId = req.body && req.body.user_id ? req.body.user_id : 'unknown';
//     console.error(`[${new Date().toISOString()}] Unexpected error interpreting lab results for clientId: ${reqClientId}, user_id: ${reqUserId}:`, error);
//     res.status(500).json({
//       error: 'Internal server error',
//       message: error.message || 'An unexpected error occurred'
//     });
//   }
// };

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

// Helper function to check subscription status
// function checkSubscriptionStatus(user) {
//   const now = new Date();
  
//   // Check if user has a subscription object
//   if (!user.subscription) {
//     return {
//       isValid: false,
//       reason: 'No subscription found'
//     };
//   }

//   // Check if subscription is active
//   if (!user.subscription.isSubscribed) {
//     return {
//       isValid: false,
//       reason: 'Subscription is not active'
//     };
//   }

//   // Check if subscription has expired
//   if (user.subscription.expiryDate && new Date(user.subscription.expiryDate) < now) {
//     return {
//       isValid: false,
//       reason: 'Subscription has expired',
//       expiryDate: user.subscription.expiryDate
//     };
//   }

//   return {
//     isValid: true,
//     packageType: user.subscription.packageType,
//     expiryDate: user.subscription.expiryDate
//   };
// }

// Helper function to check subscription status - FIXED VERSION
function checkSubscriptionStatus(user) {
  const now = new Date();
  
  // Check if user has a subscription object
  if (!user.subscription) {
    return {
      isValid: false,
      reason: 'No subscription found'
    };
  }

  // PRIORITY 1: Check expiry date first (if it exists)
  if (user.subscription.expiryDate) {
    const expiryDate = new Date(user.subscription.expiryDate);
    
    if (expiryDate < now) {
      // Subscription has expired
      return {
        isValid: false,
        reason: 'Subscription has expired',
        expiryDate: user.subscription.expiryDate
      };
    } else {
      // Subscription has not expired - it's valid regardless of isSubscribed flag
      return {
        isValid: true,
        packageType: user.subscription.packageType,
        expiryDate: user.subscription.expiryDate
      };
    }
  }

  // PRIORITY 2: If no expiry date, fall back to isSubscribed flag
  if (user.subscription.isSubscribed) {
    return {
      isValid: true,
      packageType: user.subscription.packageType,
      expiryDate: user.subscription.expiryDate
    };
  }

  // Default case - no active subscription
  return {
    isValid: false,
    reason: 'Subscription is not active'
  };
}

// Helper function to determine if user can proceed with interpretation
function canProceedWithInterpretation(user) {
  const subscriptionStatus = checkSubscriptionStatus(user);
  const hasRemainingInterpretations = user.singleLabInterpretationsRemaining > 0;

  // If user has remaining interpretations (pay-per-use), they can proceed
  if (hasRemainingInterpretations) {
    return {
      canProceed: true,
      useCredits: true,
      reason: 'Using remaining lab interpretation credits'
    };
  }

  // If no remaining interpretations, check subscription
  if (subscriptionStatus.isValid) {
    return {
      canProceed: true,
      useCredits: false,
      reason: 'Active subscription allows unlimited interpretations',
      subscriptionInfo: subscriptionStatus
    };
  }

  // Neither credits nor valid subscription
  return {
    canProceed: false,
    reason: 'No remaining interpretations and no active subscription',
    subscriptionStatus: subscriptionStatus
  };
}

/**
 * Controller to process and interpret lab results
 */
exports.interpretLabResults = async (req, res) => {
  try {
    const { encryptedLabText, clientId, testType: clientReportedTestType, user_id } = req.body;

    if (!encryptedLabText || !clientId || !user_id) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required information. Please ensure all data is provided and try again.',
        error: 'Missing required data (encryptedLabText, clientId, or user_id)' 
      });
    }

    console.log(`[${new Date().toISOString()}] Received request for clientId: ${clientId.substring(0, 8)}...`);
    console.log(`[${new Date().toISOString()}] Received request for user_id: ${user_id}`);
    console.log(`[${new Date().toISOString()}] Received encrypted data length: ${encryptedLabText.length}`);
    if (clientReportedTestType) {
      console.log(`[${new Date().toISOString()}] Client reported test type: ${clientReportedTestType}`);
    }

    // Check user exists and authorization to proceed
    let user;
    try {
      user = await User.findById(user_id);
      if (!user) {
        console.log(`[${new Date().toISOString()}] User not found: ${user_id}`);
        return res.status(404).json({
          success: false,
          message: 'We couldn\'t find your account. Please make sure you\'re logged in and try again.',
          error: 'User not found'
        });
      }

      // Check if user can proceed with interpretation
      const authCheck = canProceedWithInterpretation(user);
      
      if (!authCheck.canProceed) {
        console.log(`[${new Date().toISOString()}] User cannot proceed: ${user_id} - ${authCheck.reason}`);
        
        let userFriendlyMessage = '';
        let actionRequired = '';
        
        if (user.singleLabInterpretationsRemaining <= 0 && !authCheck.subscriptionStatus?.isValid) {
          userFriendlyMessage = 'You have used all your lab interpretation credits and don\'t have an active subscription.';
          actionRequired = 'To continue analyzing your lab results, you can either:\n• Purchase more interpretation credits, or\n• Subscribe to our plan for unlimited lab interpretations';
        } else if (authCheck.subscriptionStatus?.reason === 'Subscription has expired') {
          const expiryDate = new Date(authCheck.subscriptionStatus.expiryDate).toLocaleDateString();
          userFriendlyMessage = `Your subscription expired on ${expiryDate} and you have no remaining credits.`;
          actionRequired = 'To continue analyzing your lab results, you can either:\n• Renew your subscription for unlimited interpretations, or\n• Purchase interpretation credits for pay-per-use access';
        } else if (authCheck.subscriptionStatus?.reason === 'Subscription is not active') {
          userFriendlyMessage = 'Your subscription is currently inactive and you have no remaining credits.';
          actionRequired = 'Please reactivate your subscription or purchase interpretation credits to continue.';
        } else {
          userFriendlyMessage = 'You don\'t have access to lab interpretation services.';
          actionRequired = 'Please purchase interpretation credits or subscribe to a plan to analyze your lab results.';
        }

        return res.status(403).json({
          success: false,
          message: userFriendlyMessage,
          actionRequired: actionRequired,
          currentStatus: {
            remainingCredits: user.singleLabInterpretationsRemaining,
            hasActiveSubscription: authCheck.subscriptionStatus?.isValid || false,
            subscriptionExpired: authCheck.subscriptionStatus?.reason === 'Subscription has expired'
          }
        });
      }

      console.log(`[${new Date().toISOString()}] User ${user_id} authorized: ${authCheck.reason}`);
      console.log(`[${new Date().toISOString()}] Remaining interpretations: ${user.singleLabInterpretationsRemaining}`);
      if (authCheck.subscriptionInfo) {
        console.log(`[${new Date().toISOString()}] Subscription: ${authCheck.subscriptionInfo.packageType}, expires: ${authCheck.subscriptionInfo.expiryDate}`);
      }

    } catch (userError) {
      console.error(`[${new Date().toISOString()}] Error checking user:`, userError);
      return res.status(500).json({
        success: false,
        message: 'We\'re having trouble verifying your account. Please try again in a moment.',
        error: 'User verification failed'
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
        success: false,
        message: 'We couldn\'t process your lab test data. Please try uploading again.',
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
        success: false,
        message: 'Our AI analysis service is temporarily unavailable. Please try again in a few minutes.',
        error: 'Interpretation service failed',
        details: aiError.message || 'Unknown error from AI service'
      });
    }

    // Check if this is a valid lab test
    if (!isValidTest) {
      console.log(`[${new Date().toISOString()}] Invalid test detected`);
      return res.status(422).json({
        success: false,
        message: 'We couldn\'t recognize this as a valid lab test result.',
        details: 'Please make sure you\'ve uploaded a clear, complete image of your lab test results. The image should show test names, values, and reference ranges.',
        testType: 'Unknown',
        isValidTest: false,
        timestamp: req.requestTimestamp || new Date().toISOString(),
      });
    }

    // Determine if we should decrement credits
    const authCheck = canProceedWithInterpretation(user);
    let shouldDecrementCredits = authCheck.useCredits;
    let updatedRemainingInterpretations = user.singleLabInterpretationsRemaining;

    // Decrement user's remaining interpretations only if using credits (not subscription)
    if (shouldDecrementCredits) {
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
          updatedRemainingInterpretations = updatedUser.singleLabInterpretationsRemaining;
          console.log(`[${new Date().toISOString()}] User ${user_id} interpretations decremented. Remaining: ${updatedRemainingInterpretations}`);
        }
      } catch (updateError) {
        console.error(`[${new Date().toISOString()}] Failed to update user interpretations:`, updateError);
        // Continue with the process even if user update fails, but log the error
      }
    } else {
      console.log(`[${new Date().toISOString()}] User ${user_id} using subscription - no credits decremented`);
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

    // Prepare response data
    const responseData = {
      success: true,
      testType: actualTestType,
      encryptedInterpretation: encryptedResponse,
      isValidTest: true,
      timestamp: req.requestTimestamp || new Date().toISOString(),
      usage: {
        method: shouldDecrementCredits ? 'credits' : 'subscription',
        creditsRemaining: updatedRemainingInterpretations,
        message: shouldDecrementCredits 
          ? `Analysis complete! You have ${updatedRemainingInterpretations} interpretation credits remaining.`
          : 'Analysis complete! Used your active subscription - no credits deducted.'
      }
    };

    // Add subscription info if user has an active subscription
    const currentSubscriptionStatus = checkSubscriptionStatus(user);
    if (currentSubscriptionStatus.isValid) {
      const expiryDate = new Date(currentSubscriptionStatus.expiryDate).toLocaleDateString();
      responseData.subscription = {
        isActive: true,
        plan: currentSubscriptionStatus.packageType,
        expiresOn: expiryDate,
        status: 'Your subscription is active and includes unlimited lab interpretations.'
      };
    }

    // Return response for valid tests
    res.status(200).json(responseData);

  } catch (error) {
    const reqClientId = req.body && req.body.clientId ? req.body.clientId.substring(0,8)+'...' : 'unknown';
    const reqUserId = req.body && req.body.user_id ? req.body.user_id : 'unknown';
    console.error(`[${new Date().toISOString()}] Unexpected error interpreting lab results for clientId: ${reqClientId}, user_id: ${reqUserId}:`, error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong while processing your request. Our team has been notified and we\'re working to fix this.',
      error: 'Internal server error'
    });
  }
};