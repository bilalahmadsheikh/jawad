// ============================================================
// Jawad - Shared Type Definitions
// ============================================================

// --- LLM Configuration ---
export interface LLMConfig {
  provider: 'openai' | 'openrouter' | 'ollama';
  apiKey: string;
  model: string;
  baseUrl: string;
}

// --- Chat Messages ---
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  isError?: boolean;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

// --- Page Content ---
export interface PageContent {
  title: string;
  url: string;
  markdown: string;
  source: 'readability' | 'fallback' | 'vision';
}

// --- MCP Tool Definitions ---
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
  permission: PermissionLevel;
}

export interface ToolParameter {
  type: string;
  description: string;
  required?: boolean;
  enum?: string[];
}

export type PermissionLevel = 'read-only' | 'navigate' | 'interact' | 'submit';

// --- Harbor Permission System ---
export interface HarborPolicy {
  trustedSites: Record<string, SiteTrust>;
  toolOverrides: Record<string, ToolOverride>;
  defaults: HarborDefaults;
}

export interface SiteTrust {
  trustLevel: 'blocked' | 'read-only' | 'navigate' | 'interact' | 'full';
  autoApprove: string[];
  requireConfirm: string[];
  expiresAt?: number;
}

export interface ToolOverride {
  enabled: boolean;
  globalAutoApprove: boolean;
}

export interface HarborDefaults {
  readOnly: 'auto-approve' | 'ask' | 'deny';
  navigate: 'auto-approve' | 'ask' | 'deny';
  interact: 'auto-approve' | 'ask' | 'deny';
  submit: 'auto-approve' | 'ask' | 'deny';
  criticalActions: string[];
}

// --- Permission Request / Response ---
export interface PermissionRequest {
  id: string;
  toolName: string;
  parameters: Record<string, unknown>;
  site: string;
  permissionLevel: PermissionLevel;
  reason: string;
  timestamp: number;
}

export type PermissionDecision =
  | 'allow-once'
  | 'allow-site'
  | 'allow-session'
  | 'deny'
  | 'deny-all';

// --- Action Log ---
export interface ActionLogEntry {
  id: string;
  timestamp: number;
  toolName: string;
  parameters: Record<string, unknown>;
  site: string;
  permissionLevel: PermissionLevel;
  decision: PermissionDecision | 'auto-approved';
  result: 'success' | 'denied' | 'error';
  details?: string;
}

// --- Research Mode Workflows ---
export interface WorkflowPlan {
  id: string;
  intent: string;
  steps: WorkflowStep[];
  status:
    | 'planning'
    | 'awaiting-approval'
    | 'running'
    | 'paused'
    | 'completed'
    | 'cancelled'
    | 'error';
  createdAt: number;
  error?: string;
}

export interface WorkflowStep {
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

// --- Extension Messages ---
export type ExtensionMessage =
  | { type: 'CHAT_MESSAGE'; payload: { content: string } }
  | { type: 'SUMMARIZE_PAGE' }
  | { type: 'PERMISSION_RESPONSE'; payload: { requestId: string; decision: PermissionDecision } }
  | { type: 'SAVE_SETTINGS'; payload: LLMConfig }
  | { type: 'GET_SETTINGS' }
  | { type: 'START_WORKFLOW'; payload: { intent: string } }
  | { type: 'CANCEL_WORKFLOW' }
  | { type: 'CHAT_RESPONSE'; payload: { content: string; isError?: boolean } }
  | { type: 'PERMISSION_REQUEST'; payload: PermissionRequest }
  | { type: 'ACTION_LOG_UPDATE'; payload: ActionLogEntry }
  | { type: 'WORKFLOW_UPDATE'; payload: WorkflowPlan }
  | { type: 'SETTINGS'; payload: LLMConfig | null }
  | { type: 'READ_PAGE' }
  | { type: 'CLICK_ELEMENT'; payload: { selector: string } }
  | { type: 'FILL_FORM'; payload: { selector: string; text: string } }
  | { type: 'SCROLL_PAGE'; payload: { direction: 'up' | 'down' } }
  | { type: 'HIGHLIGHT_ELEMENT'; payload: { selector: string } };

