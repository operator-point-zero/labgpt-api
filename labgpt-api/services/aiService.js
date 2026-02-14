// services/aiService.js

const OpenAIProvider = require('./providers/openaiProvider');
const GeminiProvider = require('./providers/geminiProvider');

const providerName = process.env.LLM_PROVIDER ? process.env.LLM_PROVIDER.toLowerCase() : 'gemini';

let providerInstance;

try {
  if (providerName === 'openai') {
    console.log('Initializing LLM Provider: OpenAI');
    providerInstance = new OpenAIProvider();
  } else {
    console.log('Initializing LLM Provider: Gemini (default)');
    providerInstance = new GeminiProvider();
  }
} catch (error) {
    console.error(`CRITICAL: Failed to initialize LLM provider (${providerName}).`, error.message);
    console.error('Please ensure the corresponding API key (OPENAI_API_KEY or GEMINI_API_KEY) is set in your .env file.');
    process.exit(1); // Exit if the provider cannot be initialized
}

/**
 * Export a single, initialized instance of the LLM provider.
 */
module.exports = providerInstance;
