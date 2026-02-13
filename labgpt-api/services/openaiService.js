

const OpenAI = require('openai');

// Validate API key at startup
if (!process.env.OPENAI_API_KEY) {
  console.error('CRITICAL: OPENAI_API_KEY not set in environment variables!');
  process.exit(1);
}

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000, // 60 second timeout
  maxRetries: 2,
});

// Configuration with validation
function getConfig() {
  const temperature = process.env.OPENAI_TEMPERATURE 
    ? parseFloat(process.env.OPENAI_TEMPERATURE) 
    : 0.3;
  
  const maxTokens = process.env.OPENAI_MAX_TOKENS 
    ? parseInt(process.env.OPENAI_MAX_TOKENS, 10) 
    : 6000;
  
  const model = process.env.OPENAI_MODEL || 'gpt-4o'; // Updated default model
  
  // Validate ranges
  if (temperature < 0 || temperature > 2) {
    console.warn(`Invalid OPENAI_TEMPERATURE: ${temperature}. Using 0.3`);
    return { temperature: 0.3, maxTokens, model };
  }
  
  if (maxTokens < 1000 || maxTokens > 16000) {
    console.warn(`Invalid OPENAI_MAX_TOKENS: ${maxTokens}. Using 6000`);
    return { temperature, maxTokens: 6000, model };
  }
  
  return { temperature, maxTokens, model };
}

