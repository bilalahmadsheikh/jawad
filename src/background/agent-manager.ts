// ============================================================
// Agent Manager - LLM tool-calling loop
// Handles native function calling AND XML-fallback for models
// that don't support the tools parameter (e.g. some Ollama models).
// ============================================================

import { chatCompletion } from '../lib/any-llm-router';
import { TOOLS, toOpenAITools, executeToolAction } from '../lib/mcp-tool-registry';
import { checkPermission, getHarborPolicy, updateHarborPolicyForDecision } from '../lib/harbor-engine';
import { generateId } from '../lib/constants';
import type { LLMConfig, PermissionLevel } from '../lib/types';

type PermissionRequester = (
  toolName: string,
  args: Record<string, unknown>,
  site: string,
  permissionLevel: string,
  port: browser.Port
) => Promise<string>;

// ------------------------------------------------------------------
// XML tool-call parser (fallback for models without function-calling)
// ------------------------------------------------------------------

const KNOWN_TOOL_NAMES = new Set(TOOLS.map((t) => t.name));

function parseXmlAttrs(attrStr: string): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  const re = /(\w+)\s*=\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(attrStr)) !== null) {
    let val: unknown = m[2];
    if (val === 'true') val = true;
    else if (val === 'false') val = false;
    else if (typeof val === 'string' && val !== '' && !isNaN(Number(val))) {
      val = Number(val);
    }
    args[m[1]] = val;
  }
  return args;
}

/**
 * Try to extract tool invocations from free-text LLM output.
 * Only matches names that exist in the TOOLS registry.
 */
function parseXmlToolCalls(
  text: string
): Array<{ name: string; args: Record<string, unknown> }> {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  for (const name of KNOWN_TOOL_NAMES) {
    const selfRe = new RegExp('<' + name + '\\b([^>]*?)\\s*/>', 'g');
    let m: RegExpExecArray | null;
    while ((m = selfRe.exec(text)) !== null) {
      calls.push({ name, args: parseXmlAttrs(m[1]) });
    }
    const pairRe = new RegExp('<' + name + '\\b([^>]*)>', 'g');
    while ((m = pairRe.exec(text)) !== null) {
      if (!m[0].endsWith('/>')) {
        calls.push({ name, args: parseXmlAttrs(m[1]) });
      }
    }
  }
  return calls;
}

// ------------------------------------------------------------------
// Shared helper: permission check -> execute -> log
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

  if (decision === 'auto-approve') {
    port.postMessage({
      type: 'ACTION_LOG_UPDATE',
      payload: {
        id: generateId(), timestamp: Date.now(), toolName, parameters: args,
        site, permissionLevel: permLevel, decision: 'auto-approved', result: 'success',
      },
    });
    result = await executeToolAction(toolName, args, tabId);
  } else if (decision === 'deny') {
    port.postMessage({
      type: 'ACTION_LOG_UPDATE',
      payload: {
        id: generateId(), timestamp: Date.now(), toolName, parameters: args,
        site, permissionLevel: permLevel, decision: 'deny', result: 'denied',
      },
    });
    result = { error: "Tool '" + toolName + "' is blocked by Harbor policy for " + site };
  } else {
    const userDecision = await requestPermission(toolName, args, site, permLevel, port);
    port.postMessage({
      type: 'ACTION_LOG_UPDATE',
      payload: {
        id: generateId(), timestamp: Date.now(), toolName, parameters: args,
        site, permissionLevel: permLevel, decision: userDecision,
        result: userDecision.startsWith('allow') ? 'success' : 'denied',
      },
    });
    if (userDecision.startsWith('allow')) {
      if (userDecision === 'allow-site' || userDecision === 'allow-session') {
        await updateHarborPolicyForDecision(toolName, site, userDecision);
      }
      result = await executeToolAction(toolName, args, tabId);
    } else {
      result = { error: "User denied permission for '" + toolName + "' on " + site };
    }
  }
  return result;
}

// ------------------------------------------------------------------
// Main agent loop
// ------------------------------------------------------------------

/**
 * Run the agent loop: send messages to LLM, handle tool calls, repeat.
 * Returns the final text response from the LLM.
 *
 * IMPORTANT: This function NEVER sends CHAT_RESPONSE to the port.
 * The caller (message-handler) is responsible for the single final
 * CHAT_RESPONSE so that the sidebar only flips isLoading once.
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

  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];
  const tabId = currentTab?.id;
  const site = currentTab?.url ? new URL(currentTab.url).hostname : 'unknown';

  while (iterations < maxIterations) {
    iterations++;

    const response = await chatCompletion(config, {
      messages,
      tools: toOpenAITools(TOOLS),
    });

    const choice = response.choices[0];
    if (!choice) return 'No response from LLM.';
    const message = choice.message;

    // ---- Path A: Native function-calling ----
    if (message.tool_calls && message.tool_calls.length > 0) {
      messages.push({
        role: 'assistant', content: message.content, tool_calls: message.tool_calls,
      });
      for (const toolCall of message.tool_calls) {
        const toolName = toolCall.function.name;
        let args: Record<string, unknown>;
        try { args = JSON.parse(toolCall.function.arguments); } catch { args = {}; }
        const result = await executeToolWithPermission(
          toolName, args, tabId, site, port, requestPermission
        );
        messages.push({
          role: 'tool', content: JSON.stringify(result), tool_call_id: toolCall.id,
        });
      }
      continue;
    }

    // ---- Path B: XML fallback (model didn't use function calling) ----
    if (message.content) {
      const xmlCalls = parseXmlToolCalls(message.content);
      if (xmlCalls.length > 0) {
        messages.push({ role: 'assistant', content: message.content });
        const resultParts: string[] = [];
        for (const call of xmlCalls) {
          if (!KNOWN_TOOL_NAMES.has(call.name)) {
            resultParts.push('[' + call.name + ']: unknown tool');
            continue;
          }
          const result = await executeToolWithPermission(
            call.name, call.args, tabId, site, port, requestPermission
          );
          resultParts.push(
            '[Tool result for ' + call.name + ']: ' + JSON.stringify(result)
          );
        }
        // Feed results back as user message (non-FC models don't
        // understand role:"tool" / tool_call_id).
        messages.push({ role: 'user', content: resultParts.join('\n\n') });
        continue;
      }
    }

    // ---- Path C: Plain text â€” done ----
    return message.content || '';
  }

  return 'Agent reached maximum iterations. Please try a simpler request.';
}
