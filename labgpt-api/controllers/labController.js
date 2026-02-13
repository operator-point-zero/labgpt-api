// const crypto = require('crypto');
// const { interpretLabText } = require('../services/openaiService');
// const Test = require('../models/test');
// const User = require('../models/user');

// // Configuration constants
// const MAX_ENCRYPTED_SIZE = 5 * 1024 * 1024; // 5MB max
// const PBKDF2_ITERATIONS = 600000; // OWASP 2023 recommendation
// const SERVER_ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || 'CHANGE_THIS_IN_PRODUCTION';

// // Validate critical environment variables at startup
// if (!SERVER_ENCRYPTION_SECRET || SERVER_ENCRYPTION_SECRET === 'CHANGE_THIS_IN_PRODUCTION') {
//   console.error('CRITICAL: ENCRYPTION_SECRET not set in environment variables!');
//   process.exit(1);
// }

// // ─── Encryption helpers ────────────────────────────────────────────────────────

// /**
//  * Encrypt text using AES-256-CBC with HMAC authentication
//  * @param {string} text - Plain text to encrypt
//  * @param {string} clientId - Client identifier (mixed with server secret)
//  * @returns {string} Base64 encoded encrypted data
//  */
// function encrypt(text, clientId) {
//   try {
//     const salt = crypto.randomBytes(16);
//     const iv = crypto.randomBytes(16);
    
//     // Derive keys using client ID + server secret for added security
//     const keyMaterial = crypto.pbkdf2Sync(
//       `${clientId}:${SERVER_ENCRYPTION_SECRET}`,
//       salt,
//       PBKDF2_ITERATIONS,
//       64, // 64 bytes = 512 bits for both keys
//       'sha256'
//     );
    
//     const encKey = keyMaterial.subarray(0, 32);
//     const hmacKey = keyMaterial.subarray(32, 64);

//     const cipher = crypto.createCipheriv('aes-256-cbc', encKey, iv);
//     let encrypted = cipher.update(text, 'utf8');
//     encrypted = Buffer.concat([encrypted, cipher.final()]);

//     const hmac = crypto.createHmac('sha256', hmacKey);
//     hmac.update(salt);
//     hmac.update(iv);
//     hmac.update(encrypted);
//     const authTag = hmac.digest();

//     return Buffer.concat([salt, iv, authTag, encrypted]).toString('base64');
//   } catch (error) {
//     console.error('Encryption failed:', error);
//     throw new Error(`Encryption failed: ${error.message}`);
//   }
// }

// /**
//  * Decrypt encrypted data with HMAC verification
//  * @param {string} encryptedData - Base64 encoded encrypted data
//  * @param {string} clientId - Client identifier (mixed with server secret)
//  * @returns {string} Decrypted plain text
//  */
// function decrypt(encryptedData, password) {
//   try {
//     const data = Buffer.from(encryptedData, 'base64');
//     if (data.length < 64) throw new Error('Invalid encrypted data length');

//     const salt = data.subarray(0, 16);
//     const iv = data.subarray(16, 32);
//     const authTag = data.subarray(32, 64);
//     const encrypted = data.subarray(64);

//     // Derive keys using client ID + server secret
//     const keyMaterial = crypto.pbkdf2Sync(
//       `${password}:${SERVER_ENCRYPTION_SECRET}`,
//       salt,
//       PBKDF2_ITERATIONS,
//       64,
//       'sha256'
//     );
    
//     const encKey = keyMaterial.subarray(0, 32);
//     const hmacKey = keyMaterial.subarray(32, 64);

//     const hmac = crypto.createHmac('sha256', hmacKey);
//     hmac.update(salt);
//     hmac.update(iv);
//     hmac.update(encrypted);
//     const expectedTag = hmac.digest();

//     if (!crypto.timingSafeEqual(authTag, expectedTag)) {
//       throw new Error('Authentication failed - data may be tampered');
//     }

//     const decipher = crypto.createDecipheriv('aes-256-cbc', encKey, iv);
//     let decrypted = decipher.update(encrypted);
//     decrypted = Buffer.concat([decrypted, decipher.final()]);
//     return decrypted.toString('utf8');
//   } catch (error) {
//     console.error('Decryption failed:', error);
//     throw new Error(`Decryption failed: ${error.message}`);
//   }
// }

// // ─── Subscription helpers ──────────────────────────────────────────────────────

