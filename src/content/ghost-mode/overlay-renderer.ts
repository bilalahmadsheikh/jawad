// ============================================================
// Ghost Mode — Overlay Renderer
// Renders visual overlays, floating labels, and the stats panel.
// Pure DOM manipulation — no React needed in content script.
// ============================================================

import type { DetectedElement, ElementType } from './element-detector';
import { classifyPageType, getElementCounts } from './element-detector';

const OVERLAY_CONTAINER_ID = 'jawad-ghost-container';
const STATS_PANEL_ID = 'jawad-ghost-stats-panel';
const DETAIL_POPUP_ID = 'jawad-ghost-detail-popup';

let overlayContainer: HTMLDivElement | null = null;
let currentDetailPopup: HTMLDivElement | null = null;
let currentMode: 'detailed' | 'simple' = 'detailed';
let labelsVisible = true;

// Color map for element types
function getOverlayClass(el: DetectedElement): string {
  if (el.isDangerous) return 'jawad-ghost-danger';
  switch (el.type) {
    case 'button': return 'jawad-ghost-button';
    case 'input':
    case 'contenteditable': return 'jawad-ghost-input';
    case 'link': return 'jawad-ghost-link';
    case 'form': return 'jawad-ghost-form';
    case 'select': return 'jawad-ghost-select';
    default: return 'jawad-ghost-button';
  }
}

function getTypeIcon(type: ElementType, isDangerous: boolean): string {
  if (isDangerous) return '🔴';
  switch (type) {
    case 'button': return '🟢';
    case 'input':
    case 'contenteditable': return '🔵';
    case 'link': return '🟡';
    case 'form': return '🟣';
    case 'select': return '🔵';
    default: return '⚪';
  }
}

function getTypeLabel(type: ElementType): string {
  switch (type) {
    case 'button': return 'BTN';
    case 'input': return 'INPUT';
    case 'link': return 'LINK';
    case 'form': return 'FORM';
    case 'select': return 'SELECT';
    case 'contenteditable': return 'EDIT';
    default: return 'EL';
  }
}

/**
 * Render overlays for all detected elements.
 */
export function renderOverlays(elements: DetectedElement[]): void {
  removeOverlays();

  overlayContainer = document.createElement('div');
  overlayContainer.id = OVERLAY_CONTAINER_ID;
  overlayContainer.style.cssText = 'position: fixed; inset: 0; pointer-events: none; z-index: 2147483640;';

  if (currentMode === 'simple') {
    overlayContainer.classList.add('jawad-ghost-simple');
  }

  // Render each element overlay
  for (const el of elements) {
    const overlay = createOverlay(el);
    if (overlay) overlayContainer.appendChild(overlay);
  }

  document.body.appendChild(overlayContainer);

  // Render stats panel
  renderStatsPanel(elements);
}

