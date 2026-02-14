// services/llmProvider.js

/**
 * Base class for all LLM providers.
 * Defines the common interface for generating text.
 */
class LLMProvider {
  /**
   * Generates text from a given prompt.
   * This method must be implemented by subclasses.
   *
   * @param {string} prompt The user prompt.
   * @param {object} [options={}] Additional options for the provider.
   * @param {string} [options.systemPrompt] An optional system prompt for chat models.
   * @param {string} [options.model] The specific model to use.
   * @returns {Promise<string>} The generated text content.
   */
  async generate(prompt, options = {}) {
    throw new Error('LLMProvider.generate() must be implemented by subclasses');
  }
}

module.exports = LLMProvider;
