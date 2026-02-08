<p align="center">
  <img src="icons/icon-96.png" alt="Jawad Logo" width="96" height="96" />
</p>

<h1 align="center">Jawad</h1>

<p align="center">
  <em>Like Jarvis is to Iron Man, Jawad is to us.</em><br/>
  <strong>Bring Your Own AI to Every Website — A Browser Operating System for Firefox</strong>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-features">Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#%EF%B8%8F-configuration">Configuration</a> •
  <a href="#-harbor-permissions">Permissions</a> •
  <a href="#-documentation">Docs</a>
</p>

----

## What is Jawad?

**Jawad** is a Firefox browser extension that transforms your browser into an AI-powered operating system. Instead of being stuck with whatever AI a website embeds, Jawad lets you bring **your own AI** — whether it's a local Ollama model, OpenRouter, or OpenAI — to **any website**.

Think of it as your personal AI assistant that lives in your browser sidebar, sees what you see, and can act on your behalf — all under your control.

```
┌─────────────────────────────────────────────────────────┐
│                     Firefox Browser                      │
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
└─────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### 🧠 Multi-Provider LLM Support
Connect to **any** LLM provider with a unified abstraction layer:
- **Ollama** — Run models locally, completely private
- **OpenRouter** — Access 100+ models from one API key
- **OpenAI** — GPT-4o, GPT-4o-mini, and more

### 🔧 Universal Tool Calling
- **Native function calling** for models that support it (OpenAI, Claude, etc.)
- **Automatic XML fallback** for models that don't — every model gets tool access
- **Smart retry logic** — if a provider rejects the `tools` parameter, Jawad retries without it and uses the XML fallback seamlessly

### 📄 Intelligent Page Understanding
- **Structured DOM extraction** via tree walk — captures headings, text, images, links
- **Product data extraction** — JSON-LD, OpenGraph, price/rating heuristics
- **Interactive element mapping** — buttons, links, forms with robust CSS selectors
- **Readability integration** — clean article content extraction
- **Page caching** — remembers what you've browsed for memory-aware conversations

### 🎙️ Voice-Native Navigation
- Speak instead of type — **"Summarize this page"**, **"Find the refund policy"**
- Web Speech API integration running in content scripts for Firefox compatibility
- Real-time transcript display with visual feedback

### 🔬 Research Mode (Multi-Step Workflows)
- **"Find flights, check my calendar, draft an email"** — one intent, multiple sites
- Jawad creates a plan, opens tabs, reads pages, and aggregates results
- Specialized agents for search, email, calendar, and summarization

### 🛡️ Harbor Permission System
A scoped, time-bounded, contextual permission engine:
- **Per-tool control** — allow `read_page` but block `click_element`
- **Per-site trust** — always allow actions on trusted sites
- **Time-bounded** — trust expires after your configured duration
- **Visual permission modal** — see exactly what Jawad wants to do before it acts
- **Action log** — full audit trail of every action taken

### 🎨 Modern Sidebar UI
- Built with **React 18** + **Zustand** + **Tailwind CSS**
- Tabbed interface: Chat, Activity Log, Harbor Permissions, Settings
- Markdown rendering with syntax highlighting
- Dark-themed, compact design optimized for sidebar

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Firefox Developer Edition** (recommended) or Firefox 109+
- An LLM provider (Ollama for local, OpenRouter or OpenAI for cloud)

### Install & Build

```bash
git clone https://github.com/bilalahmadsheikh/jawad.git
cd jawad
npm install
npm run build
```

### Load in Firefox

1. Open Firefox → navigate to `about:debugging#/runtime/this-firefox`
2. Click **"Load Temporary Add-on"**
3. Select `dist/manifest.json`
4. Open the sidebar: **View → Sidebar → Jawad**

### Configure Your AI

1. Click the **Settings** tab (⚙️ gear icon) in the Jawad sidebar
2. Select your provider
3. Enter your API key (if needed)
4. Set the model name
5. Click **Save**

---

## ⚙️ Configuration

### Ollama (Local — Free & Private)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull llama3.1
```

| Setting  | Value |
|----------|-------|
| Provider | `Ollama` |
| Base URL | `http://localhost:11434/v1` |
| Model    | `llama3.1` (or any pulled model) |
| API Key  | *(leave empty)* |

### OpenRouter (Cloud — 100+ Models)

