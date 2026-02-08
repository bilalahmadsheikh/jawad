// ============================================================
// Agent Manager - LLM tool-calling loop
// Supports BOTH proper OpenAI function calls AND XML-style
// fallback for models that don't support tool_calls natively.
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

interface ParsedToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

// -------- XML fallback parser --------

const TOOL_NAMES = TOOLS.map((t) => t.name);
const TOOL_NAME_PATTERN = TOOL_NAMES.join('|');

/**
 * Parse XML-style tool calls that some LLMs produce when they don't
 * support the OpenAI function-calling format.
 *
 * Handles patterns like:
 *   <navigate url="https://example.com" newTab="true"></navigate>
 *   <read_page />
 *   <search_web query="cheap speakers" />
 *   <fill_form selector="search" text="hoodies" submit="true"></fill_form>
 */
function parseXMLToolCalls(text: string): ParsedToolCall[] {
  const calls: ParsedToolCall[] = [];

  // Match both  <tool .../>  and  <tool ...>...</tool>
  const regex = new RegExp(
    `<(${TOOL_NAME_PATTERN})\\b([^>]*?)\\s*(?:/>|>([\\s\\S]*?)<\\/\\1\\s*>)`,
    'gi'
  );

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const name = match[1];
    const attrsStr = match[2] || '';
    const args: Record<string, unknown> = {};

    // Parse key="value" or key='value' attributes
    const attrRegex = /(\w+)\s*=\s*"([^"]*)"|(\w+)\s*=\s*'([^']*)'/g;
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
      const key = attrMatch[1] || attrMatch[3];
      const rawVal = attrMatch[2] ?? attrMatch[4] ?? '';

      // Coerce known boolean / numeric values
      if (rawVal === 'true') args[key] = true;
      else if (rawVal === 'false') args[key] = false;
      else if (rawVal !== '' && !isNaN(Number(rawVal))) args[key] = Number(rawVal);
      else args[key] = rawVal;
    }

    // Validate tool name exists (case-insensitive check)
    const validName = TOOL_NAMES.find(
      (n) => n.toLowerCase() === name.toLowerCase()
    );
    if (validName) {
      calls.push({
        id: `xmlcall_${generateId()}`,
        name: validName,
        args,
      });
    }
  }

  return calls;
}

/**
 * Remove the XML tool-call tags from the LLM text so the user
 * sees only the natural-language portions of the response.
 */
function stripXMLToolTags(text: string): string {
  const regex = new RegExp(
    `<(${TOOL_NAME_PATTERN})\\b[^>]*?\\s*(?:/>|>[\\s\\S]*?<\\/\\1\\s*>)`,
    'gi'
  );
  return text.replace(regex, '').trim();
}

