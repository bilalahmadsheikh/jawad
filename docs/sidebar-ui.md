# Jawad — Sidebar UI and User Interaction

## Overview

The sidebar is Jawad's primary user interface, built with React 18, Zustand for state management, and Tailwind CSS for styling. It runs in Firefox's sidebar panel.

**Entry point**: `src/sidebar/main.tsx` → `src/sidebar/App.tsx`

## Architecture

```
sidebar/
├── App.tsx                  # Root component, tab routing
├── main.tsx                 # React DOM render entry
├── index.css                # Tailwind base styles
├── components/
│   ├── Chat.tsx             # Chat interface
│   ├── Settings.tsx         # LLM provider config
│   ├── ActionLog.tsx        # Tool execution history
│   ├── VoiceButton.tsx      # Microphone input
│   ├── SummarizeButton.tsx  # Quick page summary
│   ├── PermissionModal.tsx  # Harbor permission requests
│   ├── HarborManager.tsx    # Permission policy editor
│   └── WorkflowPlan.tsx     # Multi-step workflow display
├── hooks/
│   ├── useLLM.ts            # Background communication
│   ├── useVoiceInput.ts     # Voice input relay
│   └── useHarbor.ts         # Permission state
├── stores/
│   ├── chat-store.ts        # Messages, loading state, active tab
│   ├── harbor-store.ts      # Pending permissions, action log
│   └── workflow-store.ts    # Workflow plan state
└── lib/
    └── port.ts              # Background port singleton
```

## Tab Navigation

The sidebar has four main tabs:

| Tab | ID | Icon | Component | Purpose |
|-----|----|------|-----------|---------|
| **Chat** | `chat` | MessageSquare | `Chat.tsx` | Main conversational interface |
| **Log** | `activity` | Activity | `ActionLog.tsx` | History of all tool executions |
| **Config** | `settings` | Settings | `Settings.tsx` | LLM provider configuration |
| **Harbor** | `harbor` | Shield | `HarborManager.tsx` | Permission policy editor |

Tab type: `type TabId = 'chat' | 'activity' | 'settings' | 'harbor';`

## Chat Interface (`Chat.tsx`)

### Message Display
- Messages rendered with `react-markdown` for rich formatting
- User messages aligned right, assistant messages aligned left
- Loading indicator during processing
- Auto-scroll to latest message

### Input Area
- Text input with Enter to send
- Voice input button (microphone icon)
- Summarize button (quick page summary)
- Disabled during loading state

### Message Flow
```
User input → useLLM.sendChatMessage(content)
          → port.postMessage({ type: 'CHAT_MESSAGE', payload: { content } })
          → Background processes
          → CHAT_RESPONSE received
          → chatStore.addMessage()
          → chatStore.setLoading(false)
          → UI re-renders
```

### Welcome Message
On startup (and after `clearMessages()`), the chat shows:

> **Welcome to Jawad!** I'm your browser operating system.
>
> I can:
> - **Summarize** any web page
> - **Navigate** and **interact** with sites
> - **Research** across multiple tabs
> - Accept **voice commands**
>
> Configure your AI provider in **Settings** to get started.

After clearing, it shows: "Chat cleared. How can I help you?"

## Settings Panel (`Settings.tsx`)

### Configurable Options

| Setting | Description |
|---------|-------------|
| **Provider** | OpenAI, OpenRouter, or Ollama |
| **API Key** | Required for OpenAI and OpenRouter |
| **Base URL** | Custom endpoint (auto-filled per provider) |
| **Model** | Model identifier string |
| **System Prompt** | Custom instructions for the AI agent |

### Persistence
Settings are saved to `browser.storage.local` via `SAVE_SETTINGS` and loaded on startup via `GET_SETTINGS`.

## Voice Button (`VoiceButton.tsx`)

### States
- **Idle**: Microphone icon, click to start
- **Recording/Listening**: Pulsing red indicator, "Recording... click to stop"
- **Transcribing**: Pulsing blue + spinner (Whisper mode only), "Transcribing..."
- **Error**: Amber error tooltip with specific guidance, auto-dismiss after 12s

### Voice Modes
Users can select between two modes in Settings:

| Mode | Message Sent | How It Works |
|------|-------------|-------------|
| **Whisper** (default) | `START_VOICE` | Content script records audio → background transcribes via Whisper API |
| **Browser Speech** | `START_SPEECH_RECOGNITION` | Content script uses Web Speech API for real-time transcript |

### Flow (Whisper)
1. Click mic → sends `START_VOICE` to background
2. Background relays `START_VOICE_INPUT` to content script
3. Content script starts MediaRecorder → sends `VOICE_STARTED`
4. Click stop → sends `STOP_VOICE` → content script stops → sends `VOICE_AUDIO`
5. Background transcribes via Whisper → sends `VOICE_RESULT`
6. Final transcript inserted as chat message

