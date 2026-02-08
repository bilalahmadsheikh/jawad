// ============================================================
// Ghost Mode — Main Controller
// Orchestrates element detection, overlay rendering, and
// user interactions. Manages lifecycle and performance.
// ============================================================

import { detectElements, getElementCounts, classifyPageType } from './element-detector';
import type { DetectedElement } from './element-detector';
import { injectGhostStyles, removeGhostStyles } from './ghost-styles';
import {
  renderOverlays,
  updateOverlayPositions,
  removeOverlays,
  toggleLabels,
} from './overlay-renderer';

let isActive = false;
let detectedElements: DetectedElement[] = [];
let scrollDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let mutationObserver: MutationObserver | null = null;
let intersectionObserver: IntersectionObserver | null = null;

/**
 * Toggle Ghost Mode on/off.
 */
export function toggleGhostMode(): boolean {
  if (isActive) {
    deactivateGhostMode();
    return false;
  } else {
    activateGhostMode();
    return true;
  }
}

/**
 * Activate Ghost Mode — scan, render, and start watching.
 */
export function activateGhostMode(): void {
  if (isActive) return;
  isActive = true;

  console.log('[Jawad Ghost Mode] Activating...');

  // Inject styles
  injectGhostStyles();

  // Detect elements
  detectedElements = detectElements();
  console.log(`[Jawad Ghost Mode] Detected ${detectedElements.length} interactive elements`);

  // Render overlays
  renderOverlays(detectedElements);

  // Set up watchers
  setupScrollWatcher();
  setupResizeWatcher();
  setupMutationWatcher();
  setupActionHandlers();
  setupKeyboardShortcuts();

  // Notify sidebar
  try {
    browser.runtime.sendMessage({
      type: 'GHOST_MODE_STATE',
      payload: {
        active: true,
        elementCount: detectedElements.length,
        pageType: classifyPageType(),
        counts: getElementCounts(detectedElements),
      },
    });
  } catch {
    // Sidebar may not be listening
  }
}

/**
 * Deactivate Ghost Mode — clean up everything.
 */
export function deactivateGhostMode(): void {
  if (!isActive) return;
  isActive = false;

  console.log('[Jawad Ghost Mode] Deactivating...');

  // Remove overlays with exit animation
  removeOverlays();

  // Clean up watchers
  if (scrollDebounceTimer) clearTimeout(scrollDebounceTimer);
  if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer);
  if (mutationObserver) { mutationObserver.disconnect(); mutationObserver = null; }
  if (intersectionObserver) { intersectionObserver.disconnect(); intersectionObserver = null; }

  // Remove keyboard shortcuts
  window.removeEventListener('keydown', keydownHandler);

  // Remove action handlers
  window.removeEventListener('jawad-ghost-toggle', toggleEventHandler as EventListener);
  window.removeEventListener('jawad-ghost-action', actionEventHandler as EventListener);

  // Remove styles after animation
  setTimeout(() => {
    removeGhostStyles();
  }, 300);

  detectedElements = [];

  // Notify sidebar
  try {
    browser.runtime.sendMessage({
      type: 'GHOST_MODE_STATE',
      payload: { active: false },
    });
  } catch {
    // Sidebar may not be listening
  }
}

/**
 * Get current state.
 */
export function getGhostModeState(): {
  active: boolean;
  elementCount: number;
  elements: DetectedElement[];
} {
  return {
    active: isActive,
    elementCount: detectedElements.length,
    elements: detectedElements,
  };
}

/**
 * Refresh overlays (re-scan and re-render).
 */
export function refreshGhostMode(): void {
  if (!isActive) return;

  detectedElements = detectElements();
  renderOverlays(detectedElements);

  // Notify sidebar of updated counts
  try {
    browser.runtime.sendMessage({
      type: 'GHOST_MODE_STATE',
      payload: {
        active: true,
        elementCount: detectedElements.length,
        pageType: classifyPageType(),
        counts: getElementCounts(detectedElements),
      },
    });
  } catch {
    // Sidebar may not be listening
  }
}

// ── Scroll handler ──

