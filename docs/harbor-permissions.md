# FoxAgent — Harbor Permission System

## Overview

Harbor is FoxAgent's permission engine, mediating between AI capabilities and user control. It ensures that every agent action is either explicitly authorized or falls within a pre-approved policy.

**File**: `src/lib/harbor-engine.ts`

## Design Principles

1. **Scoped**: Permissions are per-tool, per-site, per-permission-level
2. **Time-bounded**: Policies can be temporary (session) or permanent
3. **Contextual**: Different sites can have different permission levels
4. **User-controlled**: Users can always see, modify, and revoke permissions
5. **Inspectable**: Every action is logged in the Action Log

## Permission Levels

| Level | Description | Example Tools |
|-------|-------------|---------------|
| `read-only` | Can read but not modify | `read_page`, `scroll_page`, `get_snapshot` |
| `interact` | Can interact with page elements | `click_element`, `fill_form`, `draft_email` |
| `navigate` | Can change the current URL | `navigate`, `search_web` |

## Permission Check Flow

```
Tool execution requested
       │
       ▼
checkPermission(policy, toolName, permLevel, site)
       │
       ├── Policy says "auto-approve" for this tool/site → Execute immediately
       │
       ├── Policy says "ask" → Show permission modal to user
       │   │
       │   ├── User approves → Execute
       │   ├── User approves + "remember" → Execute + save policy
       │   └── User denies → Skip tool, inform LLM
       │
       └── Policy says "deny" → Skip tool, inform LLM
```

## Policy Structure

```typescript
interface HarborPolicy {
  defaultLevel: 'ask' | 'auto-approve' | 'deny';
  siteOverrides: Record<string, {
    level: 'ask' | 'auto-approve' | 'deny';
    allowedTools?: string[];
    deniedTools?: string[];
  }>;
  toolOverrides: Record<string, 'ask' | 'auto-approve' | 'deny'>;
}
```

### Resolution Order

1. **Tool-specific override** (`toolOverrides[toolName]`)
2. **Site-specific override** (`siteOverrides[site].level`)
3. **Site tool whitelist/blacklist** (`allowedTools` / `deniedTools`)
4. **Default level** (`defaultLevel`)

## Permission Modal

When a permission check returns `'ask'`, the sidebar shows a modal:

```
┌─────────────────────────────────────┐
│  🔒 Permission Request              │
│                                     │
│  FoxAgent wants to:                 │
│  click_element on amazon.com        │
│                                     │
│  Selector: button.add-to-cart       │
│                                     │
│  [Allow Once] [Allow Always] [Deny] │
└─────────────────────────────────────┘
```

## Agent Loop Integration

In `agent-manager.ts`, before each tool execution:

```typescript
const perm = checkPermission(policy, toolName, toolDef.permission, site);

if (perm === 'deny') {
  // Append denial message to conversation
  messages.push({
    role: 'tool',
    content: `Permission denied for ${toolName} on ${site}`
  });
  continue;
}

if (perm === 'ask') {
  // Send permission request to sidebar
  // Wait for user response
  // If denied, skip tool
}

// Execute tool
const result = await executeToolAction(toolName, args, tabId);
```

## Default Policies

| Action | Default |
|--------|---------|
| `read_page` | auto-approve |
| `scroll_page` | auto-approve |
| `get_snapshot` | auto-approve |
| `click_element` | ask |
| `fill_form` | ask |
| `navigate` | ask |
| `search_web` | ask |
| `draft_email` | ask |

## Harbor Manager UI

The sidebar includes a Harbor Manager component (`src/sidebar/components/HarborManager.tsx`) that allows users to:

- View current permission policies
- Modify default permission level
- Add/remove site-specific overrides
- Add/remove tool-specific overrides
- Clear all saved policies

## State Management

Harbor policies are managed through:
- **Zustand store** (`src/sidebar/stores/harbor-store.ts`): Sidebar state
- **browser.storage.local**: Persistent storage across sessions
- **Background script**: Enforces policies during tool execution

