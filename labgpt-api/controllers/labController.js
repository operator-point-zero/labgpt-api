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


// // Helper function to check subscription status - FIXED VERSION
// function checkSubscriptionStatus(user) {
//   const now = new Date();
  
//   // Check if user has a subscription object
//   if (!user.subscription) {
//     return {
//       isValid: false,
//       reason: 'No subscription found'
//     };
//   }

//   // PRIORITY 1: Check expiry date first (if it exists)
//   if (user.subscription.expiryDate) {
//     const expiryDate = new Date(user.subscription.expiryDate);
    
//     if (expiryDate < now) {
//       // Subscription has expired
//       return {
//         isValid: false,
//         reason: 'Subscription has expired',
//         expiryDate: user.subscription.expiryDate
//       };
//     } else {
//       // Subscription has not expired - it's valid regardless of isSubscribed flag
//       return {
//         isValid: true,
//         packageType: user.subscription.packageType,
//         expiryDate: user.subscription.expiryDate
//       };
//     }
//   }

//   // PRIORITY 2: If no expiry date, fall back to isSubscribed flag
//   if (user.subscription.isSubscribed) {
//     return {
//       isValid: true,
//       packageType: user.subscription.packageType,
//       expiryDate: user.subscription.expiryDate
//     };
//   }

//   // Default case - no active subscription
//   return {
//     isValid: false,
//     reason: 'Subscription is not active'
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
//       return res.status(400).json({ 
//         success: false,
//         message: 'Missing required information. Please ensure all data is provided and try again.',
//         error: 'Missing required data (encryptedLabText, clientId, or user_id)' 
//       });
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
//           success: false,
//           message: 'We couldn\'t find your account. Please make sure you\'re logged in and try again.',
//           error: 'User not found'
//         });
//       }

//       // Check if user can proceed with interpretation
//       const authCheck = canProceedWithInterpretation(user);
      
//       if (!authCheck.canProceed) {
//         console.log(`[${new Date().toISOString()}] User cannot proceed: ${user_id} - ${authCheck.reason}`);
        
//         let userFriendlyMessage = '';
//         let actionRequired = '';
        
//         if (user.singleLabInterpretationsRemaining <= 0 && !authCheck.subscriptionStatus?.isValid) {
//           userFriendlyMessage = 'You have used all your lab interpretation credits and don\'t have an active subscription.';
//           actionRequired = 'To continue analyzing your lab results, you can either:\n• Purchase more interpretation credits, or\n• Subscribe to our plan for unlimited lab interpretations';
//         } else if (authCheck.subscriptionStatus?.reason === 'Subscription has expired') {
//           const expiryDate = new Date(authCheck.subscriptionStatus.expiryDate).toLocaleDateString();
//           userFriendlyMessage = `Your subscription expired on ${expiryDate} and you have no remaining credits.`;
//           actionRequired = 'To continue analyzing your lab results, you can either:\n• Renew your subscription for unlimited interpretations, or\n• Purchase interpretation credits for pay-per-use access';
//         } else if (authCheck.subscriptionStatus?.reason === 'Subscription is not active') {
//           userFriendlyMessage = 'Your subscription is currently inactive and you have no remaining credits.';
//           actionRequired = 'Please reactivate your subscription or purchase interpretation credits to continue.';
//         } else {
//           userFriendlyMessage = 'You don\'t have access to lab interpretation services.';
//           actionRequired = 'Please purchase interpretation credits or subscribe to a plan to analyze your lab results.';
//         }

//         return res.status(403).json({
//           success: false,
//           message: userFriendlyMessage,
//           actionRequired: actionRequired,
//           currentStatus: {
//             remainingCredits: user.singleLabInterpretationsRemaining,
//             hasActiveSubscription: authCheck.subscriptionStatus?.isValid || false,
//             subscriptionExpired: authCheck.subscriptionStatus?.reason === 'Subscription has expired'
//           }
//         });
//       }

//       console.log(`[${new Date().toISOString()}] User ${user_id} authorized: ${authCheck.reason}`);
//       console.log(`[${new Date().toISOString()}] Remaining interpretations: ${user.singleLabInterpretationsRemaining}`);
//       if (authCheck.subscriptionInfo) {
//         console.log(`[${new Date().toISOString()}] Subscription: ${authCheck.subscriptionInfo.packageType}, expires: ${authCheck.subscriptionInfo.expiryDate}`);
//       }

