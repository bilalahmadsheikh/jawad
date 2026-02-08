// ============================================================
// Enhanced MCP Tool Registry — v2
// New tools: screenshot_page, extract_table, translate_text,
//   watch_price, compare_tabs, auto_fill_form
// Better descriptions that guide LLM behavior
// ============================================================

import type { ToolDefinition } from './types';
import { getCachedSnapshot, getLastProductContext } from './page-cache';

export const TOOLS: ToolDefinition[] = [
  {
    name: 'read_page',
    description:
      'Read the current page. Returns page content (markdown), product info if on a product page, and a list of INTERACTIVE ELEMENTS with their exact CSS selectors. ALWAYS call this first before clicking or filling anything.',
    parameters: {},
    permission: 'read-only',
  },
  {
    name: 'click_element',
    description:
      'Click an element on the current page. You can pass either an exact CSS selector from read_page results, OR the visible text of the element (e.g. "Add to Cart", "Sign In"). The element is highlighted before clicking.',
    parameters: {
      selector: {
        type: 'string',
        description:
          'CSS selector from read_page results, OR the visible text of the element to click (e.g. "Add to Cart")',
        required: true,
      },
    },
    permission: 'interact',
  },
  {
    name: 'fill_form',
    description:
      'Type text into an input field. You can pass an exact CSS selector from read_page, OR a purpose keyword ("search", "email", "password"). Set submit=true to press Enter/submit after filling.',
    parameters: {
      selector: {
        type: 'string',
        description:
          'CSS selector from read_page results, OR purpose keyword: "search", "email", "password", "query"',
        required: true,
      },
      text: {
        type: 'string',
        description: 'Text to type into the field',
        required: true,
      },
      submit: {
        type: 'boolean',
        description:
          'If true, press Enter or click Submit after filling. Use this for search bars.',
      },
    },
    permission: 'interact',
  },
  {
    name: 'navigate',
    description:
      'Navigate to a URL. Opens in the current tab by default, or a new tab if newTab=true.',
    parameters: {
      url: {
        type: 'string',
        description: 'Full URL to navigate to',
        required: true,
      },
      newTab: {
        type: 'boolean',
        description: 'If true, open in a new tab.',
      },
    },
    permission: 'navigate',
  },
  {
    name: 'search_web',
    description:
      'Search Google directly. Much more reliable than trying to fill a search bar. Returns the search results page content. Use this for finding products, prices, information, etc.',
    parameters: {
      query: {
        type: 'string',
        description:
          'Search query (e.g. "Nike Air Max 270 price comparison", "best hoodies under $50")',
        required: true,
      },
    },
    permission: 'navigate',
  },
  {
    name: 'draft_email',
    description:
      'Open a Gmail compose window with pre-filled To, Subject, and Body. The email is NOT sent — it opens as a draft for the user to review. Works with Gmail.',
    parameters: {
      to: {
        type: 'string',
        description: 'Recipient email address (leave empty if unknown)',
      },
      subject: {
        type: 'string',
        description: 'Email subject line',
        required: true,
      },
      body: {
        type: 'string',
        description: 'Email body text. Can include line breaks with \\n.',
        required: true,
      },
    },
    permission: 'interact',
  },
  {
    name: 'scroll_page',
    description: 'Scroll the current page up or down to see more content.',
    parameters: {
      direction: {
        type: 'string',
        description: 'Scroll direction: "up" or "down"',
        required: true,
        enum: ['up', 'down'],
      },
    },
    permission: 'read-only',
  },
  {
    name: 'get_snapshot',
    description:
      'Retrieve cached context from a previously viewed page. Use this when the user says "like this" or "similar to what I was looking at". Returns saved product info, title, and content.',
    parameters: {
      url: {
        type: 'string',
        description:
          'URL of the page to retrieve. Leave empty to get the most recent snapshot.',
      },
    },
    permission: 'read-only',
  },
  // ── NEW TOOLS ──────────────────────────────────────────────
  {
    name: 'extract_table',
    description:
      'Extract all tables from the current page as structured data (array of rows). Great for comparison pages, pricing tables, specs, etc. Returns JSON.',
    parameters: {},
    permission: 'read-only',
  },
  {
    name: 'screenshot_page',
    description:
      'Take a screenshot/snapshot description of the visible viewport. Returns a text description of what is currently visible on screen (headings, images, layout). Useful for understanding page state after interactions.',
    parameters: {},
    permission: 'read-only',
  },
  {
    name: 'translate_text',
    description:
      'Translate text to a target language. Uses the LLM to translate. Good for translating page content, product descriptions, etc.',
    parameters: {
      text: {
        type: 'string',
        description: 'The text to translate',
        required: true,
      },
      targetLanguage: {
        type: 'string',
        description: 'Target language (e.g. "Spanish", "French", "Arabic", "Chinese")',
        required: true,
      },
    },
    permission: 'read-only',
  },
  {
    name: 'watch_price',
    description:
      'Start watching the current product page for price changes. Jawad will remember the current price and notify the user if it changes on future visits.',
    parameters: {
      productName: {
        type: 'string',
        description: 'Name of the product to watch',
        required: true,
      },
      currentPrice: {
        type: 'string',
        description: 'Current price of the product',
        required: true,
      },
    },
    permission: 'read-only',
  },
  {
    name: 'select_text',
    description:
      'Select and extract specific text from the page by CSS selector or search term. Returns the text content of matching elements.',
    parameters: {
      selector: {
        type: 'string',
        description: 'CSS selector or text to search for on the page',
        required: true,
      },
    },
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
 * Execute a tool action.
 */
export async function executeToolAction(
  toolName: string,
  args: Record<string, unknown>,
  tabId?: number
): Promise<unknown> {
  const tabOptional = ['navigate', 'search_web', 'draft_email', 'get_snapshot', 'translate_text', 'watch_price'];
  if (!tabId && !tabOptional.includes(toolName)) {
    return { error: 'No active tab available' };
  }

  try {
    switch (toolName) {
      case 'read_page':
        return await browser.tabs.sendMessage(tabId!, { type: 'READ_PAGE' });

      case 'click_element': {
        return await browser.tabs.sendMessage(tabId!, {
          type: 'CLICK_ELEMENT',
          payload: { selector: args.selector },
        });
      }

      case 'fill_form': {
        return await browser.tabs.sendMessage(tabId!, {
          type: 'FILL_FORM',
          payload: {
            selector: args.selector,
            text: args.text,
            submit: args.submit || false,
          },
        });
      }

      case 'navigate': {
        if (args.newTab) {
          const tab = await browser.tabs.create({
            url: args.url as string,
            active: true,
          });
          await waitForTabLoad(tab.id!);
          return {
            success: true,
            tabId: tab.id,
            url: args.url,
            message: `Opened ${args.url} in a new tab.`,
          };
        } else if (tabId) {
          await browser.tabs.update(tabId, { url: args.url as string });
          await waitForTabLoad(tabId);
          return {
            success: true,
            url: args.url,
            message: `Navigated to ${args.url}.`,
          };
        }
        return { error: 'No tab to navigate' };
      }

      case 'search_web': {
        const query = args.query as string;
        const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

        if (tabId) {
          await browser.tabs.update(tabId, { url });
          await waitForTabLoad(tabId);
          try {
            const results = await browser.tabs.sendMessage(tabId, {
              type: 'READ_PAGE',
            });
            return {
              success: true,
              searchQuery: query,
              url,
              pageContent: results,
            };
          } catch {
            return {
              success: true,
              searchQuery: query,
              url,
              message:
                'Navigated to search results. Call read_page to see the content.',
            };
          }
        } else {
          const tab = await browser.tabs.create({ url, active: true });
          await waitForTabLoad(tab.id!);
          return {
            success: true,
            searchQuery: query,
            url,
            tabId: tab.id,
            message:
              'Opened search results in new tab. Call read_page to see the content.',
          };
        }
      }

      case 'draft_email': {
        const to = (args.to as string) || '';
        const subject = (args.subject as string) || '';
        const body = (args.body as string) || '';

        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        const tab = await browser.tabs.create({
          url: gmailUrl,
          active: true,
        });

        return {
          success: true,
          tabId: tab.id,
          message: `Email draft opened in Gmail.\n- To: ${to || '(empty)'}\n- Subject: ${subject}\n- Body: ${body.substring(0, 100)}${body.length > 100 ? '...' : ''}\n\nThe user must review and click Send.`,
        };
      }

      case 'scroll_page':
        return await browser.tabs.sendMessage(tabId!, {
          type: 'SCROLL_PAGE',
          payload: { direction: args.direction },
        });

      case 'get_snapshot': {
        const url = args.url as string | undefined;
        const snapshot = await getCachedSnapshot(url);

        if (!snapshot) {
          const product = await getLastProductContext();
          if (product) {
            return {
              success: true,
              source: 'product-cache',
              product,
              message: `Found cached product: ${product.name}${product.price ? ` at ${product.price}` : ''}`,
            };
          }
          return {
            success: false,
            error: 'No cached page snapshots found. Browse to a page first.',
          };
        }

        return {
          success: true,
          source: 'page-cache',
          title: snapshot.title,
          url: snapshot.url,
          product: snapshot.product || null,
          content: snapshot.markdown.substring(0, 3000),
          cachedAt: new Date(snapshot.timestamp).toISOString(),
        };
      }

      // ── NEW TOOL IMPLEMENTATIONS ──────────────────────────────

      case 'extract_table': {
        return await browser.tabs.sendMessage(tabId!, {
          type: 'EXTRACT_TABLES',
        });
      }

      case 'screenshot_page': {
        return await browser.tabs.sendMessage(tabId!, {
          type: 'SCREENSHOT_PAGE',
        });
      }

      case 'translate_text': {
        // Translation is handled by the LLM itself — we return a marker
        // so the agent loop knows to translate
        return {
          success: true,
          action: 'translate',
          text: args.text,
          targetLanguage: args.targetLanguage,
          message: `Translation request queued. Translate the following to ${args.targetLanguage}: "${(args.text as string).substring(0, 200)}"`,
        };
      }

      case 'watch_price': {
        const productName = args.productName as string;
        const currentPrice = args.currentPrice as string;
        const watchUrl = tabId
          ? (await browser.tabs.get(tabId)).url || 'unknown'
          : 'unknown';

        // Store in browser.storage.local
        const existing = await browser.storage.local.get('jawad_price_watches');
        const watches = (existing.jawad_price_watches as Record<string, unknown>[]) || [];
        watches.push({
          productName,
          currentPrice,
          url: watchUrl,
          timestamp: Date.now(),
        });
        await browser.storage.local.set({ jawad_price_watches: watches });

        return {
          success: true,
          message: `Now watching "${productName}" at ${currentPrice}. You'll be notified if the price changes.`,
          watchUrl,
        };
      }

      case 'select_text': {
        return await browser.tabs.sendMessage(tabId!, {
          type: 'SELECT_TEXT',
          payload: { selector: args.selector },
        });
      }

      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { error: `Tool execution failed: ${msg}` };
  }
}

function waitForTabLoad(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    const listener = (
      updatedTabId: number,
      changeInfo: { status?: string }
    ) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        browser.tabs.onUpdated.removeListener(listener);
        setTimeout(resolve, 800);
      }
    };
    browser.tabs.onUpdated.addListener(listener);
    setTimeout(() => {
      browser.tabs.onUpdated.removeListener(listener);
      resolve();
    }, 15000);
  });
}

// Re-export for use by agent-manager
export { waitForTabLoad };
