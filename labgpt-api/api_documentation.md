# LabGPT API Documentation

This document outlines the API endpoints for the LabGPT backend, including expected requests and responses.

## Public Routes (No Authentication Required)

### `GET /ping`

A simple endpoint to check if the API is alive.

**Response `200 OK`**

```json
{
  "status": "ok",
  "timestamp": "2024-05-21T10:00:00.000Z",
  "message": "🧪 LabGPT API is alive!"
}
```

### `GET /api/status`

Provides a detailed status of the API, including database connection, environment variables, and memory usage.

**Response `200 OK` (Healthy)**

```json
{
  "status": "healthy",
  "timestamp": "2024-05-21T10:00:00.000Z",
  "uptime": {
    "seconds": 120,
    "formatted": "2m 0s"
  },
  "database": {
    "status": "connected",
    "statusCode": 1,
    "statusText": "connected"
  },
  "environment": {
    "node_version": "v18.17.1",
    "node_env": "development",
    "port": 3000
  },
  "configuration": {
    "openai_configured": true,
    "encryption_configured": true,
    "database_configured": true,
    "all_valid": true
  },
  "memory": {
    "rss": "100 MB",
    "heapTotal": "50 MB",
    "heapUsed": "30 MB",
    "external": "10 MB"
  },
  "version": "2.0.0"
}
```

**Response `503 Service Unavailable` (Unhealthy)**

The response will be similar, but the `status` will be "unhealthy" and there may be a `warnings` array.

### `GET /`

A simple message indicating the API is up and running.

**Response `200 OK`**

```
🧪 LabGPT API is up and running!
```

### `POST /api/auth/oauth`

Authenticates a user via OAuth. Creates a new user if they don't exist.

**Request Body**

```json
{
  "email": "user@example.com",
  "name": "Test User",
  "profilePicture": "https://example.com/profile.jpg",
  "provider": "google",
  "providerId": "1234567890"
}
```

**Response `200 OK`**

```json
{
  "message": "New user created and authenticated",
  "user": {
    "_id": "60a7b1b9e6b3c2a4b8f0e1c2",
    "email": "user@example.com",
    "name": "Test User",
    "profilePicture": "https://example.com/profile.jpg",
    "provider": "google",
    "providerId": "1234567890",
    "singleLabInterpretationsRemaining": 1,
    "refreshTokens": [
      {
        "tokenHash": "somehashedtoken"
      }
    ]
  },
  "accessToken": "a.jwt.access.token"
}
```

### `POST /api/auth/refresh`

Refreshes an access token using a refresh token. The refresh token can be sent in a `refreshToken` cookie or in the request body.

**Response `200 OK`**

```json
{
  "accessToken": "a.new.jwt.access.token"
}
```

### `POST /api/auth/logout`

Logs out a user by invalidating their refresh token. The refresh token can be sent in a `refreshToken` cookie or in the request body.

**Response `200 OK`**

```json
{
  "message": "Logged out"
}
```

### `GET /api/health`

Checks the health of the API.

**Response `200 OK`**

```json
{
  "status": "ok",
  "timestamp": "2024-05-21T10:00:00.000Z",
  "environment": "development"
}
```

## Protected Routes (Authentication Required)

### `POST /api/labs`

Interprets lab results from an encrypted string.

**Request Body**

```json
{
  "encryptedLabText": "an_encrypted_string_of_lab_results",
  "clientId": "a_unique_client_identifier",
  "user_id": "a_valid_mongodb_objectid",
  "testType": "Blood Test"
}
```

**Response `200 OK`**

```json
{
  "success": true,
  "testType": "Blood Test",
  "encryptedInterpretation": "an_encrypted_string_of_the_interpretation",
  "interpretationFormat": "structured_json",
  "isValidTest": true,
  "timestamp": "2024-05-21T10:00:00.000Z",
  "requestId": "a_unique_request_id",
  "usage": {
    "method": "credits",
    "creditsRemaining": 0,
    "creditsUsed": 1,
    "message": "Analysis complete! You have 0 interpretation credit(s) remaining."
  }
}
```