### Flow (Browser Speech)
1. Click mic → sends `START_SPEECH_RECOGNITION` to background
2. Background relays to content script
3. Content script starts SpeechRecognition → sends `VOICE_STARTED`
4. Real-time results: `VOICE_SPEECH_RESULT` with interim/final transcripts
5. Click stop → sends `STOP_SPEECH_RECOGNITION`
6. Final transcript inserted as chat message

### Error Messages
- **Mic blocked**: Click the lock icon in the address bar → Allow microphone
- **Provider doesn't support Whisper**: Use Browser Speech mode or switch to OpenAI/OpenRouter
- **No speech detected**: Speak clearly and try again
- **Wrong page**: Navigate to a regular HTTPS webpage first
- **Insecure context**: Voice requires HTTPS
- **No mic found**: Connect a microphone and try again

## Permission Modal (`PermissionModal.tsx`)

Appears as an overlay when a tool requires user confirmation:

- Shows tool name, target site, and action details
- Options: Allow Once, Allow for Site, Deny
- Blocks further agent execution until resolved
- Keyboard accessible (Enter to allow, Escape to deny)

## State Management (Zustand)

### Chat Store (`chat-store.ts`)

```typescript
type TabId = 'chat' | 'activity' | 'settings' | 'harbor';

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  activeTab: TabId;

  addMessage: (msg: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
  setActiveTab: (tab: TabId) => void;
  clearMessages: () => void;
}
```

### Harbor Store (`harbor-store.ts`)

```typescript
interface HarborState {
  pendingPermissions: PermissionRequest[];
  actionLog: ActionLogEntry[];

  addPendingPermission: (req: PermissionRequest) => void;
  removePendingPermission: (id: string) => void;
  addActionLogEntry: (entry: ActionLogEntry) => void;
  clearActionLog: () => void;
}
```

Keeps the last 100 action log entries. Pending permissions are displayed as modals; the first in the queue is shown at any time.

### Workflow Store (`workflow-store.ts`)

```typescript
interface WorkflowState {
  currentWorkflow: WorkflowPlan | null;

  setWorkflow: (workflow: WorkflowPlan | null) => void;
  updateStepStatus: (stepId: string, status: string, result?: unknown) => void;
}
```

## Background Communication (`lib/port.ts`)

Singleton pattern for the background script connection:

```typescript
// Send a message to the background script
sendToBackground({ type: 'CHAT_MESSAGE', payload: { content: 'Hello' } });

// Listen for messages from background
const unsubscribe = addMessageHandler((msg) => {
  if (msg.type === 'CHAT_RESPONSE') {
    // Handle response
  }
});
```

### Message Types (Sidebar → Background)

| Type | Payload | Purpose |
|------|---------|---------|
| `CHAT_MESSAGE` | `{ content: string }` | Send chat message |
| `SUMMARIZE_PAGE` | — | Request page summary |
| `START_VOICE` | — | Begin voice capture (Whisper mode) |
| `STOP_VOICE` | — | End voice capture (Whisper mode) |
| `START_SPEECH_RECOGNITION` | — | Begin voice capture (Browser Speech mode) |
| `STOP_SPEECH_RECOGNITION` | — | End voice capture (Browser Speech mode) |
| `TEST_CONNECTION` | `{ baseUrl, model, apiKey, provider }` | Test LLM connection |
| `PERMISSION_RESPONSE` | `{ requestId: string, decision: string }` | Respond to permission request |
| `SAVE_SETTINGS` | `LLMConfig` | Save provider settings |
| `GET_SETTINGS` | — | Load saved settings |
| `START_WORKFLOW` | `{ intent: string }` | Start multi-step research |
| `CANCEL_WORKFLOW` | — | Cancel running workflow |
| `CLEAR_HISTORY` | — | Clear conversation history |

### Message Types (Background → Sidebar)

| Type | Payload | Purpose |
|------|---------|---------|
| `CHAT_RESPONSE` | `{ content: string, isError?: boolean }` | Final AI response |
| `ACTION_LOG_UPDATE` | `ActionLogEntry` | Tool execution log entry |
| `PERMISSION_REQUEST` | `PermissionRequest` | Ask user permission |
| `SETTINGS` | `LLMConfig \| null` | Return saved settings |
| `VOICE_STARTED` | — | Voice recording has started |
| `VOICE_TRANSCRIBING` | — | Audio sent to Whisper, awaiting result |
| `VOICE_RESULT` | `{ transcript: string, isFinal: boolean }` | Whisper transcription result |
| `VOICE_SPEECH_RESULT` | `{ transcript: string, isFinal: boolean, isInterim?: boolean }` | Browser Speech real-time result |
| `VOICE_END` | — | Voice capture ended |
| `VOICE_ERROR` | `{ error: string }` | Voice error message |
| `TEST_RESULT` | `{ success: boolean, error?: string }` | LLM connection test result |
| `WORKFLOW_UPDATE` | `WorkflowPlan` | Workflow progress |

## Styling

- **Tailwind CSS** with a dark theme (slate-900 background)
- **Responsive**: Adapts to sidebar width
- **Lucide React** icons throughout
- **Animations**: Loading spinner, voice pulse, permission modal fade