// function checkSubscriptionStatus(user) {
//   const now = new Date();
  
//   if (!user.subscription) {
//     return { 
//       isValid: false, 
//       reason: 'No subscription found',
//       packageType: null,
//       expiryDate: null
//     };
//   }

//   if (user.subscription.expiryDate) {
//     const expiryDate = new Date(user.subscription.expiryDate);
//     if (expiryDate < now) {
//       return { 
//         isValid: false, 
//         reason: 'Subscription has expired', 
//         expiryDate: user.subscription.expiryDate,
//         packageType: user.subscription.packageType
//       };
//     }
//     return { 
//       isValid: true, 
//       packageType: user.subscription.packageType, 
//       expiryDate: user.subscription.expiryDate,
//       reason: 'Active subscription'
//     };
//   }

//   if (user.subscription.isSubscribed) {
//     return { 
//       isValid: true, 
//       packageType: user.subscription.packageType, 
//       expiryDate: user.subscription.expiryDate,
//       reason: 'Active subscription'
//     };
//   }

//   return { 
//     isValid: false, 
//     reason: 'Subscription is not active',
//     packageType: null,
//     expiryDate: null
//   };
// }

// function canProceedWithInterpretation(user) {
//   const subscriptionStatus = checkSubscriptionStatus(user);

//   if (user.singleLabInterpretationsRemaining > 0) {
//     return { 
//       canProceed: true, 
//       useCredits: true, 
//       reason: 'Using remaining lab interpretation credits',
//       subscriptionStatus
//     };
//   }

//   if (subscriptionStatus.isValid) {
//     return {
//       canProceed: true,
//       useCredits: false,
//       reason: 'Active subscription allows unlimited interpretations',
//       subscriptionStatus,
//     };
//   }

//   return { 
//     canProceed: false, 
//     reason: 'No remaining interpretations and no active subscription', 
//     subscriptionStatus 
//   };
// }

// // ─── Input Validation ──────────────────────────────────────────────────────────

// function validateInput(body) {
//   const { encryptedLabText, clientId, user_id } = body;
  
//   // DEBUG: Comprehensive logging of entire body and fields
//   console.log('═══════════════════════════════════════════════════════════');
//   console.log('[VALIDATION DEBUG] ===== FULL REQUEST BODY RECEIVED =====');
//   console.log('Raw body:', JSON.stringify(body, null, 2));
//   console.log('Body keys:', Object.keys(body || {}));
//   console.log('Body type:', typeof body);
//   console.log('═══════════════════════════════════════════════════════════');
  
//   // DEBUG: Log each field
//   console.log('[VALIDATION DEBUG] encryptedLabText:', {
//     value: encryptedLabText ? encryptedLabText.substring(0, 50) + '...' : 'MISSING/NULL',
//     type: typeof encryptedLabText,
//     length: typeof encryptedLabText === 'string' ? encryptedLabText.length : 'N/A',
//     isString: typeof encryptedLabText === 'string',
//     isEmpty: !encryptedLabText,
//   });
  
//   console.log('[VALIDATION DEBUG] clientId:', {
//     value: clientId,
//     type: typeof clientId,
//     length: typeof clientId === 'string' ? clientId.length : 'N/A',
//     isString: typeof clientId === 'string',
//     isEmpty: !clientId,
//   });
  
//   console.log('[VALIDATION DEBUG] user_id:', {
//     value: user_id,
//     type: typeof user_id,
//     length: typeof user_id === 'string' ? user_id.length : 'N/A',
//     isString: typeof user_id === 'string',
//     isEmpty: !user_id,
//     charCodes: typeof user_id === 'string' ? user_id.split('').map((char, i) => `${i}:${char}(${char.charCodeAt(0)})`).join(', ') : 'N/A',
//     hexRegexMatch: typeof user_id === 'string' ? /^[0-9a-fA-F]{24}$/.test(user_id) : false,
//   });
  
//   console.log('═══════════════════════════════════════════════════════════');
  
//   // Validation checks with specific error reasons
//   if (!encryptedLabText) {
//     console.error('[VALIDATION FAILED] encryptedLabText is missing or null');
//     return { valid: false, error: 'encryptedLabText is required' };
//   }
  
//   if (typeof encryptedLabText !== 'string') {
//     console.error('[VALIDATION FAILED] encryptedLabText is not a string, got:', typeof encryptedLabText);
//     return { valid: false, error: 'encryptedLabText must be a string' };
//   }
  
