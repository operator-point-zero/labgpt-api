// services/openaiService.js
const aiProvider = require('./aiService'); // Use the new provider-switching service

// Validate required environment keys at startup
if (process.env.LLM_PROVIDER === 'openai' && !process.env.OPENAI_API_KEY) {
  console.error('CRITICAL: LLM_PROVIDER is "openai" but OPENAI_API_KEY is not set!');
  process.exit(1);
}
if (process.env.LLM_PROVIDER === 'gemini' && !process.env.GEMINI_API_KEY) {
    console.error('CRITICAL: LLM_PROVIDER is "gemini" but GEMINI_API_KEY is not set!');
    process.exit(1);
}
// Default to Gemini if LLM_PROVIDER is not set, check for its key
if (!process.env.LLM_PROVIDER && !process.env.GEMINI_API_KEY) {
    console.error('CRITICAL: LLM_PROVIDER is not set (defaulting to Gemini) but GEMINI_API_KEY is not set!');
    process.exit(1);
}


// Configuration with validation
function getConfig() {
  const temperature = process.env.OPENAI_TEMPERATURE 
    ? parseFloat(process.env.OPENAI_TEMPERATURE) 
    : 0.3;
  
  const maxTokens = process.env.OPENAI_MAX_TOKENS 
    ? parseInt(process.env.OPENAI_MAX_TOKENS, 10) 
    : 6000;
  
  // Model is now handled by the provider, but we can pass it as an option
  const model = process.env.OPENAI_MODEL || undefined; 
  
  // Validate ranges
  if (temperature < 0 || temperature > 2) {
    console.warn(`Invalid OPENAI_TEMPERATURE: ${temperature}. Using 0.3`);
    return { temperature: 0.3, maxTokens, model };
  }
  
  return { temperature, maxTokens, model };
}