//     } catch (userError) {
//       console.error(`[${new Date().toISOString()}] Error checking user:`, userError);
//       return res.status(500).json({
//         success: false,
//         message: 'We\'re having trouble verifying your account. Please try again in a moment.',
//         error: 'User verification failed'
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
//         success: false,
//         message: 'We couldn\'t process your lab test data. Please try uploading again.',
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
//         success: false,
//         message: 'Our AI analysis service is temporarily unavailable. Please try again in a few minutes.',
//         error: 'Interpretation service failed',
//         details: aiError.message || 'Unknown error from AI service'
//       });
//     }

//     // Check if this is a valid lab test
//     if (!isValidTest) {
//       console.log(`[${new Date().toISOString()}] Invalid test detected`);
//       return res.status(422).json({
//         success: false,
//         message: 'We couldn\'t recognize this as a valid lab test result.',
//         details: 'Please make sure you\'ve uploaded a clear, complete image of your lab test results. The image should show test names, values, and reference ranges.',
//         testType: 'Unknown',
//         isValidTest: false,
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
//       success: true,
//       testType: actualTestType,
//       encryptedInterpretation: encryptedResponse,
//       isValidTest: true,
//       timestamp: req.requestTimestamp || new Date().toISOString(),
//       usage: {
//         method: shouldDecrementCredits ? 'credits' : 'subscription',
//         creditsRemaining: updatedRemainingInterpretations,
//         message: shouldDecrementCredits 
//           ? `Analysis complete! You have ${updatedRemainingInterpretations} interpretation credits remaining.`
//           : 'Analysis complete! Used your active subscription - no credits deducted.'
//       }
//     };

//     // Add subscription info if user has an active subscription
//     const currentSubscriptionStatus = checkSubscriptionStatus(user);
//     if (currentSubscriptionStatus.isValid) {
//       const expiryDate = new Date(currentSubscriptionStatus.expiryDate).toLocaleDateString();
//       responseData.subscription = {
//         isActive: true,
//         plan: currentSubscriptionStatus.packageType,
//         expiresOn: expiryDate,
//         status: 'Your subscription is active and includes unlimited lab interpretations.'
//       };
//     }

//     // Return response for valid tests
//     res.status(200).json(responseData);

//   } catch (error) {
//     const reqClientId = req.body && req.body.clientId ? req.body.clientId.substring(0,8)+'...' : 'unknown';
//     const reqUserId = req.body && req.body.user_id ? req.body.user_id : 'unknown';
//     console.error(`[${new Date().toISOString()}] Unexpected error interpreting lab results for clientId: ${reqClientId}, user_id: ${reqUserId}:`, error);
//     res.status(500).json({
//       success: false,
//       message: 'Something went wrong while processing your request. Our team has been notified and we\'re working to fix this.',
//       error: 'Internal server error'
//     });
//   }
// };

// const crypto = require('crypto');
// const { interpretLabText } = require('../services/openaiService');
// const Test = require('../models/test');
// const User = require('../models/user');

// // ─── Encryption helpers ────────────────────────────────────────────────────────

// function encrypt(text, password) {
//   try {
//     const salt = crypto.randomBytes(16);
//     const iv = crypto.randomBytes(16);
//     const encKey = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');
//     const hmacKey = crypto.pbkdf2Sync(password + 'hmac', salt, 10000, 32, 'sha256');

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

// function decrypt(encryptedData, password) {
//   try {
//     const data = Buffer.from(encryptedData, 'base64');
//     if (data.length < 64) throw new Error('Invalid encrypted data length');

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
//   if (!user.subscription) return { isValid: false, reason: 'No subscription found' };

//   if (user.subscription.expiryDate) {
//     const expiryDate = new Date(user.subscription.expiryDate);
//     if (expiryDate < now) {
//       return { isValid: false, reason: 'Subscription has expired', expiryDate: user.subscription.expiryDate };
//     }
//     return { isValid: true, packageType: user.subscription.packageType, expiryDate: user.subscription.expiryDate };
//   }

//   if (user.subscription.isSubscribed) {
//     return { isValid: true, packageType: user.subscription.packageType, expiryDate: user.subscription.expiryDate };
//   }

//   return { isValid: false, reason: 'Subscription is not active' };
// }

// function canProceedWithInterpretation(user) {
//   const subscriptionStatus = checkSubscriptionStatus(user);

//   if (user.singleLabInterpretationsRemaining > 0) {
//     return { canProceed: true, useCredits: true, reason: 'Using remaining lab interpretation credits' };
//   }

//   if (subscriptionStatus.isValid) {
//     return {
//       canProceed: true,
//       useCredits: false,
//       reason: 'Active subscription allows unlimited interpretations',
//       subscriptionInfo: subscriptionStatus,
//     };
//   }

//   return { canProceed: false, reason: 'No remaining interpretations and no active subscription', subscriptionStatus };
// }

// // ─── Controller ────────────────────────────────────────────────────────────────