//   if (!clientId) {
//     console.error('[VALIDATION FAILED] clientId is missing or null');
//     return { valid: false, error: 'clientId is required' };
//   }
  
//   if (typeof clientId !== 'string') {
//     console.error('[VALIDATION FAILED] clientId is not a string, got:', typeof clientId);
//     return { valid: false, error: 'clientId must be a string' };
//   }
  
//   if (clientId.length < 8) {
//     console.error('[VALIDATION FAILED] clientId too short:', clientId.length, 'chars');
//     return { valid: false, error: 'clientId must be at least 8 characters' };
//   }
  
//   if (!user_id) {
//     console.error('[VALIDATION FAILED] user_id is missing or null');
//     return { valid: false, error: 'user_id is required' };
//   }
  
//   if (typeof user_id !== 'string') {
//     console.error('[VALIDATION FAILED] user_id is not a string, got:', typeof user_id);
//     return { valid: false, error: 'user_id must be a string' };
//   }
  
//   // Validate MongoDB ObjectId format (24 hex characters)
//   if (!/^[0-9a-fA-F]{24}$/.test(user_id)) {
//     console.error('[VALIDATION FAILED] user_id does not match ObjectId format:', user_id, '(length:', user_id.length, ')');
//     return { valid: false, error: 'user_id must be a valid MongoDB ObjectId (24 hex characters)' };
//   }
  
//   // Check size limit to prevent DoS
//   if (encryptedLabText.length > MAX_ENCRYPTED_SIZE) {
//     console.error('[VALIDATION FAILED] encryptedLabText exceeds size limit:', encryptedLabText.length, '>', MAX_ENCRYPTED_SIZE);
//     return { valid: false, error: 'Encrypted data exceeds maximum allowed size (5MB)' };
//   }
  
//   console.log('[VALIDATION SUCCESS] All checks passed');
//   return { valid: true };
// }

// // ─── Controller ────────────────────────────────────────────────────────────────

// /**
//  * Process and interpret lab results.
//  *
//  * CRITICAL SECURITY IMPROVEMENTS:
//  * - Input validation with size limits
//  * - Stronger encryption (600K PBKDF2 iterations + server secret)
//  * - Atomic credit decrement BEFORE AI call to prevent race conditions
//  * - Proper error handling and rollback on failures
//  * - Request timeout handling
//  */
// exports.interpretLabResults = async (req, res) => {
//   const requestTimestamp = new Date().toISOString();
//   const requestId = crypto.randomBytes(8).toString('hex');
  
//   try {
//     // ───────────────────────────────────────────────────────────────────────────
//     // INITIAL REQUEST LOGGING - Log EVERYTHING before processing
//     // ───────────────────────────────────────────────────────────────────────────
//     console.log('\n╔════════════════════════════════════════════════════════════════╗');
//     console.log('║  POST /api/labs - NEW REQUEST RECEIVED                          ║');
//     console.log('╚════════════════════════════════════════════════════════════════╝');
    
//     console.log(`[${requestTimestamp}] [${requestId}] Request headers:`, JSON.stringify(req.headers, null, 2));
//     console.log(`[${requestTimestamp}] [${requestId}] Request body type:`, typeof req.body);
//     console.log(`[${requestTimestamp}] [${requestId}] Request body is null?`, req.body === null);
//     console.log(`[${requestTimestamp}] [${requestId}] Request body is undefined?`, req.body === undefined);
//     console.log(`[${requestTimestamp}] [${requestId}] Request body keys:`, Object.keys(req.body || {}));
//     console.log(`[${requestTimestamp}] [${requestId}] Request body (full):`, JSON.stringify(req.body, null, 2));
    
//     const { encryptedLabText, clientId, testType: clientReportedTestType, user_id } = req.body;

//     console.log(`[${requestTimestamp}] [${requestId}] New interpretation request`);
//     console.log(`[${requestTimestamp}] [${requestId}] Destructured values:`, {
//       encryptedLabText: encryptedLabText ? encryptedLabText.substring(0, 50) + '...' : 'UNDEFINED/NULL',
//       clientId,
//       clientReportedTestType,
//       user_id
//     });

