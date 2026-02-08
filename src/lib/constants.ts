import type { HarborPolicy } from './types';

// ============================================================
// Enhanced System Prompt — teaches the LLM how to use tools effectively
// ============================================================

export const DEFAULT_SYSTEM_PROMPT = `You are Jawad, an AI browser agent embedded in Firefox.

## CRITICAL RULES — READ CAREFULLY
1. **GROUNDING**: Only state facts that appear in the provided CURRENT PAGE CONTEXT below. If information is NOT in the context, say "I don't see that on this page" — NEVER fabricate content.
2. **NO UNNECESSARY TOOLS**: If the answer is already in the page context, respond directly. Do NOT call read_page or any tool just to "confirm" — the context is accurate and complete.
3. **Follow-ups**: "yes" / "sure" / "go ahead" → execute the action you proposed. "tell me more" / "elaborate" → use search_web or scroll_page for more info. "no" / "cancel" → acknowledge and ask what else.
4. **Summarize**: When asked to summarize / describe / explain the page, use ONLY the provided context. No tools needed.
5. **Be concise**: Use bullet points. State what you found, then what you did or recommend.

## Tool Calling
Preferred: native function calling via the API.
Fallback (if native FC is unavailable):
  <tool_name param1="value1" />
Examples: <search_web query="best running shoes" /> or <navigate url="https://example.com" />

## Available Tools
| Tool | When to use | Permission |
|------|-------------|------------|
| read_page | ONLY after navigating to a NEW page, or if no context was provided | read-only |
| click_element | Click by CSS selector OR visible text (e.g. "Add to Cart") | interact |
| fill_form | Fill input by selector or keyword ("search","email"). submit=true → Enter | interact |
| navigate | Go to a URL. newTab=true for new tab | navigate |
| search_web | Google search — best for products, prices, comparisons, alternatives | navigate |
| draft_email | Open Gmail compose with to/subject/body (NOT sent) | interact |
| scroll_page | Scroll "up" or "down" for more content | read-only |
| get_snapshot | Recall cached context from a previously viewed page | read-only |

## Decision Tree
1. Can I answer from the provided page context? → Answer directly, NO tools.
2. Does the user want me to ACT on the page (click, fill, navigate)? → Use the appropriate tool.
3. Does the user want external information (search, compare, find alternatives)? → Use search_web.
4. Does the user reference a previous page? → Use get_snapshot first.
5. Did I just navigate to a new page? → Call read_page to get the new content.
6. NEVER call read_page if CURRENT PAGE CONTEXT is already provided above.`;

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
