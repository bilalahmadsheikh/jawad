# FoxAgent — Architecture Overview

## System Design

FoxAgent is a Firefox browser extension that turns the browser into an AI-powered operating system. It follows a **three-layer architecture** connecting the sidebar UI, background services, and content scripts.

```
┌──────────────────────────────────────────────────────────┐
│                     Firefox Browser                       │
│                                                          │
│  ┌─────────────┐   Port/Messages   ┌──────────────────┐ │
│  │  Sidebar UI │◄──────────────────►│ Background Script │ │
│  │  (React)    │                    │  (Service Hub)    │ │
│  └─────────────┘                    └────────┬─────────┘ │
│                                              │           │
│                              tabs.sendMessage│           │
│                                              ▼           │
│                                     ┌────────────────┐   │
│                                     │ Content Script  │   │
│                                     │ (Page Context)  │   │
│                                     └────────────────┘   │
│                                                          │
│  External:  LLM Providers (Ollama / OpenRouter / OpenAI) │
│             MCP Servers (future)                          │
└──────────────────────────────────────────────────────────┘
```

## Three Layers

### 1. Sidebar UI (`src/sidebar/`)

- **Technology**: React 18 + Zustand + Tailwind CSS
- **Entry point**: `src/sidebar/main.tsx` → renders `App.tsx`
- **Responsibilities**:
  - Chat interface for user input and AI responses
  - Settings panel for LLM provider configuration
  - Action log showing tool executions
  - Permission modal for Harbor permission requests
  - Voice input button (delegates to content script)
  - Workflow plan display for multi-step operations
- **Communication**: Connects to the background script via `browser.runtime.connect({ name: 'sidebar' })` (persistent port).

### 2. Background Script (`src/background/`)

- **Technology**: Plain TypeScript, bundled with esbuild
- **Entry point**: `src/background/index.ts`
- **Responsibilities**:
  - **Message routing**: Routes messages between sidebar and content scripts
  - **Agent loop** (`agent-manager.ts`): Iterative LLM ↔ tool execution cycle
  - **Message handling** (`message-handler.ts`): Intent classification, fast-paths, context injection
  - **Orchestration** (`orchestrator.ts`): Multi-tab workflow planning and execution
  - **LLM calls**: Via `any-llm-router.ts` — supports OpenAI, OpenRouter, Ollama
  - **Tool registry**: `mcp-tool-registry.ts` — defines tools and executes them
  - **Permission engine**: `harbor-engine.ts` — checks policies before tool execution
  - **Page cache**: `page-cache.ts` — stores page snapshots for memory-aware browsing
- **Communication**: Listens on port `sidebar`; uses `browser.tabs.sendMessage()` to reach content scripts.

### 3. Content Script (`src/content/`)

- **Technology**: Plain TypeScript, bundled with esbuild
- **Entry point**: `src/content/index.ts`
- **Injected into**: All URLs (`<all_urls>`, at `document_idle`)
- **Responsibilities**:
  - **DOM reading** (`dom-reader.ts`): Extracts page content, product data, interactive elements
  - **Page actions** (`page-actions.ts`): Click, fill, scroll with visual highlighting
  - **Voice capture**: Runs `SpeechRecognition` API (requires page context, not sidebar)
  - **Vision fallback** (`vision-fallback.ts`): Screenshot-based fallback for difficult pages
  - **Visual highlighting** (`visual-highlighter.ts`): Highlights elements before interaction
- **Communication**: Responds to `browser.runtime.onMessage` from background script; sends results back via `browser.runtime.sendMessage`.

## Data Flow

### Chat Message Flow

