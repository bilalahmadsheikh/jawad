// ============================================================
// Enhanced Page Actions
// - Smart input detection (by purpose, not just selector)
// - React/Vue/Angular compatible value setting
// - Auto-submit after fill
// - Robust click with text fallback
// ============================================================

import { highlightElement } from './visual-highlighter';

interface ActionResult {
  success: boolean;
  error?: string;
  details?: string;
}

// ---------- Click ----------

export async function clickElement(selector: string): Promise<ActionResult> {
  try {
    let el = document.querySelector(selector);

    // Fallback: search by text content
    if (!el) {
      el = findElementByText(selector);
    }

    if (!el) {
      // Try partial matches
      el = findElementByPartialText(selector);
    }

    if (!el) {
      return {
        success: false,
        error: `Element not found for: "${selector}". Use read_page to see available elements and their exact selectors.`,
      };
    }

    // Highlight before clicking
    highlightElement(el);
    await sleep(1200);

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(300);

    simulateClick(el);

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

// ---------- Fill form ----------

export async function fillForm(
  selector: string,
  text: string,
  submit = false
): Promise<ActionResult> {
  try {
    let el: HTMLInputElement | HTMLTextAreaElement | null = null;

    // 1. Try exact selector
    el = document.querySelector(selector) as typeof el;

    // 2. Smart detection: if selector looks like a purpose keyword
    if (!el) {
      el = findInputByPurpose(selector);
    }

    // 3. Try finding by placeholder text
    if (!el) {
      el = findInputByPlaceholder(selector);
    }

    if (!el) {
      return {
        success: false,
        error: `Input not found for: "${selector}". Use read_page to see available inputs and their exact selectors.`,
      };
    }

    // Highlight
    highlightElement(el);
    await sleep(800);

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(200);

    // Focus
    el.focus();
    el.click();
    await sleep(100);

    // Clear existing value
    setNativeValue(el, '');
    await sleep(50);

    // Set the new value (React-compatible)
    setNativeValue(el, text);
    await sleep(100);

    // Also dispatch keyboard events for frameworks that watch them
    el.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', bubbles: true })
    );
    el.dispatchEvent(
      new KeyboardEvent('keyup', { key: 'a', bubbles: true })
    );

    // Submit if requested
    if (submit) {
      await sleep(300);
      await submitInput(el);
    }

    return {
      success: true,
      details: `Filled "${getElementDescription(el)}" with "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"${submit ? ' and submitted' : ''}`,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: `Fill failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ---------- Scroll ----------

export async function scrollPage(
  direction: 'up' | 'down'
): Promise<ActionResult> {
  const amount = direction === 'down' ? 600 : -600;
  window.scrollBy({ top: amount, behavior: 'smooth' });
  return {
    success: true,
    details: `Scrolled ${direction} by ${Math.abs(amount)}px. Page is at ${Math.round(window.scrollY)}px / ${document.body.scrollHeight}px total.`,
  };
}

// ---------- React-compatible value setter ----------

function setNativeValue(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string
): void {
  // Use the native setter to bypass React's synthetic event system
  const descriptor =
    element instanceof HTMLTextAreaElement
      ? Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          'value'
        )
      : Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        );

  if (descriptor?.set) {
    descriptor.set.call(element, value);
  } else {
    element.value = value;
  }

  // Fire React-compatible events
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

// ---------- Smart input detection ----------

function findInputByPurpose(
  purpose: string
): HTMLInputElement | HTMLTextAreaElement | null {
  const lower = purpose.toLowerCase();

  // Search-related
  if (
    lower.includes('search') ||
    lower === 'q' ||
    lower === 'query'
  ) {
    const searchSelectors = [
      'input[type="search"]',
      'input[name="q"]',
      'input[name="query"]',
      'input[name="search"]',
      'input[name="search_query"]',
      'input[role="searchbox"]',
      'input[role="combobox"]',
      'input[aria-label*="search" i]',
      'input[placeholder*="search" i]',
      'textarea[name="q"]',
    ];

    for (const sel of searchSelectors) {
      const el = document.querySelector(sel) as HTMLInputElement | null;
      if (el && isVisible(el)) return el;
    }

    // Last resort: first visible text input
    const firstInput = document.querySelector(
      'input[type="text"], input:not([type])'
    ) as HTMLInputElement | null;
    if (firstInput && isVisible(firstInput)) return firstInput;
  }

  // Email
  if (lower.includes('email') || lower.includes('mail')) {
    const el = document.querySelector(
      'input[type="email"], input[name*="email" i], input[placeholder*="email" i]'
    ) as HTMLInputElement | null;
    if (el) return el;
  }

  // Password
  if (lower.includes('password') || lower.includes('pass')) {
    const el = document.querySelector(
      'input[type="password"]'
    ) as HTMLInputElement | null;
    if (el) return el;
  }

  return null;
}

function findInputByPlaceholder(
  text: string
): HTMLInputElement | HTMLTextAreaElement | null {
  const lower = text.toLowerCase();
  const inputs = document.querySelectorAll(
    'input, textarea'
  ) as NodeListOf<HTMLInputElement | HTMLTextAreaElement>;

  for (const input of inputs) {
    const placeholder = input.getAttribute('placeholder')?.toLowerCase() || '';
    const ariaLabel = input.getAttribute('aria-label')?.toLowerCase() || '';
    if (placeholder.includes(lower) || ariaLabel.includes(lower)) {
      if (isVisible(input as HTMLElement)) return input;
    }
  }
  return null;
}

// ---------- Submit ----------

async function submitInput(
  el: HTMLInputElement | HTMLTextAreaElement
): Promise<void> {
  // Try form submit first
  const form = el.closest('form');
  if (form) {
    const submitBtn = form.querySelector(
      'button[type="submit"], input[type="submit"], button:not([type])'
    ) as HTMLElement | null;
    if (submitBtn) {
      simulateClick(submitBtn);
      return;
    }
    // Try form.submit()
    try {
      form.requestSubmit();
      return;
    } catch {
      // Fall through to Enter key
    }
  }

  // Press Enter
  const enterEvent = new KeyboardEvent('keydown', {
    key: 'Enter',
    code: 'Enter',
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true,
  });
  el.dispatchEvent(enterEvent);
  el.dispatchEvent(
    new KeyboardEvent('keyup', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
    })
  );
}

// ---------- Click simulation ----------

function simulateClick(el: Element): void {
  const events: Array<[string, typeof MouseEvent]> = [
    ['pointerdown', PointerEvent],
    ['mousedown', MouseEvent],
    ['pointerup', PointerEvent],
    ['mouseup', MouseEvent],
    ['click', MouseEvent],
  ];

  for (const [name, EventClass] of events) {
    const event = new EventClass(name, {
      bubbles: true,
      cancelable: true,
      view: window,
    });
    el.dispatchEvent(event);
  }

  // Also try .click() for good measure
  if ('click' in el && typeof (el as HTMLElement).click === 'function') {
    (el as HTMLElement).click();
  }
}

// ---------- Element finding by text ----------

function findElementByText(text: string): Element | null {
  const cleanText = text
    .replace(/^[.#\[\]>:"]/, '')
    .toLowerCase()
    .trim();

  if (!cleanText) return null;

  // Search interactive elements
  const candidates = document.querySelectorAll(
    'a, button, [role="button"], [role="link"], input[type="submit"], input[type="button"], label, span[onclick], div[onclick], li[onclick]'
  );

  // Exact match first
  for (const el of candidates) {
    const elText = el.textContent?.trim().toLowerCase() || '';
    if (elText === cleanText && isVisible(el as HTMLElement)) {
      return el;
    }
  }

  // Contains match
  for (const el of candidates) {
    const elText = el.textContent?.trim().toLowerCase() || '';
    if (elText.includes(cleanText) && isVisible(el as HTMLElement)) {
      return el;
    }
  }

  return null;
}

function findElementByPartialText(text: string): Element | null {
  const cleanText = text.toLowerCase().trim();
  if (!cleanText || cleanText.length < 2) return null;

  // Search for elements containing keywords
  const words = cleanText.split(/\s+/).filter((w) => w.length > 2);
  if (words.length === 0) return null;

  const allElements = document.querySelectorAll(
    'a, button, [role="button"], [role="link"], h1, h2, h3, span, div, li, p'
  );

  for (const el of allElements) {
    const elText = el.textContent?.trim().toLowerCase() || '';
    const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
    const combined = elText + ' ' + ariaLabel;

    const matchCount = words.filter((w) => combined.includes(w)).length;
    if (matchCount >= Math.ceil(words.length * 0.6) && isVisible(el as HTMLElement)) {
      return el;
    }
  }

  return null;
}

// ---------- Helpers ----------

function getElementDescription(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const text = el.textContent?.trim().substring(0, 50) || '';
  const id = el.id ? `#${el.id}` : '';
  const className = el.className
    ? `.${String(el.className).split(' ')[0]}`
    : '';
  return `<${tag}${id}${className}> "${text}"`;
}

function isVisible(el: HTMLElement): boolean {
  if (!el.offsetParent && el.tagName !== 'BODY' && el.tagName !== 'HTML') {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden')
      return false;
    if (style.position !== 'fixed' && style.position !== 'sticky')
      return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
