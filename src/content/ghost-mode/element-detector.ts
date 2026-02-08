// ============================================================
// Ghost Mode — Element Detector
// Scans the page for all interactive elements, classifies them
// by type, purpose, and importance, extracts contextual info.
// ============================================================

export type ElementType = 'button' | 'input' | 'link' | 'form' | 'select' | 'contenteditable';
export type ElementImportance = 'primary' | 'secondary' | 'tertiary';

export interface DetectedElement {
  id: string;
  element: HTMLElement;
  type: ElementType;
  purpose: string;
  label: string;
  confidence: number; // 0–100
  rect: DOMRect;
  importance: ElementImportance;
  isDangerous: boolean;
  inputType?: string;
  placeholder?: string;
  href?: string;
  formFields?: number;
}

// Dangerous action keywords
const DANGEROUS_KEYWORDS = [
  'delete', 'remove', 'logout', 'sign out', 'signout', 'log out',
  'cancel subscription', 'deactivate', 'close account', 'unsubscribe',
  'revoke', 'terminate', 'destroy', 'erase', 'reset', 'clear all',
];

// Primary CTA keywords
const PRIMARY_CTA_KEYWORDS = [
  'sign up', 'signup', 'register', 'get started', 'buy', 'purchase',
  'add to cart', 'checkout', 'subscribe', 'download', 'install',
  'try free', 'start trial', 'create account', 'join', 'apply',
  'submit', 'send', 'confirm', 'continue', 'next', 'proceed',
  'book now', 'order', 'pay', 'donate', 'enroll',
];

// Page type classification patterns
const PAGE_PATTERNS: Record<string, RegExp[]> = {
  'Login': [/log\s?in/i, /sign\s?in/i, /password/i, /username/i],
  'Signup': [/sign\s?up/i, /register/i, /create\s?account/i, /join/i],
  'Checkout': [/checkout/i, /payment/i, /billing/i, /order\s?summary/i, /cart/i],
  'Search': [/search/i, /results?\s?for/i, /find/i],
  'Article': [/article/i, /blog/i, /post/i, /read/i],
  'Product': [/product/i, /price/i, /add\s?to\s?cart/i, /buy/i, /shop/i],
  'Form': [/form/i, /submit/i, /application/i, /survey/i, /feedback/i],
  'Dashboard': [/dashboard/i, /analytics/i, /overview/i, /admin/i],
  'Settings': [/settings/i, /preferences/i, /account/i, /profile/i],
  'Contact': [/contact/i, /support/i, /help/i, /message/i],
};

let elementIdCounter = 0;

/**
 * Detect all interactive elements on the page.
 */
export function detectElements(): DetectedElement[] {
  elementIdCounter = 0;
  const detected: DetectedElement[] = [];
  const seen = new Set<HTMLElement>();

  // 1. Buttons (including role="button")
  scanElements(
    'button, [role="button"], input[type="submit"], input[type="button"], input[type="reset"]',
    'button',
    detected,
    seen
  );

  // 2. Input fields
  scanElements(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]), textarea',
    'input',
    detected,
    seen
  );

  // 3. Select dropdowns
  scanElements('select', 'select', detected, seen);

  // 4. Links
  scanElements('a[href]', 'link', detected, seen);

  // 5. Forms
  scanElements('form', 'form', detected, seen);

  // 6. Content-editable elements
  scanElements('[contenteditable="true"], [contenteditable=""]', 'contenteditable', detected, seen);

  // 7. Clickable elements with click handlers (heuristic)
  scanClickableElements(detected, seen);

  return detected;
}

function scanElements(
  selector: string,
  type: ElementType,
  detected: DetectedElement[],
  seen: Set<HTMLElement>
): void {
  try {
    const elements = document.querySelectorAll(selector);
    for (const el of elements) {
      const htmlEl = el as HTMLElement;
      if (seen.has(htmlEl)) continue;
      if (!isVisible(htmlEl)) continue;

      seen.add(htmlEl);

      const rect = htmlEl.getBoundingClientRect();
      if (rect.width < 5 || rect.height < 5) continue;

      const label = extractLabel(htmlEl, type);
      const purpose = classifyPurpose(htmlEl, type, label);
      const isDangerous = checkDangerous(label, purpose);
      const importance = classifyImportance(htmlEl, type, label, purpose);
      const confidence = calculateConfidence(htmlEl, type, label);

      const entry: DetectedElement = {
        id: `ghost-el-${++elementIdCounter}`,
        element: htmlEl,
        type,
        purpose,
        label: label || type,
        confidence,
        rect,
        importance,
        isDangerous,
      };

      if (type === 'input') {
        entry.inputType = htmlEl.getAttribute('type') || 'text';
        entry.placeholder = htmlEl.getAttribute('placeholder') || undefined;
      }

      if (type === 'link') {
        entry.href = (htmlEl as HTMLAnchorElement).href;
      }

      if (type === 'form') {
        entry.formFields = htmlEl.querySelectorAll('input, textarea, select').length;
      }

      detected.push(entry);
    }
  } catch {
    // Selector might be invalid on some pages
  }
}

