// ============================================================
// Enhanced DOM Reader
// - Readability article extraction
// - Product data extraction (JSON-LD, OpenGraph, DOM heuristics)
// - Interactive elements map with reliable CSS selectors
// ============================================================

import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';

// ---------- Public interfaces ----------

export interface PageResult {
  title: string;
  url: string;
  markdown: string;
  product: ProductData | null;
  interactiveElements: string; // formatted for LLM
  source: 'readability' | 'fallback';
}

export interface ProductData {
  name: string;
  price?: string;
  currency?: string;
  description?: string;
  brand?: string;
  image?: string;
  rating?: string;
}

interface InteractiveEl {
  tag: string;
  type?: string;
  selector: string;
  label: string;
  placeholder?: string;
  href?: string;
  role?: string;
}

// ---------- Main reader ----------

export function readPage(): PageResult {
  const product = extractProductInfo();
  const interactiveElements = formatInteractiveElements(
    extractInteractiveElements()
  );

  try {
    const docClone = document.cloneNode(true) as Document;
    const article = new Readability(docClone).parse();

    if (article && article.textContent && article.textContent.length > 50) {
      const turndown = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
      });
      turndown.addRule('removeScripts', {
        filter: ['script', 'style', 'noscript'],
        replacement: () => '',
      });

      const markdown = turndown.turndown(article.content);

      return {
        title: article.title || document.title,
        url: window.location.href,
        markdown: markdown.substring(0, 6000),
        product,
        interactiveElements,
        source: 'readability',
      };
    }
  } catch (e) {
    console.warn('[FoxAgent] Readability failed, using fallback:', e);
  }

  return {
    title: document.title,
    url: window.location.href,
    markdown: extractBasicContent(),
    product,
    interactiveElements,
    source: 'fallback',
  };
}

// ---------- Product extraction ----------

function extractProductInfo(): ProductData | null {
  // 1. JSON-LD structured data (most reliable)
  const jsonLdProduct = extractFromJsonLd();
  if (jsonLdProduct) return jsonLdProduct;

  // 2. Open Graph meta tags
  const ogProduct = extractFromOpenGraph();
  if (ogProduct) return ogProduct;

  // 3. DOM heuristics (price patterns, common selectors)
  return extractFromDomHeuristics();
}

function extractFromJsonLd(): ProductData | null {
  const scripts = document.querySelectorAll(
    'script[type="application/ld+json"]'
  );
  for (const script of scripts) {
    try {
      const raw = JSON.parse(script.textContent || '');
      const items = Array.isArray(raw) ? raw : [raw];

      for (const data of items) {
        if (data['@type'] === 'Product' || data['@type']?.includes?.('Product')) {
          const offers = Array.isArray(data.offers)
            ? data.offers[0]
            : data.offers;
          return {
            name: data.name || '',
            price: offers?.price || offers?.lowPrice || undefined,
            currency: offers?.priceCurrency || undefined,
            description: (data.description || '').substring(0, 500),
            brand:
              typeof data.brand === 'string'
                ? data.brand
                : data.brand?.name || undefined,
            image: Array.isArray(data.image)
              ? data.image[0]
              : data.image || undefined,
            rating: data.aggregateRating?.ratingValue || undefined,
          };
        }

        // Handle @graph arrays
        if (data['@graph']) {
          for (const node of data['@graph']) {
            if (
              node['@type'] === 'Product' ||
              node['@type']?.includes?.('Product')
            ) {
              const offers = Array.isArray(node.offers)
                ? node.offers[0]
                : node.offers;
              return {
                name: node.name || '',
                price: offers?.price || offers?.lowPrice || undefined,
                currency: offers?.priceCurrency || undefined,
                description: (node.description || '').substring(0, 500),
                brand:
                  typeof node.brand === 'string'
                    ? node.brand
                    : node.brand?.name || undefined,
                image: Array.isArray(node.image)
                  ? node.image[0]
                  : node.image || undefined,
                rating: node.aggregateRating?.ratingValue || undefined,
              };
            }
          }
        }
      }
    } catch {
      // Invalid JSON-LD
    }
  }
  return null;
}