// /**
//  * Process and interpret lab results.
//  *
//  * The AI service returns a fully styled, self-contained HTML document as the
//  * interpretation. That HTML is encrypted with the clientId and returned as
//  * `encryptedInterpretation`. The frontend:
//  *   1. Decrypts the HTML string using the clientId.
//  *   2. Either renders it in a WebView/iframe for preview, or
//  *   3. Passes it to a PDF renderer (html2pdf.js, Puppeteer, wkhtmltopdf, etc.).
//  *
//  * For invalid tests the AI still returns a styled HTML error card, also encrypted,
//  * so the frontend can display a rich "not recognized" screen instead of a raw error.
//  */
// exports.interpretLabResults = async (req, res) => {
//   try {
//     const { encryptedLabText, clientId, testType: clientReportedTestType, user_id } = req.body;

//     if (!encryptedLabText || !clientId || !user_id) {
//       return res.status(400).json({
//         success: false,
//         message: 'Missing required information. Please ensure all data is provided and try again.',
//         error: 'Missing required data (encryptedLabText, clientId, or user_id)',
//       });
//     }

//     const requestTimestamp = req.requestTimestamp || new Date().toISOString();

//     console.log(`[${requestTimestamp}] Request for clientId: ${clientId.substring(0, 8)}...`);
//     console.log(`[${requestTimestamp}] Request for user_id: ${user_id}`);
//     console.log(`[${requestTimestamp}] Encrypted data length: ${encryptedLabText.length}`);
//     if (clientReportedTestType) {
//       console.log(`[${requestTimestamp}] Client reported test type: ${clientReportedTestType}`);
//     }

//     // ── 1. Verify user & authorisation ──────────────────────────────────────
//     let user;
//     try {
//       user = await User.findById(user_id);
//       if (!user) {
//         return res.status(404).json({
//           success: false,
//           message: "We couldn't find your account. Please make sure you're logged in and try again.",
//           error: 'User not found',
//         });
//       }

//       const authCheck = canProceedWithInterpretation(user);
//       if (!authCheck.canProceed) {
//         console.log(`[${requestTimestamp}] User ${user_id} blocked: ${authCheck.reason}`);

//         let userFriendlyMessage;
//         let actionRequired;

//         if (authCheck.subscriptionStatus?.reason === 'Subscription has expired') {
//           const d = new Date(authCheck.subscriptionStatus.expiryDate).toLocaleDateString();
//           userFriendlyMessage = `Your subscription expired on ${d} and you have no remaining credits.`;
//           actionRequired = 'Renew your subscription for unlimited interpretations, or purchase interpretation credits for pay-per-use access.';
//         } else if (authCheck.subscriptionStatus?.reason === 'Subscription is not active') {
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
//             hasActiveSubscription: authCheck.subscriptionStatus?.isValid || false,
//             subscriptionExpired: authCheck.subscriptionStatus?.reason === 'Subscription has expired',
//           },
//         });
//       }

//       console.log(`[${requestTimestamp}] User ${user_id} authorized: ${authCheck.reason}`);
//     } catch (userError) {
//       console.error(`[${requestTimestamp}] User check error:`, userError);
//       return res.status(500).json({
//         success: false,
//         message: "We're having trouble verifying your account. Please try again in a moment.",
//         error: 'User verification failed',
//       });
//     }

//     // ── 2. Capture auth decision once (prevents stale re-check race) ─────────
//     const authDecision = canProceedWithInterpretation(user);
//     const shouldDecrementCredits = authDecision.useCredits;

//     // ── 3. Decrypt lab text ──────────────────────────────────────────────────
//     let labText;
//     try {
//       labText = decrypt(encryptedLabText, clientId);
//       console.log(`[${requestTimestamp}] Decryption OK, text length: ${labText.length}`);
//     } catch (decryptError) {
//       console.error(`[${requestTimestamp}] Decryption error: ${decryptError.message}`);
//       return res.status(400).json({
//         success: false,
//         message: "We couldn't process your lab test data. Please try uploading again.",
//         error: 'Failed to decrypt data',
//         details: decryptError.message,
//       });
//     }

//     // ── 4. Interpret with AI — returns styled HTML document ──────────────────
//     let actualTestType, interpretation, isValidTest;
//     try {
//       ({ testType: actualTestType, interpretation, isValidTest } = await interpretLabText(labText.trim()));
//       console.log(`[${requestTimestamp}] AI complete. testType: ${actualTestType}, valid: ${isValidTest}`);
//     } catch (aiError) {
//       console.error(`[${requestTimestamp}] AI service error:`, aiError);
//       return res.status(502).json({
//         success: false,
//         message: 'Our AI analysis service is temporarily unavailable. Please try again in a few minutes.',
//         error: 'Interpretation service failed',
//         details: aiError.message || 'Unknown error from AI service',
//       });
//     }

