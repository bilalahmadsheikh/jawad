// ============================================================
// Agent Manager – LLM tool-calling loop
// Handles THREE paths:
//   A) Native function-calling  (OpenAI, good OpenRouter models)
//   B) XML / text-based tool calls  (Ollama, weaker models)
//   C) Plain-text response  (no tool invocation detected)
// ============================================================

import { chatCompletion } from '../lib/any-llm-router';
import {
  TOOLS,
  toOpenAITools,
  executeToolAction,
} from '../lib/mcp-tool-registry';
import {
  checkPermission,
  getHarborPolicy,
  updateHarborPolicyForDecision,
} from '../lib/harbor-engine';
import { generateId } from '../lib/constants';
import type { LLMConfig, PermissionLevel } from '../lib/types';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

type PermissionRequester = (
  toolName: string,
  args: Record<string, unknown>,
  site: string,
  permissionLevel: string,
  port: browser.Port
) => Promise<string>;

// ------------------------------------------------------------------
// Tool-name lookup set (built once)
// ------------------------------------------------------------------

const KNOWN_TOOL_NAMES = new Set(TOOLS.map((t) => t.name));

// ------------------------------------------------------------------
// XML / text-based tool-call parser
//
// Patterns we handle:
//   <tool_name />                           self-closing, no args
//   <tool_name key="val" />                 self-closing with attrs
//   <tool_name>  </tool_name>               paired tags, no args
//   <tool_name key="val"> </tool_name>      paired tags with attrs
//   <tool_name>{"key":"val"}</tool_name>    paired tags with JSON body
// ------------------------------------------------------------------

function parseXmlAttrs(attrStr: string): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};
  // Match key="value" or key='value'
  const re = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(attrStr)) !== null) {
    let value: unknown = m[2] ?? m[3];
    if (value === 'true') value = true;
    else if (value === 'false') value = false;
    else if (typeof value === 'string' && value !== '' && !isNaN(Number(value)))
      value = Number(value);
    attrs[m[1]] = value;
  }
  return attrs;
}

