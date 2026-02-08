// ============================================================
// any-llm-router: Universal LLM abstraction layer
// Supports OpenAI, OpenRouter, and Ollama (all OpenAI-compatible)
// ============================================================

import type { LLMConfig } from './types';

// ============================================================
// Audio Transcription (Whisper API)
// ============================================================

/**
 * Check if the configured LLM provider supports audio transcription.
 * OpenAI and OpenRouter support Whisper. Ollama does not (separate model, different API).
 */
export function supportsTranscription(config: LLMConfig): boolean {
  return config.provider === 'openai' || config.provider === 'openrouter';
}

/**
 * Transcribe audio using the provider's OpenAI-compatible /audio/transcriptions endpoint.
 * Works with OpenAI (Whisper) and OpenRouter. Ollama does not support this — use Browser Speech fallback.
 */
export async function transcribeAudio(
  config: LLMConfig,
  audioBase64: string,
  mimeType: string
): Promise<string> {
  if (!supportsTranscription(config)) {
    throw new Error(
      `Voice transcription requires OpenAI or OpenRouter. ${config.provider} does not support Whisper. ` +
      'Switch to OpenAI/OpenRouter in Settings, or use "Browser Speech" mode (free, no API key).'
    );
  }

  const baseUrl = config.baseUrl.replace(/\/+$/, '');
  const url = `${baseUrl}/audio/transcriptions`;

  // Decode base64 → binary
  const binaryString = atob(audioBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Build a File object so FormData sends the right filename
  const ext = mimeType.includes('webm')
    ? 'webm'
    : mimeType.includes('ogg')
      ? 'ogg'
      : mimeType.includes('mp4')
        ? 'mp4'
        : 'wav';
  const audioBlob = new Blob([bytes], { type: mimeType });
  const audioFile = new File([audioBlob], `recording.${ext}`, { type: mimeType });

  const formData = new FormData();
  formData.append('file', audioFile);
  formData.append('model', 'whisper-1');

  const headers: Record<string, string> = {};
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }
  if (config.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://jawad.dev';
    headers['X-Title'] = 'Jawad';
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    if (response.status === 401) {
      throw new Error('Invalid API key. Check your Settings.');
    }
    if (response.status === 404) {
      throw new Error(
        `Your provider does not support voice transcription. ` +
        'Use OpenAI or OpenRouter, or switch to "Browser Speech" mode.'
      );
    }
    throw new Error(
      `Transcription failed: ${errorBody || response.statusText}`
    );
  }

  const result = await response.json();
  return result.text || '';
}

export interface ChatCompletionOptions {
  messages: Array<{
    role: string;
    content: string | null;
    tool_calls?: unknown[];
    tool_call_id?: string;
  }>;
  tools?: unknown[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: string;
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Make a non-streaming chat completion request to any OpenAI-compatible API.
 * Works with OpenAI, OpenRouter, and Ollama identically.
 */
export async function chatCompletion(
  config: LLMConfig,
  options: ChatCompletionOptions
): Promise<ChatCompletionResponse> {
  const url = `${config.baseUrl}/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  // OpenRouter-specific headers
  if (config.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://jawad.dev';
    headers['X-Title'] = 'Jawad';
  }

  const body: Record<string, unknown> = {
    model: config.model,
    messages: options.messages,
    stream: false,
    temperature: options.temperature ?? 0.4,
    max_tokens: options.max_tokens ?? 4096,
  };

  // Only include tools if provided and non-empty
  if (options.tools && options.tools.length > 0) {
    body.tools = options.tools;
    body.tool_choice = 'auto';
  }

  let response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  // Universal fallback: if ANY provider rejects the tools param,
  // retry without tools so the agent-manager XML parser can handle it.
  // This covers Ollama, OpenRouter with tool-unsupported models,
  // and any other provider that chokes on the tools parameter.
  if (!response.ok && body.tools) {
    const errText = await response.text();
    const status = response.status;
    const looksToolRelated =
      status === 400 ||
      status === 422 ||
      /tool|function|unsupported|not support|invalid.*param/i.test(errText);

    if (looksToolRelated) {
      console.warn(
        `[any-llm-router] Provider "${config.provider}" rejected tools param (${status}), retrying without tools. ` +
          `Error: ${errText.substring(0, 120)}`
      );
      delete body.tools;
      delete body.tool_choice;
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
    } else {
      throw new Error(
        `LLM API error (${status}): ${errText.substring(0, 200)}`
      );
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM API error (${response.status}): ${errorText.substring(0, 200)}`
    );
  }

  return response.json();
}

/**
 * Test connection to an LLM provider.
 * Returns true if the connection is successful.
 */
export async function testConnection(config: LLMConfig): Promise<boolean> {
  try {
    const response = await chatCompletion(config, {
      messages: [{ role: 'user', content: 'Say "ok" and nothing else.' }],
      max_tokens: 5,
    });
    return !!response.choices?.[0]?.message?.content;
  } catch {
    return false;
  }
}

/**
 * Build a LLMConfig from user settings.
 */
export function buildConfig(
  provider: string,
  apiKey: string,
  model: string,
  customBaseUrl?: string
): LLMConfig {
  let baseUrl: string;

  switch (provider) {
    case 'ollama':
      baseUrl = customBaseUrl || 'http://localhost:11434/v1';
      break;
    case 'openrouter':
      baseUrl = 'https://openrouter.ai/api/v1';
      break;
    case 'openai':
      baseUrl = 'https://api.openai.com/v1';
      break;
    default:
      baseUrl = customBaseUrl || 'https://api.openai.com/v1';
  }

  return {
    provider: provider as LLMConfig['provider'],
    apiKey,
    model,
    baseUrl,
  };
}