function createOverlay(el: DetectedElement): HTMLDivElement | null {
  const rect = el.element.getBoundingClientRect();

  // Skip elements not in viewport
  if (
    rect.bottom < 0 ||
    rect.top > window.innerHeight ||
    rect.right < 0 ||
    rect.left > window.innerWidth
  ) {
    return null;
  }

  const overlay = document.createElement('div');
  overlay.className = `jawad-ghost-overlay ${getOverlayClass(el)}`;
  overlay.dataset.ghostId = el.id;
  overlay.style.cssText = `
    top: ${rect.top - 2}px;
    left: ${rect.left - 2}px;
    width: ${rect.width + 4}px;
    height: ${rect.height + 4}px;
    animation-delay: ${Math.random() * 0.3}s;
  `;

  // Background tint
  const bg = document.createElement('div');
  bg.className = 'jawad-ghost-overlay-bg';
  overlay.appendChild(bg);

  // Floating label
  if (labelsVisible) {
    const label = document.createElement('div');
    label.className = 'jawad-ghost-label';

    const icon = document.createElement('span');
    icon.className = 'jawad-ghost-label-icon';
    icon.textContent = getTypeIcon(el.type, el.isDangerous);
    label.appendChild(icon);

    const typeSpan = document.createElement('span');
    typeSpan.textContent = getTypeLabel(el.type);
    typeSpan.style.cssText = 'opacity: 0.7; font-size: 8px; margin-right: 2px;';
    label.appendChild(typeSpan);

    const text = document.createElement('span');
    text.textContent = el.label.substring(0, 30) + (el.label.length > 30 ? '…' : '');
    label.appendChild(text);

    // Confidence badge
    if (el.confidence >= 90) {
      const conf = document.createElement('span');
      conf.textContent = `${el.confidence}%`;
      conf.style.cssText = 'font-size: 7px; opacity: 0.6; margin-left: 3px;';
      label.appendChild(conf);
    }

    // Make label clickable for detail popup
    label.style.pointerEvents = 'auto';
    label.style.cursor = 'pointer';
    label.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      showDetailPopup(el, rect);
    });

    overlay.appendChild(label);
  }

  // Hover effect — make the overlay interactive
  overlay.style.pointerEvents = 'auto';
  overlay.addEventListener('mouseenter', () => {
    overlay.style.borderWidth = '3px';
    overlay.style.zIndex = '2147483645';
  });
  overlay.addEventListener('mouseleave', () => {
    overlay.style.borderWidth = '2px';
    overlay.style.zIndex = '2147483640';
  });
  overlay.addEventListener('click', (e) => {
    e.stopPropagation();
    showDetailPopup(el, rect);
  });

  return overlay;
}

/**
 * Show a detail popup for a specific element.
 */
function showDetailPopup(el: DetectedElement, rect: DOMRect): void {
  removeDetailPopup();

  const popup = document.createElement('div');
  popup.id = DETAIL_POPUP_ID;
  popup.className = 'jawad-ghost-detail';

  // Position: prefer right of element, fallback to left
  let left = rect.right + 12;
  let top = rect.top;
  if (left + 230 > window.innerWidth) {
    left = rect.left - 232;
  }
  if (top + 200 > window.innerHeight) {
    top = window.innerHeight - 210;
  }
  if (top < 10) top = 10;

  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;

  const rows: [string, string][] = [
    ['Type', `${getTypeIcon(el.type, el.isDangerous)} ${el.type.toUpperCase()}`],
    ['Label', el.label],
    ['Purpose', el.purpose],
    ['Importance', el.importance],
    ['Confidence', `${el.confidence}%`],
  ];

  if (el.inputType) rows.push(['Input Type', el.inputType]);
  if (el.placeholder) rows.push(['Placeholder', el.placeholder]);
  if (el.href) rows.push(['URL', el.href.substring(0, 40) + (el.href.length > 40 ? '…' : '')]);
  if (el.formFields !== undefined) rows.push(['Fields', `${el.formFields}`]);
  if (el.isDangerous) rows.push(['⚠️ Warning', 'Potentially dangerous action']);

  for (const [key, val] of rows) {
    const row = document.createElement('div');
    row.className = 'jawad-ghost-detail-row';

    const keyEl = document.createElement('span');
    keyEl.className = 'jawad-ghost-detail-key';
    keyEl.textContent = key;
    row.appendChild(keyEl);

    const valEl = document.createElement('span');
    valEl.className = 'jawad-ghost-detail-val';
    valEl.textContent = val;
    row.appendChild(valEl);

    popup.appendChild(row);
  }

  // Close on click outside
  const closeHandler = (e: MouseEvent) => {
    if (!popup.contains(e.target as Node)) {
      removeDetailPopup();
      document.removeEventListener('click', closeHandler, true);
    }
  };
  setTimeout(() => document.addEventListener('click', closeHandler, true), 100);

  document.body.appendChild(popup);
  currentDetailPopup = popup;
}

function removeDetailPopup(): void {
  if (currentDetailPopup) {
    currentDetailPopup.remove();
    currentDetailPopup = null;
  }
  const existing = document.getElementById(DETAIL_POPUP_ID);
  if (existing) existing.remove();
}

/**
 * Render the floating stats panel.
 */
