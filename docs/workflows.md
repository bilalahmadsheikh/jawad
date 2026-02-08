# FoxAgent — Workflows and Orchestration

## Overview

FoxAgent supports multi-step, cross-site workflows through its orchestration layer. This enables complex tasks like "find flights, check my calendar, and draft an email" to be executed as a coordinated sequence.

**File**: `src/background/orchestrator.ts`

## Workflow Architecture

```
User: "Compare prices for Nike Air Max across 3 stores"
       │
       ▼
Message Handler detects workflow intent
       │
       ▼
planAndExecuteWorkflow()
       │
       ├── Step 1: LLM generates workflow plan
       │   └── { steps: [
       │         { action: "search_web", args: { query: "Nike Air Max Amazon" } },
       │         { action: "navigate", args: { url: "..." } },
       │         { action: "read_page", args: {} },
       │         ...
       │       ]}
       │
       ├── Step 2: Execute each step sequentially
       │   ├── Check permissions
       │   ├── Execute tool action
       │   ├── Collect results
       │   └── Update workflow status in sidebar
       │
       └── Step 3: Synthesize results
           └── LLM combines all step results into final response
```

## Workflow Planning

The orchestrator uses the LLM to decompose complex requests:

1. **Input**: User's multi-step request + available tools
2. **LLM call**: Generates a structured plan with ordered steps
3. **Output**: Array of steps with tool names, arguments, and dependencies

## Step Execution

Each step in the workflow:

1. **Permission check**: Via Harbor engine (may pause for user approval)
2. **Tool execution**: Via `mcp-tool-registry.ts`
3. **Result collection**: Page content, action results stored
4. **Status update**: Sidebar shows current step progress
5. **Error handling**: Failed steps logged, workflow continues if possible

## Multi-Tab Coordination

Workflows can span multiple tabs:

```typescript
// Navigate to a new tab for each site
await browser.tabs.create({ url: targetUrl });

// Wait for page load
await new Promise(resolve => {
  browser.tabs.onUpdated.addListener(function listener(tabId, info) {
    if (tabId === newTab.id && info.status === 'complete') {
      browser.tabs.onUpdated.removeListener(listener);
      resolve(undefined);
    }
  });
});

// Read the new page
const pageContent = await browser.tabs.sendMessage(tab.id, { type: 'READ_PAGE' });
```

## Specialized Agents

FoxAgent includes specialized agent definitions for common workflows:

| Agent | File | Purpose |
|-------|------|---------|
| **Search Agent** | `src/agents/search-agent.ts` | Web search and result parsing |
| **Calendar Agent** | `src/agents/calendar-agent.ts` | Calendar interaction |
| **Email Agent** | `src/agents/email-agent.ts` | Email composition |
| **Summarize Agent** | `src/agents/summarize-agent.ts` | Content summarization |

These agents provide specialized system prompts and tool configurations for their respective domains.

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
- ✅ **Complete**: Finished successfully
- ❌ **Failed**: Error occurred
- ⏭️ **Skipped**: Skipped due to dependency failure

## Workflow Store (`workflow-store.ts`)

Zustand store tracking workflow state:

```typescript
interface WorkflowState {
  isActive: boolean;
  plan: WorkflowStep[];
  currentStep: number;
  results: Record<number, string>;
  setWorkflow: (plan: WorkflowStep[]) => void;
  updateStep: (index: number, status: StepStatus) => void;
  addResult: (index: number, result: string) => void;
  clearWorkflow: () => void;
}
```

## Result Synthesis

After all steps complete, the orchestrator:

1. Collects all step results
2. Sends them to the LLM with a synthesis prompt
3. LLM generates a unified response (e.g., price comparison table)
4. Response sent to sidebar as final `CHAT_RESPONSE`

## Error Recovery

- **Tab closed**: Detects missing tabs and re-creates if needed
- **Page load timeout**: 30-second timeout per navigation step
- **Tool failure**: Logs error, attempts to continue with remaining steps
- **Permission denied**: Skips step, notes in final synthesis
- **LLM error**: Retries once, then reports partial results

## Example Workflows

### Price Comparison
```
1. search_web("Nike Air Max 270 Amazon")
2. navigate(first result URL)
3. read_page() → extract price
4. search_web("Nike Air Max 270 eBay")
5. navigate(first result URL)
6. read_page() → extract price
7. Synthesize: comparison table
```

### Travel Planning
```
1. search_web("flights NYC to London March 2024")
2. read_page() → extract flight options
3. navigate("calendar.google.com")
4. read_page() → check availability
5. draft_email(to, "Travel Plans", summary)
```

### Research and Summarize
```
1. search_web("topic of interest")
2. navigate(top 3 results, new tabs)
3. read_page() on each tab
4. Synthesize: combined summary with sources
```

