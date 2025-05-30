// const OpenAI = require('openai');

// // Initialize OpenAI
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// /**
//  * Send lab text to OpenAI for interpretation and test type extraction
//  * @param {string} labText - The raw lab results text
//  * @returns {Promise<{ testType: string, interpretation: string }>}
//  */
// exports.interpretLabText = async (labText) => {
//   try {
//     const completion = await openai.chat.completions.create({
//       model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
//       messages: [
//         {
//           role: 'system',
//           content: `
// You are a kind and knowledgeable medical assistant. Your goal is to help patients clearly understand their lab results in a reassuring, digestible, and educational way.

// ⚠️ DO NOT rely on any test type label the user may provide.  
// ✅ INFER the test type strictly from the actual lab result content.

// **Instructions:**
// 1. At the top of your response, return a JSON block like this:

// \`\`\`json
// {
//   "testType": "Complete Blood Count (CBC)"
// }
// \`\`\`

// 2. Below that, explain the results in **Markdown format** suitable for a mobile app.

// **Markdown Guidelines:**
// - Use clear section headings (## Red Blood Cells, etc.)
// - Use bullet points for each result
// - Mark abnormal values (**High**, **Low**) and explain them in plain language
// - Use analogies when helpful
// - Include a helpful ## Summary at the end:
//   - ⚠️ Concerns
//   - ✅ Good news
//   - 🩺 Next steps
// - Be supportive, avoid alarming language
// - End with: “Always consult your doctor for personalized medical advice.”
//           `.trim(),
//         },
//         {
//           role: 'user',
//           content: `Please interpret the following lab results. Ignore any test type labels. Use only the values themselves to determine what kind of test this is:\n\n${labText}`,
//         },
//       ],
//       temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
//       max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1000,
//     });

//     const rawResponse = completion.choices[0].message.content;

//     // Extract testType from the JSON block
//     const jsonMatch = rawResponse.match(/```json\s*({[\s\S]*?})\s*```/);
//     let testType = 'Unknown';

//     if (jsonMatch) {
//       try {
//         const parsedJson = JSON.parse(jsonMatch[1]);
//         if (parsedJson.testType) {
//           testType = parsedJson.testType;
//         }
//       } catch (err) {
//         console.error('Failed to parse testType JSON:', err.message);
//       }
//     }

//     // Remove the JSON block from the interpretation text
//     const interpretation = rawResponse.replace(/```json[\s\S]*?```/, '').trim();

//     return { testType, interpretation };
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
 * Send lab text to OpenAI for interpretation and test type extraction
 * @param {string} labText - The raw lab results text
 * @returns {Promise<{ testType: string, interpretation: string, isValidTest: boolean }>}
 */
exports.interpretLabText = async (labText) => {
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: `
You are a medical assistant that analyzes lab results. Your primary task is to determine if the provided text contains valid medical lab test results.

**Critical Instructions:**
1. First, determine if this is actually a lab test result by looking for:
   - Medical test names (CBC, LFT, glucose, cholesterol, etc.)
   - Numerical values with units (mg/dL, mmol/L, etc.)
   - Reference ranges
   - Medical terminology
   - Laboratory headers/formats

2. At the top of your response, return a JSON block like this:

For VALID lab tests:
\`\`\`json
{
  "testType": "Complete Blood Count (CBC)",
  "isValidTest": true
}
\`\`\`

For INVALID/NON-TEST content (receipts, random text, photos without lab data, etc.):
\`\`\`json
{
  "testType": "Unknown",
  "isValidTest": false
}
\`\`\`

3. If isValidTest is true, provide a detailed interpretation in Markdown format.
4. If isValidTest is false, provide a brief explanation of why this isn't a lab test.

**Valid Test Types Include:**
- Complete Blood Count (CBC)
- Liver Function Tests (LFT) 
- Kidney Function Tests (KFT/UEC)
- Lipid Profile
- Blood Glucose Tests
- Thyroid Function Tests
- Urinalysis
- Electrolyte Panel
- Cardiac Markers
- Hemoglobin A1C
- Vitamin D
- Iron Studies
- And other standard medical laboratory tests

**Invalid Content Includes:**
- Receipts or bills
- Random text or documents
- Images without clear lab values
- Incomplete or unclear text
- Non-medical content
          `.trim(),
        },
        {
          role: 'user',
          content: `Analyze the following text and determine if it contains valid lab test results:\n\n${labText}`,
        },
      ],
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.3,
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1000,
    });

    const rawResponse = completion.choices[0].message.content;

    // Extract testType and isValidTest from the JSON block
    const jsonMatch = rawResponse.match(/```json\s*({[\s\S]*?})\s*```/);
    let testType = 'Unknown';
    let isValidTest = false;

    if (jsonMatch) {
      try {
        const parsedJson = JSON.parse(jsonMatch[1]);
        if (parsedJson.testType) {
          testType = parsedJson.testType;
        }
        if (parsedJson.hasOwnProperty('isValidTest')) {
          isValidTest = parsedJson.isValidTest;
        }
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