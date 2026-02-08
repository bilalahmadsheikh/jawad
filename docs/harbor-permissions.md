# FoxAgent — Harbor Permission System

## Overview

Harbor is FoxAgent's permission engine, mediating between AI capabilities and user control. It ensures that every agent action is either explicitly authorized or falls within a pre-approved policy.

**File**: `src/lib/harbor-engine.ts`

## Design Principles

1. **Scoped**: Permissions are per-tool, per-site, per-permission-level
2. **Time-bounded**: Site trust entries support optional `expiresAt` timestamps
3. **Contextual**: Different sites can have different trust levels and tool whitelists
4. **User-controlled**: Users can always see, modify, and revoke permissions
5. **Inspectable**: Every action is logged in the Action Log

## Permission Levels

| Level | Description | Example Tools |
|-------|-------------|---------------|
| `read-only` | Can read but not modify | `read_page`, `scroll_page`, `get_snapshot` |
| `navigate` | Can change the current URL | `navigate`, `search_web` |
| `interact` | Can interact with page elements | `click_element`, `fill_form`, `draft_email` |
| `submit` | Can perform irreversible or high-impact actions | Purchase, checkout, send email |

Defined as: `type PermissionLevel = 'read-only' | 'navigate' | 'interact' | 'submit';`

## Permission Check Flow

```
Tool execution requested
       │
       ▼
checkPermission(policy, toolName, permLevel, site)
       │
       ├── Tool override exists and globalAutoApprove? → auto-approve
       │
       ├── Site trust entry exists?
       │   ├── Expired? → fall through to defaults
       │   ├── toolName in autoApprove[] → auto-approve
       │   ├── toolName in requireConfirm[] → ask
       │   └── trustLevel covers permLevel → auto-approve
       │
       ├── Check defaults for permission level:
       │   ├── read-only → defaults.readOnly ('auto-approve' | 'ask')
       │   ├── navigate → defaults.navigate ('auto-approve' | 'ask')
       │   ├── interact → defaults.interact ('ask' | 'deny')
       │   └── submit → defaults.submit ('ask' | 'deny')
       │
       └── If 'ask' → Show permission modal to user
           ├── User approves → Execute + optionally save policy
           └── User denies → Skip tool, inform LLM
```

## Policy Structure

```typescript
interface HarborPolicy {
  trustedSites: Record<string, SiteTrust>;
  toolOverrides: Record<string, ToolOverride>;
  defaults: HarborDefaults;
}

interface SiteTrust {
  trustLevel: 'blocked' | 'read-only' | 'navigate' | 'interact' | 'full';
  autoApprove: string[];       // Tool names auto-approved for this site
  requireConfirm: string[];    // Tool names always requiring confirmation
  expiresAt?: number;          // Unix timestamp; entry ignored after expiry
}

interface ToolOverride {
  enabled: boolean;
  globalAutoApprove: boolean;  // If true, skip permission checks everywhere
}

interface HarborDefaults {
  readOnly: 'auto-approve' | 'ask';
  navigate: 'auto-approve' | 'ask';
  interact: 'ask' | 'deny';
  submit: 'ask' | 'deny';
  criticalActions: string[];   // Keywords that flag high-risk actions
}
```

### Resolution Order

1. **Tool-specific override** — `toolOverrides[toolName].globalAutoApprove`
2. **Site trust entry** — `trustedSites[site]` (checked for expiry via `expiresAt`)
   - `autoApprove[]` / `requireConfirm[]` tool lists
   - `trustLevel` compared against `permLevel`
3. **Global defaults** — `defaults.readOnly` / `defaults.navigate` / `defaults.interact` / `defaults.submit`

## Default Policy

Defined in `src/lib/constants.ts` as `DEFAULT_HARBOR_POLICY`:

```typescript
{
  trustedSites: {},
  toolOverrides: {},
  defaults: {
    readOnly: 'auto-approve',
    navigate: 'ask',
    interact: 'ask',
    submit: 'ask',
    criticalActions: [
      'checkout', 'purchase', 'buy now', 'order',
      'pay', 'payment', 'delete', 'remove',
      'cancel', 'send'
    ]
  }
}
```

