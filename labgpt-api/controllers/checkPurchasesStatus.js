const express = require('express');
const router = express.Router();
const User = require('../models/user');

/**
 * Checks user's subscription status and lab interpretation credits
 * @param {string} userId - The user ID to check
 * @returns {Promise<Object>} - Status object with user access information
 */
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

    // Check if subscription exists and is currently marked as active
    if (user.subscription && user.subscription.isSubscribed === true) {
      // Check if subscription has expired
      if (user.subscription.expiryDate && currentDate > new Date(user.subscription.expiryDate)) {
        // Subscription has expired - update the user record
        user.subscription.isSubscribed = false;
        await user.save();
        subscriptionExpired = true;
        subscriptionActive = false;
      } else {
        subscriptionActive = true;
      }
    }

    // Check single lab interpretation credits
    const hasLabCredits = user.singleLabInterpretationsRemaining > 0;

    // Determine if user can proceed
    const canProceed = subscriptionActive || hasLabCredits;

    // Prepare response based on user's access status
    let response = {
      success: true,
      canProceed: canProceed,
      statusCode: 200,
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
    // For example:
    const interpretationResult = {
      interpretationId: `interp_${Date.now()}`,
      userId: userId,
      processedAt: new Date(),
      results: {
        // Your lab interpretation results would go here
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