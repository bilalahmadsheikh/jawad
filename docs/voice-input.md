# Jawad — Voice Input System

## Overview

Jawad supports voice-native navigation through a **MediaRecorder + Whisper API** pipeline. The content script records audio using the browser's MediaRecorder API (reliable across all browsers), then sends the recorded audio to the background script, which transcribes it via the user's configured LLM provider's OpenAI-compatible Whisper endpoint.

This approach was chosen because Firefox's experimental `SpeechRecognition` API is unreliable — it starts without error but silently fails to produce results in many configurations.

## Architecture

```
┌─────────────┐    START_VOICE     ┌──────────────┐  START_VOICE_INPUT  ┌────────────────┐
│  Sidebar    │ ──────────────────►│  Background  │ ──────────────────►│ Content Script │
│  (UI)       │                    │  (Hub)       │                    │ (MediaRecorder)│
│             │◄────────────────── │              │◄────────────────── │                │
│             │  VOICE_STARTED     │  Transcribes │  VOICE_AUDIO       │                │
│             │  VOICE_TRANSCRIBING│  via Whisper │  VOICE_STARTED     │                │
│             │  VOICE_RESULT      │              │  VOICE_TRANSCRIBING│                │
│             │  VOICE_ERROR       │              │  VOICE_ERROR       │                │
└─────────────┘                    └──────────────┘                    └────────────────┘
```

### Flow

1. **User clicks mic** → Sidebar sends `START_VOICE` to background
2. **Background relays** → `START_VOICE_INPUT` to content script
3. **Content script starts MediaRecorder** → captures audio from microphone → sends `VOICE_STARTED` to confirm
4. **User clicks stop** → Sidebar sends `STOP_VOICE` to background → relayed as `STOP_VOICE_INPUT`
5. **Content script stops recording** → assembles audio blob → converts to base64 → sends `VOICE_TRANSCRIBING` + `VOICE_AUDIO`
6. **Background receives audio** → loads LLM config → calls Whisper API (`/audio/transcriptions`)
7. **Transcription result** → Background sends `VOICE_RESULT` with `{ transcript, isFinal: true }` to sidebar
8. **Sidebar processes** → `useVoiceInput` hook calls `onResult(transcript)` → text is submitted to chat

## Why MediaRecorder + Whisper?

| Approach | Reliability | Browser Support | Quality |
|----------|------------|-----------------|---------|
| `SpeechRecognition` | ❌ Unreliable in Firefox (silent failures) | Firefox requires `about:config` flags | Decent |
| **MediaRecorder + Whisper** | ✅ Reliable, deterministic | All modern browsers | Excellent (OpenAI Whisper) |

Content scripts run in the **page context** and have access to `navigator.mediaDevices.getUserMedia()` and `MediaRecorder`, which work reliably in Firefox.

## Components

### VoiceButton (`src/sidebar/components/VoiceButton.tsx`)

UI component with four states:

| State | Visual | Behavior |
|-------|--------|----------|
| **Idle** | Mic icon | Click to start recording |
| **Recording** | Pulsing red + "Recording... click to stop" | Click to stop |
| **Transcribing** | Pulsing blue + spinner + "Transcribing..." | Waiting for Whisper result |
| **Error** | Amber error tooltip | Auto-dismiss after 12s, click to retry |

### useVoiceInput Hook (`src/sidebar/hooks/useVoiceInput.ts`)

Manages voice state and communication:

```typescript
interface UseVoiceInputReturn {
  isListening: boolean;       // Microphone is recording
  isTranscribing: boolean;    // Audio sent to Whisper, waiting for result
  transcript: string;         // Last transcribed text
  error: string | null;       // User-friendly error message
  startListening: () => void;
  stopListening: () => void;
  isSupported: boolean;
  clearError: () => void;
}
```

- `startListening()` → sends `START_VOICE` to background
- `stopListening()` → sends `STOP_VOICE` to background
- Listens for `VOICE_STARTED`, `VOICE_TRANSCRIBING`, `VOICE_RESULT`, `VOICE_END`, `VOICE_ERROR`

### Background Script (`src/background/index.ts`)