function renderStatsPanel(elements: DetectedElement[]): void {
  removeStatsPanel();

  const counts = getElementCounts(elements);
  const pageInfo = classifyPageType();

  const panel = document.createElement('div');
  panel.id = STATS_PANEL_ID;
  panel.className = 'jawad-ghost-stats';

  panel.innerHTML = `
    <div class="jawad-ghost-stats-inner">
      <!-- Header -->
      <div class="jawad-ghost-stats-header">
        <div class="jawad-ghost-stats-logo">🤖</div>
        <div>
          <div class="jawad-ghost-stats-title">AI Vision</div>
          <div class="jawad-ghost-stats-subtitle">Ghost Mode Active</div>
        </div>
        <button class="jawad-ghost-stats-close" id="jawad-ghost-close" title="Close Ghost Mode (Esc)">✕</button>
      </div>

      <!-- Element counts -->
      <div class="jawad-ghost-counts">
        <div class="jawad-ghost-count-item">
          <span class="jawad-ghost-count-icon">🟢</span>
          <span class="jawad-ghost-count-num" style="color: #22c55e;">${counts.buttons}</span>
          <span class="jawad-ghost-count-label">Buttons</span>
        </div>
        <div class="jawad-ghost-count-item">
          <span class="jawad-ghost-count-icon">🔵</span>
          <span class="jawad-ghost-count-num" style="color: #3b82f6;">${counts.inputs}</span>
          <span class="jawad-ghost-count-label">Inputs</span>
        </div>
        <div class="jawad-ghost-count-item">
          <span class="jawad-ghost-count-icon">🟡</span>
          <span class="jawad-ghost-count-num" style="color: #eab308;">${counts.links}</span>
          <span class="jawad-ghost-count-label">Links</span>
        </div>
        <div class="jawad-ghost-count-item">
          <span class="jawad-ghost-count-icon">🟣</span>
          <span class="jawad-ghost-count-num" style="color: #a855f7;">${counts.forms}</span>
          <span class="jawad-ghost-count-label">Forms</span>
        </div>
        <div class="jawad-ghost-count-item">
          <span class="jawad-ghost-count-icon">🔵</span>
          <span class="jawad-ghost-count-num" style="color: #06b6d4;">${counts.selects}</span>
          <span class="jawad-ghost-count-label">Selects</span>
        </div>
        <div class="jawad-ghost-count-item">
          <span class="jawad-ghost-count-icon">📊</span>
          <span class="jawad-ghost-count-num" style="color: #e8792b;">${counts.total}</span>
          <span class="jawad-ghost-count-label">Total</span>
        </div>
      </div>

      <!-- Page type -->
      <div class="jawad-ghost-page-type">
        <span class="jawad-ghost-page-badge">📄 ${pageInfo.type}</span>
        <span class="jawad-ghost-confidence">
          ${pageInfo.confidence}%
          <span class="jawad-ghost-confidence-bar">
            <span class="jawad-ghost-confidence-fill" style="width: ${pageInfo.confidence}%"></span>
          </span>
        </span>
      </div>

      <!-- Quick actions -->
      <div class="jawad-ghost-actions">
        <button class="jawad-ghost-action-btn" id="jawad-ghost-fill" title="Auto-fill all input fields">
          ✏️ Fill All
        </button>
        <button class="jawad-ghost-action-btn" id="jawad-ghost-click-cta" title="Click the primary CTA button">
          🎯 Click CTA
        </button>
        <button class="jawad-ghost-action-btn" id="jawad-ghost-export" title="Export page structure as JSON">
          📋 Export
        </button>
      </div>

      <!-- Mode toggle -->
      <div class="jawad-ghost-mode-toggle">
        <button class="jawad-ghost-toggle-btn ${currentMode === 'simple' ? 'active' : ''}" id="jawad-ghost-mode-simple">
          Simple
        </button>
        <button class="jawad-ghost-toggle-btn ${currentMode === 'detailed' ? 'active' : ''}" id="jawad-ghost-mode-detailed">
          Detailed
        </button>
        <span class="jawad-ghost-kbd">⌘⇧G</span>
      </div>

      <!-- Footer -->
      <div class="jawad-ghost-footer">
        <span class="jawad-ghost-footer-text">Jawad AI Vision · Ghost Mode</span>
      </div>
    </div>
  `;

  document.body.appendChild(panel);

  // Bind event handlers
  const closeBtn = document.getElementById('jawad-ghost-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      // Dispatch a custom event that ghost-mode.ts listens for
      window.dispatchEvent(new CustomEvent('jawad-ghost-toggle'));
    });
  }

  const fillBtn = document.getElementById('jawad-ghost-fill');
  if (fillBtn) {
    fillBtn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('jawad-ghost-action', { detail: { action: 'fill-all' } }));
    });
  }

  const ctaBtn = document.getElementById('jawad-ghost-click-cta');
  if (ctaBtn) {
    ctaBtn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('jawad-ghost-action', { detail: { action: 'click-cta' } }));
    });
  }

  const exportBtn = document.getElementById('jawad-ghost-export');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('jawad-ghost-action', { detail: { action: 'export' } }));
    });
  }

  const simpleBtn = document.getElementById('jawad-ghost-mode-simple');
  const detailedBtn = document.getElementById('jawad-ghost-mode-detailed');

  if (simpleBtn) {
    simpleBtn.addEventListener('click', () => {
      currentMode = 'simple';
      overlayContainer?.classList.add('jawad-ghost-simple');
      simpleBtn.classList.add('active');
      detailedBtn?.classList.remove('active');
    });
  }

  if (detailedBtn) {
    detailedBtn.addEventListener('click', () => {
      currentMode = 'detailed';
      overlayContainer?.classList.remove('jawad-ghost-simple');
      detailedBtn.classList.add('active');
      simpleBtn?.classList.remove('active');
    });
  }
}

