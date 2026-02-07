// ============================================================
// MCP Tool Registry - Tool definitions and execution
// ============================================================

import type { ToolDefinition } from './types';

export const TOOLS: ToolDefinition[] = [
  {
    name: 'read_page',
    description:
      'Read the current page content. Returns the page title and main content as clean markdown. Use this to understand what is on the page before taking actions.',
    parameters: {},
    permission: 'read-only',
  },
  {
    name: 'click_element',
    description:
      'Click an element on the current page. The element will be highlighted before clicking so the user can see what is being targeted.',
    parameters: {
      selector: {
        type: 'string',
        description: 'CSS selector of the element to click',
        required: true,
      },
      description: {
        type: 'string',
        description:
          'Human-readable description of what is being clicked (e.g. "Add to Cart button")',
        required: true,
      },
    },
    permission: 'interact',
  },
  {
    name: 'fill_form',
    description:
      'Type text into an input field or textarea on the current page.',
    parameters: {
      selector: {
        type: 'string',
        description: 'CSS selector of the input field',
        required: true,
      },
      text: {
        type: 'string',
        description: 'Text to type into the field',
        required: true,
      },
    },
    permission: 'interact',
  },
  {
    name: 'navigate',
    description:
      'Navigate to a URL. Can open in the current tab or a new tab.',
    parameters: {
      url: {
        type: 'string',
        description: 'Full URL to navigate to',
        required: true,
      },
      newTab: {
        type: 'boolean',
        description: 'If true, open in a new tab. Default is false.',
      },
    },
    permission: 'navigate',
  },
  {
    name: 'scroll_page',
    description: 'Scroll the current page up or down.',
    parameters: {
      direction: {
        type: 'string',
        description: 'Scroll direction',
        required: true,
        enum: ['up', 'down'],
      },
    },
    permission: 'read-only',
  },
  {
    name: 'summarize_page',
    description:
      'Read the current page content and return it for summarization. Use read_page instead if you just want to see what is on the page.',
    parameters: {},
    permission: 'read-only',
  },
];

/**
 * Convert our tool definitions to OpenAI function calling format.
 */
export function toOpenAITools(tools: ToolDefinition[]): unknown[] {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: Object.fromEntries(
          Object.entries(tool.parameters).map(([key, param]) => [
            key,
            {
              type: param.type,
              description: param.description,
              ...(param.enum ? { enum: param.enum } : {}),
            },
          ])
        ),
        required: Object.entries(tool.parameters)
          .filter(([, param]) => param.required)
          .map(([key]) => key),
      },
    },
  }));
}

/**
 * Execute a tool action by sending a message to the content script.
 */
export async function executeToolAction(
  toolName: string,
  args: Record<string, unknown>,
  tabId?: number
): Promise<unknown> {
  if (!tabId && toolName !== 'navigate') {
    return { error: 'No active tab available' };
  }

  try {
    switch (toolName) {
      case 'read_page':
        return await browser.tabs.sendMessage(tabId!, { type: 'READ_PAGE' });

      case 'click_element': {
        // Highlight the element first
        await browser.tabs.sendMessage(tabId!, {
          type: 'HIGHLIGHT_ELEMENT',
          payload: { selector: args.selector },
        });
        // Wait for highlight animation
        await sleep(1500);
        // Click the element
        return await browser.tabs.sendMessage(tabId!, {
          type: 'CLICK_ELEMENT',
          payload: { selector: args.selector },
        });
      }

      case 'fill_form': {
        await browser.tabs.sendMessage(tabId!, {
          type: 'HIGHLIGHT_ELEMENT',
          payload: { selector: args.selector },
        });
        await sleep(1000);
        return await browser.tabs.sendMessage(tabId!, {
          type: 'FILL_FORM',
          payload: { selector: args.selector, text: args.text },
        });
      }

      case 'navigate': {
        if (args.newTab) {
          const tab = await browser.tabs.create({
            url: args.url as string,
            active: true,
          });
          // Wait for page load
          await waitForTabLoad(tab.id!);
          return { success: true, tabId: tab.id, url: args.url };
        } else if (tabId) {
          await browser.tabs.update(tabId, { url: args.url as string });
          await waitForTabLoad(tabId);
          return { success: true, url: args.url };
        }
        return { error: 'No tab to navigate' };
      }

      case 'scroll_page':
        return await browser.tabs.sendMessage(tabId!, {
          type: 'SCROLL_PAGE',
          payload: { direction: args.direction },
        });

      case 'summarize_page':
        return await browser.tabs.sendMessage(tabId!, { type: 'READ_PAGE' });

      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { error: `Tool execution failed: ${msg}` };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForTabLoad(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    const listener = (
      updatedTabId: number,
      changeInfo: { status?: string }
    ) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        browser.tabs.onUpdated.removeListener(listener);
        // Small extra delay for JS rendering
        setTimeout(resolve, 500);
      }
    };
    browser.tabs.onUpdated.addListener(listener);
    // Timeout after 15 seconds
    setTimeout(() => {
      browser.tabs.onUpdated.removeListener(listener);
      resolve();
    }, 15000);
  });
}