//     // ── 1. Input Validation ─────────────────────────────────────────────────
//     const validation = validateInput(req.body);
//     if (!validation.valid) {
//       console.error(`[${requestTimestamp}] [${requestId}] ❌ VALIDATION FAILED: ${validation.error}`);
//       console.error(`[${requestTimestamp}] [${requestId}] Request body was:`, JSON.stringify(req.body || {}, null, 2));
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid request data. Please check your input and try again.',
//         error: validation.error,
//         requestId: requestId,
//         timestamp: requestTimestamp
//       });
//     }

//     console.log(`[${requestTimestamp}] [${requestId}] ClientId: ${clientId.substring(0, 8)}..., UserId: ${user_id}`);
//     console.log(`[${requestTimestamp}] [${requestId}] Encrypted data size: ${encryptedLabText.length} bytes`);
//     if (clientReportedTestType) {
//       console.log(`[${requestTimestamp}] [${requestId}] Client reported test type: ${clientReportedTestType}`);
//     }

//     // ── 2. Verify user & authorization ──────────────────────────────────────
//     let user;
//     try {
//       user = await User.findById(user_id);
//       if (!user) {
//         console.log(`[${requestTimestamp}] [${requestId}] User not found: ${user_id}`);
//         return res.status(404).json({
//           success: false,
//           message: "We couldn't find your account. Please make sure you're logged in and try again.",
//           error: 'User not found',
//         });
//       }

//       const authCheck = canProceedWithInterpretation(user);
//       if (!authCheck.canProceed) {
//         console.log(`[${requestTimestamp}] [${requestId}] User ${user_id} unauthorized: ${authCheck.reason}`);

//         let userFriendlyMessage;
//         let actionRequired;

//         if (authCheck.subscriptionStatus.reason === 'Subscription has expired') {
//           const d = new Date(authCheck.subscriptionStatus.expiryDate).toLocaleDateString();
//           userFriendlyMessage = `Your subscription expired on ${d} and you have no remaining credits.`;
//           actionRequired = 'Renew your subscription for unlimited interpretations, or purchase interpretation credits for pay-per-use access.';
//         } else if (authCheck.subscriptionStatus.reason === 'Subscription is not active') {
//           userFriendlyMessage = 'Your subscription is currently inactive and you have no remaining credits.';
//           actionRequired = 'Please reactivate your subscription or purchase interpretation credits to continue.';
//         } else {
//           userFriendlyMessage = 'You have used all your lab interpretation credits and do not have an active subscription.';
//           actionRequired = 'Purchase more interpretation credits, or subscribe to our plan for unlimited lab interpretations.';
//         }

//         return res.status(403).json({
//           success: false,
//           message: userFriendlyMessage,
//           actionRequired,
//           currentStatus: {
//             remainingCredits: user.singleLabInterpretationsRemaining,
//             hasActiveSubscription: authCheck.subscriptionStatus.isValid || false,
//             subscriptionExpired: authCheck.subscriptionStatus.reason === 'Subscription has expired',
//           },
//         });
//       }

//       console.log(`[${requestTimestamp}] [${requestId}] User ${user_id} authorized: ${authCheck.reason}`);
//     } catch (userError) {
//       console.error(`[${requestTimestamp}] [${requestId}] User check error:`, userError);
//       return res.status(500).json({
//         success: false,
//         message: "We're having trouble verifying your account. Please try again in a moment.",
//         error: 'User verification failed',
//       });
//     }

//     // ── 3. Capture auth decision and atomically reserve credit if needed ────
//     const authDecision = canProceedWithInterpretation(user);
//     const shouldDecrementCredits = authDecision.useCredits;
//     let creditReserved = false;
//     let originalCreditCount = user.singleLabInterpretationsRemaining;

//     if (shouldDecrementCredits) {
//       try {
//         // CRITICAL FIX: Atomically decrement BEFORE doing expensive AI call
//         // This prevents race conditions where multiple concurrent requests
//         // could all pass the check and consume credits they don't have
//         const updatedUser = await User.findOneAndUpdate(
//           { 
//             _id: user_id, 
//             singleLabInterpretationsRemaining: { $gt: 0 } 
//           },
//           { 
//             $inc: { singleLabInterpretationsRemaining: -1 },
//             updatedAt: new Date() 
//           },
//           { new: true }
//         );