function extractFromOpenGraph(): ProductData | null {
  const ogTitle = getMeta('og:title');
  const ogPrice =
    getMeta('product:price:amount') || getMeta('og:price:amount');
  const ogCurrency =
    getMeta('product:price:currency') || getMeta('og:price:currency');

  if (ogTitle && ogPrice) {
    return {
      name: ogTitle,
      price: ogPrice,
      currency: ogCurrency || undefined,
      description:
        getMeta('og:description')?.substring(0, 500) || undefined,
      brand: getMeta('product:brand') || undefined,
      image: getMeta('og:image') || undefined,
    };
  }
  return null;
}

function extractFromDomHeuristics(): ProductData | null {
  // Common price selectors
  const priceSelectors = [
    '[data-price]',
    '[itemprop="price"]',
    '.price:not(.was-price):not(.old-price)',
    '.product-price',
    '.current-price',
    '#price',
    '#priceValue',
    '.a-price .a-offscreen', // Amazon
    '.ProductPrice',
    'span.price',
    '.sale-price',
  ];

  let priceText: string | null = null;
  for (const sel of priceSelectors) {
    const el = document.querySelector(sel);
    if (el) {
      priceText =
        el.getAttribute('content') ||
        el.getAttribute('data-price') ||
        el.textContent?.trim() ||
        null;
      if (priceText) break;
    }
  }

  // Common product title selectors
  const titleSelectors = [
    '[itemprop="name"]',
    'h1.product-title',
    'h1.product-name',
    '#productTitle', // Amazon
    'h1[data-product-name]',
    '.product-info h1',
    '.product-detail h1',
    'h1',
  ];

  let titleText: string | null = null;
  for (const sel of titleSelectors) {
    const el = document.querySelector(sel);
    if (el) {
      titleText = el.textContent?.trim() || null;
      if (titleText && titleText.length > 2 && titleText.length < 300)
        break;
      titleText = null;
    }
  }

  if (titleText && priceText) {
    // Extract numeric price
    const priceMatch = priceText.match(
      /[\$\£\€\¥]?\s*[\d,]+\.?\d*/
    );
    return {
      name: titleText.substring(0, 200),
      price: priceMatch ? priceMatch[0].trim() : priceText.substring(0, 30),
      description:
        getMeta('description')?.substring(0, 500) || undefined,
      brand: getMeta('product:brand') || undefined,
      image: getMeta('og:image') || undefined,
    };
  }

  // Even just a product title is useful context
  if (titleText && titleText.length > 5) {
    return {
      name: titleText.substring(0, 200),
      description:
        getMeta('description')?.substring(0, 500) || undefined,
      image: getMeta('og:image') || undefined,
    };
  }

  return null;
}

// ---------- Interactive elements extraction ----------

function extractInteractiveElements(): InteractiveEl[] {
  const elements: InteractiveEl[] = [];
  const seen = new Set<Element>();

  // 1. Search inputs (highest priority)
  addElements(
    elements,
    seen,
    'input[type="search"], input[name="q"], input[name="query"], input[name="search"], input[role="searchbox"], input[aria-label*="search" i], input[placeholder*="search" i]',
    10
  );

  // 2. Text inputs and textareas
  addElements(
    elements,
    seen,
    'input[type="text"]:not([hidden]), input[type="email"], input[type="tel"], input[type="url"], input[type="number"], input:not([type]):not([hidden]), textarea',
    10
  );

  // 3. Submit / action buttons
  addElements(
    elements,
    seen,
    'button[type="submit"], input[type="submit"], button.add-to-cart, button[data-action="add-to-cart"], button[id*="add-to-cart" i], button[class*="add-to-cart" i]',
    5
  );

  // 4. Other buttons
  addElements(
    elements,
    seen,
    'button:not([type="submit"]):not([hidden]), [role="button"]',
    8
  );

  // 5. Key links (navigation, actions)
  addElements(elements, seen, 'a[href]:not([href="#"]):not([href=""])', 10);

  // 6. Select dropdowns
  addElements(elements, seen, 'select', 5);

  return elements;
}