//     // ── 5. Handle invalid test ───────────────────────────────────────────────
//     // Even for invalid inputs the AI returns a styled HTML error card.
//     // We encrypt and return it so the frontend can render a rich error screen.
//     // Credits are NOT decremented for invalid tests.
//     if (!isValidTest) {
//       console.log(`[${requestTimestamp}] Invalid test — returning styled HTML error card`);
//       let encryptedErrorHtml;
//       try {
//         encryptedErrorHtml = encrypt(interpretation, clientId);
//       } catch {
//         return res.status(422).json({
//           success: false,
//           message: "We couldn't recognize this as a valid lab test result.",
//           details: "Please upload a clear image showing test names, values, and reference ranges.",
//           testType: 'Unknown',
//           isValidTest: false,
//           timestamp: requestTimestamp,
//         });
//       }

//       return res.status(422).json({
//         success: false,
//         testType: 'Unknown',
//         isValidTest: false,
//         interpretationFormat: 'html',
//         encryptedInterpretation: encryptedErrorHtml, // decrypt → render the HTML error card
//         timestamp: requestTimestamp,
//       });
//     }

//     // ── 6. Encrypt the styled HTML interpretation ────────────────────────────
//     // This must succeed before we touch the user's credits.
//     let encryptedResponse;
//     try {
//       encryptedResponse = encrypt(interpretation, clientId);
//       console.log(`[${requestTimestamp}] Response HTML encrypted`);
//     } catch (encryptError) {
//       console.error(`[${requestTimestamp}] Response encryption failed:`, encryptError);
//       // Do NOT decrement credits — user got nothing
//       return res.status(500).json({
//         success: false,
//         message: 'Something went wrong while preparing your results. Please try again.',
//         error: 'Response encryption failed',
//       });
//     }

//     // ── 7. Atomically decrement credits (only after successful encryption) ───
//     let updatedRemainingInterpretations = user.singleLabInterpretationsRemaining;

//     if (shouldDecrementCredits) {
//       try {
//         // Conditional update prevents double-spend if concurrent requests race
//         const updatedUser = await User.findOneAndUpdate(
//           { _id: user_id, singleLabInterpretationsRemaining: { $gt: 0 } },
//           { $inc: { singleLabInterpretationsRemaining: -1 }, updatedAt: new Date() },
//           { new: true }
//         );

//         if (!updatedUser) {
//           // Credits hit 0 between our check and this write (race condition edge case)
//           console.error(`[${requestTimestamp}] Atomic decrement found 0 credits for ${user_id} — possible race`);
//           // User already got the result; log for manual reconciliation
//         } else {
//           updatedRemainingInterpretations = updatedUser.singleLabInterpretationsRemaining;
//           console.log(`[${requestTimestamp}] Credits decremented for ${user_id}. Remaining: ${updatedRemainingInterpretations}`);
//         }
//       } catch (updateError) {
//         // Non-fatal — user receives result; log for reconciliation
//         console.error(`[${requestTimestamp}] Credit decrement DB error:`, updateError);
//       }
//     } else {
//       console.log(`[${requestTimestamp}] Subscription user ${user_id} — no credits decremented`);
//     }

//     // ── 8. Persist test type for analytics (non-fatal) ──────────────────────
//     try {
//       await Test.create({ testType: actualTestType, timestamp: new Date() });
//     } catch (dbError) {
//       console.error(`[${requestTimestamp}] Analytics DB write failed:`, dbError);
//     }

//     // ── 9. Respond ───────────────────────────────────────────────────────────
//     const subscriptionStatus = checkSubscriptionStatus(user);

//     const responseData = {
//       success: true,
//       testType: actualTestType,
//       encryptedInterpretation: encryptedResponse,
//       // Tells the frontend what to expect after decryption:
//       //   "html" → render in WebView / pass to PDF renderer
//       interpretationFormat: 'html',
//       isValidTest: true,
//       timestamp: requestTimestamp,
//       usage: {
//         method: shouldDecrementCredits ? 'credits' : 'subscription',
//         creditsRemaining: updatedRemainingInterpretations,
//         message: shouldDecrementCredits
//           ? `Analysis complete! You have ${updatedRemainingInterpretations} interpretation credit(s) remaining.`
//           : 'Analysis complete! Used your active subscription — no credits deducted.',
//       },
//     };

//     if (subscriptionStatus.isValid) {
//       responseData.subscription = {
//         isActive: true,
//         plan: subscriptionStatus.packageType,
//         expiresOn: new Date(subscriptionStatus.expiryDate).toLocaleDateString(),
//         status: 'Your subscription is active and includes unlimited lab interpretations.',
//       };
//     }