//         if (!updatedUser) {
//           // Credits hit 0 between our check and this write (race condition)
//           console.log(`[${requestTimestamp}] [${requestId}] Race condition: credits depleted for ${user_id}`);
//           return res.status(403).json({
//             success: false,
//             message: 'Your interpretation credits were just used up. Please purchase more credits or subscribe to continue.',
//             currentStatus: {
//               remainingCredits: 0,
//               hasActiveSubscription: false,
//             },
//           });
//         }

//         creditReserved = true;
//         user = updatedUser; // Update user object
//         console.log(`[${requestTimestamp}] [${requestId}] Credit reserved for ${user_id}. Remaining: ${updatedUser.singleLabInterpretationsRemaining}`);
//       } catch (updateError) {
//         console.error(`[${requestTimestamp}] [${requestId}] Credit reservation failed:`, updateError);
//         return res.status(500).json({
//           success: false,
//           message: 'Unable to process your request at this time. Please try again.',
//           error: 'Credit reservation failed',
//         });
//       }
//     }

//     // ── 4. Decrypt lab text ──────────────────────────────────────────────────
//     let labText;
//     try {
//       labText = decrypt(encryptedLabText, clientId);
//       console.log(`[${requestTimestamp}] [${requestId}] Decryption successful, text length: ${labText.length}`);
//     } catch (decryptError) {
//       console.error(`[${requestTimestamp}] [${requestId}] Decryption error: ${decryptError.message}`);
      
//       // ROLLBACK: Restore credit if we decremented it
//       if (creditReserved) {
//         await rollbackCredit(user_id, requestId, requestTimestamp);
//       }
      
//       return res.status(400).json({
//         success: false,
//         message: "We couldn't process your lab test data. Please try uploading again.",
//         error: 'Failed to decrypt data',
//         details: decryptError.message,
//       });
//     }

//     // ── 5. Interpret with AI ─────────────────────────────────────────────────
//     let actualTestType, structuredReport, isValidTest;
//     try {
//       console.log(`[${requestTimestamp}] [${requestId}] Calling AI service...`);
//       ({ testType: actualTestType, structuredReport, isValidTest } = await interpretLabText(labText.trim(), requestId));
//       console.log(`[${requestTimestamp}] [${requestId}] AI complete. testType: ${actualTestType}, valid: ${isValidTest}`);
//     } catch (aiError) {
//       console.error(`[${requestTimestamp}] [${requestId}] AI service error:`, aiError);
      
//       // ROLLBACK: Restore credit if we decremented it
//       if (creditReserved) {
//         await rollbackCredit(user_id, requestId, requestTimestamp);
//       }
      
//       // Distinguish between different AI error types
//       let errorMessage = 'Our AI analysis service is temporarily unavailable. Please try again in a few minutes.';
//       let statusCode = 502;
      
//       if (aiError.message.includes('rate limit')) {
//         errorMessage = 'We are experiencing high demand. Please try again in a moment.';
//         statusCode = 429;
//       } else if (aiError.message.includes('timeout')) {
//         errorMessage = 'The analysis is taking longer than expected. Please try again.';
//         statusCode = 504;
//       }
      
//       return res.status(statusCode).json({
//         success: false,
//         message: errorMessage,
//         error: 'Interpretation service failed',
//       });
//     }

//     // ── 6. Encrypt the structured report ─────────────────────────────────────
//     let encryptedResponse;
//     try {
//       encryptedResponse = encrypt(JSON.stringify(structuredReport), clientId);
//       console.log(`[${requestTimestamp}] [${requestId}] Response encrypted successfully`);
//     } catch (encryptError) {
//       console.error(`[${requestTimestamp}] [${requestId}] Response encryption failed:`, encryptError);
      
//       // ROLLBACK: Restore credit if we decremented it
//       if (creditReserved) {
//         await rollbackCredit(user_id, requestId, requestTimestamp);
//       }
      
//       return res.status(500).json({
//         success: false,
//         message: 'Something went wrong while preparing your results. Please try again.',
//         error: 'Response encryption failed',
//       });
//     }

//     // ── 7. Persist test type for analytics (non-fatal) ──────────────────────
//     try {
//       await Test.create({ 
//         testType: actualTestType, 
//         userId: user_id,
//         timestamp: new Date(),
//         requestId
//       });
//     } catch (dbError) {
//       // Log but don't fail the request
//       console.error(`[${requestTimestamp}] [${requestId}] Analytics DB write failed:`, dbError);
//       // TODO: Send to retry queue or alerting system
//     }

//     // ── 8. Respond ───────────────────────────────────────────────────────────
//     const subscriptionStatus = checkSubscriptionStatus(user);