function addElements(
  list: InteractiveEl[],
  seen: Set<Element>,
  selector: string,
  limit: number
): void {
  let count = 0;
  try {
    const els = document.querySelectorAll(selector);
    for (const el of els) {
      if (count >= limit) break;
      if (seen.has(el)) continue;

      const htmlEl = el as HTMLElement;

      // Skip hidden elements
      if (!isVisible(htmlEl)) continue;

      seen.add(el);

      const generated = generateSelector(htmlEl);
      const label = getElementLabel(htmlEl);

      // Skip elements with no useful label
      if (!label || label.length < 1) continue;

      const entry: InteractiveEl = {
        tag: htmlEl.tagName.toLowerCase(),
        selector: generated,
        label,
      };

      const type = htmlEl.getAttribute('type');
      if (type) entry.type = type;

      const placeholder = htmlEl.getAttribute('placeholder');
      if (placeholder) entry.placeholder = placeholder;

      if (htmlEl.tagName === 'A') {
        entry.href = (htmlEl as HTMLAnchorElement).href;
      }

      const role = htmlEl.getAttribute('role');
      if (role) entry.role = role;

      list.push(entry);
      count++;
    }
  } catch {
    // Selector might be invalid on some pages
  }
}

function isVisible(el: HTMLElement): boolean {
  if (!el.offsetParent && el.tagName !== 'BODY' && el.tagName !== 'HTML') {
    // Could be position:fixed — check computed style
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    if (style.position !== 'fixed' && style.position !== 'sticky')
      return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

// ---------- Selector generation ----------

function generateSelector(el: HTMLElement): string {
  // 1. ID (most reliable)
  if (el.id && document.querySelectorAll(`#${cssEscape(el.id)}`).length === 1) {
    return `#${cssEscape(el.id)}`;
  }

  // 2. name attribute (for form inputs)
  const name = el.getAttribute('name');
  if (name) {
    const sel = `${el.tagName.toLowerCase()}[name="${cssEscape(name)}"]`;
    if (document.querySelectorAll(sel).length === 1) return sel;
  }

  // 3. data-testid / data-test
  for (const attr of ['data-testid', 'data-test-id', 'data-test', 'data-qa']) {
    const val = el.getAttribute(attr);
    if (val) {
      const sel = `[${attr}="${cssEscape(val)}"]`;
      if (document.querySelectorAll(sel).length === 1) return sel;
    }
  }

  // 4. aria-label
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) {
    const sel = `${el.tagName.toLowerCase()}[aria-label="${cssEscape(ariaLabel)}"]`;
    if (document.querySelectorAll(sel).length === 1) return sel;
  }

  // 5. type + placeholder combination (for inputs)
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    const type = el.getAttribute('type') || 'text';
    const placeholder = el.getAttribute('placeholder');
    if (placeholder) {
      const sel = `${el.tagName.toLowerCase()}[placeholder="${cssEscape(placeholder)}"]`;
      if (document.querySelectorAll(sel).length === 1) return sel;
      // Add type
      const sel2 = `input[type="${type}"][placeholder="${cssEscape(placeholder)}"]`;
      if (document.querySelectorAll(sel2).length === 1) return sel2;
    }
  }

  // 6. Unique class combination
  if (el.classList.length > 0) {
    const classes = Array.from(el.classList)
      .filter((c) => !c.match(/^(js-|is-|has-|active|hover|focus)/))
      .slice(0, 3);
    if (classes.length > 0) {
      const classSel = `${el.tagName.toLowerCase()}.${classes.map(cssEscape).join('.')}`;
      if (document.querySelectorAll(classSel).length === 1) return classSel;
    }
  }

  // 7. nth-child path (last resort but reliable)
  return getNthChildPath(el);
}

function getNthChildPath(el: HTMLElement): string {
  const parts: string[] = [];
  let current: HTMLElement | null = el;

  while (current && current !== document.body && parts.length < 4) {
    const parent = current.parentElement;
    if (!parent) break;

    const sameTagSiblings = Array.from(parent.children).filter(
      (c) => c.tagName === current!.tagName
    );
    const tag = current.tagName.toLowerCase();

    if (sameTagSiblings.length === 1) {
      parts.unshift(tag);
    } else {
      const index =
        Array.from(parent.children).indexOf(current) + 1;
      parts.unshift(`${tag}:nth-child(${index})`);
    }

    current = parent;
  }

  return parts.join(' > ');
}

function cssEscape(str: string): string {
  if (typeof CSS !== 'undefined' && CSS.escape) {
    return CSS.escape(str);
  }
  // Fallback
  return str.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
}

// ---------- Element label extraction ----------

