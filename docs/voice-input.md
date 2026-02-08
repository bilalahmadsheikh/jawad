# Jawad — Voice Input System

## Overview

Jawad supports voice-native navigation through a **dual-mode voice system**. Users can choose between:

1. **Whisper mode** (default): MediaRecorder + Whisper API — highest accuracy, requires an OpenAI-compatible provider
2. **Browser Speech mode**: Web Speech API (`SpeechRecognition`) — free, real-time, no API key needed

Both modes delegate all recording to the **content script** (page context), because Firefox's sidebar panel does not have access to `getUserMedia` or `SpeechRecognition`. The voice mode preference is persisted in `browser.storage.local`.

## Architecture

### Whisper Mode

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

### Browser Speech Mode

```
┌─────────────┐ START_SPEECH_RECOGNITION ┌──────────────┐  Relay  ┌────────────────┐
│  Sidebar    │ ────────────────────────►│  Background  │ ──────►│ Content Script │
│  (UI)       │                          │  (Hub)       │        │ (SpeechRecog.) │
│             │◄──────────────────────── │              │◄────── │                │
│             │  VOICE_STARTED           │  Relays      │ VOICE_SPEECH_RESULT    │
│             │  VOICE_SPEECH_RESULT     │  messages    │ VOICE_STARTED          │
│             │  VOICE_END               │              │ VOICE_END              │
│             │  VOICE_ERROR             │              │ VOICE_ERROR            │
└─────────────┘                          └──────────────┘                        │
                                                                 └────────────────┘
```

### Whisper Mode Flow

1. **User clicks mic** → Sidebar sends `START_VOICE` to background
2. **Background relays** → `START_VOICE_INPUT` to content script
3. **Content script starts MediaRecorder** → captures audio from microphone → sends `VOICE_STARTED`
4. **User clicks stop** → Sidebar sends `STOP_VOICE` → relayed as `STOP_VOICE_INPUT`
5. **Content script stops recording** → assembles audio blob → base64 → sends `VOICE_TRANSCRIBING` + `VOICE_AUDIO`
6. **Background receives audio** → loads LLM config → calls Whisper API (`/audio/transcriptions`)
7. **Transcription result** → Background sends `VOICE_RESULT` with `{ transcript, isFinal: true }`
8. **Sidebar processes** → `useVoiceInput` hook calls `onResult(transcript)` → text submitted to chat

### Browser Speech Mode Flow

1. **User clicks mic** → Sidebar sends `START_SPEECH_RECOGNITION` to background
2. **Background relays** → `START_SPEECH_RECOGNITION` to content script
3. **Content script starts SpeechRecognition** → sends `VOICE_STARTED`
4. **Real-time results** → Content script sends `VOICE_SPEECH_RESULT` with `{ transcript, isFinal, isInterim }`
5. **User clicks stop** → Sidebar sends `STOP_SPEECH_RECOGNITION` → content script stops recognition
6. **Final result** → `VOICE_SPEECH_RESULT` with `isFinal: true` → sidebar calls `onResult(transcript)`

## Mode Comparison

| Feature | Whisper Mode | Browser Speech Mode |
|---------|-------------|-------------------|
| **Accuracy** | Excellent (OpenAI Whisper) | Good (browser-dependent) |
| **Cost** | Requires API credits | Free |
| **Real-time** | No (batch after stop) | Yes (interim results) |
| **API key** | Required (OpenAI/OpenRouter) | Not required |
| **Firefox config** | None needed | May need `about:config` flags |
| **HTTPS required** | Yes (for getUserMedia) | Yes (for SpeechRecognition) |

## Components

### VoiceButton (`src/sidebar/components/VoiceButton.tsx`)

UI component with four states:

| State | Visual | Behavior |
|-------|--------|----------|
| **Idle** | Mic icon | Click to start recording |
| **Recording** | Pulsing red + "Recording... click to stop" | Click to stop |
| **Transcribing** | Pulsing blue + spinner + "Transcribing..." | Waiting for Whisper result (Whisper mode only) |
| **Error** | Amber error tooltip | Auto-dismiss after 12s, click to retry |

