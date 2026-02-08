# FoxAgent — API and Message Protocol Reference

## Message Protocol

FoxAgent uses Firefox extension messaging APIs for inter-component communication.

### Communication Channels

| Channel | Method | Direction |
|---------|--------|-----------|
| Sidebar ↔ Background | `browser.runtime.connect()` (Port) | Bidirectional |
| Background → Content | `browser.tabs.sendMessage()` | Request-Response |
| Content → Background | `browser.runtime.sendMessage()` | One-way |

## Sidebar ↔ Background Messages

### Port Connection

```typescript
// Sidebar connects to background
const port = browser.runtime.connect({ name: 'sidebar' });

// Send messages
port.postMessage({ type: 'CHAT', content: 'Hello' });

// Receive messages
port.onMessage.addListener((msg) => { /* ... */ });
```

### Sidebar → Background

#### `CHAT`
Send a chat message for AI processing.
```json
{
  "type": "CHAT",
  "content": "Find me a cheaper alternative to this product"
}
```

#### `SUMMARIZE`
Request a page summary.
```json
{
  "type": "SUMMARIZE"
}
```

#### `START_VOICE`
Begin voice capture.
```json
{
  "type": "START_VOICE"
}
```

#### `STOP_VOICE`
End voice capture.
```json
{
  "type": "STOP_VOICE"
}
```

#### `PERMISSION_RESPONSE`
Respond to a permission request.
```json
{
  "type": "PERMISSION_RESPONSE",
  "payload": {
    "allowed": true,
    "remember": false,
    "requestId": "req-123"
  }
}
```

#### `SAVE_SETTINGS`
Save LLM provider configuration.
```json
{
  "type": "SAVE_SETTINGS",
  "payload": {
    "provider": "openrouter",
    "model": "anthropic/claude-3.5-sonnet",
    "apiKey": "sk-or-...",
    "baseUrl": "https://openrouter.ai/api/v1"
  }
}
```

#### `LOAD_SETTINGS`
Request saved settings.
```json
{
  "type": "LOAD_SETTINGS"
}
```

#### `SAVE_POLICY`
Save Harbor permission policy.
```json
{
  "type": "SAVE_POLICY",
  "payload": {
    "defaultLevel": "ask",
    "siteOverrides": {},
    "toolOverrides": { "read_page": "auto-approve" }
  }
}
```

#### `LOAD_POLICY`
Request saved Harbor policy.
```json
{
  "type": "LOAD_POLICY"
}
```

### Background → Sidebar

#### `CHAT_RESPONSE`
Final AI response after processing.
```json
{
  "type": "CHAT_RESPONSE",
  "payload": {
    "content": "I found 3 alternatives under $50..."
  }
}
```

#### `ACTION_UPDATE`
Tool execution log entry.
```json
{
  "type": "ACTION_UPDATE",
  "payload": {
    "tool": "search_web",
    "args": { "query": "cheap hoodies" },
    "result": "Found 10 results...",
    "success": true,
    "timestamp": 1707400000000
  }
}
```

#### `PERMISSION_REQUEST`
Request user permission for a tool action.
```json
{
  "type": "PERMISSION_REQUEST",
  "payload": {
    "requestId": "req-123",
    "tool": "click_element",
    "site": "amazon.com",
    "args": { "selector": "button.add-to-cart" },
    "permission": "interact"
  }
}
```

#### `SETTINGS_LOADED`
Return saved settings.
```json
{
  "type": "SETTINGS_LOADED",
  "payload": {
    "provider": "ollama",
    "model": "llama3.1",
    "baseUrl": "http://localhost:11434/v1"
  }
}
```

#### `POLICY_LOADED`
Return saved Harbor policy.
```json
{
  "type": "POLICY_LOADED",
  "payload": { "defaultLevel": "ask", "siteOverrides": {}, "toolOverrides": {} }
}
```

#### `VOICE_RESULT`
Voice transcription result.
```json
{
  "type": "VOICE_RESULT",
  "payload": {
    "transcript": "find me a cheaper alternative",
    "isFinal": true
  }
}
```

#### `VOICE_END`
Voice capture session ended.
```json
{
  "type": "VOICE_END"
}
```

#### `VOICE_ERROR`
Voice capture error.
```json
{
  "type": "VOICE_ERROR",
  "payload": {
    "error": "Speech recognition not available in this browser"
  }
}
```

