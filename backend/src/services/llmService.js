/**
 * Unified LLM Service (DeepSeek, OpenAI & Google Gemini)
 * Powers chat and policy reasoning agents with live LLM completions.
 */
const config = require('../config');

class LLMService {
  constructor() {
    this.deepseekClient = null;
    this.openaiClient = null;
    this.geminiClient = null;
    this.init();
  }

  init() {
    // 1. Initialize DeepSeek client if API key is provided
    const deepseekKey = config.deepseekApiKey;
    if (deepseekKey && deepseekKey !== 'tu_api_key_de_deepseek_aqui' && deepseekKey.trim().length > 10) {
      try {
        const OpenAI = require('openai');
        this.deepseekClient = new OpenAI({
          baseURL: config.deepseekBaseUrl || 'https://api.deepseek.com',
          apiKey: deepseekKey.trim()
        });
        console.log(`[LLM] Cliente DeepSeek conectado exitosamente (Modelo: ${config.deepseekModel})`);
      } catch (err) {
        console.warn('[LLM] Error inicializando SDK de DeepSeek:', err.message);
      }
    } else {
      this.deepseekClient = null;
    }

    // 2. Initialize OpenAI client if API key is provided
    const openaiKey = config.openaiApiKey;
    if (openaiKey && openaiKey !== 'tu_api_key_de_openai_aqui' && openaiKey.trim().length > 10) {
      try {
        const OpenAI = require('openai');
        this.openaiClient = new OpenAI({ apiKey: openaiKey.trim() });
        console.log(`[LLM] Cliente OpenAI conectado exitosamente (Modelo: ${config.openaiModel})`);
      } catch (err) {
        console.warn('[LLM] Error inicializando SDK de OpenAI:', err.message);
      }
    } else {
      this.openaiClient = null;
    }

    // 3. Initialize Gemini client if API key is provided
    const geminiKey = config.geminiApiKey;
    if (geminiKey && geminiKey !== 'tu_api_key_de_gemini_aqui' && geminiKey.trim().length > 10) {
      try {
        const { GoogleGenAI } = require('@google/genai');
        this.geminiClient = new GoogleGenAI({ apiKey: geminiKey.trim() });
        console.log(`[LLM] Cliente Google Gemini conectado exitosamente (Modelo: ${config.geminiModel})`);
      } catch (err) {
        console.warn('[LLM] Error inicializando SDK de GoogleGenAI:', err.message);
      }
    } else {
      this.geminiClient = null;
    }
  }

  /**
   * Genera texto con DeepSeek (prioritario si está activo), OpenAI o Gemini con fallback inteligente
   */
  async generateText({ prompt, systemInstruction = '', temperature = 0.2 }) {
    // 1. Intentar con DeepSeek si está configurado
    if (this.deepseekClient && (config.llmProvider === 'deepseek' || (!this.openaiClient && !this.geminiClient))) {
      try {
        const messages = [];
        if (systemInstruction) {
          messages.push({ role: 'system', content: systemInstruction });
        }
        messages.push({ role: 'user', content: prompt });

        const completion = await this.deepseekClient.chat.completions.create({
          model: config.deepseekModel || 'deepseek-chat',
          messages,
          temperature
        });

        if (completion && completion.choices && completion.choices[0] && completion.choices[0].message) {
          return completion.choices[0].message.content.trim();
        }
      } catch (err) {
        console.warn('[LLM] Error en llamada a DeepSeek API:', err.message);
      }
    }

    // 2. Intentar con OpenAI si está configurado
    if (this.openaiClient && (config.llmProvider === 'openai' || !this.geminiClient)) {
      try {
        const messages = [];
        if (systemInstruction) {
          messages.push({ role: 'system', content: systemInstruction });
        }
        messages.push({ role: 'user', content: prompt });

        const completion = await this.openaiClient.chat.completions.create({
          model: config.openaiModel || 'gpt-4o-mini',
          messages,
          temperature
        });

        if (completion && completion.choices && completion.choices[0] && completion.choices[0].message) {
          return completion.choices[0].message.content.trim();
        }
      } catch (err) {
        console.warn('[LLM] Error en llamada a OpenAI API:', err.message);
      }
    }

    // 3. Intentar con Gemini si está configurado
    if (this.geminiClient) {
      try {
        const response = await this.geminiClient.models.generateContent({
          model: config.geminiModel,
          contents: prompt,
          config: {
            systemInstruction: systemInstruction || undefined,
            temperature,
          }
        });
        if (response && response.text) {
          return response.text.trim();
        }
      } catch (err) {
        console.warn('[LLM] Error en llamada a Gemini API:', err.message);
      }
    }

    // Retorna null para indicar a los agentes que usen la síntesis determinista fundamentada en fragmentos
    return null;
  }

  /**
   * Obtiene el estado del proveedor activo de LLM
   */
  getStatus() {
    let provider = 'local_grounded_engine';
    if (this.deepseekClient && config.llmProvider === 'deepseek') {
      provider = 'deepseek';
    } else if (this.openaiClient && config.llmProvider === 'openai') {
      provider = 'openai';
    } else if (this.deepseekClient) {
      provider = 'deepseek';
    } else if (this.openaiClient) {
      provider = 'openai';
    } else if (this.geminiClient) {
      provider = 'gemini';
    }

    return {
      provider,
      deepseekConfigured: !!this.deepseekClient,
      deepseekModel: config.deepseekModel,
      openaiConfigured: !!this.openaiClient,
      openaiModel: config.openaiModel,
      geminiConfigured: !!this.geminiClient,
      geminiModel: config.geminiModel
    };
  }
}

module.exports = new LLMService();
