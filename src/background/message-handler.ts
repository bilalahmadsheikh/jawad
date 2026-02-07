// ============================================================
// Message Handler - Routes sidebar messages to appropriate handlers
// ============================================================

import { runAgentLoop } from './agent-manager';
import { planAndExecuteWorkflow, cancelCurrentWorkflow } from './orchestrator';
import { chatCompletion } from '../lib/any-llm-router';
import type { LLMConfig } from '../lib/types';
import { DEFAULT_SYSTEM_PROMPT, generateId } from '../lib/constants';

// Conversation history for the agent loop
let conversationHistory: Array<{
  role: string;
  content: string | null;
  tool_calls?: unknown[];
  tool_call_id?: string;
}> = [];

// Pending permission requests waiting for user response
const pendingPermissions = new Map<
  string,
  { resolve: (decision: string) => void }
>();

/**
 * Main message router. Called by background/index.ts when the sidebar sends a message.
 */
export async function handleMessage(
  msg: Record<string, unknown>,
  port: browser.Port
): Promise<void> {
  const type = msg.type as string;
  const payload = msg.payload as Record<string, unknown> | undefined;

  switch (type) {
    case 'CHAT_MESSAGE':
      await handleChatMessage(payload!.content as string, port);
      break;

    case 'SUMMARIZE_PAGE':
      await handleSummarizePage(port);
      break;

    case 'PERMISSION_RESPONSE':
      handlePermissionResponse(
        payload!.requestId as string,
        payload!.decision as string
      );
      break;

    case 'SAVE_SETTINGS':
      await browser.storage.local.set({
        foxagent_config: payload,
      });
      break;

    case 'GET_SETTINGS': {
      const data = await browser.storage.local.get('foxagent_config');
      port.postMessage({
        type: 'SETTINGS',
        payload: data.foxagent_config || null,
      });
      break;
    }

    case 'START_WORKFLOW':
      await planAndExecuteWorkflow(payload!.intent as string, port);
      break;

    case 'CANCEL_WORKFLOW':
      cancelCurrentWorkflow();
      break;

    case 'CLEAR_HISTORY':
      conversationHistory = [];
      break;
  }
}

/**
 * Handle a chat message from the user.
 */
async function handleChatMessage(
  content: string,
  port: browser.Port
): Promise<void> {
  try {
    const config = await getConfig();

    // Get current page context
    let pageContext = '';
    try {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      const currentTab = tabs[0];
      if (currentTab?.id) {
        const pageContent = (await browser.tabs.sendMessage(currentTab.id, {
          type: 'READ_PAGE',
        })) as { title?: string; markdown?: string } | null;

        if (pageContent?.markdown) {
          pageContext = `\n\nCurrent tab: ${currentTab.url}\nPage title: ${pageContent.title || 'Unknown'}\nPage content (markdown):\n${pageContent.markdown.substring(0, 3000)}`;
        }
      }
    } catch {
      // Content script not available on this page
    }

    const systemPrompt = DEFAULT_SYSTEM_PROMPT + pageContext;

    // Add user message to history
    conversationHistory.push({ role: 'user', content });

    // Build full message list
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
    ];

    // Run the agent loop (handles tool calls)
    const response = await runAgentLoop(
      config,
      messages,
      port,
      requestPermissionFromUser
    );

    // Add response to history
    conversationHistory.push({ role: 'assistant', content: response });

    // Send response to sidebar
    port.postMessage({
      type: 'CHAT_RESPONSE',
      payload: { content: response },
    });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : 'Unknown error occurred';
    port.postMessage({
      type: 'CHAT_RESPONSE',
      payload: { content: `Error: ${msg}`, isError: true },
    });
  }
}

/**
 * Handle a "Summarize This Page" request.
 */
async function handleSummarizePage(port: browser.Port): Promise<void> {
  try {
    const config = await getConfig();
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    const currentTab = tabs[0];

    if (!currentTab?.id) {
      port.postMessage({
        type: 'CHAT_RESPONSE',
        payload: { content: 'No active tab found.', isError: true },
      });
      return;
    }

    let pageContent: { title?: string; markdown?: string; url?: string } | null = null;
    try {
      pageContent = (await browser.tabs.sendMessage(currentTab.id, {
        type: 'READ_PAGE',
      })) as { title?: string; markdown?: string; url?: string } | null;
    } catch {
      port.postMessage({
        type: 'CHAT_RESPONSE',
        payload: {
          content:
            'Could not read the page. The content script may not be loaded on this page (try refreshing or navigating to a regular webpage).',
          isError: true,
        },
      });
      return;
    }

    if (!pageContent?.markdown) {
      port.postMessage({
        type: 'CHAT_RESPONSE',
        payload: { content: 'Could not extract page content.', isError: true },
      });
      return;
    }

    const response = await chatCompletion(config, {
      messages: [
        {
          role: 'system',
          content:
            'You are FoxAgent. Summarize the following web page content concisely. Use bullet points for key information. Be brief but thorough.',
        },
        {
          role: 'user',
          content: `Summarize this page:\n\nTitle: ${pageContent.title || 'Unknown'}\nURL: ${currentTab.url}\n\nContent:\n${pageContent.markdown.substring(0, 5000)}`,
        },
      ],
    });

    const summary = response.choices[0]?.message?.content || 'No summary generated.';

    // Add to conversation history
    conversationHistory.push(
      { role: 'user', content: `Summarize this page: ${currentTab.url}` },
      { role: 'assistant', content: summary }
    );

    port.postMessage({
      type: 'CHAT_RESPONSE',
      payload: { content: summary },
    });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : 'Unknown error occurred';
    port.postMessage({
      type: 'CHAT_RESPONSE',
      payload: { content: `Error summarizing: ${msg}`, isError: true },
    });
  }
}

/**
 * Request permission from the user via the sidebar.
 * Returns a Promise that resolves when the user responds.
 */
export function requestPermissionFromUser(
  toolName: string,
  args: Record<string, unknown>,
  site: string,
  permissionLevel: string,
  port: browser.Port
): Promise<string> {
  const requestId = `perm_${generateId()}`;

  return new Promise((resolve) => {
    pendingPermissions.set(requestId, { resolve });

    port.postMessage({
      type: 'PERMISSION_REQUEST',
      payload: {
        id: requestId,
        toolName,
        parameters: args,
        site,
        permissionLevel,
        reason: `FoxAgent wants to use '${toolName}' on ${site}`,
        timestamp: Date.now(),
      },
    });

    // Timeout after 60 seconds - default to deny
    setTimeout(() => {
      if (pendingPermissions.has(requestId)) {
        pendingPermissions.delete(requestId);
        resolve('deny');
      }
    }, 60000);
  });
}

/**
 * Handle user's response to a permission request.
 */
function handlePermissionResponse(
  requestId: string,
  decision: string
): void {
  const pending = pendingPermissions.get(requestId);
  if (pending) {
    pending.resolve(decision);
    pendingPermissions.delete(requestId);
  }
}

/**
 * Get LLM config from storage.
 */
async function getConfig(): Promise<LLMConfig> {
  const data = await browser.storage.local.get('foxagent_config');
  const config = data.foxagent_config as LLMConfig | undefined;
  if (!config) {
    throw new Error(
      'LLM not configured. Please open Settings and set up your AI provider.'
    );
  }
  return config;
}

