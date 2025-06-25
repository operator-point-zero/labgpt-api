const express = require('express');
const router = express.Router();
const User = require('../models/user');

/**
 * Checks user's subscription status and lab interpretation credits
 * @param {string} userId - The user ID to check
 * @returns {Promise<Object>} - Status object with user access information
 */
// async function checkUserSubscriptionStatus(userId) {
//   try {
//     const user = await User.findById(userId);
    
//     if (!user) {
//       return {
//         success: false,
//         canProceed: false,
//         message: 'User not found.',
//         statusCode: 404
//       };
//     }

//     const currentDate = new Date();
//     let subscriptionExpired = false;
//     let subscriptionActive = false;

//     console.log('=== SUBSCRIPTION CHECK DEBUG ===');
//     console.log('User ID:', userId);
//     console.log('Current date:', currentDate.toISOString());
//     console.log('User subscription object:', JSON.stringify(user.subscription, null, 2));
//     console.log('Lab credits remaining:', user.singleLabInterpretationsRemaining);

//     // Check if subscription exists and is currently marked as active
//     if (user.subscription && user.subscription.isSubscribed === true) {
//       console.log('Subscription is marked as subscribed: true');
      
//       // Check if subscription has expired
//       if (user.subscription.expiryDate) {
//         // Handle both Date objects and timestamp numbers
//         let expiryDate;
//         if (typeof user.subscription.expiryDate === 'number') {
//           expiryDate = new Date(user.subscription.expiryDate);
//         } else if (user.subscription.expiryDate.$date) {
//           // Handle MongoDB date format
//           expiryDate = new Date(user.subscription.expiryDate.$date.$numberLong ? 
//             parseInt(user.subscription.expiryDate.$date.$numberLong) : 
//             user.subscription.expiryDate.$date);
//         } else {
//           expiryDate = new Date(user.subscription.expiryDate);
//         }
        
//         console.log('Parsed expiry date:', expiryDate.toISOString());
//         console.log('Current > Expiry?', currentDate > expiryDate);
        
//         if (currentDate > expiryDate) {
//           // Subscription has expired - update the user record
//           console.log('❌ Subscription EXPIRED - updating user record');
//           user.subscription.isSubscribed = false;
//           await user.save();
//           subscriptionExpired = true;
//           subscriptionActive = false;
//         } else {
//           console.log('✅ Subscription is ACTIVE');
//           subscriptionActive = true;
//         }
//       } else {
//         // No expiry date set, consider active if isSubscribed is true
//         console.log('✅ Subscription ACTIVE (no expiry date)');
//         subscriptionActive = true;
//       }
//     } else {
//       console.log('❌ Subscription not active or not found');
//     }

//     // Check single lab interpretation credits
//     const hasLabCredits = user.singleLabInterpretationsRemaining > 0;

//     console.log('📊 FINAL STATUS:');
//     console.log('Subscription active:', subscriptionActive);
//     console.log('Has lab credits:', hasLabCredits);
//     console.log('Credits remaining:', user.singleLabInterpretationsRemaining);

//     // Determine if user can proceed
//     const canProceed = subscriptionActive || hasLabCredits;
//     console.log('🚀 Can proceed:', canProceed);

//     // Prepare response based on user's access status
//     let response = {
//       success: true,
//       canProceed: canProceed,
//       statusCode: canProceed ? 200 : 403,
//       userStatus: {
//         userId: user._id,
//         subscription: {
//           isActive: subscriptionActive,
//           hasExpired: subscriptionExpired,
//           expiryDate: user.subscription?.expiryDate || null,
//           packageType: user.subscription?.packageType || null,
//           startDate: user.subscription?.startDate || null
//         },
//         labCredits: {
//           remaining: user.singleLabInterpretationsRemaining,
//           hasCredits: hasLabCredits
//         }
//       }
//     };

//     // Set appropriate message based on access status
//     if (canProceed) {
//       if (subscriptionActive && hasLabCredits) {
//         response.message = 'User can proceed - has active subscription and lab credits.';
//       } else if (subscriptionActive) {
//         response.message = 'User can proceed - has active subscription.';
//       } else if (hasLabCredits) {
//         response.message = 'User can proceed - has lab interpretation credits.';
//       }
//     } else {
//       if (subscriptionExpired) {
//         response.message = 'Access denied - subscription has expired and no lab credits remaining.';
//       } else {
//         response.message = 'Access denied - no active subscription and no lab credits remaining.';
//       }
//       response.statusCode = 403; // Forbidden
//     }

//     console.log('📤 RESPONSE BEING RETURNED:', JSON.stringify(response, null, 2));
//     console.log('=== END DEBUG ===');
//     return response;