// -------- Main agent loop --------

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

  // Get current active tab
  const tabs = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  const currentTab = tabs[0];
  let tabId = currentTab?.id;
  const site = currentTab?.url
    ? new URL(currentTab.url).hostname
    : 'unknown';

  while (iterations < maxIterations) {
    iterations++;

    const response = await chatCompletion(config, {
      messages,
      tools: toOpenAITools(TOOLS),
    });

    const choice = response.choices[0];
    if (!choice) {
      return 'No response from LLM.';
    }

    const message = choice.message;

    // ----- Route A: proper function calls from the API -----
    if (message.tool_calls && message.tool_calls.length > 0) {
      messages.push({
        role: 'assistant',
        content: message.content,
        tool_calls: message.tool_calls,
      });

      for (const toolCall of message.tool_calls) {
        const result = await processToolCall(
          { id: toolCall.id, name: toolCall.function.name, args: safeJsonParse(toolCall.function.arguments) },
          site,
          tabId,
          port,
          requestPermission
        );

        // If a navigate/search_web happened, update tabId for subsequent calls
        if (typeof result === 'object' && result !== null && 'tabId' in result) {
          tabId = (result as { tabId: number }).tabId;
        }

        messages.push({
          role: 'tool',
          content: JSON.stringify(result),
          tool_call_id: toolCall.id,
        });
      }

      continue; // back to the LLM for the next turn
    }

    // ----- Route B: XML fallback for models without function calling -----
    const textContent = message.content || '';
    const xmlCalls = parseXMLToolCalls(textContent);

    if (xmlCalls.length > 0) {
      // Strip XML tags so only the natural-language portion remains
      const cleanedText = stripXMLToolTags(textContent);

      // Send the cleaned text as an intermediate chat bubble so the user
      // can see what the agent is thinking
      if (cleanedText.length > 0) {
        port.postMessage({
          type: 'CHAT_RESPONSE',
          payload: { content: cleanedText },
        });
      }

      // Execute every parsed tool call sequentially
      const toolResults: string[] = [];
      for (const call of xmlCalls) {
        const result = await processToolCall(
          call,
          site,
          tabId,
          port,
          requestPermission
        );

        if (typeof result === 'object' && result !== null && 'tabId' in result) {
          tabId = (result as { tabId: number }).tabId;
        }

        toolResults.push(JSON.stringify(result));
      }

      // Feed tool results back to the LLM so it can summarise
      messages.push({
        role: 'assistant',
        content: textContent,
      });
      messages.push({
        role: 'user',
        content:
          `Tool results:\n${toolResults.join('\n')}\n\n` +
          `Based on these tool results, provide a helpful answer to the user. Do NOT use XML tags. Respond in plain text / markdown.`,
      });

      continue; // LLM will now summarize
    }

    // ----- No tool calls at all — final text response -----
    return textContent;
  }

  return 'Agent reached maximum iterations. Please try a simpler request.';
}

// -------- Helpers --------

function safeJsonParse(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Process a single tool call: check permissions, execute, log.
 */
async function processToolCall(
  call: ParsedToolCall,
  site: string,
  tabId: number | undefined,
  port: browser.Port,
  requestPermission: PermissionRequester
): Promise<unknown> {
  const toolDef = TOOLS.find((t) => t.name === call.name);
  const permLevel: PermissionLevel = toolDef?.permission || 'interact';

  // Check Harbor permissions
  const policy = await getHarborPolicy();
  const decision = checkPermission(policy, call.name, permLevel, site);

  if (decision === 'auto-approve') {
    port.postMessage({
      type: 'ACTION_LOG_UPDATE',
      payload: {
        id: generateId(),
        timestamp: Date.now(),
        toolName: call.name,
        parameters: call.args,
        site,
        permissionLevel: permLevel,
        decision: 'auto-approved',
        result: 'success',
      },
    });

    return await executeToolAction(call.name, call.args, tabId);
  }

  if (decision === 'deny') {
    port.postMessage({
      type: 'ACTION_LOG_UPDATE',
      payload: {
        id: generateId(),
        timestamp: Date.now(),
        toolName: call.name,
        parameters: call.args,
        site,
        permissionLevel: permLevel,
        decision: 'deny',
        result: 'denied',
      },
    });

    return { error: `Tool '${call.name}' is blocked by Harbor policy for ${site}` };
  }

  // Ask the user
  const userDecision = await requestPermission(
    call.name,
    call.args,
    site,
    permLevel,
    port
  );

  port.postMessage({
    type: 'ACTION_LOG_UPDATE',
    payload: {
      id: generateId(),
      timestamp: Date.now(),
      toolName: call.name,
      parameters: call.args,
      site,
      permissionLevel: permLevel,
      decision: userDecision,
      result: userDecision.startsWith('allow') ? 'success' : 'denied',
    },
  });

  if (userDecision.startsWith('allow')) {
    if (userDecision === 'allow-site' || userDecision === 'allow-session') {
      await updateHarborPolicyForDecision(call.name, site, userDecision);
    }
    return await executeToolAction(call.name, call.args, tabId);
  }

  return { error: `User denied permission for '${call.name}' on ${site}` };
}
