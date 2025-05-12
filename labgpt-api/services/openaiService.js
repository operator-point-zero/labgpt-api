// // services/openaiService.js
// const OpenAI = require('openai');

// // Initialize OpenAI
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY
// });

// /**
//  * Send lab text to OpenAI for interpretation
//  * @param {string} labText - The raw lab results text
//  * @param {string} testType - The type of lab test
//  * @returns {Promise<string>} - The interpretation
//  */
// exports.interpretLabText = async (labText, testType) => {
//   try {
//     const completion = await openai.chat.completions.create({
//       model: process.env.OPENAI_MODEL || "gpt-4-turbo",
//       messages: [
//         {
//           role: "system",
//           content: `You are a helpful assistant that interprets medical lab test results for patients. 
//           Explain the results in simple, easy-to-understand language. 
//           Highlight any abnormal values and explain what they might mean, but avoid alarming language. 
//           Do not provide specific medical advice, diagnoses, or treatment recommendations. 
//           Always remind the user to consult with their healthcare provider for proper interpretation of their results.
//           Format your response with clear headings and bullet points when appropriate.`
//         },
//         {
//           role: "user",
//           content: `Please interpret these ${testType} lab test results in simple terms:\n\n${labText}`
//         }
//       ],
//       temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
//       max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1000,
//     });
    
//     return completion.choices[0].message.content;
//   } catch (error) {
//     console.error('OpenAI API error:', error);
//     throw new Error(`OpenAI service error: ${error.message}`);
//   }
// };
// const OpenAI = require('openai');

// // Initialize OpenAI
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY
// });

// /**
//  * Send lab text to OpenAI for interpretation
//  * @param {string} labText - The raw lab results text
//  * @param {string} testType - The type of lab test
//  * @returns {Promise<string>} - The interpretation
//  */
// exports.interpretLabText = async (labText, testType) => {
//   try {
//     const completion = await openai.chat.completions.create({
//       model: process.env.OPENAI_MODEL || "gpt-4-turbo",
//       messages: [
//         {
//           role: "system",
//           content: `
// You are a kind and informative medical assistant that helps patients understand their lab results.

// Guidelines:
// - Use simple, compassionate language suitable for someone without medical training.
// - Clearly list each result, flag if it's normal or abnormal, and explain what that means in layman's terms.
// - Use bullet points for each test result for clarity.
// - Group results under relevant headings (e.g., Red Blood Cells, White Blood Cells, Platelets).
// - Reassure the user and encourage them to follow up with a healthcare provider.
// - Avoid alarming or definitive language like "serious" or "dangerous".
// - Do not give medical advice, diagnoses, or suggest treatment.

// Example formatting:
// **Red Blood Cells**
// - Hemoglobin: 9.2 g/dL (Low)  
//   This is lower than normal and could suggest anemia, which means your body may not be getting enough oxygen. This can cause tiredness or weakness.

// **Reminder:** This interpretation is informational only. Please consult a healthcare provider for personalized medical advice.
//           `.trim()
//         },
//         {
//           role: "user",
//           content: `Please interpret the following ${testType} lab results:\n\n${labText}`
//         }
//       ],
//       temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
//       max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1000,
//     });

//     return completion.choices[0].message.content;
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
//  * Send lab text to OpenAI for interpretation
//  * @param {string} labText - The raw lab results text
//  * @param {string} testType - The type of lab test
//  * @returns {Promise<string>} - The interpretation in Markdown format
//  */
// exports.interpretLabText = async (labText, testType) => {
//   try {
//     const completion = await openai.chat.completions.create({
//       model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
//       messages: [
//         {
//           role: 'system',
//           content: `
// You are a compassionate and knowledgeable medical assistant, helping patients understand their lab results.

// Guidelines:
// - Respond in clear **Markdown** format, suitable for a mobile app.
// - Use **headings** for major sections (e.g., ## Red Blood Cells, ## White Blood Cells).
// - Use **bullet points** for each individual test result.
// - Highlight **abnormal results** (e.g., low or high values) in **bold**.
// - Explain the test results in simple terms for a layperson.
// - Avoid using alarming language; focus on informative and reassuring explanations.
// - Remind patients to consult a healthcare provider for personalized advice.
// - Do not provide specific medical advice, diagnoses, or treatment suggestions.

// Example of output format:
// **Red Blood Cells**
// - **Hemoglobin: 9.2 g/dL (Low)**  
//   This is lower than normal and might suggest anemia. Anemia can cause fatigue, weakness, and shortness of breath.

// **White Blood Cells**
// - **WBC: 14.8 x10³/µL (High)**  
//   A high count of white blood cells might indicate an infection or inflammation. It’s important to consult a doctor to determine the cause.

// **Reminder:** This interpretation is intended for informational purposes only. Always consult with your healthcare provider for a proper diagnosis and treatment.
//           `.trim(),
//         },
//         {
//           role: 'user',
//           content: `Please interpret the following ${testType} lab results:\n\n${labText}`,
//         },
//       ],
//       temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
//       max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1000,
//     });

//     return completion.choices[0].message.content;
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
 * Send lab text to OpenAI for interpretation
 * @param {string} labText - The raw lab results text
 * @param {string} testType - The type of lab test
 * @returns {Promise<string>} - The interpretation in Markdown format
 */
exports.interpretLabText = async (labText, testType) => {
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: `
You are a compassionate and knowledgeable medical assistant, helping patients understand their lab results.

Guidelines:
- Respond in **Markdown** format, suitable for a mobile app.
- Use **headings** for major sections (e.g., ## Red Blood Cells, ## White Blood Cells).
- Use **bullet points** for each individual test result.
- Highlight **abnormal results** (e.g., low or high values) in **bold**.
- Explain the test results in simple terms for a layperson.
- For each abnormal result, suggest general actions (like consulting a healthcare provider, lifestyle changes, or further testing).
- Avoid providing specific medical advice or treatment suggestions; focus on general next steps.
- Use compassionate and informative language.
- Remind patients to consult a healthcare provider for personalized advice.

Example of output format:
**Red Blood Cells**
- **Hemoglobin: 9.2 g/dL (Low)**  
  This is lower than normal and might suggest anemia. Anemia can cause fatigue, weakness, and shortness of breath.  
  **Next steps:** Consult with your healthcare provider to determine the cause of the anemia. Possible causes include iron deficiency, vitamin B12 deficiency, or chronic disease. Treatment may involve dietary changes, iron supplements, or other medications.

**White Blood Cells**
- **WBC: 14.8 x10³/µL (High)**  
  A high count of white blood cells could indicate an infection or inflammation in the body.  
  **Next steps:** It's important to follow up with your healthcare provider for a thorough evaluation. They may perform additional tests to identify the underlying cause. If an infection is present, antibiotics may be prescribed.

**Reminder:** This interpretation is informational only. Always consult with your healthcare provider for a full diagnosis and personalized treatment plan.
          `.trim(),
        },
        {
          role: 'user',
          content: `Please interpret the following ${testType} lab results:\n\n${labText}`,
        },
      ],
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1000,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error(`OpenAI service error: ${error.message}`);
  }
};

