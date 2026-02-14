// services/providers/openaiProvider.js

const OpenAI = require('openai');
const LLMProvider = require('../llmProvider');

/**
 * OpenAI provider for generating text using the OpenAI API.
 */
class OpenAIProvider extends LLMProvider {
  constructor() {
    super();
    if (!process.env.OPENAI_API_KEY) {
      // This check is redundant if the main service exits on failure, but good for standalone use.
      throw new Error('OPENAI_API_KEY not set in environment variables!');
    }
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 60000, // 60 second timeout
      maxRetries: 2,
    });
  }

  /**
   * Generates text using the OpenAI API.
   *
   * @param {string} prompt The user prompt.
   * @param {object} [options={}] Additional options.
   * @param {string} [options.systemPrompt] The system prompt to use.
   * @param {string} [options.model] The model to use. Defaults to 'gpt-4.1-mini'.
   * @param {number} [options.temperature] The temperature for the generation.
   * @param {number} [options.maxTokens] The maximum number of tokens for the completion.
   * @returns {Promise<string>} The generated text content.
   */
  async generate(prompt, options = {}) {
    try {
      const messages = [];
      if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const model = options.model || 'gpt-4.1-mini'; // as per user request

      const completion = await this.openai.chat.completions.create({
        model: model,
        messages: messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        response_format: { type: 'json_object' }, // Assuming JSON output is always needed for this app
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API Error:', error.message);
      // Re-throw a generic error to be caught by the calling service
      throw new Error('LLM generation failed');
    }
  }
}

module.exports = OpenAIProvider;
