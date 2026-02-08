# FoxAgent — Developer Setup Guide

## Prerequisites

- **Node.js** 18+ and npm
- **Firefox Developer Edition** (recommended) or Firefox 109+
- An LLM provider:
  - **Ollama** (local, free): [ollama.com](https://ollama.com)
  - **OpenRouter** (cloud, multi-model): [openrouter.ai](https://openrouter.ai)
  - **OpenAI** (cloud): [platform.openai.com](https://platform.openai.com)

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/AIMasterMinds/Universal-Web-Agent-for-Firefox.git
cd Universal-Web-Agent-for-Firefox
npm install
```

### 2. Build

```bash
npm run build
```

This runs `build.mjs` which:
1. Builds the sidebar React app with Vite → `dist/sidebar.html`, `dist/assets/`
2. Bundles the background script with esbuild → `dist/background.js`
3. Bundles the content script with esbuild → `dist/content.js`
4. Copies `manifest.json` and `icons/` → `dist/`

### 3. Load in Firefox

1. Open Firefox
2. Navigate to `about:debugging#/runtime/this-firefox`
3. Click **"Load Temporary Add-on"**
4. Select `dist/manifest.json`
5. Open the sidebar: **View → Sidebar → FoxAgent**

### 4. Configure LLM Provider

In the FoxAgent sidebar:
1. Click the **Settings** tab (gear icon)
2. Select your provider (Ollama, OpenRouter, or OpenAI)
3. Enter API key (if required)
4. Set model name (e.g., `llama3.1`, `gpt-4o-mini`, `anthropic/claude-3.5-sonnet`)
5. Click **Save**

### Provider-Specific Setup

#### Ollama (Local)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull llama3.1

# Ollama runs on http://localhost:11434 by default
```

Settings:
- Provider: `Ollama`
- Base URL: `http://localhost:11434/v1`
- Model: `llama3.1` (or any pulled model)
- API Key: (leave empty)

#### OpenRouter (Cloud)

1. Sign up at [openrouter.ai](https://openrouter.ai)
2. Get an API key from the dashboard

Settings:
- Provider: `OpenRouter`
- Base URL: `https://openrouter.ai/api/v1`
- Model: e.g., `anthropic/claude-3.5-sonnet`, `google/gemini-2.0-flash-exp:free`
- API Key: Your OpenRouter key

#### OpenAI (Cloud)

1. Sign up at [platform.openai.com](https://platform.openai.com)
2. Create an API key

Settings:
- Provider: `OpenAI`
- Base URL: `https://api.openai.com/v1`
- Model: e.g., `gpt-4o-mini`, `gpt-4o`
- API Key: Your OpenAI key

## Enable Voice Input

Voice input requires Firefox configuration:

1. Open `about:config` in Firefox
2. Search for `media.webspeech.recognition.enable` → set to `true`
3. Search for `media.webspeech.recognition.force_enable` → set to `true`
4. Reload the extension

## Development

### Project Structure

```
├── build.mjs           # Build script (Vite + esbuild)
├── manifest.json       # Firefox extension manifest (v2)
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── vite.config.ts      # Vite config (sidebar build)
├── tailwind.config.js  # Tailwind CSS config
├── postcss.config.js   # PostCSS config
├── sidebar.html        # Sidebar HTML template
├── icons/              # Extension icons
├── src/                # Source code
│   ├── background/     # Background script
│   ├── content/        # Content script
│   ├── sidebar/        # React sidebar UI
│   ├── lib/            # Shared libraries
│   ├── agents/         # Specialized agents
│   └── global.d.ts     # Type declarations
└── dist/               # Built extension (git-ignored)
```

### Build Commands

```bash
# Full build (Vite + esbuild)
npm run build

# Type checking only
npm run lint
```

### Rebuilding After Changes

After modifying source files:

```bash
npm run build
```

Then reload the extension in `about:debugging`:
- Click the **Reload** button next to FoxAgent

### Type Checking

```bash
npm run lint    # runs tsc --noEmit
```

## Troubleshooting

### Extension won't load
- Ensure you're selecting `dist/manifest.json`, not the root `manifest.json`
- Check the browser console (`Ctrl+Shift+J`) for errors

### No LLM response
- Check Settings tab for correct provider configuration
- For Ollama: ensure the server is running (`ollama serve`)
- Check background script console in `about:debugging` → FoxAgent → Inspect

### Voice not working
- Enable `media.webspeech.recognition.enable` in `about:config`
- Enable `media.webspeech.recognition.force_enable` in `about:config`
- Navigate to a regular webpage (not `about:*` or extension pages)
- Allow microphone permission when prompted

### Content script not injecting
- Reload the page after loading the extension
- Check that the URL is not restricted (`about:*`, `moz-extension:*`)
- Check content script console via browser developer tools (F12)

### Tools not calling
- Some models don't support native function calling — the system falls back to XML parsing automatically
- Check the Action Log tab for tool execution history
- Ensure Harbor permissions aren't blocking the tool

## Dependencies

### Runtime
| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^18.2.0 | UI framework |
| `react-dom` | ^18.2.0 | React DOM renderer |
| `react-markdown` | ^9.0.1 | Markdown rendering in chat |
| `zustand` | ^4.5.0 | State management |
| `@mozilla/readability` | ^0.5.0 | Article content extraction |
| `turndown` | ^7.2.0 | HTML → Markdown conversion |
| `lucide-react` | ^0.300.0 | Icons |

### Development
| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ^5.3.0 | Type checking |
| `esbuild` | ^0.19.0 | Background/content bundling |
| `vite` | ^5.0.0 | Sidebar build |
| `@vitejs/plugin-react` | ^4.2.0 | React JSX transform |
| `tailwindcss` | ^3.4.0 | Utility CSS |
| `autoprefixer` | ^10.4.0 | CSS prefixing |
| `postcss` | ^8.4.0 | CSS processing |