//     res.status(200).json(responseData);

//   } catch (error) {
//     const reqClientId = req.body?.clientId ? req.body.clientId.substring(0, 8) + '...' : 'unknown';
//     const reqUserId = req.body?.user_id || 'unknown';
//     console.error(`[${new Date().toISOString()}] Unhandled error — clientId: ${reqClientId}, user_id: ${reqUserId}:`, error);
//     res.status(500).json({
//       success: false,
//       message: "Something went wrong while processing your request. Our team has been notified and we're working to fix this.",
//       error: 'Internal server error',
//     });
//   }
// };

const crypto = require('crypto');
const { interpretLabText } = require('../services/openaiService');
const Test = require('../models/test');
const User = require('../models/user');

// Configuration constants
const MAX_ENCRYPTED_SIZE = 5 * 1024 * 1024; // 5MB max
const PBKDF2_ITERATIONS = 600000; // OWASP 2023 recommendation
const SERVER_ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || 'CHANGE_THIS_IN_PRODUCTION';

// Validate critical environment variables at startup
if (!SERVER_ENCRYPTION_SECRET || SERVER_ENCRYPTION_SECRET === 'CHANGE_THIS_IN_PRODUCTION') {
  console.error('CRITICAL: ENCRYPTION_SECRET not set in environment variables!');
  process.exit(1);
}

// ─── Encryption helpers ────────────────────────────────────────────────────────

/**
 * Encrypt text using AES-256-CBC with HMAC authentication
 * @param {string} text - Plain text to encrypt
 * @param {string} clientId - Client identifier (mixed with server secret)
 * @returns {string} Base64 encoded encrypted data
 */