function setupScrollWatcher(): void {
  const handler = () => {
    if (scrollDebounceTimer) clearTimeout(scrollDebounceTimer);
    scrollDebounceTimer = setTimeout(() => {
      if (isActive) {
        updateOverlayPositions(detectedElements);
      }
    }, 50); // 50ms debounce for smooth updates
  };

  window.addEventListener('scroll', handler, { passive: true });
  document.addEventListener('scroll', handler, { passive: true, capture: true });
}

// ── Resize handler ──

function setupResizeWatcher(): void {
  const handler = () => {
    if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer);
    resizeDebounceTimer = setTimeout(() => {
      if (isActive) {
        // Full re-render on resize since layouts change
        refreshGhostMode();
      }
    }, 200);
  };

  window.addEventListener('resize', handler, { passive: true });
}

// ── DOM mutation watcher ──

function setupMutationWatcher(): void {
  mutationObserver = new MutationObserver((mutations) => {
    // Only refresh if significant DOM changes occurred
    let shouldRefresh = false;
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            const tag = node.tagName?.toLowerCase();
            if (
              tag === 'button' || tag === 'input' || tag === 'a' ||
              tag === 'form' || tag === 'select' || tag === 'textarea' ||
              node.querySelector('button, input, a, form, select, textarea')
            ) {
              shouldRefresh = true;
              break;
            }
          }
        }
      }
      if (shouldRefresh) break;
    }

    if (shouldRefresh) {
      // Debounce the refresh
      if (scrollDebounceTimer) clearTimeout(scrollDebounceTimer);
      scrollDebounceTimer = setTimeout(() => {
        if (isActive) refreshGhostMode();
      }, 500);
    }
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// ── Action handlers ──

const toggleEventHandler = () => {
  toggleGhostMode();
};

const actionEventHandler = (e: Event) => {
  const detail = (e as CustomEvent).detail as { action: string };
  handleAction(detail.action);
};

function setupActionHandlers(): void {
  window.addEventListener('jawad-ghost-toggle', toggleEventHandler as EventListener);
  window.addEventListener('jawad-ghost-action', actionEventHandler as EventListener);
}

function handleAction(action: string): void {
  switch (action) {
    case 'fill-all':
      fillAllFields();
      break;
    case 'click-cta':
      clickPrimaryCTA();
      break;
    case 'export':
      exportPageStructure();
      break;
  }
}

/**
 * Auto-fill all detected input fields with placeholder/sample data.
 */
function fillAllFields(): void {
  const inputs = detectedElements.filter(
    (el) => el.type === 'input' || el.type === 'contenteditable'
  );

  let filled = 0;
  for (const input of inputs) {
    const el = input.element;
    const inputType = el.getAttribute('type') || 'text';
    const purpose = input.purpose;

    let value = '';
    if (purpose.includes('email')) value = 'user@example.com';
    else if (purpose.includes('password')) value = '••••••••';
    else if (purpose.includes('name')) value = 'John Doe';
    else if (purpose.includes('phone') || purpose.includes('tel')) value = '+1 (555) 123-4567';
    else if (purpose.includes('url') || purpose.includes('website')) value = 'https://example.com';
    else if (purpose.includes('address')) value = '123 Main Street';
    else if (purpose.includes('search')) value = '';
    else if (inputType === 'number') value = '42';
    else if (inputType === 'date') value = '2024-01-15';
    else value = 'Sample text';

    if (value) {
      try {
        // React-compatible value setting
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, 'value'
        )?.set;
        const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype, 'value'
        )?.set;

        if (el.tagName === 'TEXTAREA' && nativeTextAreaValueSetter) {
          nativeTextAreaValueSetter.call(el, value);
        } else if (nativeInputValueSetter) {
          nativeInputValueSetter.call(el, value);
        } else {
          (el as HTMLInputElement).value = value;
        }

        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));

        // Brief highlight animation
        el.style.transition = 'box-shadow 0.3s, border-color 0.3s';
        el.style.boxShadow = '0 0 15px rgba(34, 197, 94, 0.4)';
        el.style.borderColor = '#22c55e';
        setTimeout(() => {
          el.style.boxShadow = '';
          el.style.borderColor = '';
        }, 1000);

        filled++;
      } catch {
        // Skip if we can't set the value
      }
    }
  }

  console.log(`[Jawad Ghost Mode] Filled ${filled} fields`);

  // Notify sidebar
  try {
    browser.runtime.sendMessage({
      type: 'GHOST_MODE_ACTION_RESULT',
      payload: { action: 'fill-all', result: `Filled ${filled} input fields` },
    });
  } catch {
    // OK
  }
}