### useVoiceInput Hook (`src/sidebar/hooks/useVoiceInput.ts`)

Manages voice state and communication:

```typescript
type VoiceMode = 'whisper' | 'browser';

interface UseVoiceInputReturn {
  isListening: boolean;       // Microphone is recording / recognition active
  isTranscribing: boolean;    // Audio sent to Whisper, waiting for result
  transcript: string;         // Last transcribed text
  error: string | null;       // User-friendly error message
  voiceMode: VoiceMode;       // Current mode ('whisper' or 'browser')
  startListening: () => void;
  stopListening: () => void;
  clearError: () => void;
  setVoiceMode: (mode: VoiceMode) => void;
}
```

- `startListening()` → sends `START_VOICE` (Whisper) or `START_SPEECH_RECOGNITION` (Browser Speech)
- `stopListening()` → sends `STOP_VOICE` or `STOP_SPEECH_RECOGNITION`
- `setVoiceMode()` → persists choice to `browser.storage.local`
- Listens for `VOICE_STARTED`, `VOICE_TRANSCRIBING`, `VOICE_RESULT`, `VOICE_SPEECH_RESULT`, `VOICE_END`, `VOICE_ERROR`

**Important**: The sidebar NEVER touches `getUserMedia`, `MediaRecorder`, or `SpeechRecognition` directly. All recording happens in the content script.

### Background Script (`src/background/index.ts`)

Central hub for voice handling:

- Relays `START_VOICE` / `STOP_VOICE` to content script as `START_VOICE_INPUT` / `STOP_VOICE_INPUT`
- Relays `START_SPEECH_RECOGNITION` / `STOP_SPEECH_RECOGNITION` to content script
- Receives `VOICE_AUDIO` from content script → calls `transcribeAudio()` from `any-llm-router.ts`
- Forwards `VOICE_STARTED`, `VOICE_TRANSCRIBING`, `VOICE_RESULT`, `VOICE_SPEECH_RESULT`, `VOICE_ERROR`, `VOICE_END` to sidebar
- Checks `supportsTranscription()` before attempting Whisper — returns friendly error for Ollama users

### Transcription (`src/lib/any-llm-router.ts`)

```typescript
export async function transcribeAudio(
  config: LLMConfig,
  audioBase64: string,
  mimeType: string
): Promise<string>

export function supportsTranscription(config: LLMConfig): boolean
// Returns true for 'openai' and 'openrouter', false for 'ollama'
```

- `supportsTranscription()` checks if the provider supports Whisper
- Decodes base64 audio → builds `FormData` with `file` and `model: 'whisper-1'`
- POSTs to `{baseUrl}/audio/transcriptions`
- Works with OpenAI, OpenRouter, and any OpenAI-compatible provider
- Throws descriptive errors with `friendlyApiError()` for HTTP failures

### Content Script (`src/content/index.ts`)

Manages both recording modes:

```typescript
// --- Whisper path (MediaRecorder) ---
function startVoiceCapture(): void
// 1. Pre-flight checks (HTTPS, mediaDevices, MediaRecorder, mic permission)
// 2. getUserMedia({ audio: true })
// 3. new MediaRecorder(stream, { mimeType })
// 4. Collects chunks via ondataavailable
// 5. On stop: assembles blob → base64 → sends VOICE_AUDIO

function stopVoiceCapture(): void
// Stops MediaRecorder → triggers onstop handler

// --- Browser Speech path ---
function startSpeechRecognition(): Promise<{ success: boolean; error?: string }>
// 1. Pre-flight checks (SpeechRecognition API, HTTPS)
// 2. new SpeechRecognition() with continuous + interimResults
// 3. Sends VOICE_SPEECH_RESULT on each result event
// 4. Sends VOICE_END on recognition end

function stopSpeechRecognition(): void
// Stops active SpeechRecognition instance
```

## Prerequisites