| Setting  | Value |
|----------|-------|
| Provider | `OpenRouter` |
| Base URL | `https://openrouter.ai/api/v1` |
| Model    | e.g., `anthropic/claude-3.5-sonnet`, `google/gemini-2.0-flash-exp:free` |
| API Key  | Your OpenRouter key |

### OpenAI (Cloud)

| Setting  | Value |
|----------|-------|
| Provider | `OpenAI` |
| Base URL | `https://api.openai.com/v1` |
| Model    | e.g., `gpt-4o-mini`, `gpt-4o` |
| API Key  | Your OpenAI key |

### Enable Voice Input

1. Open `about:config` in Firefox
2. Set `media.webspeech.recognition.enable` → `true`
3. Set `media.webspeech.recognition.force_enable` → `true`
4. Reload the extension

---

## 🏗️ Architecture

Jawad follows a **three-layer architecture**:

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| **Sidebar UI** | React 18 + Zustand + Tailwind | Chat, settings, permissions, action log |
| **Background Script** | TypeScript + esbuild | LLM routing, agent loop, orchestration, message handling |
| **Content Script** | TypeScript + esbuild | DOM reading, page actions, voice capture, visual highlighting |

### Capability Tiers

| Tier | Capability | What Jawad Can Do |
|------|-----------|-------------------|
| **1** | LLM + Tools | Chat, structured outputs, tool calling (native + XML fallback) |
| **2** | Browser Context | Read pages, extract products, click, fill forms, scroll, navigate |
| **3** | Coordinated Workflows | Multi-tab research, cross-site actions, agent orchestration |

### Available Tools

| Tool | Permission | Description |
|------|-----------|-------------|
| `read_page` | `read` | Read and extract current page content |
| `click_element` | `interact` | Click a button/link by selector or text |
| `fill_form` | `interact` | Fill a form field with a value |
| `scroll_page` | `interact` | Scroll the page up/down |
| `navigate` | `navigate` | Navigate to a URL |
| `search_web` | `navigate` | Open a web search for a query |
| `draft_email` | `submit` | Open Gmail compose with pre-filled fields |
| `get_snapshot` | `read` | Get a cached snapshot of a previously visited page |

---

## 🛡️ Harbor Permissions

Harbor is Jawad's permission engine. Every AI action goes through it.

### Permission Levels

| Level | Risk | Examples |
|-------|------|---------|
| `read` | Low | Reading page content, getting snapshots |
| `interact` | Medium | Clicking buttons, filling forms, scrolling |
| `navigate` | Medium | Opening URLs, searching the web |
| `submit` | High | Submitting forms, drafting emails |

### How It Works

1. Jawad decides to use a tool (e.g., `click_element`)
2. Harbor checks the policy → auto-approve, prompt user, or deny
3. If prompted, a modal shows: **"Jawad wants to click 'Add to Cart' on amazon.com"**
4. You choose: Allow Once, Allow for Site, Deny, or Deny All
5. Your decision is remembered (with optional expiration)

### Action Log

Every tool execution is logged with:
- Tool name and parameters
- Target site
- Permission decision
- Result (success/error)
- Timestamp

---

## 📁 Project Structure

```
jawad/
├── build.mjs              # Build script (Vite + esbuild)
├── manifest.json          # Firefox extension manifest (v2)
├── package.json           # Dependencies
├── sidebar.html           # Sidebar HTML template
├── tsconfig.json          # TypeScript config
├── vite.config.ts         # Vite config (sidebar)
├── tailwind.config.js     # Tailwind CSS config
├── icons/                 # Extension icons
├── src/
│   ├── background/
│   │   ├── index.ts            # Entry point, port management
│   │   ├── message-handler.ts  # Message routing, intent classification
│   │   ├── agent-manager.ts    # LLM tool-calling loop (native + XML)
│   │   └── orchestrator.ts     # Multi-step workflow orchestration
│   ├── content/
│   │   ├── index.ts            # Entry point, voice capture
│   │   ├── dom-reader.ts       # Structured DOM extraction
│   │   ├── page-actions.ts     # Click, fill, scroll, navigate
│   │   ├── visual-highlighter.ts  # Element targeting overlay
│   │   └── vision-fallback.ts  # Screenshot-based fallback
│   ├── sidebar/
│   │   ├── App.tsx             # Root component with tab routing
│   │   ├── main.tsx            # React entry point
│   │   ├── index.css           # Tailwind + custom styles
│   │   ├── components/
│   │   │   ├── Chat.tsx            # Chat interface
│   │   │   ├── Settings.tsx        # LLM configuration
│   │   │   ├── ActionLog.tsx       # Action audit trail
│   │   │   ├── PermissionModal.tsx # Harbor permission dialog
│   │   │   └── VoiceButton.tsx     # Voice input control
│   │   ├── hooks/
│   │   │   ├── useLLM.ts          # Background message bridge
│   │   │   ├── useHarbor.ts       # Permission state
│   │   │   └── useVoiceInput.ts   # Voice relay to content script
│   │   └── stores/
│   │       ├── chat-store.ts      # Chat messages state
│   │       ├── harbor-store.ts    # Permission requests state
│   │       └── workflow-store.ts  # Workflow progress state
│   ├── agents/
│   │   ├── calendar-agent.ts  # Calendar checking
│   │   ├── email-agent.ts     # Email drafting
│   │   ├── search-agent.ts    # Web search
│   │   └── summarize-agent.ts # Page summarization
│   ├── lib/
│   │   ├── any-llm-router.ts     # Universal LLM abstraction
│   │   ├── mcp-tool-registry.ts  # Tool definitions + execution
│   │   ├── harbor-engine.ts      # Permission engine
│   │   ├── page-cache.ts         # Page snapshot caching
│   │   ├── constants.ts          # System prompt, defaults
│   │   └── types.ts              # Shared TypeScript types
│   └── global.d.ts            # Browser API declarations
├── docs/                      # Detailed documentation
└── dist/                      # Built extension (git-ignored)
```