// Input sanitization
function sanitizeInput(text) {
  // Remove potential prompt injection attempts while preserving medical data
  // Don't strip medical symbols, just neutralize obvious injection patterns
  return text
    .replace(/###\s*SYSTEM/gi, '[SYSTEM]')
    .replace(/###\s*ASSISTANT/gi, '[ASSISTANT]')
    .replace(/```json/gi, 'JSON')
    .slice(0, 50000); // Hard limit on input size
}

/**
 * DRASTICALLY SHORTENED SYSTEM PROMPT
 * Original was ~3,500 tokens (~$0.007/request). This is ~600 tokens (~$0.001/request).
 * Savings: 85% reduction in prompt costs.
 */
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

## KEY REFERENCE RANGES (Representative - use full medical knowledge)

**Hematology:** Hgb 13-17 g/dL (M), 12-15.5 (F); WBC 4.5-11 ×10³/µL; Platelets 150-400 ×10³/µL; MCV 80-100 fL

**Chemistry:** Glucose (fasting) 70-100 mg/dL; HbA1c <5.7%; Creatinine 0.6-1.2 mg/dL (M), 0.5-1.1 (F); eGFR ≥60; Na 136-145 mEq/L; K 3.5-5.0 mEq/L

**Liver:** ALT 7-56 U/L; AST 10-40 U/L; Bilirubin 0.1-1.2 mg/dL

**Lipids:** Total chol <200 mg/dL; LDL <100 mg/dL; HDL >60 mg/dL; Trig <150 mg/dL

**Thyroid:** TSH 0.4-4.0 mIU/L; Free T4 0.8-1.8 ng/dL

**Iron:** Ferritin 12-300 ng/mL (M), 12-150 (F); Serum iron 60-170 µg/dL

**Cardiac:** Troponin I <0.04 ng/mL; BNP <100 pg/mL

## STATUS CLASSIFICATION
- normal: Within range → #16A34A
- low/high: Outside range, not life-threatening → #2563EB / #D97706
- critical_low/high: Dangerous (Hgb <7, glucose <50, K <2.5 or >6.5) → #DC2626 / #7C3AED

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

## QUALITY REQUIREMENTS
- Include ALL parameters from report
- Order by importance: critical → abnormal → borderline → normal
- Explanations: 6th-grade reading level, specific values, no jargon
- Every finding needs unique analogy (no repetition)
- Reference ranges NEVER null - use medical knowledge
- No generic phrases like "consult doctor" in findings (that's doctorNote's job)

RETURN ONLY THE JSON OBJECT.`;

/**
 * Analyze lab or diagnostic report text and return structured JSON
 * @param {string} medicalText - Lab/diagnostic text to analyze
 * @param {string} requestId - Request tracking ID
 * @returns {Promise<{ testType: string, structuredReport: object, isValidTest: boolean }>}
 */
exports.interpretLabText = async (medicalText, requestId = 'unknown') => {
  const startTime = Date.now();
  
  try {
    // Sanitize input to prevent prompt injection
    const sanitized = sanitizeInput(medicalText);
    
    if (sanitized.length < 10) {
      throw new Error('Input too short to be a valid medical report');
    }
    
    const config = getConfig();
    
    console.log(`[${requestId}] Calling OpenAI - Model: ${config.model}, Temp: ${config.temperature}, MaxTokens: ${config.maxTokens}`);

    const completion = await openai.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Analyze this medical text and return structured JSON:\n\n${sanitized}`,
        },
      ],
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      response_format: { type: 'json_object' },
    });

    const duration = Date.now() - startTime;
    const usage = completion.usage;
    
    // Log token usage for cost tracking
    console.log(`[${requestId}] OpenAI response received in ${duration}ms`);
    console.log(`[${requestId}] Token usage - Prompt: ${usage.prompt_tokens}, Completion: ${usage.completion_tokens}, Total: ${usage.total_tokens}`);
    console.log(`[${requestId}] Estimated cost: $${(usage.total_tokens * 0.000002).toFixed(6)}`); // Rough estimate for gpt-4o
    
    const rawResponse = completion.choices[0].message.content;

    let structuredReport;
    try {
      structuredReport = JSON.parse(rawResponse);
    } catch (parseErr) {
      // Fallback: try stripping markdown fences
      console.warn(`[${requestId}] Initial JSON parse failed, attempting cleanup`);
      const cleaned = rawResponse
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/m, '')
        .trim();
      
      try {
        structuredReport = JSON.parse(cleaned);
      } catch (secondErr) {
        console.error(`[${requestId}] Failed to parse OpenAI JSON response after cleanup:`, secondErr.message);
        console.error(`[${requestId}] Raw response preview:`, rawResponse.substring(0, 500));
        throw new Error('AI returned malformed JSON. Please try again.');
      }
    }

    // Validate response structure
    if (!structuredReport.meta || typeof structuredReport.meta !== 'object') {
      console.error(`[${requestId}] Invalid response structure - missing meta object`);
      throw new Error('AI returned invalid response structure');
    }

    const testType = structuredReport.meta.testType || 'Unknown';
    const isValidTest = structuredReport.meta.isValidTest === true;

    // Additional validation for valid tests
    if (isValidTest) {
      if (!Array.isArray(structuredReport.findings)) {
        console.error(`[${requestId}] Invalid response - findings is not an array`);
        throw new Error('AI returned invalid findings structure');
      }
      
      if (!structuredReport.sections || typeof structuredReport.sections !== 'object') {
        console.error(`[${requestId}] Invalid response - missing sections object`);
        throw new Error('AI returned invalid sections structure');
      }
    }

    console.log(`[${requestId}] Interpretation successful - Type: ${testType}, Valid: ${isValidTest}, Findings: ${structuredReport.findings?.length || 0}`);

    return { testType, structuredReport, isValidTest };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] OpenAI API error after ${duration}ms:`, error.message);
    
    // Enhanced error handling with specific error types
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;
      
      console.error(`[${requestId}] OpenAI API HTTP ${status}:`, errorData);
      
      if (status === 429) {
        throw new Error('OpenAI rate limit exceeded - please try again in a moment');
      } else if (status === 401) {
        throw new Error('OpenAI authentication failed - invalid API key');
      } else if (status === 503) {
        throw new Error('OpenAI service temporarily unavailable');
      } else if (status >= 500) {
        throw new Error('OpenAI server error - please try again');
      }
    }
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new Error('OpenAI request timeout - analysis took too long');
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new Error('Cannot reach OpenAI API - network error');
    }
    
    // Re-throw with original message if not a known error type
    throw new Error(`OpenAI service error: ${error.message}`);
  }
};