/**
 * Click the primary CTA button.
 */
function clickPrimaryCTA(): void {
  const primaryButtons = detectedElements.filter(
    (el) => el.type === 'button' && el.importance === 'primary' && !el.isDangerous
  );

  if (primaryButtons.length === 0) {
    console.log('[Jawad Ghost Mode] No primary CTA found');
    try {
      browser.runtime.sendMessage({
        type: 'GHOST_MODE_ACTION_RESULT',
        payload: { action: 'click-cta', result: 'No primary CTA button found on this page' },
      });
    } catch {
      // OK
    }
    return;
  }

  const target = primaryButtons[0];
  console.log(`[Jawad Ghost Mode] Clicking CTA: "${target.label}"`);

  // Highlight before clicking
  target.element.style.transition = 'box-shadow 0.3s, transform 0.3s';
  target.element.style.boxShadow = '0 0 20px rgba(34, 197, 94, 0.5)';
  target.element.style.transform = 'scale(1.02)';

  setTimeout(() => {
    target.element.click();
    target.element.style.boxShadow = '';
    target.element.style.transform = '';
  }, 500);

  try {
    browser.runtime.sendMessage({
      type: 'GHOST_MODE_ACTION_RESULT',
      payload: { action: 'click-cta', result: `Clicked "${target.label}"` },
    });
  } catch {
    // OK
  }
}

/**
 * Export the page structure as JSON.
 */
function exportPageStructure(): void {
  const pageType = classifyPageType();
  const counts = getElementCounts(detectedElements);

  const structure = {
    url: window.location.href,
    title: document.title,
    pageType: pageType.type,
    pageTypeConfidence: pageType.confidence,
    timestamp: new Date().toISOString(),
    elementCounts: counts,
    elements: detectedElements.map((el) => ({
      id: el.id,
      type: el.type,
      purpose: el.purpose,
      label: el.label,
      confidence: el.confidence,
      importance: el.importance,
      isDangerous: el.isDangerous,
      inputType: el.inputType,
      placeholder: el.placeholder,
      href: el.href,
      formFields: el.formFields,
      position: {
        top: Math.round(el.rect.top),
        left: Math.round(el.rect.left),
        width: Math.round(el.rect.width),
        height: Math.round(el.rect.height),
      },
    })),
  };

  // Copy to clipboard
  const json = JSON.stringify(structure, null, 2);
  navigator.clipboard.writeText(json).then(() => {
    console.log('[Jawad Ghost Mode] Page structure exported to clipboard');
    try {
      browser.runtime.sendMessage({
        type: 'GHOST_MODE_ACTION_RESULT',
        payload: { action: 'export', result: `Exported ${counts.total} elements to clipboard as JSON` },
      });
    } catch {
      // OK
    }
  }).catch(() => {
    // Fallback: download as file
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jawad-ghost-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    try {
      browser.runtime.sendMessage({
        type: 'GHOST_MODE_ACTION_RESULT',
        payload: { action: 'export', result: `Downloaded page structure as JSON file` },
      });
    } catch {
      // OK
    }
  });
}

// ── Keyboard shortcuts ──

function keydownHandler(e: KeyboardEvent): void {
  // Ctrl/Cmd + Shift + G: Toggle Ghost Mode
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'G') {
    e.preventDefault();
    toggleGhostMode();
    return;
  }

  // Ctrl/Cmd + Shift + H: Toggle labels
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'H') {
    e.preventDefault();
    toggleLabels();
    return;
  }

  // Escape: Exit Ghost Mode
  if (e.key === 'Escape' && isActive) {
    e.preventDefault();
    deactivateGhostMode();
    return;
  }
}

function setupKeyboardShortcuts(): void {
  window.addEventListener('keydown', keydownHandler);
}

// ── Global keyboard shortcut (always active, even when Ghost Mode is off) ──

function globalKeydownHandler(e: KeyboardEvent): void {
  // Ctrl/Cmd + Shift + G: Toggle Ghost Mode
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'G') {
    e.preventDefault();
    toggleGhostMode();
  }
}

// Register global shortcut
window.addEventListener('keydown', globalKeydownHandler);