/**
 * Update overlay positions (on scroll/resize).
 */
export function updateOverlayPositions(elements: DetectedElement[]): void {
  if (!overlayContainer) return;

  const overlays = overlayContainer.querySelectorAll('.jawad-ghost-overlay');
  const elementMap = new Map<string, DetectedElement>();
  for (const el of elements) {
    elementMap.set(el.id, el);
  }

  for (const overlay of overlays) {
    const id = (overlay as HTMLElement).dataset.ghostId;
    if (!id) continue;

    const el = elementMap.get(id);
    if (!el) continue;

    const rect = el.element.getBoundingClientRect();
    el.rect = rect; // Update cached rect

    // Hide if off-screen
    if (
      rect.bottom < 0 ||
      rect.top > window.innerHeight ||
      rect.right < 0 ||
      rect.left > window.innerWidth
    ) {
      (overlay as HTMLElement).style.display = 'none';
      continue;
    }

    (overlay as HTMLElement).style.display = '';
    (overlay as HTMLElement).style.top = `${rect.top - 2}px`;
    (overlay as HTMLElement).style.left = `${rect.left - 2}px`;
    (overlay as HTMLElement).style.width = `${rect.width + 4}px`;
    (overlay as HTMLElement).style.height = `${rect.height + 4}px`;
  }
}

/**
 * Toggle label visibility.
 */
export function toggleLabels(): void {
  labelsVisible = !labelsVisible;
  if (overlayContainer) {
    const labels = overlayContainer.querySelectorAll('.jawad-ghost-label');
    for (const label of labels) {
      (label as HTMLElement).style.display = labelsVisible ? '' : 'none';
    }
  }
}

/**
 * Remove all overlays.
 */
export function removeOverlays(): void {
  if (overlayContainer) {
    overlayContainer.classList.add('jawad-ghost-exit');
    setTimeout(() => {
      overlayContainer?.remove();
      overlayContainer = null;
    }, 250);
  } else {
    const existing = document.getElementById(OVERLAY_CONTAINER_ID);
    if (existing) existing.remove();
  }
  removeStatsPanel();
  removeDetailPopup();
}

function removeStatsPanel(): void {
  const existing = document.getElementById(STATS_PANEL_ID);
  if (existing) existing.remove();
}

/**
 * Get the current display mode.
 */
export function getMode(): 'detailed' | 'simple' {
  return currentMode;
}

/**
 * Set the display mode.
 */
export function setMode(mode: 'detailed' | 'simple'): void {
  currentMode = mode;
}

