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
port.postMessage({ type: 'CHAT_MESSAGE', payload: { content: 'Hello' } });

// Receive messages
port.onMessage.addListener((msg) => { /* ... */ });
```

### Sidebar → Background

#### `CHAT_MESSAGE`
Send a chat message for AI processing.
```json
{
  "type": "CHAT_MESSAGE",
  "payload": {
    "content": "Find me a cheaper alternative to this product"
  }
}
```

#### `SUMMARIZE_PAGE`
Request a page summary.
```json
{
  "type": "SUMMARIZE_PAGE"
}
```

#### `START_VOICE`
Begin voice capture (relayed to content script as `START_VOICE_INPUT`).
```json
{
  "type": "START_VOICE"
}
```

#### `STOP_VOICE`
End voice capture (relayed to content script as `STOP_VOICE_INPUT`).
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
    "requestId": "perm_123456_abc",
    "decision": "allow-once"
  }
}
```

Valid decisions: `"allow-once"`, `"allow-site"`, `"allow-session"`, `"deny"`, `"deny-all"`

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

#### `GET_SETTINGS`
Request saved settings.
```json
{
  "type": "GET_SETTINGS"
}
```

#### `START_WORKFLOW`
Start a Research Mode multi-step workflow.
```json
{
  "type": "START_WORKFLOW",
  "payload": {
    "intent": "Compare prices for Nike Air Max across 3 stores"
  }
}
```

#### `CANCEL_WORKFLOW`
Cancel the currently running workflow.
```json
{
  "type": "CANCEL_WORKFLOW"
}
```

#### `CLEAR_HISTORY`
Clear the conversation history in the background script.
```json
{
  "type": "CLEAR_HISTORY"
}
```

### Background → Sidebar

#### `CHAT_RESPONSE`
Final AI response after processing.
```json
{
  "type": "CHAT_RESPONSE",
  "payload": {
    "content": "I found 3 alternatives under $50...",
    "isError": false
  }
}
```

#### `ACTION_LOG_UPDATE`
Tool execution log entry.
```json
{
  "type": "ACTION_LOG_UPDATE",
  "payload": {
    "id": "log_123",
    "timestamp": 1707400000000,
    "toolName": "search_web",
    "parameters": { "query": "cheap hoodies" },
    "site": "google.com",
    "permissionLevel": "navigate",
    "decision": "auto-approved",
    "result": "success",
    "details": "Found 10 results..."
  }
}
```

#### `PERMISSION_REQUEST`
Request user permission for a tool action.
```json
{
  "type": "PERMISSION_REQUEST",
  "payload": {
    "id": "perm_123456_abc",
    "toolName": "click_element",
    "parameters": { "selector": "button.add-to-cart" },
    "site": "amazon.com",
    "permissionLevel": "interact",
    "reason": "FoxAgent wants to use 'click_element' on amazon.com",
    "timestamp": 1707400000000
  }
}
```

#### `SETTINGS`
Return saved settings (response to `GET_SETTINGS`).
```json
{
  "type": "SETTINGS",
  "payload": {
    "provider": "ollama",
    "model": "llama3.1",
    "apiKey": "",
    "baseUrl": "http://localhost:11434/v1"
  }
}
```

Payload is `null` if no settings have been saved yet.

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
Workflow progress update. Payload is a full `WorkflowPlan` object.
```json
{
  "type": "WORKFLOW_UPDATE",
  "payload": {
    "id": "wf_123",
    "intent": "Compare prices for Nike Air Max",
    "steps": [
      {
        "id": "step_0_abc",
        "agent": "SearchAgent",
        "task": "Search Amazon for Nike Air Max",
        "site": "https://www.google.com/search?q=...",
        "permissions": ["read-only", "navigate"],
        "status": "completed",
        "result": "Found Nike Air Max at $150"
      },
      {
        "id": "step_1_def",
        "agent": "SearchAgent",
        "task": "Search eBay for Nike Air Max",
        "site": "https://www.google.com/search?q=...",
        "permissions": ["read-only", "navigate"],
        "status": "running"
      }
    ],
    "status": "running",
    "createdAt": 1707400000000
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

Sent via `browser.runtime.sendMessage(message)`. These are one-way (fire-and-forget), relayed to the sidebar port by the background script.

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
  apiKey: string;
  baseUrl: string;
}

interface ChatCompletionOptions {
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | null;
    tool_calls?: unknown[];
    tool_call_id?: string;
  }>;
  tools?: ToolDefinition[];  // OpenAI-format function definitions
  temperature?: number;
  max_tokens?: number;       // Defaults to 4096
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

If a provider rejects the `tools` parameter (status 400/422 with tool-related error text), the router automatically retries without tools, enabling the XML fallback in `agent-manager.ts`.

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
  permission: 'read-only' | 'interact' | 'navigate' | 'submit';
}
```

### `executeToolAction(toolName, args, tabId)`

Executes a tool action and returns the result.

```typescript
async function executeToolAction(
  toolName: string,
  args: Record<string, unknown>,
  tabId?: number
): Promise<unknown>
```

## Harbor Engine (`src/lib/harbor-engine.ts`)

### `checkPermission(policy, toolName, permLevel, site)`

```typescript
function checkPermission(
  policy: HarborPolicy,
  toolName: string,
  permLevel: PermissionLevel,  // 'read-only' | 'navigate' | 'interact' | 'submit'
  site: string
): 'auto-approve' | 'ask' | 'deny'
```

### `updateHarborPolicyForDecision(toolName, site, decision)`

```typescript
async function updateHarborPolicyForDecision(
  toolName: string,
  site: string,
  decision: string  // PermissionDecision
): Promise<void>
```

### `isCriticalAction(buttonText, url)`

```typescript
function isCriticalAction(buttonText: string, url: string): boolean
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

### `getRecentSnapshots(limit?)`
```typescript
async function getRecentSnapshots(limit?: number): Promise<CachedPageSnapshot[]>
```