function parseXmlToolCalls(
  text: string
): Array<{ name: string; args: Record<string, unknown> }> {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];

  // 1) Self-closing  <tool_name ... />
  const selfClosing = /<(\w+)((?:\s+\w+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*\/>/g;
  let m: RegExpExecArray | null;
  while ((m = selfClosing.exec(text)) !== null) {
    if (KNOWN_TOOL_NAMES.has(m[1])) {
      calls.push({ name: m[1], args: parseXmlAttrs(m[2]) });
    }
  }

  // 2) Paired  <tool_name ...>body</tool_name>
  const paired =
    /<(\w+)((?:\s+\w+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*>([\s\S]*?)<\/\1\s*>/g;
  while ((m = paired.exec(text)) !== null) {
    if (!KNOWN_TOOL_NAMES.has(m[1])) continue;

    const attrs = parseXmlAttrs(m[2]);
    const body = (m[3] || '').trim();

    // If the body looks like JSON, merge it into attrs
    if (body.startsWith('{')) {
      try {
        const parsed = JSON.parse(body);
        if (typeof parsed === 'object' && parsed !== null) {
          Object.assign(attrs, parsed);
        }
      } catch {
        // not JSON – ignore body
      }
    }

    // Avoid duplicates from self-closing match
    const already = calls.find(
      (c) => c.name === m![1] && JSON.stringify(c.args) === JSON.stringify(attrs)
    );
    if (!already) {
      calls.push({ name: m[1], args: attrs });
    }
  }

  return calls;
}

// ------------------------------------------------------------------
// Strip XML tool tags from text so the user sees a clean response
// ------------------------------------------------------------------

function stripToolTags(text: string): string {
  let cleaned = text;
  // Remove self-closing
  cleaned = cleaned.replace(
    /<(\w+)(?:\s+\w+\s*=\s*(?:"[^"]*"|'[^']*'))*\s*\/>/g,
    (full, name) => (KNOWN_TOOL_NAMES.has(name) ? '' : full)
  );
  // Remove paired
  cleaned = cleaned.replace(
    /<(\w+)(?:\s+\w+\s*=\s*(?:"[^"]*"|'[^']*'))*\s*>[\s\S]*?<\/\1\s*>/g,
    (full, name) => (KNOWN_TOOL_NAMES.has(name) ? '' : full)
  );
  return cleaned.trim();
}

// ------------------------------------------------------------------
// Unified tool executor – handles permissions, logging, execution
// ------------------------------------------------------------------

async function executeToolWithPermission(
  toolName: string,
  args: Record<string, unknown>,
  tabId: number | undefined,
  site: string,
  port: browser.Port,
  requestPermission: PermissionRequester
): Promise<unknown> {
  const toolDef = TOOLS.find((t) => t.name === toolName);
  const permLevel: PermissionLevel = toolDef?.permission || 'interact';

  const policy = await getHarborPolicy();
  const decision = checkPermission(policy, toolName, permLevel, site);

  let result: unknown;
  let finalDecision: string = 'error';

  try {
    if (decision === 'auto-approve') {
      finalDecision = 'auto-approved';
      result = await executeToolAction(toolName, args, tabId);
    } else if (decision === 'deny') {
      finalDecision = 'deny';
      result = {
        error: `Tool '${toolName}' is blocked by Harbor policy for ${site}`,
      };
    } else {
      const userDecision = await requestPermission(
        toolName,
        args,
        site,
        permLevel,
        port
      );
      finalDecision = userDecision;

      if (userDecision.startsWith('allow')) {
        if (
          userDecision === 'allow-site' ||
          userDecision === 'allow-session'
        ) {
          await updateHarborPolicyForDecision(toolName, site, userDecision);
        }
        result = await executeToolAction(toolName, args, tabId);
      } else {
        result = {
          error: `User denied permission for '${toolName}' on ${site}`,
        };
      }
    }
  } catch (e) {
    result = {
      error: `Tool execution failed: ${e instanceof Error ? e.message : String(e)}`,
    };
    finalDecision = 'error';
  }

  // Log the action
  port.postMessage({
    type: 'ACTION_LOG_UPDATE',
    payload: {
      id: generateId(),
      timestamp: Date.now(),
      toolName,
      parameters: args,
      site,
      permissionLevel: permLevel,
      decision: finalDecision,
      result:
        (result as { error?: string })?.error ? 'error' : 'success',
      details:
        (result as { error?: string })?.error ||
        JSON.stringify(result).substring(0, 200),
    },
  });

  return result;
}

// ------------------------------------------------------------------
// Main agent loop
// ------------------------------------------------------------------

/**
 * Run the agent loop: send messages to LLM, handle tool calls, repeat.
 * Returns the final text response from the LLM.
 */
export async function runAgentLoop(
  config: LLMConfig,
  messages: Array<{
    role: string;
    content: string | null;
    tool_calls?: unknown[];
    tool_call_id?: string;
  }>,
  port: browser.Port,
  requestPermission: PermissionRequester
): Promise<string> {
  const maxIterations = 10;
  let iterations = 0;

  // Mutable — refreshed every iteration so navigation tools
  // don't leave us with a stale tab / site.
  let tabId: number | undefined;
  let site = 'unknown';

  while (iterations < maxIterations) {
    iterations++;

    // Refresh active-tab context each iteration
    try {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      const activeTab = tabs[0];
      tabId = activeTab?.id;
      site = activeTab?.url
        ? new URL(activeTab.url).hostname
        : 'unknown';
    } catch {
      // keep previous values on error
    }

    const response = await chatCompletion(config, {
      messages,
      tools: toOpenAITools(TOOLS),
    });

    const choice = response.choices[0];
    if (!choice) {
      return 'No response from LLM.';
    }

    const message = choice.message;

    // ── Path A: Native function-calling ──────────────────────────
    if (message.tool_calls && message.tool_calls.length > 0) {
      messages.push({
        role: 'assistant',
        content: message.content,
        tool_calls: message.tool_calls,
      });

      for (const toolCall of message.tool_calls) {
        const toolName = toolCall.function.name;
        let args: Record<string, unknown>;
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch {
          args = {};
        }

        const result = await executeToolWithPermission(
          toolName,
          args,
          tabId,
          site,
          port,
          requestPermission
        );

        messages.push({
          role: 'tool',
          content: JSON.stringify(result),
          tool_call_id: toolCall.id,
        });
      }

      continue; // next LLM turn
    }

    // ── Path B: XML / text-based fallback ────────────────────────
    if (message.content) {
      const xmlCalls = parseXmlToolCalls(message.content);

      if (xmlCalls.length > 0) {
        // Add assistant turn with the raw text
        messages.push({ role: 'assistant', content: message.content });

        // Execute each parsed tool call
        const resultParts: string[] = [];
        for (const call of xmlCalls) {
          const result = await executeToolWithPermission(
            call.name,
            call.args,
            tabId,
            site,
            port,
            requestPermission
          );
          resultParts.push(
            `[Tool result for ${call.name}]: ${JSON.stringify(result)}`
          );
        }

        // Feed results back as a user message
        // (models without native FC don't understand role:"tool")
        messages.push({
          role: 'user',
          content: resultParts.join('\n\n'),
        });

        continue; // next LLM turn — let the model summarise
      }
    }

    // ── Path C: Plain text — we're done ──────────────────────────
    return message.content || '';
  }

  return 'Agent reached maximum iterations. Please try a simpler request.';
}