//     const responseData = {
//       success: true,
//       testType: actualTestType,
//       encryptedInterpretation: encryptedResponse,
//       interpretationFormat: 'structured_json',
//       isValidTest,
//       timestamp: requestTimestamp,
//       requestId,
//       usage: {
//         method: shouldDecrementCredits ? 'credits' : 'subscription',
//         creditsRemaining: user.singleLabInterpretationsRemaining,
//         creditsUsed: shouldDecrementCredits ? 1 : 0,
//         message: shouldDecrementCredits
//           ? `Analysis complete! You have ${user.singleLabInterpretationsRemaining} interpretation credit(s) remaining.`
//           : 'Analysis complete! Used your active subscription — no credits deducted.',
//       },
//     };

//     if (subscriptionStatus.isValid) {
//       responseData.subscription = {
//         isActive: true,
//         plan: subscriptionStatus.packageType,
//         expiresOn: subscriptionStatus.expiryDate ? new Date(subscriptionStatus.expiryDate).toLocaleDateString() : null,
//         status: 'Your subscription is active and includes unlimited lab interpretations.',
//       };
//     }

//     console.log(`[${requestTimestamp}] [${requestId}] Request completed successfully`);
//     res.status(200).json(responseData);

//   } catch (error) {
//     const reqClientId = req.body?.clientId ? req.body.clientId.substring(0, 8) + '...' : 'unknown';
//     const reqUserId = req.body?.user_id || 'unknown';
//     console.error(`[${requestTimestamp}] [${requestId}] Unhandled error — clientId: ${reqClientId}, user_id: ${reqUserId}:`, error);
    
//     // TODO: Send to error tracking service (Sentry, etc.)
    
//     res.status(500).json({
//       success: false,
//       message: "Something went wrong while processing your request. Our team has been notified and we're working to fix this.",
//       error: 'Internal server error',
//       requestId, // Include for support tickets
//     });
//   }
// };

// /**
//  * Helper function to rollback credit on failure
//  */
// async function rollbackCredit(userId, requestId, timestamp) {
//   try {
//     const rolledBack = await User.findByIdAndUpdate(
//       userId,
//       { 
//         $inc: { singleLabInterpretationsRemaining: 1 },
//         updatedAt: new Date()
//       },
//       { new: true }
//     );
    
//     if (rolledBack) {
//       console.log(`[${timestamp}] [${requestId}] Credit rollback successful for ${userId}. New balance: ${rolledBack.singleLabInterpretationsRemaining}`);
//     } else {
//       console.error(`[${timestamp}] [${requestId}] CRITICAL: Credit rollback failed - user not found: ${userId}`);
//       // TODO: Alert ops team for manual reconciliation
//     }
//   } catch (rollbackError) {
//     console.error(`[${timestamp}] [${requestId}] CRITICAL: Credit rollback error for ${userId}:`, rollbackError);
//     // TODO: Send to reconciliation queue
//   }
// }

// const { interpretLabText } = require('../services/openaiService');
// const Test = require('../models/test');
// const User = require('../models/user');
// const crypto = require('crypto');

// // ─── Subscription Helpers ──────────────────────────────────────────────────────

// function checkSubscriptionStatus(user) {
//   const now = new Date();
  
//   if (!user.subscription) {
//     return { 
//       isValid: false, 
//       reason: 'No subscription found',
//       packageType: null,
//       expiryDate: null
//     };
//   }

//   if (user.subscription.expiryDate) {
//     const expiryDate = new Date(user.subscription.expiryDate);
//     if (expiryDate < now) {
//       return { 
//         isValid: false, 
//         reason: 'Subscription has expired', 
//         expiryDate: user.subscription.expiryDate,
//         packageType: user.subscription.packageType
//       };
//     }
//     return { 
//       isValid: true, 
//       packageType: user.subscription.packageType, 
//       expiryDate: user.subscription.expiryDate,
//       reason: 'Active subscription'
//     };
//   }

//   if (user.subscription.isSubscribed) {
//     return { 
//       isValid: true, 
//       packageType: user.subscription.packageType, 
//       expiryDate: user.subscription.expiryDate,
//       reason: 'Active subscription'
//     };
//   }

//   return { 
//     isValid: false, 
//     reason: 'Subscription is not active',
//     packageType: null,
//     expiryDate: null
//   };
// }

