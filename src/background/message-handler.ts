// ============================================================
// Message Handler — Routes sidebar messages to appropriate handlers
// Now includes page context caching and product context injection
// ============================================================

import { runAgentLoop } from './agent-manager';
import { planAndExecuteWorkflow, cancelCurrentWorkflow } from './orchestrator';
import { chatCompletion } from '../lib/any-llm-router';
import type { LLMConfig } from '../lib/types';
import { DEFAULT_SYSTEM_PROMPT, generateId } from '../lib/constants';
import { cachePageSnapshot, getLastProductContext } from '../lib/page-cache';

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
 * Main message router.
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
      await browser.storage.local.set({ foxagent_config: payload });
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

    // Get current page context and cache it
    let pageContext = '';
    let currentUrl = '';
    try {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      const currentTab = tabs[0];
      currentUrl = currentTab?.url || '';

      if (currentTab?.id) {
        const pageContent = (await browser.tabs.sendMessage(currentTab.id, {
          type: 'READ_PAGE',
        })) as {
          title?: string;
          markdown?: string;
          product?: Record<string, unknown>;
          interactiveElements?: string;
        } | null;

        if (pageContent) {
          // Cache the page for future reference
          await cachePageSnapshot({
            url: currentUrl,
            title: pageContent.title || 'Unknown',
            markdown: pageContent.markdown || '',
            product: pageContent.product as {
              name: string;
              price?: string;
              currency?: string;
              description?: string;
              brand?: string;
              image?: string;
              rating?: string;
            } | undefined,
            interactiveElements: pageContent.interactiveElements,
          });

          // Build rich context
          const parts = [
            `\n\n--- CURRENT PAGE CONTEXT ---`,
            `URL: ${currentUrl}`,
            `Title: ${pageContent.title || 'Unknown'}`,
          ];

          if (pageContent.product) {
            const p = pageContent.product;
            parts.push(`\nPRODUCT DETECTED:`);
            if (p.name) parts.push(`  Name: ${p.name}`);
            if (p.price) parts.push(`  Price: ${p.price}${p.currency ? ' ' + p.currency : ''}`);
            if (p.brand) parts.push(`  Brand: ${p.brand}`);
            if (p.description) parts.push(`  Description: ${String(p.description).substring(0, 200)}`);
          }

          if (pageContent.markdown) {
            parts.push(
              `\nPAGE CONTENT:\n${pageContent.markdown.substring(0, 3000)}`
            );
          }

          if (pageContent.interactiveElements) {
            parts.push(
              `\nINTERACTIVE ELEMENTS:\n${pageContent.interactiveElements}`
            );
          }

          pageContext = parts.join('\n');
        }
      }
    } catch {
      // Content script not available on this page
    }

    // Check if user is referencing a previous page ("like this", "similar", etc.)
    const refersToProduct =
      /\b(this|like this|similar|same|current|cheaper|less|lower price|compare)\b/i.test(
        content
      );
    if (refersToProduct && !pageContext.includes('PRODUCT DETECTED')) {
      // Try to get cached product context
      const lastProduct = await getLastProductContext();
      if (lastProduct) {
        pageContext += `\n\nPREVIOUS PRODUCT CONTEXT (from cache):\n  Name: ${lastProduct.name}${lastProduct.price ? `\n  Price: ${lastProduct.price}` : ''}${lastProduct.brand ? `\n  Brand: ${lastProduct.brand}` : ''}`;
      }
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

    type PageResult = {
      title?: string;
      markdown?: string;
      url?: string;
      product?: Record<string, unknown>;
      interactiveElements?: string;
    };

    let pageContent: PageResult | null = null;

    try {
      pageContent = (await browser.tabs.sendMessage(currentTab.id, {
        type: 'READ_PAGE',
      })) as PageResult;
    } catch {
      port.postMessage({
        type: 'CHAT_RESPONSE',
        payload: {
          content:
            'Could not read the page. Try refreshing or navigating to a regular webpage.',
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

    // Cache the page
    await cachePageSnapshot({
      url: currentTab.url || '',
      title: pageContent.title || 'Unknown',
      markdown: pageContent.markdown,
      product: pageContent.product as {
        name: string;
        price?: string;
        currency?: string;
        description?: string;
        brand?: string;
        image?: string;
        rating?: string;
      } | undefined,
    });

    let summaryPrompt = `Summarize this page concisely. Use bullet points for key information. Be brief but thorough.`;
    if (pageContent.product) {
      summaryPrompt += `\n\nThis appears to be a product page. Include: product name, price, key features, and any notable details.`;
    }

    const response = await chatCompletion(config, {
      messages: [
        { role: 'system', content: `You are FoxAgent. ${summaryPrompt}` },
        {
          role: 'user',
          content: `Summarize this page:\n\nTitle: ${pageContent.title || 'Unknown'}\nURL: ${currentTab.url}\n\nContent:\n${pageContent.markdown.substring(0, 5000)}`,
        },
      ],
    });

    const summary =
      response.choices[0]?.message?.content || 'No summary generated.';

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

    // Timeout after 60 seconds — default to deny
    setTimeout(() => {
      if (pendingPermissions.has(requestId)) {
        pendingPermissions.delete(requestId);
        resolve('deny');
      }
    }, 60000);
  });
}

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
