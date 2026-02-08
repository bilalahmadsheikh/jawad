# Jawad — DOM Extraction and Page Context

## Overview

Jawad extracts rich, structured content from any webpage to provide the LLM with accurate context. This is critical for grounded responses and preventing hallucinations.

**File**: `src/content/dom-reader.ts`

## Extraction Pipeline

```
readPage()
    │
    ├── extractProductInfo()      → ProductData (JSON-LD, OG, heuristics)
    ├── extractInteractiveElements() → list of interactive elements + selectors
    ├── buildStructuredSnapshot()  → structured markdown from DOM tree walk
    └── Readability fallback       → article extraction (supplemental)
    │
    ▼
Return {
  title, url, markdown,
  product, interactiveElements
}
```

## Structured DOM Snapshot (`buildStructuredSnapshot`)

The primary extraction method walks the DOM tree and emits structured markdown:

### What It Captures

| Element | Output |
|---------|--------|
| `<h1>` – `<h6>` | `# Heading` – `###### Heading` (with hierarchy) |
| `<img>` | `[Image: alt text]` |
| `<a>` | `[link text](url)` |
| Text nodes | Plain text content |
| `<table>` | Markdown table format |
| `<ul>/<ol>` | Markdown list format |

### Why Not Just Readability?

Mozilla's Readability library works well for **articles** but fails on:
- Product pages (strips structured data)
- Dashboard/app pages (removes interactive elements)
- Search results (loses link structure)
- Pages with primarily image content

The structured snapshot captures **all** page types accurately.

### Content Limit

Output is capped at **8,000 characters** to fit within LLM context windows while providing sufficient detail.

## Product Data Extraction (`extractProductInfo`)

Extracts product information using three strategies in priority order:

### 1. JSON-LD (`<script type="application/ld+json">`)

Parses structured data markup:
```json
{
  "@type": "Product",
  "name": "Nike Air Max 270",
  "offers": { "price": "150.00", "priceCurrency": "USD" },
  "brand": { "name": "Nike" },
  "aggregateRating": { "ratingValue": "4.5" }
}
```

### 2. OpenGraph Meta Tags

Falls back to OG tags:
```html
<meta property="og:title" content="Nike Air Max 270">
<meta property="og:description" content="...">
<meta property="product:price:amount" content="150.00">
```

### 3. DOM Heuristics

Last resort — searches for common CSS patterns:
- Price: elements matching `.price`, `[class*="price"]`, `[itemprop="price"]`
- Product name: `h1`, `[itemprop="name"]`, `.product-title`
- Rating: `[class*="rating"]`, `[class*="stars"]`
- Brand: `[itemprop="brand"]`, `.brand`

## Interactive Elements Extraction (`extractInteractiveElements`)

Identifies all actionable elements on the page:

### Elements Captured

- `<a>` tags with href
- `<button>` elements
- `<input>` fields (text, search, email, password, etc.)
- `<select>` dropdowns
- `<textarea>` fields
- Elements with `role="button"`, `role="link"`, `role="tab"`
- Elements with click handlers (`onclick`, `[class*="btn"]`)

### Selector Generation

For each element, a unique CSS selector is generated:
1. **ID**: `#element-id` (if unique)
2. **Data attributes**: `[data-testid="value"]`
3. **Type + name**: `input[name="search"]`
4. **Class combination**: `.btn.btn-primary`
5. **Fallback**: `tag:nth-of-type(n)`

### Output Format

```
INTERACTIVE ELEMENTS:
[1] BUTTON "Add to Cart" → button.add-to-cart
[2] LINK "Home" → a[href="/"]
[3] INPUT (search) → input#search-box
[4] SELECT "Size" → select[name="size"]
```

## Page Context Caching (`src/lib/page-cache.ts`)

### Purpose

Enables memory-aware browsing by caching page snapshots:
- Remember products viewed across different sites
- Answer "like what I was looking at" questions
- Provide context when navigating back to previous pages

### Storage

- **Location**: `browser.storage.local`
- **Key**: `page_cache`
- **TTL**: 7 days
- **Max entries**: 50 (oldest removed first)

### Cached Data

```typescript
interface CachedPageSnapshot {
  url: string;
  title: string;
  markdown: string;
  product?: ProductInfo;
  interactiveElements?: string;
  timestamp: number;
}
```

### Functions

| Function | Description |
|----------|-------------|
| `cachePageSnapshot(snapshot)` | Store a page snapshot (dedupes by URL) |
| `getCachedSnapshot(url?)` | Retrieve by URL, or most recent if no URL |
| `getRecentSnapshots(limit)` | Get N most recent snapshots |
| `getLastProductContext()` | Get most recent product info |
| `cleanupCache()` | Remove entries older than 7 days |

## Context Injection in Message Handler

`src/background/message-handler.ts` builds page context for the LLM:

```
1. Query active tab
2. Send READ_PAGE to content script
3. Cache the page snapshot
4. Build context string:
   - CURRENT PAGE CONTEXT:
   - Title: {title}
   - URL: {url}
   - Product: {product data if present}
   - Content: {markdown}
   - Interactive Elements: {list}
5. Check for previous product context
6. Inject into conversation messages
```

This context is provided **before** the agent loop starts, so the LLM can answer most questions without calling `read_page`.