function encrypt(text, clientId) {
  try {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(16);
    
    // Derive keys using client ID + server secret for added security
    const keyMaterial = crypto.pbkdf2Sync(
      `${clientId}:${SERVER_ENCRYPTION_SECRET}`,
      salt,
      PBKDF2_ITERATIONS,
      64, // 64 bytes = 512 bits for both keys
      'sha256'
    );
    
    const encKey = keyMaterial.subarray(0, 32);
    const hmacKey = keyMaterial.subarray(32, 64);

    const cipher = crypto.createCipheriv('aes-256-cbc', encKey, iv);
    let encrypted = cipher.update(text, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    const hmac = crypto.createHmac('sha256', hmacKey);
    hmac.update(salt);
    hmac.update(iv);
    hmac.update(encrypted);
    const authTag = hmac.digest();

    return Buffer.concat([salt, iv, authTag, encrypted]).toString('base64');
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt encrypted data with HMAC verification
 * @param {string} encryptedData - Base64 encoded encrypted data
 * @param {string} clientId - Client identifier (mixed with server secret)
 * @returns {string} Decrypted plain text
 */
function decrypt(encryptedData, password) {
  try {
    const data = Buffer.from(encryptedData, 'base64');
    if (data.length < 64) throw new Error('Invalid encrypted data length');

    const salt = data.subarray(0, 16);
    const iv = data.subarray(16, 32);
    const authTag = data.subarray(32, 64);
    const encrypted = data.subarray(64);

    // Derive keys using client ID + server secret
    const keyMaterial = crypto.pbkdf2Sync(
      `${password}:${SERVER_ENCRYPTION_SECRET}`,
      salt,
      PBKDF2_ITERATIONS,
      64,
      'sha256'
    );
    
    const encKey = keyMaterial.subarray(0, 32);
    const hmacKey = keyMaterial.subarray(32, 64);

    const hmac = crypto.createHmac('sha256', hmacKey);
    hmac.update(salt);
    hmac.update(iv);
    hmac.update(encrypted);
    const expectedTag = hmac.digest();

    if (!crypto.timingSafeEqual(authTag, expectedTag)) {
      throw new Error('Authentication failed - data may be tampered');
    }

    const decipher = crypto.createDecipheriv('aes-256-cbc', encKey, iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

// ─── Subscription helpers ──────────────────────────────────────────────────────

function checkSubscriptionStatus(user) {
  const now = new Date();
  
  if (!user.subscription) {
    return { 
      isValid: false, 
      reason: 'No subscription found',
      packageType: null,
      expiryDate: null
    };
  }

  if (user.subscription.expiryDate) {
    const expiryDate = new Date(user.subscription.expiryDate);
    if (expiryDate < now) {
      return { 
        isValid: false, 
        reason: 'Subscription has expired', 
        expiryDate: user.subscription.expiryDate,
        packageType: user.subscription.packageType
      };
    }
    return { 
      isValid: true, 
      packageType: user.subscription.packageType, 
      expiryDate: user.subscription.expiryDate,
      reason: 'Active subscription'
    };
  }

  if (user.subscription.isSubscribed) {
    return { 
      isValid: true, 
      packageType: user.subscription.packageType, 
      expiryDate: user.subscription.expiryDate,
      reason: 'Active subscription'
    };
  }

  return { 
    isValid: false, 
    reason: 'Subscription is not active',
    packageType: null,
    expiryDate: null
  };
}

function canProceedWithInterpretation(user) {
  const subscriptionStatus = checkSubscriptionStatus(user);

  if (user.singleLabInterpretationsRemaining > 0) {
    return { 
      canProceed: true, 
      useCredits: true, 
      reason: 'Using remaining lab interpretation credits',
      subscriptionStatus
    };
  }

  if (subscriptionStatus.isValid) {
    return {
      canProceed: true,
      useCredits: false,
      reason: 'Active subscription allows unlimited interpretations',
      subscriptionStatus,
    };
  }

  return { 
    canProceed: false, 
    reason: 'No remaining interpretations and no active subscription', 
    subscriptionStatus 
  };
}

// ─── Input Validation ──────────────────────────────────────────────────────────

function validateInput(body) {
  const { encryptedLabText, clientId, user_id } = body;
  
  if (!encryptedLabText || typeof encryptedLabText !== 'string') {
    return { valid: false, error: 'encryptedLabText is required and must be a string' };
  }
  
  if (!clientId || typeof clientId !== 'string' || clientId.length < 8) {
    return { valid: false, error: 'clientId is required and must be at least 8 characters' };
  }
  
  if (!user_id || typeof user_id !== 'string') {
    return { valid: false, error: 'user_id is required and must be a string' };
  }
  
  // Validate MongoDB ObjectId format (24 hex characters)
  if (!/^[0-9a-fA-F]{24}$/.test(user_id)) {
    return { valid: false, error: 'user_id must be a valid MongoDB ObjectId' };
  }
  
  // Check size limit to prevent DoS
  if (encryptedLabText.length > MAX_ENCRYPTED_SIZE) {
    return { valid: false, error: 'Encrypted data exceeds maximum allowed size (5MB)' };
  }
  
  return { valid: true };
}

// ─── Controller ────────────────────────────────────────────────────────────────

/**
 * Process and interpret lab results.
 *
 * CRITICAL SECURITY IMPROVEMENTS:
 * - Input validation with size limits
 * - Stronger encryption (600K PBKDF2 iterations + server secret)
 * - Atomic credit decrement BEFORE AI call to prevent race conditions
 * - Proper error handling and rollback on failures
 * - Request timeout handling
 */
exports.interpretLabResults = async (req, res) => {
  const requestTimestamp = new Date().toISOString();
  const requestId = crypto.randomBytes(8).toString('hex');
  
  try {
    const { encryptedLabText, clientId, testType: clientReportedTestType, user_id } = req.body;

    console.log(`[${requestTimestamp}] [${requestId}] New interpretation request`);

    // ── 1. Input Validation ─────────────────────────────────────────────────
    const validation = validateInput(req.body);
    if (!validation.valid) {
      console.log(`[${requestTimestamp}] [${requestId}] Validation failed: ${validation.error}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid request data. Please check your input and try again.',
        error: validation.error,
      });
    }

    console.log(`[${requestTimestamp}] [${requestId}] ClientId: ${clientId.substring(0, 8)}..., UserId: ${user_id}`);
    console.log(`[${requestTimestamp}] [${requestId}] Encrypted data size: ${encryptedLabText.length} bytes`);
    if (clientReportedTestType) {
      console.log(`[${requestTimestamp}] [${requestId}] Client reported test type: ${clientReportedTestType}`);
    }

    // ── 2. Verify user & authorization ──────────────────────────────────────
    let user;
    try {
      user = await User.findById(user_id);
      if (!user) {
        console.log(`[${requestTimestamp}] [${requestId}] User not found: ${user_id}`);
        return res.status(404).json({
          success: false,
          message: "We couldn't find your account. Please make sure you're logged in and try again.",
          error: 'User not found',
        });
      }

      const authCheck = canProceedWithInterpretation(user);
      if (!authCheck.canProceed) {
        console.log(`[${requestTimestamp}] [${requestId}] User ${user_id} unauthorized: ${authCheck.reason}`);

        let userFriendlyMessage;
        let actionRequired;

        if (authCheck.subscriptionStatus.reason === 'Subscription has expired') {
          const d = new Date(authCheck.subscriptionStatus.expiryDate).toLocaleDateString();
          userFriendlyMessage = `Your subscription expired on ${d} and you have no remaining credits.`;
          actionRequired = 'Renew your subscription for unlimited interpretations, or purchase interpretation credits for pay-per-use access.';
        } else if (authCheck.subscriptionStatus.reason === 'Subscription is not active') {
          userFriendlyMessage = 'Your subscription is currently inactive and you have no remaining credits.';
          actionRequired = 'Please reactivate your subscription or purchase interpretation credits to continue.';
        } else {
          userFriendlyMessage = 'You have used all your lab interpretation credits and do not have an active subscription.';
          actionRequired = 'Purchase more interpretation credits, or subscribe to our plan for unlimited lab interpretations.';
        }

        return res.status(403).json({
          success: false,
          message: userFriendlyMessage,
          actionRequired,
          currentStatus: {
            remainingCredits: user.singleLabInterpretationsRemaining,
            hasActiveSubscription: authCheck.subscriptionStatus.isValid || false,
            subscriptionExpired: authCheck.subscriptionStatus.reason === 'Subscription has expired',
          },
        });
      }

      console.log(`[${requestTimestamp}] [${requestId}] User ${user_id} authorized: ${authCheck.reason}`);
    } catch (userError) {
      console.error(`[${requestTimestamp}] [${requestId}] User check error:`, userError);
      return res.status(500).json({
        success: false,
        message: "We're having trouble verifying your account. Please try again in a moment.",
        error: 'User verification failed',
      });
    }

    // ── 3. Capture auth decision and atomically reserve credit if needed ────
    const authDecision = canProceedWithInterpretation(user);
    const shouldDecrementCredits = authDecision.useCredits;
    let creditReserved = false;
    let originalCreditCount = user.singleLabInterpretationsRemaining;

    if (shouldDecrementCredits) {
      try {
        // CRITICAL FIX: Atomically decrement BEFORE doing expensive AI call
        // This prevents race conditions where multiple concurrent requests
        // could all pass the check and consume credits they don't have
        const updatedUser = await User.findOneAndUpdate(
          { 
            _id: user_id, 
            singleLabInterpretationsRemaining: { $gt: 0 } 
          },
          { 
            $inc: { singleLabInterpretationsRemaining: -1 },
            updatedAt: new Date() 
          },
          { new: true }
        );

        if (!updatedUser) {
          // Credits hit 0 between our check and this write (race condition)
          console.log(`[${requestTimestamp}] [${requestId}] Race condition: credits depleted for ${user_id}`);
          return res.status(403).json({
            success: false,
            message: 'Your interpretation credits were just used up. Please purchase more credits or subscribe to continue.',
            currentStatus: {
              remainingCredits: 0,
              hasActiveSubscription: false,
            },
          });
        }

        creditReserved = true;
        user = updatedUser; // Update user object
        console.log(`[${requestTimestamp}] [${requestId}] Credit reserved for ${user_id}. Remaining: ${updatedUser.singleLabInterpretationsRemaining}`);
      } catch (updateError) {
        console.error(`[${requestTimestamp}] [${requestId}] Credit reservation failed:`, updateError);
        return res.status(500).json({
          success: false,
          message: 'Unable to process your request at this time. Please try again.',
          error: 'Credit reservation failed',
        });
      }
    }

    // ── 4. Decrypt lab text ──────────────────────────────────────────────────
    let labText;
    try {
      labText = decrypt(encryptedLabText, clientId);
      console.log(`[${requestTimestamp}] [${requestId}] Decryption successful, text length: ${labText.length}`);
    } catch (decryptError) {
      console.error(`[${requestTimestamp}] [${requestId}] Decryption error: ${decryptError.message}`);
      
      // ROLLBACK: Restore credit if we decremented it
      if (creditReserved) {
        await rollbackCredit(user_id, requestId, requestTimestamp);
      }
      
      return res.status(400).json({
        success: false,
        message: "We couldn't process your lab test data. Please try uploading again.",
        error: 'Failed to decrypt data',
        details: decryptError.message,
      });
    }

    // ── 5. Interpret with AI ─────────────────────────────────────────────────
    let actualTestType, structuredReport, isValidTest;
    try {
      console.log(`[${requestTimestamp}] [${requestId}] Calling AI service...`);
      ({ testType: actualTestType, structuredReport, isValidTest } = await interpretLabText(labText.trim(), requestId));
      console.log(`[${requestTimestamp}] [${requestId}] AI complete. testType: ${actualTestType}, valid: ${isValidTest}`);
    } catch (aiError) {
      console.error(`[${requestTimestamp}] [${requestId}] AI service error:`, aiError);
      
      // ROLLBACK: Restore credit if we decremented it
      if (creditReserved) {
        await rollbackCredit(user_id, requestId, requestTimestamp);
      }
      
      // Distinguish between different AI error types
      let errorMessage = 'Our AI analysis service is temporarily unavailable. Please try again in a few minutes.';
      let statusCode = 502;
      
      if (aiError.message.includes('rate limit')) {
        errorMessage = 'We are experiencing high demand. Please try again in a moment.';
        statusCode = 429;
      } else if (aiError.message.includes('timeout')) {
        errorMessage = 'The analysis is taking longer than expected. Please try again.';
        statusCode = 504;
      }
      
      return res.status(statusCode).json({
        success: false,
        message: errorMessage,
        error: 'Interpretation service failed',
      });
    }

    // ── 6. Encrypt the structured report ─────────────────────────────────────
    let encryptedResponse;
    try {
      encryptedResponse = encrypt(JSON.stringify(structuredReport), clientId);
      console.log(`[${requestTimestamp}] [${requestId}] Response encrypted successfully`);
    } catch (encryptError) {
      console.error(`[${requestTimestamp}] [${requestId}] Response encryption failed:`, encryptError);
      
      // ROLLBACK: Restore credit if we decremented it
      if (creditReserved) {
        await rollbackCredit(user_id, requestId, requestTimestamp);
      }
      
      return res.status(500).json({
        success: false,
        message: 'Something went wrong while preparing your results. Please try again.',
        error: 'Response encryption failed',
      });
    }

    // ── 7. Persist test type for analytics (non-fatal) ──────────────────────
    try {
      await Test.create({ 
        testType: actualTestType, 
        userId: user_id,
        timestamp: new Date(),
        requestId
      });
    } catch (dbError) {
      // Log but don't fail the request
      console.error(`[${requestTimestamp}] [${requestId}] Analytics DB write failed:`, dbError);
      // TODO: Send to retry queue or alerting system
    }

    // ── 8. Respond ───────────────────────────────────────────────────────────
    const subscriptionStatus = checkSubscriptionStatus(user);

    const responseData = {
      success: true,
      testType: actualTestType,
      encryptedInterpretation: encryptedResponse,
      interpretationFormat: 'structured_json',
      isValidTest,
      timestamp: requestTimestamp,
      requestId,
      usage: {
        method: shouldDecrementCredits ? 'credits' : 'subscription',
        creditsRemaining: user.singleLabInterpretationsRemaining,
        creditsUsed: shouldDecrementCredits ? 1 : 0,
        message: shouldDecrementCredits
          ? `Analysis complete! You have ${user.singleLabInterpretationsRemaining} interpretation credit(s) remaining.`
          : 'Analysis complete! Used your active subscription — no credits deducted.',
      },
    };

    if (subscriptionStatus.isValid) {
      responseData.subscription = {
        isActive: true,
        plan: subscriptionStatus.packageType,
        expiresOn: subscriptionStatus.expiryDate ? new Date(subscriptionStatus.expiryDate).toLocaleDateString() : null,
        status: 'Your subscription is active and includes unlimited lab interpretations.',
      };
    }

    console.log(`[${requestTimestamp}] [${requestId}] Request completed successfully`);
    res.status(200).json(responseData);

  } catch (error) {
    const reqClientId = req.body?.clientId ? req.body.clientId.substring(0, 8) + '...' : 'unknown';
    const reqUserId = req.body?.user_id || 'unknown';
    console.error(`[${requestTimestamp}] [${requestId}] Unhandled error — clientId: ${reqClientId}, user_id: ${reqUserId}:`, error);
    
    // TODO: Send to error tracking service (Sentry, etc.)
    
    res.status(500).json({
      success: false,
      message: "Something went wrong while processing your request. Our team has been notified and we're working to fix this.",
      error: 'Internal server error',
      requestId, // Include for support tickets
    });
  }
};

/**
 * Helper function to rollback credit on failure
 */
async function rollbackCredit(userId, requestId, timestamp) {
  try {
    const rolledBack = await User.findByIdAndUpdate(
      userId,
      { 
        $inc: { singleLabInterpretationsRemaining: 1 },
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (rolledBack) {
      console.log(`[${timestamp}] [${requestId}] Credit rollback successful for ${userId}. New balance: ${rolledBack.singleLabInterpretationsRemaining}`);
    } else {
      console.error(`[${timestamp}] [${requestId}] CRITICAL: Credit rollback failed - user not found: ${userId}`);
      // TODO: Alert ops team for manual reconciliation
    }
  } catch (rollbackError) {
    console.error(`[${timestamp}] [${requestId}] CRITICAL: Credit rollback error for ${userId}:`, rollbackError);
    // TODO: Send to reconciliation queue
  }
}