// Input sanitization (remains unchanged)
function sanitizeInput(text) {
  return text
    .replace(/###\s*SYSTEM/gi, '[SYSTEM]')
    .replace(/###\s*ASSISTANT/gi, '[ASSISTANT]')
    .replace(/```json/gi, 'JSON')
    .slice(0, 50000);
}

// System prompt remains the core logic for this specific service
const SYSTEM_PROMPT = `You are a medical assistant that analyzes lab/diagnostic reports and returns structured JSON for patient-friendly display.

## CRITICAL RULES
1. PRIVACY: Never include patient names, DOB, IDs, addresses in output
2. OUTPUT: Return ONLY valid JSON, no markdown, no extra text
3. REFERENCES: Always provide reference ranges using medical knowledge if not in report

## JSON SCHEMA (all fields required unless noted optional)

{
  "meta": {
    "testType": "Specific test name (e.g., 'Complete Blood Count')",
    "format": "structured | narrative | invalid",
    "isValidTest": true | false,
    "overallConclusion": "Normal | Abnormal | Requires Attention | Review Needed",
    "conclusionColor": "#16A34A=normal | #DC2626=abnormal | #D97706=attention | #2563EB=review",
    "summaryText": "1-2 sentence plain summary with specific findings",
    "reportDate": "Date from report or null"
  },
  "findings": [
    {
      "id": "camelCase unique (e.g., 'hemoglobin', 'wbc')",
      "parameter": "Human-readable name",
      "value": "Measured value with unit (e.g., '11.2 g/dL')",
      "referenceRange": "Normal range (REQUIRED - use medical knowledge if missing)",
      "referenceSource": "report | medical_guidelines",
      "status": "normal | low | high | critical_low | critical_high",
      "statusColor": "#16A34A | #2563EB | #D97706 | #DC2626 | #7C3AED",
      "shortExplanation": "What this result means for the patient (1 sentence)",
      "whatItMeasures": "Biological purpose in plain language (1-2 sentences)",
      "whatYourResultMeans": "Specific interpretation with actual value vs range (1-2 sentences)",
      "whyItMatters": "Health impact - symptoms/risks (1-2 sentences)",
      "analogy": "Original memorable real-world comparison (1 sentence)",
      "patientMessage": "Warm direct message about this finding (2-3 sentences)"
    }
  ],
  "sections": {
    "whatThisMeans": {
      "paragraphs": ["Holistic narrative (3+ sentences)", "Address abnormals specifically", "Optional: context/borderline values"]
    },
    "keyTakeaways": {
      "items": [
        {
          "text": "Specific point with parameter names and values",
          "icon": "check | warning | info | priority_high",
          "color": "#16A34A | #DC2626 | #2563EB | #D97706"
        }
      ]
    },
    "doctorNote": {
      "text": "3-5 sentence follow-up recommendation (warm, non-diagnostic, specific)",
      "urgency": "routine | soon | urgent",
      "urgencyLabel": "Routine Follow-Up | See Doctor Soon | Seek Prompt Care"
    }
  }
}

## INVALID INPUT
For non-medical content (receipts, menus, gibberish), return:
{
  "meta": {
    "testType": "Unknown",
    "format": "invalid",
    "isValidTest": false,
    "overallConclusion": null,
    "conclusionColor": null,
    "summaryText": "This does not appear to be a medical test result. Please upload a clear lab report.",
    "reportDate": null
  },
  "findings": [],
  "sections": {}
}

RETURN ONLY THE JSON OBJECT.`;

/**
 * Analyze lab or diagnostic report text and return structured JSON.
 * This function's signature and behavior remain IDENTICAL to the outside world.
 * Internally, it now uses the swappable AI provider.
 * @param {string} medicalText - Lab/diagnostic text to analyze
 * @param {string} requestId - Request tracking ID
 * @returns {Promise<{ testType: string, structuredReport: object, isValidTest: boolean }>}
 */
exports.interpretLabText = async (medicalText, requestId = 'unknown') => {
  const startTime = Date.now();
  
  try {
    const sanitized = sanitizeInput(medicalText);
    if (sanitized.length < 10) {
      throw new Error('Input too short to be a valid medical report');
    }
    
    const config = getConfig();
    const llmProviderName = process.env.LLM_PROVIDER || 'gemini';

    console.log(`[${requestId}] Calling LLM Provider: ${llmProviderName}`);

    // *** REFACTORED PART ***
    // Instead of calling openai.chat.completions.create directly,
    // we now call the generic generate() method of our selected provider.
    const rawResponse = await aiProvider.generate(
      `Analyze this medical text and return structured JSON:\n\n${sanitized}`,
      {
        systemPrompt: SYSTEM_PROMPT,
        model: config.model, // Pass model override if present
        temperature: config.temperature,
        maxTokens: config.maxTokens
      }
    );
    // *** END REFACTORED PART ***

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] LLM response received in ${duration}ms`);
    
    if (!rawResponse) {
        throw new Error('AI provider returned an empty response.');
    }

    let structuredReport;
    try {
      structuredReport = JSON.parse(rawResponse);
    } catch (parseErr) {
      console.warn(`[${requestId}] Initial JSON parse failed, attempting cleanup`);
      const cleaned = rawResponse
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/m, '')
        .trim();
      
      try {
        structuredReport = JSON.parse(cleaned);
      } catch (secondErr) {
        console.error(`[${requestId}] Failed to parse LLM JSON response after cleanup:`, secondErr.message);
        console.error(`[${requestId}] Raw response preview:`, rawResponse.substring(0, 500));
        throw new Error('AI returned malformed JSON. Please try again.');
      }
    }

    // Response validation logic remains unchanged
    if (!structuredReport.meta || typeof structuredReport.meta !== 'object') {
      console.error(`[${requestId}] Invalid response structure - missing meta object`);
      throw new Error('AI returned invalid response structure');
    }

    const testType = structuredReport.meta.testType || 'Unknown';
    const isValidTest = structuredReport.meta.isValidTest === true;

    if (isValidTest) {
      if (!Array.isArray(structuredReport.findings)) {
        throw new Error('AI returned invalid findings structure');
      }
      if (!structuredReport.sections || typeof structuredReport.sections !== 'object') {
        throw new Error('AI returned invalid sections structure');
      }
    }

    console.log(`[${requestId}] Interpretation successful - Type: ${testType}, Valid: ${isValidTest}, Findings: ${structuredReport.findings?.length || 0}`);

    return { testType, structuredReport, isValidTest };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] Error during LLM interpretation after ${duration}ms:`, error.message);
    // Re-throw a user-friendly error. The specific provider error is already logged.
    throw new Error(`Lab report analysis failed. Reason: ${error.message}`);
  }
};