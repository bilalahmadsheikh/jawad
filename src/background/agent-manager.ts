// ============================================================
// Agent Manager - LLM tool-calling loop
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
  const tabId = currentTab?.id;
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

    // Check if LLM wants to call tools
    if (message.tool_calls && message.tool_calls.length > 0) {
      // Add assistant message with tool calls to conversation
      messages.push({
        role: 'assistant',
        content: message.content,
        tool_calls: message.tool_calls,
      });

      // Execute each tool call
      for (const toolCall of message.tool_calls) {
        const toolName = toolCall.function.name;
        let args: Record<string, unknown>;
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch {
          args = {};
        }

        // Find tool definition for permission level
        const toolDef = TOOLS.find((t) => t.name === toolName);
        const permLevel: PermissionLevel = toolDef?.permission || 'interact';

        // Check Harbor permissions
        const policy = await getHarborPolicy();
        const decision = checkPermission(policy, toolName, permLevel, site);

        let result: unknown;

        if (decision === 'auto-approve') {
          // Log auto-approved action
          port.postMessage({
            type: 'ACTION_LOG_UPDATE',
            payload: {
              id: generateId(),
              timestamp: Date.now(),
              toolName,
              parameters: args,
              site,
              permissionLevel: permLevel,
              decision: 'auto-approved',
              result: 'success',
            },
          });

          result = await executeToolAction(toolName, args, tabId);
        } else if (decision === 'deny') {
          // Log denied action
          port.postMessage({
            type: 'ACTION_LOG_UPDATE',
            payload: {
              id: generateId(),
              timestamp: Date.now(),
              toolName,
              parameters: args,
              site,
              permissionLevel: permLevel,
              decision: 'deny',
              result: 'denied',
            },
          });

          result = {
            error: `Tool '${toolName}' is blocked by Harbor policy for ${site}`,
          };
        } else {
          // Ask the user
          const userDecision = await requestPermission(
            toolName,
            args,
            site,
            permLevel,
            port
          );

          // Log the decision
          port.postMessage({
            type: 'ACTION_LOG_UPDATE',
            payload: {
              id: generateId(),
              timestamp: Date.now(),
              toolName,
              parameters: args,
              site,
              permissionLevel: permLevel,
              decision: userDecision,
              result: userDecision.startsWith('allow') ? 'success' : 'denied',
            },
          });

          if (userDecision.startsWith('allow')) {
            // Update policy if user chose to remember
            if (
              userDecision === 'allow-site' ||
              userDecision === 'allow-session'
            ) {
              await updateHarborPolicyForDecision(
                toolName,
                site,
                userDecision
              );
            }
            result = await executeToolAction(toolName, args, tabId);
          } else {
            result = {
              error: `User denied permission for '${toolName}' on ${site}`,
            };
          }
        }

        // Add tool result to conversation
        messages.push({
          role: 'tool',
          content: JSON.stringify(result),
          tool_call_id: toolCall.id,
        });
      }

      // Continue the loop to get the next LLM response
      continue;
    }

    // No tool calls - LLM responded with text. We're done.
    return message.content || '';
  }

  return 'Agent reached maximum iterations. Please try a simpler request.';
}