```
User types message
       │
       ▼
Sidebar (Chat.tsx) ──► port.postMessage({ type: 'CHAT_MESSAGE', payload: { content } })
       │
       ▼
Background (message-handler.ts)
  ├── Classify intent: action / summarize / Q&A / follow-up
  ├── Fast-path (summarize/Q&A): Direct LLM call with page context → response
  └── Action path: runAgentLoop()
       │
       ▼
Agent Loop (agent-manager.ts) ──── while (iterations < 10)
  ├── Build messages array with system prompt + conversation + page context
  ├── Call LLM via any-llm-router.ts (with tools if supported)
  ├── Parse response:
  │   ├── Native tool_calls → extract tool name + args
  │   ├── XML fallback → parse <tool_name param="value" />
  │   └── Plain text → return as final answer
  ├── For each tool call:
  │   ├── Check permission via harbor-engine.ts
  │   ├── If denied → ask user via sidebar
  │   ├── Execute tool via mcp-tool-registry.ts
  │   │   └── Tool sends message to content script (READ_PAGE, CLICK_ELEMENT, etc.)
  │   └── Append tool result to messages
  └── Loop until plain text response or max iterations
       │
       ▼
Background sends CHAT_RESPONSE to sidebar
       │
       ▼
Sidebar displays the response
```

### Voice Input Flow

```
User clicks mic button (VoiceButton.tsx)
       │
       ▼
Sidebar ──► port.postMessage({ type: 'START_VOICE' })
       │
       ▼
Background (index.ts) ──► browser.tabs.sendMessage(tabId, { type: 'START_VOICE_INPUT' })
       │
       ▼
Content Script (index.ts) ──► starts SpeechRecognition
       │
       ▼ (on result)
Content Script ──► browser.runtime.sendMessage({ type: 'VOICE_RESULT', payload: { transcript } })
       │
       ▼
Background ──► sidebarPort.postMessage({ type: 'VOICE_RESULT', ... })
       │
       ▼
Sidebar (useVoiceInput.ts) ──► calls onResult(transcript)
```

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Persistent port** for sidebar ↔ background | Enables streaming, avoids reconnection overhead |
| **Content script for voice** | Firefox sidebar doesn't support `SpeechRecognition`; content scripts have full Web API access |
| **Intent classification before agent loop** | Prevents hallucinated tool calls for simple Q&A/summarization |
| **Universal tools-rejection fallback** | Models that don't support function calling gracefully fall back to XML parsing |
| **Page context injected into system prompt** | Keeps LLM grounded; eliminates unnecessary `read_page` calls |
| **esbuild for background/content, Vite for sidebar** | Sidebar needs React JSX transform; background/content are simpler bundles |

## Extension Manifest

- **Manifest V2** (Firefox)
- **Permissions**: `activeTab`, `storage`, `tabs`, `<all_urls>`
- **Sidebar action**: Opens the FoxAgent panel
- **Content scripts**: Injected into all pages at `document_idle`
- **CSP**: `script-src 'self'; object-src 'self'`

## File Structure

```
src/
├── agents/              # Specialized agent definitions (search, calendar, email, summarize)
├── background/
│   ├── index.ts         # Entry point, port management, voice relay
│   ├── agent-manager.ts # Core agent loop (LLM ↔ tools)
│   ├── message-handler.ts # Intent routing, fast-paths, context
│   └── orchestrator.ts  # Multi-tab workflow engine
├── content/
│   ├── index.ts         # Message router, voice capture
│   ├── dom-reader.ts    # Page extraction (structured + Readability)
│   ├── page-actions.ts  # Click, fill, scroll
│   ├── vision-fallback.ts    # Screenshot-based fallback
│   └── visual-highlighter.ts # Element highlighting before interaction
├── lib/
│   ├── any-llm-router.ts    # Universal LLM abstraction
│   ├── constants.ts          # System prompt, defaults
│   ├── harbor-engine.ts      # Permission engine
│   ├── mcp-tool-registry.ts  # Tool definitions + execution
│   ├── page-cache.ts         # Page snapshot caching
│   └── types.ts              # Shared type definitions
├── sidebar/
│   ├── App.tsx               # Root component
│   ├── main.tsx              # React entry point
│   ├── components/           # UI components
│   ├── hooks/                # React hooks (useLLM, useVoiceInput, etc.)
│   ├── lib/port.ts           # Background port management
│   └── stores/               # Zustand state stores
└── global.d.ts               # Browser API type declarations
```