function getElementLabel(el: HTMLElement): string {
  // For inputs: placeholder > aria-label > associated label > name
  if (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT'
  ) {
    const placeholder = el.getAttribute('placeholder');
    if (placeholder) return placeholder;

    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    const id = el.id;
    if (id) {
      const label = document.querySelector(`label[for="${cssEscape(id)}"]`);
      if (label?.textContent) return label.textContent.trim();
    }

    const name = el.getAttribute('name');
    if (name) return name;

    const type = el.getAttribute('type') || 'text';
    return `${type} input`;
  }

  // For buttons/links: textContent > aria-label > title
  const text = el.textContent?.trim();
  if (text && text.length > 0 && text.length < 80) return text;

  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;

  const title = el.getAttribute('title');
  if (title) return title;

  // For images/icons inside buttons
  const img = el.querySelector('img');
  if (img?.alt) return img.alt;

  return el.tagName.toLowerCase();
}

// ---------- Format for LLM ----------

function formatInteractiveElements(elements: InteractiveEl[]): string {
  if (elements.length === 0) return '';

  const inputs = elements.filter(
    (e) =>
      e.tag === 'input' || e.tag === 'textarea' || e.tag === 'select'
  );
  const buttons = elements.filter(
    (e) =>
      e.tag === 'button' ||
      e.role === 'button' ||
      e.type === 'submit'
  );
  const links = elements.filter(
    (e) => e.tag === 'a' && !buttons.includes(e)
  );

  const sections: string[] = [];

  if (inputs.length > 0) {
    sections.push('INPUTS:');
    for (const el of inputs) {
      const phNote = el.placeholder ? ` (placeholder: "${el.placeholder}")` : '';
      const typeNote = el.type ? `[${el.type}]` : '';
      sections.push(
        `  - ${el.label}${typeNote}${phNote} → selector: \`${el.selector}\``
      );
    }
  }

  if (buttons.length > 0) {
    sections.push('BUTTONS:');
    for (const el of buttons) {
      sections.push(
        `  - "${el.label}" → selector: \`${el.selector}\``
      );
    }
  }

  if (links.length > 0) {
    sections.push('LINKS:');
    for (const el of links) {
      const hrefNote = el.href ? ` → ${el.href}` : '';
      sections.push(
        `  - "${el.label}"${hrefNote} → selector: \`${el.selector}\``
      );
    }
  }

  return sections.join('\n');
}

// ---------- Fallback extraction ----------

function extractBasicContent(): string {
  const parts: string[] = [];
  parts.push(`# ${document.title}\n`);

  const selectors = [
    'main',
    'article',
    '[role="main"]',
    '#content',
    '.content',
    '#main',
    '.main',
  ];

  let container: Element | null = null;
  for (const sel of selectors) {
    container = document.querySelector(sel);
    if (container) break;
  }
  if (!container) container = document.body;

  // Extract headings
  container.querySelectorAll('h1, h2, h3, h4').forEach((h) => {
    const level = parseInt(h.tagName[1]);
    const prefix = '#'.repeat(level);
    const text = h.textContent?.trim();
    if (text) parts.push(`${prefix} ${text}`);
  });

  // Extract paragraphs
  container.querySelectorAll('p').forEach((p) => {
    const text = p.textContent?.trim();
    if (text && text.length > 20) parts.push(text);
  });

  // Extract list items
  container.querySelectorAll('li').forEach((li) => {
    const text = li.textContent?.trim();
    if (text && text.length > 10) parts.push(`- ${text.substring(0, 200)}`);
  });

  // Extract key links
  const linkTexts: string[] = [];
  container.querySelectorAll('a[href]').forEach((a) => {
    const text = a.textContent?.trim();
    if (text && text.length > 2 && text.length < 100) {
      linkTexts.push(`[${text}](${(a as HTMLAnchorElement).href})`);
    }
  });
  if (linkTexts.length > 0) {
    parts.push('\n**Links:**');
    parts.push(...linkTexts.slice(0, 20));
  }

  return parts.join('\n\n').substring(0, 6000);
}

// ---------- Helper ----------

function getMeta(property: string): string | null {
  const el =
    document.querySelector(`meta[property="${property}"]`) ||
    document.querySelector(`meta[name="${property}"]`);
  return el?.getAttribute('content') || null;
}