//   } catch (error) {
//     console.error('Error checking user subscription status:', error);
//     return {
//       success: false,
//       canProceed: false,
//       message: 'Server error while checking subscription status.',
//       statusCode: 500
//     };
//   }
// }

async function checkUserSubscriptionStatus(userId) {
  try {
    const user = await User.findById(userId);
    
    if (!user) {
      return {
        success: false,
        canProceed: false,
        message: 'User not found.',
        statusCode: 404
      };
    }

    const currentDate = new Date();
    let subscriptionExpired = false;
    let subscriptionActive = false;

    console.log('=== SUBSCRIPTION CHECK DEBUG ===');
    console.log('User ID:', userId);
    console.log('Current date:', currentDate.toISOString());
    console.log('User subscription object:', JSON.stringify(user.subscription, null, 2));
    console.log('Lab credits remaining:', user.singleLabInterpretationsRemaining);

    // Check if subscription exists
    if (user.subscription) {
      console.log('Subscription object found');
      
      // Check expiry date FIRST (priority over isSubscribed flag)
      if (user.subscription.expiryDate) {
        // Handle both Date objects and timestamp numbers
        let expiryDate;
        if (typeof user.subscription.expiryDate === 'number') {
          expiryDate = new Date(user.subscription.expiryDate);
        } else if (user.subscription.expiryDate.$date) {
          // Handle MongoDB date format
          expiryDate = new Date(user.subscription.expiryDate.$date.$numberLong ? 
            parseInt(user.subscription.expiryDate.$date.$numberLong) : 
            user.subscription.expiryDate.$date);
        } else {
          expiryDate = new Date(user.subscription.expiryDate);
        }
        
        console.log('Parsed expiry date:', expiryDate.toISOString());
        console.log('Current > Expiry?', currentDate > expiryDate);
        
        if (currentDate > expiryDate) {
          // Subscription has expired
          console.log('❌ Subscription EXPIRED');
          subscriptionExpired = true;
          subscriptionActive = false;
          
          // Update the user record to reflect expired status
          if (user.subscription.isSubscribed === true) {
            user.subscription.isSubscribed = false;
            await user.save();
            console.log('Updated user record: set isSubscribed to false');
          }
        } else {
          // Subscription has NOT expired - it's active!
          console.log('✅ Subscription is ACTIVE (not expired)');
          subscriptionActive = true;
          
          // Update the user record to reflect active status if needed
          if (user.subscription.isSubscribed === false) {
            user.subscription.isSubscribed = true;
            await user.save();
            console.log('Updated user record: set isSubscribed to true');
          }
        }
      } else {
        // No expiry date - fall back to isSubscribed flag
        console.log('No expiry date found, checking isSubscribed flag');
        if (user.subscription.isSubscribed === true) {
          console.log('✅ Subscription ACTIVE (isSubscribed = true)');
          subscriptionActive = true;
        } else {
          console.log('❌ Subscription not active (isSubscribed = false)');
          subscriptionActive = false;
        }
      }
    } else {
      console.log('❌ No subscription object found');
    }

    // Check single lab interpretation credits
    const hasLabCredits = user.singleLabInterpretationsRemaining > 0;

    console.log('📊 FINAL STATUS:');
    console.log('Subscription active:', subscriptionActive);
    console.log('Has lab credits:', hasLabCredits);
    console.log('Credits remaining:', user.singleLabInterpretationsRemaining);

    // Determine if user can proceed
    const canProceed = subscriptionActive || hasLabCredits;
    console.log('🚀 Can proceed:', canProceed);

    // Prepare response based on user's access status
    let response = {
      success: true,
      canProceed: canProceed,
      statusCode: canProceed ? 200 : 403,
      userStatus: {
        userId: user._id,
        subscription: {
          isActive: subscriptionActive,
          hasExpired: subscriptionExpired,
          expiryDate: user.subscription?.expiryDate || null,
          packageType: user.subscription?.packageType || null,
          startDate: user.subscription?.startDate || null
        },
        labCredits: {
          remaining: user.singleLabInterpretationsRemaining,
          hasCredits: hasLabCredits
        }
      }
    };

    // Set appropriate message based on access status
    if (canProceed) {
      if (subscriptionActive && hasLabCredits) {
        response.message = 'User can proceed - has active subscription and lab credits.';
      } else if (subscriptionActive) {
        response.message = 'User can proceed - has active subscription.';
      } else if (hasLabCredits) {
        response.message = 'User can proceed - has lab interpretation credits.';
      }
    } else {
      if (subscriptionExpired) {
        response.message = 'Access denied - subscription has expired and no lab credits remaining.';
      } else {
        response.message = 'Access denied - no active subscription and no lab credits remaining.';
      }
      response.statusCode = 403; // Forbidden
    }

    console.log('📤 RESPONSE BEING RETURNED:', JSON.stringify(response, null, 2));
    console.log('=== END DEBUG ===');
    return response;

  } catch (error) {
    console.error('Error checking user subscription status:', error);
    return {
      success: false,
      canProceed: false,
      message: 'Server error while checking subscription status.',
      statusCode: 500
    };
  }
}

