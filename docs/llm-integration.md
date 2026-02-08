# Jawad — LLM Integration

## Universal LLM Router (`src/lib/any-llm-router.ts`)

Jawad uses a single abstraction layer that supports three LLM providers with a unified API.

### Supported Providers

| Provider | Base URL | Auth | Tool Calling |
|----------|----------|------|--------------|
| **OpenAI** | `https://api.openai.com/v1` | `Authorization: Bearer <key>` | Native function calling |
| **OpenRouter** | `https://openrouter.ai/api/v1` | `Authorization: Bearer <key>` | Depends on model |
| **Ollama** | `http://localhost:11434/v1` | None | Depends on model |

### Request Flow

```
chatCompletion(config, options)
       │
       ▼
  Build request body:
  - messages, model, temperature
  - tools (if provided)
  - tool_choice (if tools present)
       │
       ▼
  Set headers by provider:
  - OpenAI/OpenRouter: Authorization + Content-Type
  - Ollama: Content-Type only
       │
       ▼
  POST to provider endpoint
       │
       ├── Success → parse JSON → return ChatCompletionResponse
       │
       └── Failure (400/422 + tool-related error)
              │
              ▼
           Retry WITHOUT tools parameter
           (enables XML fallback in agent-manager)
              │
              ├── Success → return response (no tool_calls in response)
              └── Failure → throw Error
```

### Universal Tools-Rejection Fallback

Many models (especially via Ollama or OpenRouter) don't support native function calling. The router handles this transparently:

1. **Initial request** includes `tools` parameter
2. If provider returns **400 or 422** with a tool-related error message, the router:
   - Removes `tools` and `tool_choice` from the body
   - Retries the same request without tools
3. The LLM then responds with plain text (potentially containing XML tool calls)
4. `agent-manager.ts` parses any XML tool calls from the response

**Detection heuristic**: Status 400/422 plus error text matching `/tool|function|unsupported|not support|invalid.*param/i`

### Friendly Error Messages

The router includes `friendlyApiError()` which maps HTTP status codes to actionable user-facing messages:

| Status | Message |
|--------|---------|
| 401 | Invalid API key — double-check your provider key in Settings |
| 403 (OpenRouter) | API key has no credits or is invalid — add credits at openrouter.ai |
| 403 (OpenAI) | API key invalid or no billing — check platform.openai.com |
| 404 | Model not found — check the model name in Settings |
| 429 | Rate limited — wait and try again |
| 5xx | Server error — provider may be down |

### Configuration (`LLMConfig`)

```typescript
interface LLMConfig {
  provider: 'openai' | 'openrouter' | 'ollama';
  model: string;
  apiKey?: string;
  baseUrl?: string;
}
```

Settings are stored in `browser.storage.local` and configurable from the sidebar Settings panel.

## Tool Calling

### Native Function Calling (Preferred)

For models that support it (e.g., GPT-4, Claude via OpenRouter), tools are passed as OpenAI-format function definitions:

```json
{
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "search_web",
        "description": "Search Google directly...",
        "parameters": {
          "type": "object",
          "properties": {
            "query": { "type": "string", "description": "Search query" }
          },
          "required": ["query"]
        }
      }
    }
  ]
}
```

The response includes `tool_calls` array with function name and arguments.

### XML Fallback (Automatic)

When native function calling is unavailable, the LLM includes tool calls as XML in its text response:

```xml
<search_web query="best running shoes 2024" />
```

Or with body content:

```xml
<draft_email to="user@example.com" subject="Meeting">
  Body text here
</draft_email>
```

**Parsing** (`agent-manager.ts`):
1. Self-closing: `/<(\w+)\s+([\s\S]*?)\/>/g`
2. With body: `/<(\w+)\s+([\s\S]*?)>([\s\S]*?)<\/\1>/g`
3. Attributes extracted via `/(\w+)\s*=\s*"([^"]*)"/g`

### Response Sanitization

After the agent loop completes, `cleanLLMResponse()` strips:
- Known tool XML tags (all registered tool names)
- Hallucinated XML patterns (`<function_name ... />`)
- Markdown-wrapped tool calls (````xml ... <tool> ... `````)
- Orphaned XML-like patterns

## System Prompt Design (`src/lib/constants.ts`)

The system prompt includes:
1. **Critical rules**: Grounding, no unnecessary tools, follow-up handling, summarization
2. **Tool calling instructions**: Native preferred, XML fallback format
3. **Available tools table**: Name, when to use, permission level
4. **Decision tree**: Step-by-step guide for the LLM to choose the right action

### Context Injection

Before the agent loop, `message-handler.ts` injects:
- **Current page context**: Title, URL, structured content, product data, interactive elements
- **Previous product context**: From page cache, if navigating between product pages
- **Previous assistant response**: For follow-up questions

This ensures the LLM has all necessary information to answer without unnecessary tool calls.

## Agent Loop (`src/background/agent-manager.ts`)

```
┌─────────────────────────────────────┐
│         runAgentLoop()              │
│                                     │
│  iterations = 0                     │
│  while (iterations < 10):          │
│    ├── Refresh tab context          │
│    ├── Call LLM with messages       │
│    ├── Check for tool_calls         │
│    │   ├── Yes → execute tools      │
│    │   │        append results      │
│    │   │        continue loop       │
│    │   └── No                       │
│    ├── Check for XML tool calls     │
│    │   ├── Yes → execute tools      │
│    │   │        append results      │
│    │   │        continue loop       │
│    │   └── No                       │
│    └── Return cleaned text response │
│                                     │
│  Return "max iterations" message    │
└─────────────────────────────────────┘
```

**Key properties**:
- Maximum 10 iterations to prevent infinite loops
- Tab context (tabId, site) refreshed each iteration
- Permission checked before each tool execution
- Single `CHAT_RESPONSE` sent after loop completes (prevents premature loading state)

### Conversation History Management

Conversation history is maintained in `message-handler.ts` and trimmed to the **last 100 messages** to prevent unbounded growth and context overflow. The `trimHistory()` function is called after every message addition.

### Connection Testing

The Settings panel includes a **Test Connection** button that routes through the background script (not the sidebar directly, since Firefox CSP blocks sidebar `fetch` to `localhost`). The background script uses `chatCompletion()` with a minimal prompt (`"Say ok"`) and returns a `TEST_RESULT` message with success/failure and a friendly error message.

The timeout is **30 seconds** for Ollama (cold start can be slow) and **20 seconds** for cloud providers.