#### `WORKFLOW_UPDATE`
Workflow progress update.
```json
{
  "type": "WORKFLOW_UPDATE",
  "payload": {
    "step": 2,
    "totalSteps": 5,
    "status": "running",
    "description": "Searching eBay for prices..."
  }
}
```

## Background → Content Script Messages

Sent via `browser.tabs.sendMessage(tabId, message)`. Content script returns a Promise with the result.

#### `READ_PAGE`
Extract page content.
```json
// Request
{ "type": "READ_PAGE" }

// Response
{
  "title": "Nike Air Max 270 - Amazon",
  "url": "https://www.amazon.com/...",
  "markdown": "# Nike Air Max 270\n\nPrice: $150.00\n...",
  "product": {
    "name": "Nike Air Max 270",
    "price": "150.00",
    "currency": "USD",
    "brand": "Nike",
    "rating": "4.5"
  },
  "interactiveElements": "[1] BUTTON \"Add to Cart\" → button.add-to-cart\n..."
}
```

#### `CLICK_ELEMENT`
Click an element on the page.
```json
// Request
{ "type": "CLICK_ELEMENT", "payload": { "selector": "button.add-to-cart" } }

// Response
{ "success": true, "message": "Clicked element: button.add-to-cart" }
```

#### `FILL_FORM`
Fill a form field.
```json
// Request
{
  "type": "FILL_FORM",
  "payload": {
    "selector": "input#search",
    "text": "Nike Air Max",
    "submit": true
  }
}

// Response
{ "success": true, "message": "Filled and submitted: input#search" }
```

#### `SCROLL_PAGE`
Scroll the page.
```json
// Request
{ "type": "SCROLL_PAGE", "payload": { "direction": "down" } }

// Response
{ "success": true, "message": "Scrolled down" }
```

#### `START_VOICE_INPUT`
Begin voice capture in content script context.
```json
// Request
{ "type": "START_VOICE_INPUT" }

// Response
{ "success": true }
```

#### `STOP_VOICE_INPUT`
Stop voice capture.
```json
// Request
{ "type": "STOP_VOICE_INPUT" }

// Response
{ "success": true }
```

## Content Script → Background Messages

Sent via `browser.runtime.sendMessage(message)`. These are one-way (fire-and-forget).

#### `VOICE_RESULT`
```json
{ "type": "VOICE_RESULT", "payload": { "transcript": "hello world", "isFinal": true } }
```

#### `VOICE_END`
```json
{ "type": "VOICE_END" }
```

#### `VOICE_ERROR`
```json
{ "type": "VOICE_ERROR", "payload": { "error": "not-allowed" } }
```

#### `PAGE_CONTENT_READY`
Notifies that page content has been extracted and is ready.
```json
{ "type": "PAGE_CONTENT_READY", "payload": { "title": "...", "url": "..." } }
```

## LLM API (`src/lib/any-llm-router.ts`)

### `chatCompletion(config, options)`

```typescript
interface LLMConfig {
  provider: 'openai' | 'openrouter' | 'ollama';
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

interface ChatCompletionOptions {
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_call_id?: string;
  }>;
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string; // JSON string
        };
      }>;
    };
  }>;
}
```

## Tool Registry (`src/lib/mcp-tool-registry.ts`)

### `TOOLS` Array

```typescript
interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, {
    type: string;
    description: string;
    required?: boolean;
    enum?: string[];
  }>;
  permission: 'read-only' | 'interact' | 'navigate';
}
```

### `executeToolAction(toolName, args, tabId)`

Executes a tool action and returns the result string.

```typescript
async function executeToolAction(
  toolName: string,
  args: Record<string, unknown>,
  tabId?: number
): Promise<string>
```

## Harbor Engine (`src/lib/harbor-engine.ts`)

### `checkPermission(policy, toolName, permLevel, site)`

```typescript
function checkPermission(
  policy: HarborPolicy,
  toolName: string,
  permLevel: 'read-only' | 'interact' | 'navigate',
  site: string
): 'auto-approve' | 'ask' | 'deny'
```

## Page Cache (`src/lib/page-cache.ts`)

### `cachePageSnapshot(snapshot)`
```typescript
async function cachePageSnapshot(
  snapshot: Omit<CachedPageSnapshot, 'timestamp'>
): Promise<void>
```

### `getCachedSnapshot(url?)`
```typescript
async function getCachedSnapshot(url?: string): Promise<CachedPageSnapshot | null>
```

### `getLastProductContext()`
```typescript
async function getLastProductContext(): Promise<ProductInfo | null>
```

