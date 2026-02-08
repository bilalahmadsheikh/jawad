# Jawad — Voice Input System

## Overview

Jawad supports voice-native navigation through the Web Speech API (`SpeechRecognition`). Due to Firefox sidebar limitations, voice capture runs in the content script and results are relayed through the background script to the sidebar.

## Architecture

```
┌─────────────┐    START_VOICE     ┌──────────────┐  START_VOICE_INPUT  ┌────────────────┐
│  Sidebar    │ ──────────────────►│  Background  │ ──────────────────►│ Content Script │
│  (UI)       │                    │  (Relay)     │                    │ (SpeechRecog)  │
│             │◄────────────────── │              │◄────────────────── │                │
│             │  VOICE_RESULT /    │              │  VOICE_RESULT /    │                │
│             │  VOICE_END /       │              │  VOICE_END /       │                │
│             │  VOICE_ERROR       │              │  VOICE_ERROR       │                │
└─────────────┘                    └──────────────┘                    └────────────────┘
```

## Why Content Script?

Firefox's sidebar runs in a restricted extension context that does **not** support:
- `SpeechRecognition` / `webkitSpeechRecognition`
- Full Web API access (limited to extension APIs)

Content scripts run in the **page context** and have access to the full Web API, including `SpeechRecognition`.

## Components

### VoiceButton (`src/sidebar/components/VoiceButton.tsx`)

UI component with three states:

| State | Visual | Behavior |
|-------|--------|----------|
| **Idle** | Mic icon | Click to start listening |
| **Listening** | Pulsing red + live transcript | Click to stop |
| **Error** | Error tooltip | Click to dismiss and retry |

### useVoiceInput Hook (`src/sidebar/hooks/useVoiceInput.ts`)

Manages voice state and communication:

```typescript
interface UseVoiceInputReturn {
  isListening: boolean;
  transcript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  isSupported: boolean;
  clearError: () => void;
}
```

- `startListening()` → sends `START_VOICE` to background
- `stopListening()` → sends `STOP_VOICE` to background
- Listens for `VOICE_RESULT`, `VOICE_END`, `VOICE_ERROR` from background

### Background Relay (`src/background/index.ts`)

Routes voice messages between sidebar and content script:

- `START_VOICE` → `browser.tabs.sendMessage(tabId, { type: 'START_VOICE_INPUT' })`
- `STOP_VOICE` → `browser.tabs.sendMessage(tabId, { type: 'STOP_VOICE_INPUT' })`
- `VOICE_RESULT` → `sidebarPort.postMessage({ type: 'VOICE_RESULT', ... })`

### Content Script Handler (`src/content/index.ts`)

Manages the `SpeechRecognition` instance:

```typescript
function startVoiceCapture(): void {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    browser.runtime.sendMessage({
      type: 'VOICE_ERROR',
      payload: { error: 'Speech recognition not available...' }
    });
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    // Extract transcript, send VOICE_RESULT
  };

  recognition.onerror = (event) => {
    // Send VOICE_ERROR with specific message
  };

  recognition.onend = () => {
    // Send VOICE_END
  };

  recognition.start();
  activeRecognition = recognition;
}

function stopVoiceCapture(): void {
  if (activeRecognition) {
    activeRecognition.stop();
    activeRecognition = null;
  }
}
```

## Firefox Configuration

Voice input requires these Firefox settings to be enabled:

1. Navigate to `about:config`
2. Set `media.webspeech.recognition.enable` → `true`
3. Set `media.webspeech.recognition.force_enable` → `true`
4. Reload the extension

## Error Handling

| Error | User Message |
|-------|-------------|
| API not available | "Voice not enabled in Firefox. Open about:config..." |
| Permission denied | "Microphone permission denied. Allow mic access..." |
| No speech detected | "No speech detected. Try again and speak clearly." |
| No active tab | "Navigate to a regular webpage first..." |
| Tab inaccessible | "Cannot access this page for voice input..." |

## Message Protocol

### Sidebar → Background

```json
{ "type": "START_VOICE" }
{ "type": "STOP_VOICE" }
```

### Background → Content Script

```json
{ "type": "START_VOICE_INPUT" }
{ "type": "STOP_VOICE_INPUT" }
```

### Content Script → Background → Sidebar

```json
{ "type": "VOICE_RESULT", "payload": { "transcript": "find cheaper alternatives", "isFinal": true } }
{ "type": "VOICE_END" }
{ "type": "VOICE_ERROR", "payload": { "error": "not-allowed" } }
```

## Limitations

- Requires a regular webpage tab (not `about:*`, `moz-extension:*`, etc.)
- Internet connection required (uses Google's speech service)
- English language default (`en-US`)
- Content script must be injected (page must have loaded)

