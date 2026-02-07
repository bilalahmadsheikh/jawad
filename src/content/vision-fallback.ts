// ============================================================
// Vision Fallback - Screenshot capture for SPA/JS-heavy sites
// ============================================================

/**
 * Capture a screenshot of the visible tab area.
 * This is called from the background script since content scripts
 * can't use browser.tabs.captureVisibleTab directly.
 *
 * Instead, we provide a function to extract visual information
 * from the DOM as a fallback when Readability fails.
 */
export function extractVisualInfo(): {
  title: string;
  description: string;
  interactiveElements: string[];
  formFields: string[];
} {
  const title = document.title;

  // Get meta description
  const metaDesc =
    document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

  // Find interactive elements
  const interactiveElements: string[] = [];
  const buttons = document.querySelectorAll(
    'button, a[href], [role="button"], input[type="submit"]'
  );
  buttons.forEach((el) => {
    const text = el.textContent?.trim();
    if (text && text.length > 0 && text.length < 100) {
      const tag = el.tagName.toLowerCase();
      const selector = getUniqueSelector(el);
      interactiveElements.push(`[${tag}] "${text}" → ${selector}`);
    }
  });

  // Find form fields
  const formFields: string[] = [];
  const inputs = document.querySelectorAll(
    'input:not([type="hidden"]), textarea, select'
  );
  inputs.forEach((el) => {
    const input = el as HTMLInputElement;
    const label = getInputLabel(input);
    const selector = getUniqueSelector(el);
    formFields.push(
      `[${input.type || 'text'}] "${label}" → ${selector}`
    );
  });

  return {
    title,
    description: metaDesc,
    interactiveElements: interactiveElements.slice(0, 30),
    formFields: formFields.slice(0, 20),
  };
}

/**
 * Get a unique CSS selector for an element.
 */
function getUniqueSelector(el: Element): string {
  if (el.id) return `#${el.id}`;

  const tag = el.tagName.toLowerCase();
  const classes = Array.from(el.classList)
    .filter((c) => !c.includes('_') || c.length < 30)
    .slice(0, 2);

  if (classes.length > 0) {
    const selector = `${tag}.${classes.join('.')}`;
    if (document.querySelectorAll(selector).length === 1) {
      return selector;
    }
  }

  // Use nth-child as fallback
  const parent = el.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children);
    const index = siblings.indexOf(el) + 1;
    return `${getUniqueSelector(parent)} > ${tag}:nth-child(${index})`;
  }

  return tag;
}

/**
 * Get the label text for an input element.
 */
function getInputLabel(input: HTMLInputElement): string {
  // Check for associated label
  if (input.id) {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label?.textContent) return label.textContent.trim();
  }

  // Check for aria-label
  if (input.getAttribute('aria-label')) {
    return input.getAttribute('aria-label')!;
  }

  // Check for placeholder
  if (input.placeholder) {
    return input.placeholder;
  }

  // Check for name attribute
  return input.name || input.type || 'unknown';
}

