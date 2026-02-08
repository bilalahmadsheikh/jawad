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

  // PRIMARY: structured DOM tree-walk — captures headings, images (alt text),
  // links, text on ALL page types (shopping, dashboards, search, etc.)
  const structured = buildStructuredSnapshot();

  // SUPPLEMENT: Readability for article-like pages (blogs, docs, news)
  let readabilityMd = '';
  try {
    const docClone = document.cloneNode(true) as Document;
    const article = new Readability(docClone).parse();
    if (article?.textContent && article.textContent.length > 300) {
      const td = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
      });
      td.addRule('removeScripts', {
        filter: ['script', 'style', 'noscript'],
        replacement: () => '',
      });
      readabilityMd = td.turndown(article.content).substring(0, 6000);
    }
  } catch {
    // Readability not applicable for this page type
  }

  // Use Readability only if it captured significantly more than the
  // structured snapshot (i.e. it's a real article page).
  const useReadability =
    readabilityMd.length > structured.length * 2 && readabilityMd.length > 500;

  return {
    title: document.title,
    url: window.location.href,
    markdown: (useReadability ? readabilityMd : structured).substring(0, 8000),
    product,
    interactiveElements,
    source: useReadability ? 'readability' : 'fallback',
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

// ---------- Structured DOM snapshot ----------
// Walks the visible DOM tree and produces a rich markdown snapshot.
// Captures headings, images (alt text), links (text + URL), and text
// that Readability strips on non-article pages (Amazon, Google, dashboards).

function buildStructuredSnapshot(): string {
  const lines: string[] = [];
  const seen = new Set<string>();
  let budget = 6500; // character budget

  emit(`# ${document.title}`);

  const desc = getMeta('description') || getMeta('og:description');
  if (desc && desc.length > 10) emit(desc.substring(0, 300));

  const root =
    document.querySelector(
      'main, [role="main"], #content, .content, #main'
    ) || document.body;

  walkTree(root, 0);

  return lines.join('\n');

  // ---- scoped helpers ----

  function emit(text: string): boolean {
    if (budget <= 0) return false;
    lines.push(text);
    budget -= text.length + 1;
    return true;
  }

  function unique(text: string, ns: string): boolean {
    const key = ns + text.toLowerCase().substring(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }

  function ws(s: string | null | undefined): string {
    return (s || '').replace(/\s+/g, ' ').trim();
  }

  function walkTree(parent: Element, depth: number): void {
    if (budget <= 0 || depth > 12) return;

    for (const child of parent.children) {
      if (budget <= 0) return;

      const el = child as HTMLElement;
      const tag = child.tagName?.toLowerCase();
      if (!tag) continue;

      // Skip non-content elements
      if (
        [
          'script', 'style', 'noscript', 'svg', 'path',
          'link', 'meta', 'template', 'iframe', 'canvas',
        ].includes(tag)
      ) continue;

      // Skip hidden
      if (el.hidden || el.getAttribute('aria-hidden') === 'true') continue;

      // Skip primary navigation and footer (noise on most pages)
      if (tag === 'nav' || tag === 'footer') continue;

      // Visibility check (expensive — only for shallow depth)
      if (depth < 5) {
        try {
          if (!isVisible(el)) continue;
        } catch {
          continue;
        }
      }

      // ── Headings ──
      if (/^h[1-6]$/.test(tag)) {
        const t = ws(child.textContent);
        if (t && t.length >= 2 && unique(t, 'h'))
          emit(`\n${'#'.repeat(parseInt(tag[1]))} ${t}`);
        continue;
      }

      // ── Images with alt text (critical for product pages) ──
      if (tag === 'img') {
        const alt = el.getAttribute('alt')?.trim();
        if (alt && alt.length > 2 && unique(alt, 'i'))
          emit(`[Image: ${alt.substring(0, 120)}]`);
        continue;
      }

      // ── Links — extract text + inner img alt, don't recurse ──
      if (tag === 'a') {
        const href = (el as HTMLAnchorElement).href;
        if (!href || href === '#') {
          walkTree(child, depth + 1);
          continue;
        }
        const imgAlt = el.querySelector('img')?.getAttribute('alt')?.trim();
        const t = ws(child.textContent);

        if (imgAlt && imgAlt.length > 2 && unique(imgAlt, 'a'))
          emit(`- [${imgAlt.substring(0, 80)}](${href})`);
        else if (t && t.length > 1 && t.length < 100 && unique(t, 'a'))
          emit(`- [${t}](${href})`);
        continue;
      }

      // ── Text-bearing elements (capture full text, no recurse) ──
      if (
        ['p', 'blockquote', 'figcaption', 'td', 'th', 'dd', 'dt', 'summary'].includes(tag)
      ) {
        const t = ws(child.textContent);
        if (t && t.length > 3 && t.length < 300 && unique(t, 't'))
          emit(t);
        continue;
      }

      // ── Leaf elements (no child elements) ──
      if (child.children.length === 0) {
        const t = ws(child.textContent);
        if (t && t.length > 2 && t.length < 200 && unique(t, 't'))
          emit(t);
        continue;
      }

      // ── Container — recurse ──
      walkTree(child, depth + 1);
    }
  }
}

// ---------- Helper ----------

function getMeta(property: string): string | null {
  const el =
    document.querySelector(`meta[property="${property}"]`) ||
    document.querySelector(`meta[name="${property}"]`);
  return el?.getAttribute('content') || null;
}
