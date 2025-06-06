
// const OpenAI = require('openai');

// // Initialize OpenAI
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// /**
//  * Send lab text to OpenAI for interpretation and test type extraction
//  * @param {string} labText - The raw lab results text
//  * @returns {Promise<{ testType: string, interpretation: string, isValidTest: boolean }>}
//  */
// exports.interpretLabText = async (labText) => {
//   try {
//     const completion = await openai.chat.completions.create({
//       model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
//       messages: [
//         {
//           role: 'system',
//           content: `
// You are a medical assistant that analyzes lab results. Your primary task is to determine if the provided text contains valid medical lab test results.

// **Critical Instructions:**
// 1. First, determine if this is actually a lab test result by looking for:
//    - Medical test names (CBC, LFT, glucose, cholesterol, etc.)
//    - Numerical values with units (mg/dL, mmol/L, etc.)
//    - Reference ranges
//    - Medical terminology
//    - Laboratory headers/formats

// 2. At the top of your response, return a JSON block like this:

// For VALID lab tests:
// \`\`\`json
// {
//   "testType": "Complete Blood Count (CBC)",
//   "isValidTest": true
// }
// \`\`\`

// For INVALID/NON-TEST content (receipts, random text, photos without lab data, etc.):
// \`\`\`json
// {
//   "testType": "Unknown",
//   "isValidTest": false
// }
// \`\`\`

// 3. If isValidTest is true, provide a detailed interpretation in Markdown format.
// 4. If isValidTest is false, provide a brief explanation of why this isn't a lab test.

// **Valid Test Types Include:**
// - Complete Blood Count (CBC)
// - Liver Function Tests (LFT) 
// - Kidney Function Tests (KFT/UEC)
// - Lipid Profile
// - Blood Glucose Tests
// - Thyroid Function Tests
// - Urinalysis
// - Electrolyte Panel
// - Cardiac Markers
// - Hemoglobin A1C
// - Vitamin D
// - Iron Studies
// - And other standard medical laboratory tests

// **Invalid Content Includes:**
// - Receipts or bills
// - Random text or documents
// - Images without clear lab values
// - Incomplete or unclear text
// - Non-medical content
//           `.trim(),
//         },
//         {
//           role: 'user',
//           content: `Analyze the following text and determine if it contains valid lab test results:\n\n${labText}`,
//         },
//       ],
//       temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.3,
//       max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1000,
//     });

//     const rawResponse = completion.choices[0].message.content;

//     // Extract testType and isValidTest from the JSON block
//     const jsonMatch = rawResponse.match(/```json\s*({[\s\S]*?})\s*```/);
//     let testType = 'Unknown';
//     let isValidTest = false;

//     if (jsonMatch) {
//       try {
//         const parsedJson = JSON.parse(jsonMatch[1]);
//         if (parsedJson.testType) {
//           testType = parsedJson.testType;
//         }
//         if (parsedJson.hasOwnProperty('isValidTest')) {
//           isValidTest = parsedJson.isValidTest;
//         }
//       } catch (err) {
//         console.error('Failed to parse JSON from OpenAI response:', err.message);
//       }
//     }

//     // Remove the JSON block from the interpretation text
//     const interpretation = rawResponse.replace(/```json[\s\S]*?```/, '').trim();

//     return { testType, interpretation, isValidTest };
//   } catch (error) {
//     console.error('OpenAI API error:', error);
//     throw new Error(`OpenAI service error: ${error.message}`);
//   }
// };

// const OpenAI = require('openai');

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// /**
//  * Analyze medical text (lab results or imaging reports) and provide structured interpretation
//  * @param {string} medicalText
//  * @returns {Promise<{ testType: string, interpretation: string, isValidTest: boolean }>}
//  */
// exports.interpretMedicalText = async (medicalText) => {
//   try {
//     const completion = await openai.chat.completions.create({
//       model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
//       messages: [
//         {
//           role: 'system',
//           content: `
// You are a clinical assistant that interprets both lab results and radiology/imaging reports. Analyze the input text and follow these instructions:

// 1. First, classify the input as one of:
//    - "Lab Test"
//    - "Imaging Report"
//    - "Invalid or Non-Medical"

// 2. Return the classification in a JSON block like this:

// For Lab Test:
// \`\`\`json
// {
//   "testType": "Complete Blood Count (CBC)",
//   "isValidTest": true
// }
// \`\`\`

// For Imaging Report:
// \`\`\`json
// {
//   "testType": "CT Abdomen",
//   "isValidTest": true
// }
// \`\`\`

// For Invalid or Non-Medical content:
// \`\`\`json
// {
//   "testType": "Unknown",
//   "isValidTest": false
// }
// \`\`\`

// 3. If isValidTest is true, provide a clear and helpful interpretation in Markdown format. For imaging reports, explain what the findings mean in layman's terms.

// 4. If isValidTest is false, briefly explain why.

// Examples of Imaging Reports:
// - CT, MRI, X-ray, Ultrasound, Mammogram

