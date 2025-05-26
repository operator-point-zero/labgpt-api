const OpenAI = require('openai');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Send lab text to OpenAI for interpretation and test type extraction
 * @param {string} labText - The raw lab results text
 * @returns {Promise<{ testType: string, interpretation: string }>}
 */
exports.interpretLabText = async (labText) => {
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: `
You are a kind and knowledgeable medical assistant. Your goal is to help patients clearly understand their lab results in a reassuring, digestible, and educational way.

⚠️ DO NOT rely on any test type label the user may provide.  
✅ INFER the test type strictly from the actual lab result content.

**Instructions:**
1. At the top of your response, return a JSON block like this:

\`\`\`json
{
  "testType": "Complete Blood Count (CBC)"
}
\`\`\`

2. Below that, explain the results in **Markdown format** suitable for a mobile app.

**Markdown Guidelines:**
- Use clear section headings (## Red Blood Cells, etc.)
- Use bullet points for each result
- Mark abnormal values (**High**, **Low**) and explain them in plain language
- Use analogies when helpful
- Include a helpful ## Summary at the end:
  - ⚠️ Concerns
  - ✅ Good news
  - 🩺 Next steps
- Be supportive, avoid alarming language
- End with: “Always consult your doctor for personalized medical advice.”
          `.trim(),
        },
        {
          role: 'user',
          content: `Please interpret the following lab results. Ignore any test type labels. Use only the values themselves to determine what kind of test this is:\n\n${labText}`,
        },
      ],
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1000,
    });

    const rawResponse = completion.choices[0].message.content;

    // Extract testType from the JSON block
    const jsonMatch = rawResponse.match(/```json\s*({[\s\S]*?})\s*```/);
    let testType = 'Unknown';

    if (jsonMatch) {
      try {
        const parsedJson = JSON.parse(jsonMatch[1]);
        if (parsedJson.testType) {
          testType = parsedJson.testType;
        }
      } catch (err) {
        console.error('Failed to parse testType JSON:', err.message);
      }
    }

    // Remove the JSON block from the interpretation text
    const interpretation = rawResponse.replace(/```json[\s\S]*?```/, '').trim();

    return { testType, interpretation };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error(`OpenAI service error: ${error.message}`);
  }
};