- **Microphone permission**: The user must allow microphone access for the page when prompted
- **Regular webpage**: Voice input requires a regular HTTPS webpage tab (not `about:*`, `moz-extension:*`, etc.)
- **Whisper mode**: Requires an LLM provider that supports the `/audio/transcriptions` endpoint (OpenAI or OpenRouter)
- **Browser Speech mode**: May require enabling `media.webspeech.recognition.enable` and `media.webspeech.recognition.force_enable` in Firefox `about:config`

## Error Handling

| Error Scenario | User Message |
|----------------|-------------|
| Mic permission denied | "Mic blocked. Click the lock icon in the address bar → Allow microphone." |
| No speech detected | "No speech detected. Speak clearly and try again." |
| No active tab | "Navigate to a webpage first." |
| Tab inaccessible | "Voice doesn't work here. Navigate to a regular HTTPS website." |
| No LLM provider configured | "Configure an LLM in Settings first, or use 'Browser Speech' mode." |
| Provider doesn't support Whisper | "Provider doesn't support Whisper. Use 'Browser Speech' mode or switch to OpenAI/OpenRouter." |
| Insecure context (HTTP) | "Voice requires HTTPS. Navigate to a secure site." |
| No microphone found | "No mic found. Connect a microphone and try again." |
| Mic in use by another app | "Mic in use by another app. Close it and retry." |
| Web Speech API not available | "Browser Speech not available. Use Whisper mode or try a different browser." |
| MediaRecorder unavailable | "MediaRecorder not available on this page." |
| Transcription API error | Displays specific error from the provider with actionable guidance |

## Message Protocol

### Sidebar → Background

```json
{ "type": "START_VOICE" }
{ "type": "STOP_VOICE" }
{ "type": "START_SPEECH_RECOGNITION" }
{ "type": "STOP_SPEECH_RECOGNITION" }
```

### Background → Content Script

```json
{ "type": "START_VOICE_INPUT" }
{ "type": "STOP_VOICE_INPUT" }
{ "type": "START_SPEECH_RECOGNITION" }
{ "type": "STOP_SPEECH_RECOGNITION" }
```

### Content Script → Background

```json
{ "type": "VOICE_STARTED" }
{ "type": "VOICE_TRANSCRIBING" }
{ "type": "VOICE_AUDIO", "payload": { "audio": "<base64>", "mimeType": "audio/webm" } }
{ "type": "VOICE_SPEECH_RESULT", "payload": { "transcript": "hello", "isFinal": false, "isInterim": true } }
{ "type": "VOICE_ERROR", "payload": { "error": "MIC_DENIED: ..." } }
{ "type": "VOICE_END" }
```

### Background → Sidebar

```json
{ "type": "VOICE_STARTED" }
{ "type": "VOICE_TRANSCRIBING" }
{ "type": "VOICE_RESULT", "payload": { "transcript": "find cheaper alternatives", "isFinal": true } }
{ "type": "VOICE_SPEECH_RESULT", "payload": { "transcript": "find cheaper", "isFinal": false, "isInterim": true } }
{ "type": "VOICE_ERROR", "payload": { "error": "No speech detected..." } }
{ "type": "VOICE_END" }
```

## Supported Audio Formats (Whisper Mode)

The content script selects the best available format in priority order:

1. `audio/webm;codecs=opus` (preferred)
2. `audio/webm`
3. `audio/ogg;codecs=opus`
4. `audio/ogg`
5. Browser default (fallback)

## Voice Mode Persistence

The selected voice mode is stored in `browser.storage.local` under the key `jawad_voice_mode`. On sidebar load, the hook reads this value and restores the user's preference. The Settings panel includes a voice mode selector.

## Limitations

- Requires a regular HTTPS webpage tab (not `about:*`, `moz-extension:*`, etc.)
- Content script must be injected (page must have loaded)
- **Whisper mode**: Requires an LLM provider with Whisper support; internet connection required; small audio files (<0.5s) may not produce reliable transcription
- **Browser Speech mode**: May require Firefox `about:config` flags; accuracy varies by browser; requires HTTPS
- Firefox sidebar cannot access `getUserMedia` or `SpeechRecognition` directly — all recording is delegated to the content script