// function canProceedWithInterpretation(user) {
//   const subscriptionStatus = checkSubscriptionStatus(user);

//   if (user.singleLabInterpretationsRemaining > 0) {
//     return { 
//       canProceed: true, 
//       useCredits: true, 
//       reason: 'Using remaining lab interpretation credits',
//       subscriptionStatus
//     };
//   }

//   if (subscriptionStatus.isValid) {
//     return {
//       canProceed: true,
//       useCredits: false,
//       reason: 'Active subscription allows unlimited interpretations',
//       subscriptionStatus,
//     };
//   }

//   return { 
//     canProceed: false, 
//     reason: 'No remaining interpretations and no active subscription', 
//     subscriptionStatus 
//   };
// }

// // ─── Input Validation ──────────────────────────────────────────────────────────

// function validateInput(body) {
//   const { labText, user_id } = body;
  
//   if (!labText) {
//     console.error('[VALIDATION FAILED] labText is missing or null');
//     return { valid: false, error: 'labText is required' };
//   }
  
//   if (typeof labText !== 'string') {
//     console.error('[VALIDATION FAILED] labText is not a string');
//     return { valid: false, error: 'labText must be a string' };
//   }
  
//   if (!user_id) {
//     console.error('[VALIDATION FAILED] user_id is missing or null');
//     return { valid: false, error: 'user_id is required' };
//   }
  
//   if (!/^[0-9a-fA-F]{24}$/.test(user_id)) {
//     console.error('[VALIDATION FAILED] user_id is invalid format');
//     return { valid: false, error: 'user_id must be a valid MongoDB ObjectId' };
//   }
  
//   return { valid: true };
// }

// // ─── Main Controller ───────────────────────────────────────────────────────────

// exports.interpretLabResults = async (req, res) => {
//   const requestTimestamp = new Date().toISOString();
//   const requestId = crypto.randomBytes(8).toString('hex');
  
//   try {
//     // 1. Destructure plain text fields from the request body
//     const { labText, testType: clientReportedTestType, user_id } = req.body;

//     // 2. Validate input (checking for labText instead of encryptedLabText)
//     const validation = validateInput(req.body);
//     if (!validation.valid) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid request data.',
//         error: validation.error,
//         requestId: requestId
//       });
//     }

//     // 3. Verify user exists
//     let user = await User.findById(user_id);
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User account not found.",
//         error: 'User not found',
//       });
//     }

//     // 4. Check authorization (Credits/Subscription)
//     const authCheck = canProceedWithInterpretation(user);
//     if (!authCheck.canProceed) {
//       return res.status(403).json({
//         success: false,
//         message: 'You have no remaining credits and no active subscription.',
//         currentStatus: {
//           remainingCredits: user.singleLabInterpretationsRemaining,
//           hasActiveSubscription: authCheck.subscriptionStatus.isValid || false,
//         },
//       });
//     }

//     // 5. Atomic Credit Reservation
//     const shouldDecrementCredits = authCheck.useCredits;
//     let creditReserved = false;

//     if (shouldDecrementCredits) {
//       const updatedUser = await User.findOneAndUpdate(
//         { _id: user_id, singleLabInterpretationsRemaining: { $gt: 0 } },
//         { $inc: { singleLabInterpretationsRemaining: -1 }, updatedAt: new Date() },
//         { new: true }
//       );

//       if (!updatedUser) {
//         return res.status(403).json({ success: false, message: 'Credits depleted.' });
//       }

//       creditReserved = true;
//       user = updatedUser;
//     }

//     // 6. Call OpenAI via the service with plain text
//     let actualTestType, structuredReport, isValidTest;
//     try {
//       ({ testType: actualTestType, structuredReport, isValidTest } = await interpretLabText(labText.trim(), requestId));
//     } catch (aiError) {
//       console.error(`[${requestId}] AI service error:`, aiError);
      
//       // Rollback credit if the AI call fails
//       if (creditReserved) {
//         await rollbackCredit(user_id, requestId, requestTimestamp);
//       }
      
//       return res.status(500).json({
//         success: false,
//         message: 'AI analysis service failed. Please try again.',
//         error: aiError.message,
//       });
//     }

//     // 7. Store for analytics (non-fatal)
//     try {
//       await Test.create({ 
//         testType: actualTestType, 
//         userId: user_id,
//         timestamp: new Date(),
//         requestId
//       });
//     } catch (dbError) {
//       console.error(`[${requestId}] Analytics DB write failed:`, dbError);
//     }

