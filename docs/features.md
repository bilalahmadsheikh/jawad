# Jawad — Features and Capabilities

## Capability Tiers

Jawad implements three graduated capability tiers, each increasing power and responsibility.

### Tier 1: LLM Access + Tool Calling

- **Multi-provider LLM support**: OpenAI, OpenRouter, Ollama
- **Native function calling**: OpenAI-style tool calls for supported models
- **XML fallback**: Automatic fallback for models without native function calling
- **Configurable settings**: Provider, model, API key, base URL, system prompt
- **Conversation history**: Maintains context across messages in a session

### Tier 2: Browser Context and Page Interaction

- **Page reading**: Extracts structured content via DOM tree walk and Readability
- **Product data extraction**: JSON-LD, OpenGraph, and DOM heuristic extraction
- **Interactive elements**: Identifies clickable buttons, links, form fields with CSS selectors
- **Click elements**: By CSS selector or visible text (smart element finding)
- **Fill forms**: By CSS selector or purpose keyword (search, email, password)
- **Navigation**: Open URLs in current or new tabs
- **Scrolling**: Scroll up/down for content discovery
- **Web search**: Direct Google search with result extraction
- **Email drafting**: Open Gmail compose with pre-filled fields
- **Page caching**: Memory-aware browsing with cached snapshots

### Tier 3: Coordinated Workflows

- **Research mode**: Multi-tab workflow planning and execution
- **Step-by-step orchestration**: Plan → execute → collect → synthesize
- **Agent coordination**: Multiple specialized agents (search, calendar, email, summarize)

## Available Tools

| Tool | Description | Permission |
|------|-------------|------------|
| `read_page` | Read current page content, product info, interactive elements | read-only |
| `click_element` | Click by CSS selector or visible text | interact |
| `fill_form` | Fill input by selector or keyword; optional submit | interact |
| `navigate` | Go to a URL (current tab or new tab) | navigate |
| `search_web` | Google search — returns results page content | navigate |
| `draft_email` | Open Gmail compose with to/subject/body (not sent) | interact |
| `scroll_page` | Scroll current page up or down | read-only |
| `get_snapshot` | Retrieve cached context from a previously viewed page | read-only |

## Key Features

### Visual Search and Action
- Ask "What keyboard is this?" on a product page
- Agent extracts product info, searches for alternatives, compares prices
- Uses `read_page` → `search_web` → `navigate` tool chain

### Voice-Native Navigation
- Click the microphone button to speak commands
- **Dual-mode system**: Choose between Whisper (high accuracy, API-based) or Browser Speech (free, real-time)
- **Whisper mode**: Content script records via MediaRecorder → background transcribes via Whisper API
- **Browser Speech mode**: Content script uses Web Speech API (`SpeechRecognition`) for real-time transcript
- Voice mode preference persisted across sessions
- All recording delegated to content script (Firefox sidebar cannot access mic directly)
- Transcripts are automatically submitted as chat messages
- Works on any regular HTTPS webpage

### Cross-Site Workflows
- "Find flights, check my calendar, draft an email"
- Research mode plans multi-step workflows across tabs
- Each step executes sequentially with result collection
- Final synthesis combines all gathered information

### Memory-Aware Browsing
- Page snapshots cached in `browser.storage.local`
- Product information preserved across navigation
- "Is this similar to what I was looking at?" uses `get_snapshot`
- 7-day TTL, max 50 entries, automatic cleanup

### Preference-First Experiences
- Custom system prompts for personalized behavior
- Budget constraints, brand preferences encoded in prompt
- Context travels with the user across sites

## Intent Classification

Jawad classifies user input to route requests efficiently:

| Intent | Detection | Processing |
|--------|-----------|------------|
| **Action** | Keywords: search, find, click, fill, navigate, buy, etc. | Full agent loop with tools |
| **Summarize** | "summarize", "summary", "tldr", etc. | Fast-path: direct LLM call with page context |
| **Page Q&A** | "what is", "how much", "tell me about", etc. (no action keywords) | Fast-path: grounded LLM call (temp=0.3) |
| **Follow-up** | "yes", "sure", "tell me more", "no", "cancel" | Context injection from previous response |

## Hallucination Prevention

- **Intent-based routing**: Summarize and Q&A bypass the tool system entirely
- **Low temperature**: Factual queries use temperature 0.3
- **Response sanitization**: `cleanLLMResponse` strips hallucinated XML tool tags
- **Grounding instruction**: System prompt requires answers from provided context only
- **Context-first**: Page content injected before the agent loop starts

## Permission System (Harbor)

- **Scoped permissions**: Per-tool, per-site, per-permission-level
- **Four permission levels**: `read-only`, `navigate`, `interact`, `submit`
- **Three outcomes**: auto-approve, ask user, deny
- **User confirmation**: Modal overlay for sensitive actions
- **Critical action detection**: Keywords like "checkout", "purchase", "delete" always require confirmation
- **Time-bounded**: Site trust entries support optional expiration timestamps
- **Inspectable**: Action log shows all tool executions and their results
- **User decisions**: Allow once, allow for site, allow for session, deny, deny all

