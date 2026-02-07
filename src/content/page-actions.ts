// ============================================================
// Page Actions - Click, fill, scroll operations on the page
// ============================================================

import { highlightElement } from './visual-highlighter';

interface ActionResult {
  success: boolean;
  error?: string;
  details?: string;
}

/**
 * Click an element on the page by CSS selector.
 */
export async function clickElement(selector: string): Promise<ActionResult> {
  try {
    const el = document.querySelector(selector);
    if (!el) {
      // Try to find by text content as fallback
      const found = findElementByText(selector);
      if (found) {
        found.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(300);
        (found as HTMLElement).click();
        return {
          success: true,
          details: `Clicked element with text matching "${selector}"`,
        };
      }
      return {
        success: false,
        error: `Element not found: ${selector}`,
      };
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(300);

    // Simulate a real click
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
    });
    el.dispatchEvent(event);

    return {
      success: true,
      details: `Clicked: ${getElementDescription(el)}`,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: `Click failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Fill a form input with text.
 */
export async function fillForm(
  selector: string,
  text: string
): Promise<ActionResult> {
  try {
    const el = document.querySelector(selector) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;

    if (!el) {
      return {
        success: false,
        error: `Input not found: ${selector}`,
      };
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(300);

    // Focus the element
    el.focus();
    await sleep(100);

    // Clear existing value
    el.value = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));

    // Type character by character for natural simulation
    for (const char of text) {
      el.value += char;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(
        new KeyboardEvent('keydown', { key: char, bubbles: true })
      );
      el.dispatchEvent(
        new KeyboardEvent('keyup', { key: char, bubbles: true })
      );
      await sleep(30 + Math.random() * 30); // Natural typing speed
    }

    // Trigger change event
    el.dispatchEvent(new Event('change', { bubbles: true }));

    return {
      success: true,
      details: `Filled "${selector}" with "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: `Fill failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Scroll the page up or down.
 */
export async function scrollPage(
  direction: 'up' | 'down'
): Promise<ActionResult> {
  const amount = direction === 'down' ? 500 : -500;
  window.scrollBy({ top: amount, behavior: 'smooth' });

  return {
    success: true,
    details: `Scrolled ${direction} by ${Math.abs(amount)}px`,
  };
}

/**
 * Try to find an element by its text content.
 */
function findElementByText(text: string): Element | null {
  const cleanText = text
    .replace(/^[.#\[\]]/, '')
    .toLowerCase()
    .trim();

  // Search buttons, links, and interactive elements
  const candidates = document.querySelectorAll(
    'a, button, [role="button"], input[type="submit"], input[type="button"]'
  );

  for (const el of candidates) {
    const elText = el.textContent?.toLowerCase().trim() || '';
    if (elText.includes(cleanText) || cleanText.includes(elText)) {
      return el;
    }
  }

  return null;
}

/**
 * Get a human-readable description of an element.
 */
function getElementDescription(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const text = el.textContent?.trim().substring(0, 50) || '';
  const id = el.id ? `#${el.id}` : '';
  const className = el.className
    ? `.${String(el.className).split(' ')[0]}`
    : '';
  return `<${tag}${id}${className}> "${text}"`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

