# FoxAgent — Workflows and Orchestration

## Overview

FoxAgent supports multi-step, cross-site workflows through its orchestration layer. This enables complex tasks like "find flights, check my calendar, and draft an email" to be executed as a coordinated sequence.

**File**: `src/background/orchestrator.ts`

## Workflow Architecture

```
User: "Compare prices for Nike Air Max across 3 stores"
       │
       ▼
Message Handler detects workflow intent (START_WORKFLOW message)
       │
       ▼
planAndExecuteWorkflow(intent, port)
       │
       ├── Step 1: LLM generates a structured workflow plan
       │   └── createWorkflowPlan() → { steps: [
       │         { agent: "SearchAgent", task: "Search Amazon...", site: "https://..." },
       │         { agent: "SearchAgent", task: "Search eBay...", site: "https://..." },
       │         ...
       │       ]}
       │
       ├── Step 2: Plan sent to sidebar as WORKFLOW_UPDATE
       │   └── Also sent as CHAT_RESPONSE for display
       │
       ├── Step 3: Execute each step sequentially
       │   ├── Open site in new tab (browser.tabs.create)
       │   ├── Wait for page load (waitForLoad)
       │   ├── Read page content (READ_PAGE)
       │   ├── Build context from previous step results
       │   ├── Run agent loop for the step (runAgentLoop)
       │   ├── Collect results
       │   └── Update workflow status in sidebar (WORKFLOW_UPDATE)
       │
       └── Step 4: Aggregate and synthesize results
           └── Final summary sent as CHAT_RESPONSE
```

## Workflow Planning

The orchestrator uses the LLM to decompose complex requests:

1. **Input**: User's multi-step intent
2. **LLM call**: `createWorkflowPlan()` asks the LLM to generate a JSON plan with 3–5 steps
3. **Each step** includes: `agent` (type), `task` (description), `site` (URL to visit)
4. **Output**: `WorkflowPlan` with ordered `WorkflowStep` entries

```typescript
interface WorkflowPlan {
  id: string;
  intent: string;
  steps: WorkflowStep[];
  status: 'planning' | 'awaiting-approval' | 'running' | 'paused'
        | 'completed' | 'cancelled' | 'error';
  createdAt: number;
  error?: string;
}

interface WorkflowStep {
  id: string;
  agent: string;
  task: string;
  site: string;
  tabId?: number;
  permissions: PermissionLevel[];
  dependsOn?: string[];
  status: 'pending' | 'running' | 'completed' | 'error' | 'skipped';
  result?: unknown;
  error?: string;
}
```

## Step Execution

Each step in the workflow:

1. **Tab creation**: Opens the target site in a new tab via `browser.tabs.create()`
2. **Page load wait**: `waitForLoad()` waits for `tabs.onUpdated` status `'complete'` plus 1 second for JS rendering
3. **Page reading**: Sends `READ_PAGE` to the content script on the new tab
4. **Context building**: Includes results from all previous steps
5. **Agent loop**: `runAgentLoop()` with step-specific system prompt
6. **Status update**: Sidebar receives `WORKFLOW_UPDATE` after each step
7. **Error handling**: Failed steps logged with error details; workflow continues

## Multi-Tab Coordination

Workflows span multiple tabs:

```typescript
// Navigate to a new tab for each step
const tab = await browser.tabs.create({ url: step.site, active: true });

// Wait for page load (15-second timeout)
await waitForLoad(tab.id!);

// Read the new page
const pageContent = await browser.tabs.sendMessage(tab.id!, { type: 'READ_PAGE' });
```

The `waitForLoad()` function:
- Listens for `browser.tabs.onUpdated` with `status === 'complete'`
- Adds a 1-second delay after load for JS rendering
- Has a **15-second timeout** as a safety fallback

## Specialized Agents

FoxAgent includes specialized agent definitions for common workflows:

| Agent | File | Purpose |
|-------|------|---------|
| **Search Agent** | `src/agents/search-agent.ts` | Web search and result parsing |
| **Calendar Agent** | `src/agents/calendar-agent.ts` | Calendar interaction |
| **Email Agent** | `src/agents/email-agent.ts` | Email composition |
| **Summarize Agent** | `src/agents/summarize-agent.ts` | Content summarization |

These agents provide specialized system prompts and tool configurations for their respective domains.

## Cancellation

Users can cancel a running workflow via the Cancel button in the UI. This sends `CANCEL_WORKFLOW` to the background, which sets an `isCancelled` flag. The orchestrator checks this flag before each step and halts if set.

## Workflow UI (`WorkflowPlan.tsx`)

The sidebar displays workflow progress:

```
┌─────────────────────────────────┐
│  📋 Workflow Plan               │
│                                 │
│  ✅ Step 1: Search Amazon       │
│  ✅ Step 2: Extract price       │
│  🔄 Step 3: Search eBay        │
│  ⬜ Step 4: Compare results     │
│                                 │
│  [Cancel Workflow]              │
└─────────────────────────────────┘
```

### Step States
- ⬜ **Pending**: Not yet started
- 🔄 **Running**: Currently executing
- ✅ **Completed**: Finished successfully
- ❌ **Error**: Error occurred
- ⏭️ **Skipped**: Skipped due to dependency failure

## Workflow Store (`workflow-store.ts`)

Zustand store tracking workflow state:

```typescript
interface WorkflowState {
  currentWorkflow: WorkflowPlan | null;

  setWorkflow: (workflow: WorkflowPlan | null) => void;
  updateStepStatus: (stepId: string, status: string, result?: unknown) => void;
}
```

`setWorkflow(null)` clears the current workflow (used on cancel or completion).

`updateStepStatus` updates a step's status and optional result by matching `stepId`.

## Result Synthesis

After all steps complete, the orchestrator:

1. Collects all completed step results
2. Formats them as a summary: `**Step N (Agent):** result`
3. Sends the combined summary to the sidebar as a final `CHAT_RESPONSE`

## Error Recovery

- **Tab closed**: Steps wrapped in try-catch; errors set step status to `'error'`
- **Page load timeout**: 15-second timeout per navigation step
- **Content script failure**: Falls back to `{ markdown: 'Could not read page content.', title: step.site }`
- **Tool failure**: Logs error, workflow continues with remaining steps
- **Permission denied**: Handled by the agent loop's permission system
- **LLM error**: Caught by the orchestrator; reported as workflow error
- **User cancellation**: Checked before each step; workflow status set to `'cancelled'`

## Example Workflows

### Price Comparison
```
1. SearchAgent: "Search Amazon for Nike Air Max 270" → google.com search
2. SearchAgent: "Search eBay for Nike Air Max 270" → google.com search
3. SearchAgent: "Search Nike.com for Air Max 270" → nike.com
4. Synthesize: comparison table with prices from all sources
```

### Travel Planning
```
1. SearchAgent: "Search for flights NYC to London March 2024" → google.com
2. CalendarAgent: "Check calendar for March availability" → calendar.google.com
3. EmailAgent: "Draft email with travel plans" → gmail compose
4. Synthesize: combined summary with flight options and availability
```

### Research and Summarize
```
1. SearchAgent: "Search for topic of interest" → google.com
2. SearchAgent: "Visit top result for details" → result URL
3. SearchAgent: "Visit second result for comparison" → result URL
4. Synthesize: combined summary with sources
```
