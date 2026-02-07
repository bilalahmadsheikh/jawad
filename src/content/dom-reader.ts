// ============================================================
// DOM Reader - Extracts clean page content using Readability.js
// ============================================================

import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';

interface PageResult {
  title: string;
  url: string;
  markdown: string;
  source: 'readability' | 'fallback';
}

/**
 * Read the current page content using Mozilla's Readability.js.
 * Falls back to basic extraction if Readability fails.
 */
export function readPage(): PageResult {
  try {
    // Clone the document so Readability doesn't modify the actual page
    const docClone = document.cloneNode(true) as Document;
    const article = new Readability(docClone).parse();

    if (article && article.textContent && article.textContent.length > 50) {
      const turndown = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
      });

      // Configure turndown to handle common elements
      turndown.addRule('removeScripts', {
        filter: ['script', 'style', 'noscript'],
        replacement: () => '',
      });

      const markdown = turndown.turndown(article.content);

      return {
        title: article.title || document.title,
        url: window.location.href,
        markdown: markdown.substring(0, 8000), // Limit size for LLM context
        source: 'readability',
      };
    }
  } catch (e) {
    console.warn('[FoxAgent] Readability failed, using fallback:', e);
  }

  // Fallback: basic content extraction
  return {
    title: document.title,
    url: window.location.href,
    markdown: extractBasicContent(),
    source: 'fallback',
  };
}

/**
 * Fallback extraction for pages where Readability fails.
 * Extracts headings, paragraphs, lists, and links.
 */
function extractBasicContent(): string {
  const parts: string[] = [];

  // Get page title
  parts.push(`# ${document.title}\n`);

  // Extract main content elements
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

  if (!container) {
    container = document.body;
  }

  // Extract headings
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach((h) => {
    const level = parseInt(h.tagName[1]);
    const prefix = '#'.repeat(level);
    parts.push(`${prefix} ${h.textContent?.trim()}`);
  });

  // Extract paragraphs
  const paragraphs = container.querySelectorAll('p');
  paragraphs.forEach((p) => {
    const text = p.textContent?.trim();
    if (text && text.length > 20) {
      parts.push(text);
    }
  });

  // Extract list items
  const listItems = container.querySelectorAll('li');
  listItems.forEach((li) => {
    const text = li.textContent?.trim();
    if (text && text.length > 10) {
      parts.push(`- ${text.substring(0, 200)}`);
    }
  });

  // Extract links (navigation/key actions)
  const links = container.querySelectorAll('a[href]');
  const linkTexts: string[] = [];
  links.forEach((a) => {
    const text = a.textContent?.trim();
    if (text && text.length > 2 && text.length < 100) {
      linkTexts.push(`[${text}](${(a as HTMLAnchorElement).href})`);
    }
  });
  if (linkTexts.length > 0) {
    parts.push('\n**Links:**');
    parts.push(...linkTexts.slice(0, 20));
  }

  return parts.join('\n\n').substring(0, 8000);
}