// Examples of Lab Tests:
// - CBC, LFT, KFT, Lipid Panel, Glucose, Urinalysis, etc.
//         `.trim(),
//         },
//         {
//           role: 'user',
//           content: `Analyze the following medical text:\n\n${medicalText}`,
//         },
//       ],
//       temperature: 0.3,
//       max_tokens: 1200,
//     });

//     const rawResponse = completion.choices[0].message.content;

//     const jsonMatch = rawResponse.match(/```json\s*({[\s\S]*?})\s*```/);
//     let testType = 'Unknown';
//     let isValidTest = false;

//     if (jsonMatch) {
//       try {
//         const parsedJson = JSON.parse(jsonMatch[1]);
//         if (parsedJson.testType) {
//           testType = parsedJson.testType;
//         }
//         if (parsedJson.hasOwnProperty('isValidTest')) {
//           isValidTest = parsedJson.isValidTest;
//         }
//       } catch (err) {
//         console.error('Failed to parse JSON from OpenAI response:', err.message);
//       }
//     }

//     const interpretation = rawResponse.replace(/```json[\s\S]*?```/, '').trim();

//     return { testType, interpretation, isValidTest };
//   } catch (error) {
//     console.error('OpenAI API error:', error);
//     throw new Error(`OpenAI service error: ${error.message}`);
//   }
// };

// const OpenAI = require('openai');

// // Initialize OpenAI
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// /**
//  * Analyze lab or imaging text and return interpretation with type and status
//  * @param {string} medicalText
//  * @returns {Promise<{ testType: string, interpretation: string, isValidTest: boolean }>}
//  */
// exports.interpretLabText = async (medicalText) => {
//   try {
//     const completion = await openai.chat.completions.create({
//       model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
//       messages: [
//         {
//           role: 'system',
//           content: `
// You are a clinical assistant that interprets both **lab test results** and **radiology/imaging reports** for patients. Analyze the input text and follow these instructions carefully:

// ---

// ### Step 1: Classify the Test

// Determine the type of medical text:
// - "Lab Test" → Numerical lab values (CBC, LFT, Glucose, etc.)
// - "Imaging Report" → Descriptive reports (CT, MRI, Ultrasound, X-ray, etc.)
// - "Invalid or Non-Medical" → Receipts, bills, unclear or non-medical content

// Return this classification at the top in the following JSON block:

// \`\`\`json
// {
//   "testType": "CT Head Without Contrast",
//   "isValidTest": true
// }
// \`\`\`

// or if invalid:

// \`\`\`json
// {
//   "testType": "Unknown",
//   "isValidTest": false
// }
// \`\`\`

// ---

// ### Step 2: If isValidTest is true, provide a friendly Markdown interpretation in this format:

// ## 🧪 Test Summary

// - **Test Type:** <Name of test>
// - **Conclusion:** <Brief status — Normal, Abnormal, Further Review Needed>

// ---

// ## 🔍 Key Findings

// | Parameter / Finding     | Value / Observation     | Reference Range (if any) | Interpretation        |
// |--------------------------|-------------------------|---------------------------|------------------------|
// | Hemoglobin               | 13.5 g/dL               | 13.0 – 17.0 g/dL          | ✅ Normal              |
// | White Blood Cells        | 11.2 x10⁹/L             | 4.0 – 11.0 x10⁹/L         | ⚠️ Slightly Elevated   |

// ---

// ## 🧑‍⚕️ What This Means

// Explain the result in simple, non-technical language a patient can understand.

// ---

// ## 📝 Doctor’s Note (AI-Generated)

// > Provide a soft, informative suggestion — e.g., “Consult a doctor if you have symptoms,” or “Follow up may be needed.”

// ---

// ### Step 3: If isValidTest is false, explain why the input is not a valid lab or imaging report.
//           `.trim(),
//         },
//         {
//           role: 'user',
//           content: `Analyze the following medical text:\n\n${medicalText}`,
//         },
//       ],
//       temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.3,
//       max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1200,
//     });

//     const rawResponse = completion.choices[0].message.content;

//     // Extract testType and isValidTest from the JSON block
//     const jsonMatch = rawResponse.match(/```json\s*({[\s\S]*?})\s*```/);
//     let testType = 'Unknown';
//     let isValidTest = false;

//     if (jsonMatch) {
//       try {
//         const parsedJson = JSON.parse(jsonMatch[1]);
//         testType = parsedJson.testType || 'Unknown';
//         isValidTest = !!parsedJson.isValidTest;
//       } catch (err) {
//         console.error('Failed to parse JSON from OpenAI response:', err.message);
//       }
//     }

//     // Remove the JSON block from the interpretation text
//     const interpretation = rawResponse.replace(/```json[\s\S]*?```/, '').trim();

//     return { testType, interpretation, isValidTest };
//   } catch (error) {
//     console.error('OpenAI API error:', error);
//     throw new Error(`OpenAI service error: ${error.message}`);
//   }
// };

// const OpenAI = require('openai');

