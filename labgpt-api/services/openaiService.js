

const OpenAI = require('openai');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analyze lab or diagnostic report text and return interpretation
 * @param {string} medicalText
 * @returns {Promise<{ testType: string, interpretation: string, isValidTest: boolean }>}
 */
exports.interpretLabText = async (medicalText) => {
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: `
You are a clinical assistant that interprets diagnostic medical texts — including **lab results**, **imaging**, **histology**, **ECG**, **endoscopy**, and other **narrative reports** — for patients in friendly, clear language.

---

⚠️ **If the input text contains patient-identifiable information** (name, date of birth, ID, location, etc.), DO NOT include it in the response. Redact it or omit it entirely.

---

### Step 1: Identify the Specific Test

First, identify the specific test name from the content. Examples:
- "Complete Blood Count (CBC)"
- "Echocardiogram"
- "Chest X-Ray"
- "Lipid Panel"
- "Thyroid Function Test"
- "Colonoscopy Report"

Then determine the format category:
- "structured" → Mostly tabular or numeric data
- "narrative" → Descriptive/free-text reports
- "invalid" → Receipts, bills, notes, unclear content

Return this at the top in a JSON block:

\`\`\`json
{
  "testType": "Complete Blood Count (CBC)",
  "format": "structured",
  "isValidTest": true
}
\`\`\`

or:

\`\`\`json
{
  "testType": "Unknown",
  "format": "invalid",
  "isValidTest": false
}
\`\`\`

---

### Step 2: If isValidTest is true, choose the presentation format based on the format category:

---

#### 📊 For **structured** format tests, use:

## 🧪 Test Summary
- **Test Type:** <specific test name>
- **Conclusion:** <Normal / Abnormal / Review Needed>

---

## 🔍 Key Findings

| Parameter / Finding     | Value / Observation     | Reference Range (if any) | Interpretation        |
|--------------------------|-------------------------|---------------------------|------------------------|
| Hemoglobin               | 13.5 g/dL               | 13.0 – 17.0 g/dL          | ✅ Normal              |

---

## 🧑‍⚕️ What This Means
Explain the findings in everyday language.

---

## 📝 Doctor's Note (AI-Generated)
> Give a soft follow-up recommendation.

---

#### 📄 For **narrative** format tests, use:

## 🧪 Test Summary
- **Test Type:** <specific test name>
- **Conclusion:** <Brief summary of outcome>

---

## 📌 Key Observations
Summarize findings in 3–5 plain-language bullets.

- No tumor seen in the liver.
- Mild inflammation noted in the stomach lining.
- Normal heart rhythm on ECG.

---

## 🧑‍⚕️ What This Means
Break down findings in friendly, simple language. Avoid medical jargon.

---

## 📝 Doctor's Note (AI-Generated)
> Suggest next steps (e.g., "Consider follow-up imaging," or "Discuss results with your doctor.")

---

### Step 3: If isValidTest is false, explain why — briefly and clearly.
          `.trim(),
        },
        {
          role: 'user',
          content: `Analyze the following medical text:\n\n${medicalText}`,
        },
      ],
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.3,
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1200,
    });

    const rawResponse = completion.choices[0].message.content;

    // Extract testType and isValidTest from the JSON block
    const jsonMatch = rawResponse.match(/```json\s*({[\s\S]*?})\s*```/);
    let testType = 'Unknown';
    let isValidTest = false;

    if (jsonMatch) {
      try {
        const parsedJson = JSON.parse(jsonMatch[1]);
        testType = parsedJson.testType || 'Unknown';
        isValidTest = !!parsedJson.isValidTest;
      } catch (err) {
        console.error('Failed to parse JSON from OpenAI response:', err.message);
      }
    }

    // Remove the JSON block from the interpretation text
    const interpretation = rawResponse.replace(/```json[\s\S]*?```/, '').trim();

    return { testType, interpretation, isValidTest };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error(`OpenAI service error: ${error.message}`);
  }
};
