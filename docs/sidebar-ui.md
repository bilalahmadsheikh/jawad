# FoxAgent — Sidebar UI and User Interaction

## Overview

The sidebar is FoxAgent's primary user interface, built with React 18, Zustand for state management, and Tailwind CSS for styling. It runs in Firefox's sidebar panel.

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

> **Welcome to FoxAgent!** I'm your browser operating system.
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
- **Listening**: Pulsing red indicator, live transcript shown
- **Error**: Error message tooltip with specific guidance

### Flow
1. Click mic → sends `START_VOICE` to background
2. Background relays `START_VOICE_INPUT` to content script
3. Content script runs `SpeechRecognition`
4. Results relayed back: `VOICE_RESULT` → sidebar
5. Final transcript inserted as chat message

### Error Messages
- **Voice not enabled**: Instructions to enable in `about:config`
- **Permission denied**: Prompt to allow microphone access
- **No speech detected**: Prompt to try again
- **Wrong page**: Navigate to a regular webpage first

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
| `START_VOICE` | — | Begin voice capture |
| `STOP_VOICE` | — | End voice capture |
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
| `VOICE_RESULT` | `{ transcript: string, isFinal: boolean }` | Voice transcription result |
| `VOICE_END` | — | Voice capture ended |
| `VOICE_ERROR` | `{ error: string }` | Voice error message |
| `WORKFLOW_UPDATE` | `WorkflowPlan` | Workflow progress |

## Styling

- **Tailwind CSS** with a dark theme (slate-900 background)
- **Responsive**: Adapts to sidebar width
- **Lucide React** icons throughout
- **Animations**: Loading spinner, voice pulse, permission modal fade
