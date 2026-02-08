// ============================================================
// Page Context Cache — preserves page snapshots across navigation
// Stored in browser.storage.local with 7-day TTL
// ============================================================

export interface ProductInfo {
  name: string;
  price?: string;
  currency?: string;
  description?: string;
  brand?: string;
  image?: string;
  rating?: string;
  url?: string;
}

export interface CachedPageSnapshot {
  url: string;
  title: string;
  markdown: string;
  product?: ProductInfo;
  interactiveElements?: string;
  timestamp: number;
}

const CACHE_KEY = 'jawad_page_cache';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_ENTRIES = 50;

/**
 * Save a page snapshot to the cache.
 */
export async function cachePageSnapshot(
  snapshot: Omit<CachedPageSnapshot, 'timestamp'>
): Promise<void> {
  const cache = await getCache();
  cache[snapshot.url] = { ...snapshot, timestamp: Date.now() };

  // Cleanup expired entries
  const now = Date.now();
  for (const url of Object.keys(cache)) {
    if (now - cache[url].timestamp > CACHE_TTL) {
      delete cache[url];
    }
  }

  // Limit total entries
  const sorted = Object.entries(cache).sort(
    (a, b) => b[1].timestamp - a[1].timestamp
  );
  const trimmed = Object.fromEntries(sorted.slice(0, MAX_ENTRIES));

  await browser.storage.local.set({ [CACHE_KEY]: trimmed });
}

/**
 * Get a cached snapshot by URL, or the most recent one.
 */
export async function getCachedSnapshot(
  url?: string
): Promise<CachedPageSnapshot | null> {
  const cache = await getCache();

  if (url) {
    return cache[url] || null;
  }

  // Return most recent snapshot
  const entries = Object.values(cache);
  if (entries.length === 0) return null;

  entries.sort((a, b) => b.timestamp - a.timestamp);
  return entries[0];
}

/**
 * Get recent snapshots for context building.
 */
export async function getRecentSnapshots(
  limit = 5
): Promise<CachedPageSnapshot[]> {
  const cache = await getCache();
  return Object.values(cache)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

/**
 * Get the most recent product info from any cached page.
 */
export async function getLastProductContext(): Promise<ProductInfo | null> {
  const cache = await getCache();
  const withProduct = Object.values(cache)
    .filter((s) => s.product && s.product.name)
    .sort((a, b) => b.timestamp - a.timestamp);

  return withProduct[0]?.product || null;
}

/**
 * Cleanup expired entries (call periodically).
 */
export async function cleanupCache(): Promise<void> {
  const cache = await getCache();
  const now = Date.now();
  let changed = false;

  for (const url of Object.keys(cache)) {
    if (now - cache[url].timestamp > CACHE_TTL) {
      delete cache[url];
      changed = true;
    }
  }

  if (changed) {
    await browser.storage.local.set({ [CACHE_KEY]: cache });
  }
}

async function getCache(): Promise<Record<string, CachedPageSnapshot>> {
  const data = await browser.storage.local.get(CACHE_KEY);
  return (data[CACHE_KEY] as Record<string, CachedPageSnapshot>) || {};
}