| Permission Level | Default Behavior |
|-----------------|-----------------|
| `read-only` | auto-approve |
| `navigate` | ask |
| `interact` | ask |
| `submit` | ask |

## Critical Action Detection

`isCriticalAction(buttonText, url)` checks if an action involves high-risk keywords:

```typescript
const CRITICAL_ACTION_KEYWORDS = [
  'checkout', 'purchase', 'buy now', 'order',
  'pay', 'payment', 'delete', 'remove',
  'cancel', 'send'
];
```

If the button text or URL contains any of these keywords (case-insensitive), the action is flagged as critical and always requires explicit confirmation regardless of site trust.

## Permission Decisions

When the user responds to a permission request, the decision is one of:

```typescript
type PermissionDecision =
  | 'allow-once'      // Execute this time only
  | 'allow-site'      // Auto-approve this tool on this site going forward
  | 'allow-session'   // Auto-approve for this browsing session
  | 'deny'            // Deny this time
  | 'deny-all';       // Block this tool everywhere
```

`updateHarborPolicyForDecision(toolName, site, decision)` persists the user's choice:
- `allow-site` → adds tool to `trustedSites[site].autoApprove`
- `deny-all` → sets `toolOverrides[toolName].enabled = false`

## Permission Modal

When a permission check returns `'ask'`, the sidebar shows a modal:

```
┌─────────────────────────────────────────┐
│  🔒 Permission Request                  │
│                                         │
│  FoxAgent wants to use 'click_element'  │
│  on amazon.com                          │
│                                         │
│  Parameters: { selector: ".add-to-cart" }│
│                                         │
│  [Allow Once] [Allow for Site] [Deny]   │
└─────────────────────────────────────────┘
```

The modal is rendered by `PermissionModal.tsx` and the request payload matches:

```typescript
interface PermissionRequest {
  id: string;
  toolName: string;
  parameters: Record<string, unknown>;
  site: string;
  permissionLevel: PermissionLevel;
  reason: string;
  timestamp: number;
}
```

## Exported Functions

| Function | Purpose |
|----------|---------|
| `getHarborPolicy()` | Load policy from `browser.storage.local` (or return `DEFAULT_HARBOR_POLICY`) |
| `saveHarborPolicy(policy)` | Persist policy to `browser.storage.local` |
| `checkPermission(policy, toolName, permLevel, site)` | Determine if a tool action is auto-approved, needs asking, or is denied |
| `updateHarborPolicyForDecision(toolName, site, decision)` | Update stored policy based on user's permission decision |
| `isCriticalAction(buttonText, url)` | Check if an action involves high-risk keywords |

## Agent Loop Integration

In `agent-manager.ts`, before each tool execution:

```typescript
const policy = await getHarborPolicy();
const perm = checkPermission(policy, toolName, toolDef.permission, site);

if (perm === 'deny') {
  // Append denial message to conversation
  return `Permission denied for ${toolName} on ${site}`;
}

if (perm === 'ask') {
  // Send permission request to sidebar, wait for user response
  const decision = await requestPermission(toolName, args, site, permLevel, port);
  if (decision === 'deny' || decision === 'deny-all') {
    await updateHarborPolicyForDecision(toolName, site, decision);
    return `User denied ${toolName} on ${site}`;
  }
  await updateHarborPolicyForDecision(toolName, site, decision);
}

// Execute tool
const result = await executeToolAction(toolName, args, tabId);
```

## Harbor Manager UI

The sidebar includes a Harbor Manager component (`src/sidebar/components/HarborManager.tsx`) accessible from the **Harbor** tab (shield icon). It allows users to:

- View current permission policies
- Modify default permission levels
- Add/remove site-specific trust entries
- Add/remove tool-specific overrides
- Clear all saved policies

## State Management

Harbor state is managed through:
- **Zustand store** (`src/sidebar/stores/harbor-store.ts`): Manages `pendingPermissions` and `actionLog` arrays in the sidebar
- **`browser.storage.local`**: Persistent policy storage across sessions (key: `foxagent_harbor_policy`)
- **Background script**: Enforces policies during tool execution via `harbor-engine.ts`
