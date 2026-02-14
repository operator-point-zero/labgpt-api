// services/providers/geminiProvider.js

const { GoogleGenerativeAI } = require('@google/generative-ai');
const LLMProvider = require('../llmProvider');

/**
 * Google Gemini provider for generating text.
 */
class GeminiProvider extends LLMProvider {
  constructor() {
    super();
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not set in environment variables!');
    }
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });
  }

  /**
   * Generates text using the Google Gemini API.
   *
   * @param {string} prompt The user prompt.
   * @param {object} [options={}] Additional options.
   * @param {string} [options.systemPrompt] The system prompt to use.
   * @returns {Promise<string>} The generated text content.
   */
  async generate(prompt, options = {}) {
    try {
      const parts = [];
      if (options.systemPrompt) {
        parts.push({ text: options.systemPrompt });
      }
      parts.push({ text: prompt });

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts }],
      });
      
      const response = result.response;
      return response.text();

    } catch (error) {
      console.error('Gemini API Error:', error.message);
      throw new Error('LLM generation failed');
    }
  }
}

module.exports = GeminiProvider;
