const express = require('express');
const router = express.Router();
const User = require('../models/user');

const crypto = require('crypto');
const { interpretLabText } = require('../services/openaiService');

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

    // Simplified subscription check logic
    if (user.subscription && user.subscription.expiryDate) {
      const expiryDate = new Date(user.subscription.expiryDate);
      if (currentDate <= expiryDate) {
        subscriptionActive = true;
      } else {
        subscriptionExpired = true;
      }
    } else if (user.subscription && user.subscription.isSubscribed) {
      subscriptionActive = true;
    }
    
    const hasLabCredits = user.singleLabInterpretationsRemaining > 0;
    const canProceed = subscriptionActive || hasLabCredits;

    return {
      success: true,
      canProceed: canProceed,
      statusCode: canProceed ? 200 : 403,
      userStatus: {
        userId: user._id,
        subscription: {
          isActive: subscriptionActive,
          hasExpired: subscriptionExpired,
        },
        labCredits: {
          remaining: user.singleLabInterpretationsRemaining,
          hasCredits: hasLabCredits
        }
      },
      message: canProceed ? 'User can proceed.' : 'Access denied.'
    };

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

const Test = require('../models/test');

// Route for lab interpretation that checks access first
router.post('/lab-interpretation', async (req, res) => {
  const { userId, labData, testType: clientReportedTestType } = req.body;
  const requestId = crypto.randomBytes(8).toString('hex');

  if (!userId || !labData) {
    return res.status(400).json({ message: 'User ID and lab data are required.' });
  }

  const statusCheck = await checkUserSubscriptionStatus(userId);

  if (!statusCheck.canProceed) {
    return res.status(statusCheck.statusCode).json({
      message: statusCheck.message,
      userStatus: statusCheck.userStatus
    });
  }

  let user;
  try {
    user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Deduct credit if not on an active subscription
    if (!statusCheck.userStatus.subscription.isActive && statusCheck.userStatus.labCredits.hasCredits) {
      user = await User.findByIdAndUpdate(userId, { $inc: { singleLabInterpretationsRemaining: -1 } }, { new: true });
      console.log(`Lab credit consumed for user ${userId}. Remaining: ${user.singleLabInterpretationsRemaining}`);
    }
    
    // Call the actual AI interpretation service
    const interpretationResult = await interpretLabText(labData, requestId);
    
    // Save to history for analytics (non-fatal)
    try {
        await Test.create({ 
            testType: interpretationResult.testType, 
            userId: userId,
            requestId 
        });
    } catch (e) { 
        console.error(`[${requestId}] Analytics history log failed:`, e); 
    }

    // Respond with the structured interpretation
    res.status(200).json({
      success: true,
      message: 'Lab interpretation completed successfully.',
      testType: interpretationResult.testType,
      interpretation: JSON.stringify(interpretationResult.structuredReport),
      isValidTest: interpretationResult.isValidTest,
      requestId: requestId,
      usage: {
        creditsRemaining: user.singleLabInterpretationsRemaining
      }
    });

  } catch (error) {
    console.error(`[${requestId}] Error processing lab interpretation:`, error);
    
    // Attempt to roll back credit on failure
    if (!statusCheck.userStatus.subscription.isActive && statusCheck.userStatus.labCredits.hasCredits) {
        try {
            await User.findByIdAndUpdate(userId, { $inc: { singleLabInterpretationsRemaining: 1 } });
            console.log(`[${requestId}] Credit rolled back for user ${userId}.`);
        } catch (rollbackError) {
            console.error(`[${requestId}] CRITICAL: Failed to roll back credit for user ${userId}:`, rollbackError);
        }
    }
    
    res.status(500).json({ 
        success: false,
        message: 'Server error during lab interpretation.',
        error: error.message 
    });
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