//     // 8. Respond with plain stringified JSON
//     const subscriptionStatus = checkSubscriptionStatus(user);

//     const responseData = {
//       success: true,
//       testType: actualTestType,
//       // Stringified to remain compatible with Flutter's expectations
//       interpretation: JSON.stringify(structuredReport), 
//       interpretationFormat: 'structured_json',
//       isValidTest,
//       timestamp: requestTimestamp,
//       requestId,
//       usage: {
//         method: shouldDecrementCredits ? 'credits' : 'subscription',
//         creditsRemaining: user.singleLabInterpretationsRemaining,
//         creditsUsed: shouldDecrementCredits ? 1 : 0,
//       },
//     };

//     if (subscriptionStatus.isValid) {
//       responseData.subscription = {
//         isActive: true,
//         plan: subscriptionStatus.packageType,
//         expiresOn: subscriptionStatus.expiryDate,
//       };
//     }

//     res.status(200).json(responseData);

//   } catch (error) {
//     console.error(`[${requestId}] Unhandled error:`, error);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error.",
//       requestId,
//     });
//   }
// };

// async function rollbackCredit(userId, requestId, timestamp) {
//   try {
//     await User.findByIdAndUpdate(
//       userId,
//       { $inc: { singleLabInterpretationsRemaining: 1 }, updatedAt: new Date() }
//     );
//     console.log(`[${timestamp}] [${requestId}] Credit rollback successful for ${userId}.`);
//   } catch (rollbackError) {
//     console.error(`[${timestamp}] [${requestId}] CRITICAL: Credit rollback error:`, rollbackError);
//   }
// }

const { interpretLabText } = require('../services/openaiService');
const Test = require('../models/test');
const User = require('../models/user');
const crypto = require('crypto');

// ─── Subscription Helpers ──────────────────────────────────────────────────────

function checkSubscriptionStatus(user) {
  const now = new Date();
  if (!user.subscription) return { isValid: false, reason: 'No subscription' };

  if (user.subscription.expiryDate) {
    const expiryDate = new Date(user.subscription.expiryDate);
    if (expiryDate < now) return { isValid: false, reason: 'Expired' };
    return { isValid: true };
  }
  return { isValid: user.subscription.isSubscribed || false };
}

function canProceedWithInterpretation(user) {
  const status = checkSubscriptionStatus(user);
  if (user.singleLabInterpretationsRemaining > 0) return { canProceed: true, useCredits: true };
  if (status.isValid) return { canProceed: true, useCredits: false };
  return { canProceed: false };
}

// ─── Controller ────────────────────────────────────────────────────────────────

exports.interpretLabResults = async (req, res) => {
  const requestId = crypto.randomBytes(8).toString('hex');
  
  try {
    // 1. Get plain text from Flutter (Matches your 'labText' log)
    const { labText, user_id, testType } = req.body;

    // 2. Simple Validation
    if (!labText || !user_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing labText or user_id' 
      });
    }

    // 3. Check User & Credits
    let user = await User.findById(user_id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const auth = canProceedWithInterpretation(user);
    if (!auth.canProceed) {
      return res.status(403).json({ success: false, message: 'No credits remaining' });
    }

    // 4. Handle Credits (Atomic Decrement)
    if (auth.useCredits) {
      user = await User.findByIdAndUpdate(
        user_id, 
        { $inc: { singleLabInterpretationsRemaining: -1 } }, 
        { new: true }
      );
    }

    // 5. Call AI Service (openaiService.js)
    // We pass the plain labText directly now
    const result = await interpretLabText(labText, requestId);

    // 6. Save to history (Optional/Non-fatal)
    try {
      await Test.create({ testType: result.testType, userId: user_id, requestId });
    } catch (e) { console.error("History log failed", e); }

    // 7. Send Plain Response
    // We stringify the JSON so the Flutter app's 'jsonDecode' logic doesn't break
    res.status(200).json({
      success: true,
      testType: result.testType,
      interpretation: JSON.stringify(result.structuredReport), 
      isValidTest: result.isValidTest,
      requestId: requestId,
      usage: {
        creditsRemaining: user.singleLabInterpretationsRemaining
      }
    });

  } catch (error) {
    console.error(`[${requestId}] Server Error:`, error.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};