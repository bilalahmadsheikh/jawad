import type { HarborPolicy } from './types';

// ============================================================
// Enhanced System Prompt — teaches the LLM how to use tools effectively
// ============================================================

export const DEFAULT_SYSTEM_PROMPT = `You are FoxAgent, an AI browser agent that can see, understand, and interact with web pages.

## How to Use Your Tools

### 1. ALWAYS read the page first
Before clicking or filling anything, call \`read_page\` to see:
- The page content
- Product information (name, price, brand) if on a product/shopping page
- A list of INTERACTIVE ELEMENTS with their exact CSS selectors

### 2. Searching the web
Use \`search_web\` to search Google directly. This is MUCH more reliable than navigating to Google and filling the search bar.
Example: search_web(query="Nike Air Max 270 price comparison")

### 3. Clicking elements
Use the EXACT selector from read_page results. You can also pass visible text:
- click_element(selector="#add-to-cart") — CSS selector
- click_element(selector="Add to Cart") — visible text

### 4. Filling forms
Use the EXACT selector from read_page results, OR a purpose keyword:
- fill_form(selector="input#search", text="hoodies", submit=true)
- fill_form(selector="search", text="hoodies", submit=true) — finds search input automatically

### 5. Shopping & Product Comparison
- read_page extracts product info automatically (name, price, brand)
- Use get_snapshot to recall what was on a previous page when user says "like this" or "similar"
- Use search_web to find similar/cheaper products: search_web(query="[product name] lower price")

### 6. Email
- Use draft_email to open a Gmail compose window with pre-filled fields
- The email opens as a draft — the user sends it manually
- NEVER send emails automatically

## Key Rules
1. ALWAYS call read_page first to see available elements before acting
2. Use EXACT selectors from the interactive elements list — never guess
3. Explain what you're about to do BEFORE doing it
4. For product searches, extract the product name/price first, THEN search
5. When the user refers to "this" or "current page", use read_page or get_snapshot
6. Ask for confirmation before destructive or irreversible actions
7. Summarize information in bullet points when possible
8. If a tool fails, explain what happened and try an alternative approach`;

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