// // Initialize OpenAI
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// /**
//  * Analyze lab or imaging text and return interpretation with type and status
//  * @param {string} medicalText
//  * @returns {Promise<{ testType: string, interpretation: string, isValidTest: boolean }>}
//  */
// exports.interpretLabText = async (medicalText) => {
//   try {
//     const completion = await openai.chat.completions.create({
//       model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
//       messages: [
//         {
//           role: 'system',
//           content: `
// You are a clinical assistant that interprets both **lab test results** and **radiology/imaging reports** for patients. Analyze the input text and follow these instructions carefully.

// ⚠️ If for any reason the input text contains patient-identifiable information (names, dates of birth, patient IDs, addresses, etc.), DO NOT include it in the response. Instead, redact it or ignore it entirely.

// ---

// ### Step 1: Classify the Test

// Determine the type of medical text:
// - "Lab Test" → Numerical lab values (CBC, LFT, Glucose, etc.)
// - "Imaging Report" → Descriptive reports (CT, MRI, Ultrasound, X-ray, etc.)
// - "Invalid or Non-Medical" → Receipts, bills, unclear or non-medical content

// Return this classification at the top in the following JSON block:

// \`\`\`json
// {
//   "testType": "CT Head Without Contrast",
//   "isValidTest": true
// }
// \`\`\`

// or if invalid:

// \`\`\`json
// {
//   "testType": "Unknown",
//   "isValidTest": false
// }
// \`\`\`

// ---

// ### Step 2: If isValidTest is true, provide a friendly Markdown interpretation in this format:

// ## 🧪 Test Summary

// - **Test Type:** <Name of test>
// - **Conclusion:** <Brief status — Normal, Abnormal, Further Review Needed>

// ---

// ## 🔍 Key Findings

// | Parameter / Finding     | Value / Observation     | Reference Range (if any) | Interpretation        |
// |--------------------------|-------------------------|---------------------------|------------------------|
// | Hemoglobin               | 13.5 g/dL               | 13.0 – 17.0 g/dL          | ✅ Normal              |
// | White Blood Cells        | 11.2 x10⁹/L             | 4.0 – 11.0 x10⁹/L         | ⚠️ Slightly Elevated   |

// ---

// ## 🧑‍⚕️ What This Means

// Explain the result in simple, non-technical language a patient can understand.

// ---

// ## 📝 Doctor’s Note (AI-Generated)

// > Provide a soft, informative suggestion — e.g., “Consult a doctor if you have symptoms,” or “Follow up may be needed.”

// ---

// ### Step 3: If isValidTest is false, explain why the input is not a valid lab or imaging report.
//           `.trim(),
//         },
//         {
//           role: 'user',
//           content: `Analyze the following medical text:\n\n${medicalText}`,
//         },
//       ],
//       temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.3,
//       max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1200,
//     });

//     const rawResponse = completion.choices[0].message.content;

//     // Extract testType and isValidTest from the JSON block
//     const jsonMatch = rawResponse.match(/```json\s*({[\s\S]*?})\s*```/);
//     let testType = 'Unknown';
//     let isValidTest = false;

//     if (jsonMatch) {
//       try {
//         const parsedJson = JSON.parse(jsonMatch[1]);
//         testType = parsedJson.testType || 'Unknown';
//         isValidTest = !!parsedJson.isValidTest;
//       } catch (err) {
//         console.error('Failed to parse JSON from OpenAI response:', err.message);
//       }
//     }

//     // Remove the JSON block from the interpretation text
//     const interpretation = rawResponse.replace(/```json[\s\S]*?```/, '').trim();

//     return { testType, interpretation, isValidTest };
//   } catch (error) {
//     console.error('OpenAI API error:', error);
//     throw new Error(`OpenAI service error: ${error.message}`);
//   }
// };
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

### Step 1: Classify the Test

Classify the type of report based on the content:
- "Structured Lab Test" → Mostly tabular or numeric (e.g. CBC, CMP, lipid panel)
- "Narrative Report" → Descriptive/free-text (e.g. imaging, pathology, ECG)
- "Invalid or Non-Medical" → Receipts, bills, notes, unclear content

Return this at the top in a JSON block:

\`\`\`json
{
  "testType": "Echocardiogram Report",
  "isValidTest": true
}
\`\`\`

or:

\`\`\`json
{
  "testType": "Unknown",
  "isValidTest": false
}
\`\`\`

---

### Step 2: If isValidTest is true, choose the format based on test type:

---

#### 📊 For **Structured Lab Tests**, use:

## 🧪 Test Summary
- **Test Type:** <test name>
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

## 📝 Doctor’s Note (AI-Generated)
> Give a soft follow-up recommendation.

---

#### 📄 For **Narrative Reports**, use:

## 🧪 Test Summary
- **Test Type:** <test name>
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

## 📝 Doctor’s Note (AI-Generated)
> Suggest next steps (e.g., “Consider follow-up imaging,” or “Discuss results with your doctor.”)

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