Central hub for voice handling:

- Relays `START_VOICE` / `STOP_VOICE` from sidebar to content script
- Receives `VOICE_AUDIO` from content script → calls `transcribeAudio()` from `any-llm-router.ts`
- Forwards `VOICE_STARTED`, `VOICE_TRANSCRIBING`, `VOICE_ERROR`, `VOICE_END` to sidebar
- Sends `VOICE_RESULT` with transcription to sidebar

### Transcription (`src/lib/any-llm-router.ts`)

```typescript
export async function transcribeAudio(
  config: LLMConfig,
  audioBase64: string,
  mimeType: string
): Promise<string>
```

- Decodes base64 audio → builds `FormData` with `file` and `model: 'whisper-1'`
- POSTs to `{baseUrl}/audio/transcriptions`
- Works with OpenAI, OpenRouter, and any OpenAI-compatible provider
- Throws descriptive errors if endpoint is unavailable (404) or fails

### Content Script (`src/content/index.ts`)

Manages audio recording:

```typescript
// Selects best supported MIME type
function getSupportedMimeType(): string  // audio/webm;codecs=opus preferred

// Records audio via MediaRecorder
function startVoiceCapture(): void
// 1. getUserMedia({ audio: true })
// 2. new MediaRecorder(stream, { mimeType })
// 3. Collects chunks via ondataavailable
// 4. On stop: assembles blob → base64 → sends VOICE_AUDIO

function stopVoiceCapture(): void
// Stops MediaRecorder → triggers onstop handler
```

## Prerequisites

- **LLM provider with Whisper support**: The user must configure an LLM provider that supports the `/audio/transcriptions` endpoint (e.g., OpenAI, or OpenAI-compatible providers).
- **Microphone permission**: The user must allow microphone access for the page.
- **Regular webpage**: Voice input requires a regular webpage tab (not `about:*`, `moz-extension:*`, etc.) because content scripts must be injected.

## Error Handling

| Error Scenario | User Message |
|----------------|-------------|
| Microphone permission denied | "Microphone permission denied. Allow mic access for this site and try again." |
| No speech detected | "No speech detected. Please try again and speak clearly." |
| No active tab | "Navigate to a regular webpage first, then try voice input." |
| Tab inaccessible | "Cannot access this page for voice input. Try navigating to a regular webpage." |
| No LLM provider configured | "Configure an LLM provider in Settings to enable voice transcription." |
| Provider doesn't support Whisper | "Your LLM provider does not support voice transcription. Try OpenAI or a compatible provider." |
| MediaRecorder unavailable | "Voice recording is not available on this page." |
| Transcription API error | Displays the specific error from the provider |

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

### Content Script → Background

```json
{ "type": "VOICE_STARTED" }
{ "type": "VOICE_TRANSCRIBING" }
{ "type": "VOICE_AUDIO", "payload": { "audio": "<base64>", "mimeType": "audio/webm" } }
{ "type": "VOICE_ERROR", "payload": { "error": "Microphone permission denied..." } }
{ "type": "VOICE_END" }
```

### Background → Sidebar

```json
{ "type": "VOICE_STARTED" }
{ "type": "VOICE_TRANSCRIBING" }
{ "type": "VOICE_RESULT", "payload": { "transcript": "find cheaper alternatives", "isFinal": true } }
{ "type": "VOICE_ERROR", "payload": { "error": "No speech detected..." } }
{ "type": "VOICE_END" }
```

## Supported Audio Formats

The content script selects the best available format in priority order:

1. `audio/webm;codecs=opus` (preferred)
2. `audio/webm`
3. `audio/ogg;codecs=opus`
4. `audio/ogg`
5. Browser default (fallback)

## Limitations

- Requires a regular webpage tab (not `about:*`, `moz-extension:*`, etc.)
- Requires an LLM provider that supports the Whisper `/audio/transcriptions` endpoint
- Internet connection required for transcription API call
- English language default (Whisper auto-detects, but primarily optimized for English)
- Content script must be injected (page must have loaded)
- Small audio files (<0.5s) may not produce reliable transcription