### `POST /api/feedback`

Submits user feedback.

**Request Body**

```json
{
  "uid": "a_user_id",
  "name": "A User",
  "type": "bug",
  "title": "A Bug Report",
  "description": "A description of the bug.",
  "includeDeviceInfo": true,
  "timestamp": "2024-05-21T10:00:00.000Z"
}
```

**Response `201 Created`**

```json
{
  "message": "Feedback received successfully."
}
```

### `POST /api/purchases/purchase-success`

This endpoint is called after a successful purchase to update the user's profile with new credits or a subscription.

**Request Body for Credits**

```json
{
  "userId": "a_user_id",
  "purchaseType": "single_interpretation_credit",
  "transactionDetails": {
    "transactionId": "a_transaction_id",
    "amount": 10
  }
}
```

**Request Body for Subscription**

```json
{
  "userId": "a_user_id",
  "purchaseType": "subscription",
  "transactionDetails": {
    "transactionId": "a_transaction_id",
    "amount": 50,
    "packageType": "monthly"
  }
}
```

**Response `200 OK`**

```json
{
  "message": "User profile updated successfully.",
  "user": {
    // the updated user object
  }
}
```

### `GET /api/purchases/test-email`

Sends a test email to the billing user to verify the SMTP configuration.

**Response `200 OK`**

```json
{
  "message": "Test email sent successfully!"
}
```

### `GET /api/checkStatus/check-subscription-status/:userId`

Checks a user's subscription status and lab interpretation credits.

**URL Parameters**

*   `userId` (string, required): The ID of the user to check.

**Response `200 OK` (User can proceed)**

```json
{
  "success": true,
  "canProceed": true,
  "message": "User can proceed - has active subscription.",
  "userStatus": {
    "userId": "a_user_id",
    "subscription": {
      "isActive": true,
      "hasExpired": false,
      "expiryDate": "2025-05-21T10:00:00.000Z",
      "packageType": "monthly",
      "startDate": "2024-05-21T10:00:00.000Z"
    },
    "labCredits": {
      "remaining": 5,
      "hasCredits": true
    }
  }
}
```

### `POST /api/checkStatus/lab-interpretation`

A route for lab interpretation that checks for access first.

**Request Body**

```json
{
  "userId": "a_user_id",
  "labData": {
    // lab data
  }
}
```

**Response `200 OK`**

```json
{
  "message": "Lab interpretation completed successfully.",
  "interpretation": {
    "interpretationId": "interp_1684677600000",
    "userId": "a_user_id",
    "processedAt": "2024-05-21T10:00:00.000Z",
    "results": {
      "status": "completed",
      "data": {
        // lab data
      }
    }
  },
  "userStatus": {
    // user status object
  }
}
```

### `GET /api/checkStatus/user-dashboard/:userId`

Retrieves a user's dashboard data, including subscription status.

**URL Parameters**

*   `userId` (string, required): The ID of the user.

**Response `200 OK`**

```json
{
  "message": "Dashboard data retrieved successfully.",
  "user": {
    "name": "Test User",
    "email": "user@example.com",
    "profilePicture": "https://example.com/profile.jpg",
    "memberSince": "2024-05-21T10:00:00.000Z"
  },
  "subscriptionStatus": {
    // subscription status object
  },
  "canAccessServices": true
}
```

### `POST /api/checkStatus/protected-service`

An example of a protected route that uses the `requireSubscriptionOrCredits` middleware.

**Request Body**

```json
{
  "userId": "a_user_id",
  "serviceData": {
    // some data
  }
}
```

**Response `200 OK`**

```json
{
  "message": "Protected service accessed successfully.",
  "userStatus": {
    // user status object
  }
}
```