---

## 🛠️ Development

### Build Commands

```bash
# Full build (Vite + esbuild)
npm run build

# Type checking
npm run lint
```

### After Making Changes

```bash
npm run build
```

Then in `about:debugging`, click **Reload** next to Jawad.

### Tech Stack

| Technology | Purpose |
|-----------|---------|
| **TypeScript** | Type safety across all layers |
| **React 18** | Sidebar UI framework |
| **Zustand** | Lightweight state management |
| **Tailwind CSS** | Utility-first styling |
| **esbuild** | Fast bundling for background + content scripts |
| **Vite** | Dev server + production build for sidebar |
| **Readability** | Article content extraction |
| **Turndown** | HTML → Markdown conversion |
| **Lucide React** | UI icons |

---

## 📖 Documentation

Detailed documentation is available in the [`docs/`](./docs/) directory:

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | System design, component interaction, data flow |
| [Features](docs/features.md) | Capability tiers, tools, intent classification |
| [LLM Integration](docs/llm-integration.md) | Provider abstraction, tool calling, XML fallback |
| [DOM Extraction](docs/dom-extraction.md) | Structured page reading, product extraction |
| [Harbor Permissions](docs/harbor-permissions.md) | Permission engine, policies, resolution |
| [Sidebar UI](docs/sidebar-ui.md) | React components, stores, message protocol |
| [Voice Input](docs/voice-input.md) | Web Speech API integration, relay architecture |
| [Workflows](docs/workflows.md) | Multi-step orchestration, specialized agents |
| [API Reference](docs/api-reference.md) | Message types, payloads, storage keys |
| [Setup Guide](docs/setup-guide.md) | Installation, configuration, troubleshooting |

---

## 🎯 Example Use Cases

### Visual Search & Action
> *"What keyboard is this?"* → Jawad identifies it → searches for it → filters by your preferences → shows you the best options

### Voice-Native Navigation
> *"Find the refund policy and summarize it."* → No clicking required. Jawad reads the page and extracts exactly what you need.

### Cross-Site Workflows
> *"Find flights, check my calendar, draft an email."* → One intent, multiple sites. Jawad orchestrates the entire workflow.

### Memory-Aware Browsing
> *"Is this similar to what I was looking at earlier?"* → Jawad remembers your browsing context through page caching.

### Page Understanding
> *"What are the key points of this article?"* → Jawad extracts structured content and provides grounded, accurate summaries.

---

## 🔒 Privacy & Security

- **Your AI, your data** — Jawad connects directly to your chosen LLM provider. No intermediary servers.
- **Local-first option** — Use Ollama for completely private, offline AI.
- **Transparent permissions** — Every action requires explicit or policy-based approval.
- **Full audit trail** — All actions are logged and inspectable.
- **No tracking** — Jawad doesn't collect telemetry or usage data.

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is part of the **Mozilla Universal Web Agent Hackathon** — building the future of browser-level AI.

---

<p align="center">
  <strong>Jawad</strong> — Your AI, Your Browser, Your Rules.<br/>
  <em>Like Jarvis is to Iron Man, Jawad is to us.</em>
</p>

