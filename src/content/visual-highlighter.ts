// ============================================================
// Visual Highlighter - Shows the user what FoxAgent is targeting
// ============================================================

const HIGHLIGHT_CLASS = 'foxagent-highlight-overlay';
const STYLE_ID = 'foxagent-highlight-styles';

/**
 * Highlight an element with a pulsing orange border so the user
 * can see what FoxAgent is about to interact with.
 */
export function highlightElement(selector: string): void {
  // Inject styles if not already present
  injectStyles();

  // Remove any existing highlights
  removeHighlights();

  const el = document.querySelector(selector);
  if (!el) return;

  // Scroll element into view
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Create overlay
  const rect = el.getBoundingClientRect();
  const overlay = document.createElement('div');
  overlay.className = HIGHLIGHT_CLASS;
  overlay.style.cssText = `
    position: fixed;
    top: ${rect.top - 4}px;
    left: ${rect.left - 4}px;
    width: ${rect.width + 8}px;
    height: ${rect.height + 8}px;
    pointer-events: none;
    z-index: 2147483647;
    border: 3px solid #f97316;
    border-radius: 6px;
    box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.3), 0 0 20px rgba(249, 115, 22, 0.4);
    animation: foxagent-pulse 1s ease-in-out infinite;
  `;

  // Add label
  const label = document.createElement('div');
  label.style.cssText = `
    position: absolute;
    top: -28px;
    left: 0;
    background: #f97316;
    color: white;
    font-size: 11px;
    font-family: system-ui, sans-serif;
    padding: 2px 8px;
    border-radius: 4px;
    white-space: nowrap;
    font-weight: 600;
  `;
  label.textContent = 'FoxAgent Target';
  overlay.appendChild(label);

  document.body.appendChild(overlay);

  // Auto-remove after 2.5 seconds
  setTimeout(() => {
    removeHighlights();
  }, 2500);
}

/**
 * Remove all FoxAgent highlight overlays.
 */
function removeHighlights(): void {
  const overlays = document.querySelectorAll(`.${HIGHLIGHT_CLASS}`);
  overlays.forEach((el) => el.remove());
}

/**
 * Inject CSS animation styles for the highlighter.
 */
function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes foxagent-pulse {
      0%, 100% {
        box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.3), 0 0 20px rgba(249, 115, 22, 0.4);
        border-color: #f97316;
      }
      50% {
        box-shadow: 0 0 0 8px rgba(249, 115, 22, 0.15), 0 0 30px rgba(249, 115, 22, 0.6);
        border-color: #ea580c;
      }
    }
  `;
  document.head.appendChild(style);
}

