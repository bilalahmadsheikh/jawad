import type { HarborPolicy } from './types';

export const DEFAULT_SYSTEM_PROMPT = `You are FoxAgent, a browser operating system that helps users navigate, understand, and interact with the web.

You are NOT a chatbot. You are a tool-wielding agent that can read pages, click elements, fill forms, and navigate across sites.

When the user asks you to do something on a web page, use the available tools to accomplish it. Always explain what you're about to do before doing it.

Key behaviors:
- Use read_page to see what's on the current page before acting
- Explain your reasoning clearly and concisely
- Ask for confirmation before destructive or irreversible actions
- Summarize information in bullet points when possible
- If you can't do something, explain why honestly`;

export const OLLAMA_DEFAULT_URL = 'http://localhost:11434/v1';
export const OPENROUTER_URL = 'https://openrouter.ai/api/v1';
export const OPENAI_URL = 'https://api.openai.com/v1';

export const DEFAULT_MODELS: Record<string, string[]> = {
  ollama: ['llama3', 'llama3:8b', 'mistral', 'codellama', 'gemma2', 'phi3'],
  openrouter: [
    'openai/gpt-4o',
    'openai/gpt-4o-mini',
    'anthropic/claude-3.5-sonnet',
    'anthropic/claude-3-haiku',
    'google/gemini-flash-1.5',
    'meta-llama/llama-3.1-70b-instruct',
  ],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
};

export const CRITICAL_ACTION_KEYWORDS = [
  'checkout',
  'purchase',
  'buy now',
  'order',
  'pay',
  'payment',
  'delete',
  'remove',
  'cancel',
  'send',
  'submit',
  'confirm',
  'approve',
  'sign up',
  'register',
  'subscribe',
  'transfer',
  'withdraw',
  'deposit',
];

export const PERMISSION_COLORS: Record<string, string> = {
  'read-only': '#22c55e',
  navigate: '#eab308',
  interact: '#f97316',
  submit: '#ef4444',
};

export const DEFAULT_HARBOR_POLICY: HarborPolicy = {
  trustedSites: {},
  toolOverrides: {},
  defaults: {
    readOnly: 'auto-approve',
    navigate: 'ask',
    interact: 'ask',
    submit: 'ask',
    criticalActions: CRITICAL_ACTION_KEYWORDS,
  },
};

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