// Route to check user's subscription status
router.get('/check-subscription-status/:userId', async (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ message: 'User ID is required.' });
  }
  
  const statusCheck = await checkUserSubscriptionStatus(userId);
  return res.status(statusCheck.statusCode).json(statusCheck);
});

// Route for lab interpretation that checks access first
router.post('/lab-interpretation', async (req, res) => {
  const { userId, labData } = req.body;
  
  if (!userId) {
    return res.status(400).json({ message: 'User ID is required.' });
  }
  
  if (!labData) {
    return res.status(400).json({ message: 'Lab data is required.' });
  }
  
  // Check if user can proceed
  const statusCheck = await checkUserSubscriptionStatus(userId);
  
  if (!statusCheck.canProceed) {
    return res.status(statusCheck.statusCode).json({
      message: statusCheck.message,
      userStatus: statusCheck.userStatus
    });
  }
  
  // User can proceed - continue with lab interpretation logic
  try {
    // If using a single lab credit (not subscription), deduct it
    if (!statusCheck.userStatus.subscription.isActive && statusCheck.userStatus.labCredits.hasCredits) {
      const user = await User.findById(userId);
      user.singleLabInterpretationsRemaining -= 1;
      await user.save();
      
      console.log(`Lab credit consumed for user ${userId}. Remaining credits: ${user.singleLabInterpretationsRemaining}`);
    }
    
    // Your lab interpretation logic here...
    const interpretationResult = {
      interpretationId: `interp_${Date.now()}`,
      userId: userId,
      processedAt: new Date(),
      results: {
        status: 'completed',
        data: labData
      }
    };
    
    res.status(200).json({
      message: 'Lab interpretation completed successfully.',
      interpretation: interpretationResult,
      userStatus: statusCheck.userStatus
    });
    
  } catch (error) {
    console.error('Error processing lab interpretation:', error);
    res.status(500).json({ message: 'Server error during lab interpretation.' });
  }
});

// Route to get user dashboard data (includes subscription status)
router.get('/user-dashboard/:userId', async (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ message: 'User ID is required.' });
  }
  
  try {
    const statusCheck = await checkUserSubscriptionStatus(userId);
    
    if (!statusCheck.success) {
      return res.status(statusCheck.statusCode).json(statusCheck);
    }
    
    // Get additional user data for dashboard
    const user = await User.findById(userId).select('name email profilePicture createdAt');
    
    res.status(200).json({
      message: 'Dashboard data retrieved successfully.',
      user: {
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
        memberSince: user.createdAt
      },
      subscriptionStatus: statusCheck.userStatus,
      canAccessServices: statusCheck.canProceed
    });
    
  } catch (error) {
    console.error('Error retrieving dashboard data:', error);
    res.status(500).json({ message: 'Server error retrieving dashboard data.' });
  }
});

// Middleware function to protect routes (can be used with other routes)
const requireSubscriptionOrCredits = async (req, res, next) => {
  const userId = req.body.userId || req.params.userId;
  
  if (!userId) {
    return res.status(400).json({ message: 'User ID is required.' });
  }
  
  const statusCheck = await checkUserSubscriptionStatus(userId);
  
  if (!statusCheck.canProceed) {
    return res.status(statusCheck.statusCode).json({
      message: statusCheck.message,
      userStatus: statusCheck.userStatus
    });
  }
  
  // Add status check to request object for use in route handler
  req.userAccessStatus = statusCheck;
  next();
};

// Example of using the middleware
router.post('/protected-service', requireSubscriptionOrCredits, async (req, res) => {
  // This route is protected - user must have subscription or credits to access
  const { userId, serviceData } = req.body;
  const userStatus = req.userAccessStatus;
  
  try {
    // Your protected service logic here...
    
    res.status(200).json({
      message: 'Protected service accessed successfully.',
      userStatus: userStatus.userStatus
    });
    
  } catch (error) {
    console.error('Error in protected service:', error);
    res.status(500).json({ message: 'Server error in protected service.' });
  }
});

module.exports = router;