function scanClickableElements(
  detected: DetectedElement[],
  seen: Set<HTMLElement>
): void {
  // Find elements with cursor: pointer that aren't already detected
  const allElements = document.querySelectorAll('div, span, li, td, img, label');
  let count = 0;

  for (const el of allElements) {
    if (count >= 20) break; // Limit to prevent performance issues
    const htmlEl = el as HTMLElement;
    if (seen.has(htmlEl)) continue;

    try {
      const style = getComputedStyle(htmlEl);
      if (style.cursor === 'pointer') {
        if (!isVisible(htmlEl)) continue;
        const rect = htmlEl.getBoundingClientRect();
        if (rect.width < 10 || rect.height < 10) continue;

        const label = extractLabel(htmlEl, 'button');
        if (!label || label.length < 2) continue;

        seen.add(htmlEl);
        detected.push({
          id: `ghost-el-${++elementIdCounter}`,
          element: htmlEl,
          type: 'button',
          purpose: 'clickable element',
          label,
          confidence: 60,
          rect,
          importance: 'tertiary',
          isDangerous: checkDangerous(label, ''),
        });
        count++;
      }
    } catch {
      // Skip
    }
  }
}

function isVisible(el: HTMLElement): boolean {
  if (el.offsetWidth === 0 && el.offsetHeight === 0) {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (style.position !== 'fixed' && style.position !== 'sticky') return false;
  }
  if (el.hidden || el.getAttribute('aria-hidden') === 'true') return false;

  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function extractLabel(el: HTMLElement, type: ElementType): string {
  // For inputs
  if (type === 'input' || type === 'select' || type === 'contenteditable') {
    const placeholder = el.getAttribute('placeholder');
    if (placeholder) return placeholder.trim();

    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel.trim();

    const id = el.id;
    if (id) {
      const labelEl = document.querySelector(`label[for="${id}"]`);
      if (labelEl?.textContent) return labelEl.textContent.trim();
    }

    // Check parent label
    const parentLabel = el.closest('label');
    if (parentLabel) {
      const text = parentLabel.textContent?.trim();
      if (text && text.length < 80) return text;
    }

    const name = el.getAttribute('name');
    if (name) return name.replace(/[_-]/g, ' ');

    const inputType = el.getAttribute('type') || 'text';
    return `${inputType} field`;
  }

  // For forms
  if (type === 'form') {
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel.trim();

    const heading = el.querySelector('h1, h2, h3, h4, legend');
    if (heading?.textContent) return heading.textContent.trim().substring(0, 60);

    return 'Form';
  }

  // For buttons and links
  const text = el.textContent?.trim();
  if (text && text.length > 0 && text.length < 80) return text;

  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel.trim();

  const title = el.getAttribute('title');
  if (title) return title.trim();

  const img = el.querySelector('img');
  if (img?.alt) return img.alt.trim();

  const svgTitle = el.querySelector('svg title');
  if (svgTitle?.textContent) return svgTitle.textContent.trim();

  return '';
}

function classifyPurpose(el: HTMLElement, type: ElementType, label: string): string {
  const lower = label.toLowerCase();

  if (type === 'input') {
    const inputType = el.getAttribute('type') || 'text';
    if (inputType === 'email' || lower.includes('email')) return 'input_email';
    if (inputType === 'password' || lower.includes('password')) return 'input_password';
    if (inputType === 'search' || lower.includes('search')) return 'search';
    if (inputType === 'tel' || lower.includes('phone')) return 'input_phone';
    if (inputType === 'url' || lower.includes('website')) return 'input_url';
    if (inputType === 'number' || lower.includes('amount') || lower.includes('quantity')) return 'input_number';
    if (lower.includes('name') || lower.includes('first') || lower.includes('last')) return 'input_name';
    if (lower.includes('address') || lower.includes('street') || lower.includes('city')) return 'input_address';
    return `input_${inputType}`;
  }

  if (type === 'button') {
    if (lower.includes('submit') || lower.includes('send')) return 'submit';
    if (lower.includes('cancel')) return 'cancel';
    if (lower.includes('close') || lower.includes('dismiss')) return 'close';
    if (lower.includes('search')) return 'search';
    if (lower.includes('add to cart') || lower.includes('buy')) return 'purchase';
    if (lower.includes('sign up') || lower.includes('register') || lower.includes('join')) return 'signup';
    if (lower.includes('log in') || lower.includes('sign in')) return 'login';
    if (lower.includes('download')) return 'download';
    if (lower.includes('share')) return 'share';
    if (lower.includes('like') || lower.includes('favorite')) return 'favorite';
    if (lower.includes('menu') || lower.includes('toggle')) return 'toggle';
    if (lower.includes('next') || lower.includes('continue')) return 'navigate_next';
    if (lower.includes('back') || lower.includes('previous')) return 'navigate_back';
    return 'action';
  }

  if (type === 'link') {
    const href = (el as HTMLAnchorElement).href || '';
    if (href.includes('mailto:')) return 'email_link';
    if (href.includes('tel:')) return 'phone_link';
    if (lower.includes('home')) return 'navigate_home';
    if (lower.includes('about')) return 'navigate_about';
    if (lower.includes('contact')) return 'navigate_contact';
    if (lower.includes('login') || lower.includes('sign in')) return 'navigate_login';
    if (lower.includes('pricing') || lower.includes('plans')) return 'navigate_pricing';
    return 'navigate';
  }

  if (type === 'form') return 'form_container';
  if (type === 'select') return 'dropdown';
  if (type === 'contenteditable') return 'rich_text_input';

  return 'unknown';
}

function checkDangerous(label: string, purpose: string): boolean {
  const lower = (label + ' ' + purpose).toLowerCase();
  return DANGEROUS_KEYWORDS.some((kw) => lower.includes(kw));
}

function classifyImportance(
  el: HTMLElement,
  type: ElementType,
  label: string,
  purpose: string
): ElementImportance {
  const lower = label.toLowerCase();

  // Primary: main CTAs
  if (PRIMARY_CTA_KEYWORDS.some((kw) => lower.includes(kw))) return 'primary';

  // Primary: submit buttons
  if (type === 'button' && (purpose === 'submit' || purpose === 'purchase' || purpose === 'signup')) {
    return 'primary';
  }

  // Primary: large buttons, buttons with prominent styling
  if (type === 'button') {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const bgColor = style.backgroundColor;

    // Larger buttons are more important
    if (rect.width > 150 && rect.height > 35) return 'primary';

    // Colored buttons (not transparent/white) tend to be primary
    if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent' && bgColor !== 'rgb(255, 255, 255)') {
      return 'secondary';
    }
  }

  // Forms with many fields are important
  if (type === 'form') {
    const fields = el.querySelectorAll('input, textarea, select').length;
    if (fields >= 3) return 'primary';
    return 'secondary';
  }

  // Search inputs are secondary
  if (purpose === 'search') return 'secondary';

  // Password/email inputs in forms are secondary
  if (purpose.startsWith('input_') && (purpose.includes('email') || purpose.includes('password'))) {
    return 'secondary';
  }

  return 'tertiary';
}

function calculateConfidence(el: HTMLElement, type: ElementType, label: string): number {
  let confidence = 70; // base

  // Has a clear label
  if (label && label.length > 2) confidence += 10;

  // Has an ID
  if (el.id) confidence += 5;

  // Has aria attributes
  if (el.getAttribute('aria-label') || el.getAttribute('aria-describedby')) confidence += 5;

  // Is a native interactive element
  if (['button', 'input', 'select', 'textarea', 'a'].includes(el.tagName.toLowerCase())) {
    confidence += 10;
  }

  // Is visible and has reasonable size
  const rect = el.getBoundingClientRect();
  if (rect.width > 20 && rect.height > 15) confidence += 5;

  // Has role attribute
  if (el.getAttribute('role')) confidence += 3;

  return Math.min(confidence, 99);
}

/**
 * Classify the type of the current page.
 */
export function classifyPageType(): { type: string; confidence: number } {
  const pageText = (document.title + ' ' + document.body.innerText.substring(0, 3000)).toLowerCase();
  const url = window.location.href.toLowerCase();

  let bestMatch = 'General';
  let bestScore = 0;

  for (const [pageType, patterns] of Object.entries(PAGE_PATTERNS)) {
    let score = 0;
    for (const pattern of patterns) {
      if (pattern.test(pageText)) score += 2;
      if (pattern.test(url)) score += 3;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = pageType;
    }
  }

  // Check URL patterns
  if (url.includes('/login') || url.includes('/signin')) { bestMatch = 'Login'; bestScore = Math.max(bestScore, 8); }
  if (url.includes('/signup') || url.includes('/register')) { bestMatch = 'Signup'; bestScore = Math.max(bestScore, 8); }
  if (url.includes('/checkout') || url.includes('/cart')) { bestMatch = 'Checkout'; bestScore = Math.max(bestScore, 8); }
  if (url.includes('/search') || url.includes('?q=')) { bestMatch = 'Search'; bestScore = Math.max(bestScore, 8); }
  if (url.includes('/product') || url.includes('/item')) { bestMatch = 'Product'; bestScore = Math.max(bestScore, 6); }
  if (url.includes('/dashboard') || url.includes('/admin')) { bestMatch = 'Dashboard'; bestScore = Math.max(bestScore, 6); }
  if (url.includes('/settings') || url.includes('/account')) { bestMatch = 'Settings'; bestScore = Math.max(bestScore, 6); }

  const confidence = Math.min(50 + bestScore * 6, 99);
  return { type: bestMatch, confidence };
}

/**
 * Get element counts by type.
 */
export function getElementCounts(elements: DetectedElement[]): Record<string, number> {
  const counts: Record<string, number> = {
    buttons: 0,
    inputs: 0,
    links: 0,
    forms: 0,
    selects: 0,
    total: elements.length,
  };

  for (const el of elements) {
    switch (el.type) {
      case 'button': counts.buttons++; break;
      case 'input':
      case 'contenteditable': counts.inputs++; break;
      case 'link': counts.links++; break;
      case 'form': counts.forms++; break;
      case 'select': counts.selects++; break;
    }
  }

  return counts;
}

