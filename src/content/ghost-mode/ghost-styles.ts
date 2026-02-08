// ============================================================
// Ghost Mode — Style Injector
// Injects all CSS for overlays, stats panel, labels, animations
// Uses a unique prefix to avoid conflicts with page styles.
// ============================================================

const GHOST_STYLE_ID = 'jawad-ghost-mode-styles';

export function injectGhostStyles(): void {
  if (document.getElementById(GHOST_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = GHOST_STYLE_ID;
  style.textContent = `
    /* ═══════════════════════════════════════════
       GHOST MODE — AI VISION OVERLAY
       ═══════════════════════════════════════════ */

    @keyframes jawad-ghost-fadeIn {
      from { opacity: 0; transform: scale(0.97); }
      to   { opacity: 1; transform: scale(1); }
    }

    @keyframes jawad-ghost-pulse {
      0%, 100% { opacity: 0.8; }
      50%      { opacity: 1; }
    }

    @keyframes jawad-ghost-glow {
      0%, 100% { box-shadow: var(--ghost-shadow-base); }
      50%      { box-shadow: var(--ghost-shadow-glow); }
    }

    @keyframes jawad-ghost-slideIn {
      from { opacity: 0; transform: translateX(20px); }
      to   { opacity: 1; transform: translateX(0); }
    }

    @keyframes jawad-ghost-labelPop {
      0%   { opacity: 0; transform: translateY(4px) scale(0.9); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }

    @keyframes jawad-ghost-scanline {
      0%   { top: -2px; }
      100% { top: calc(100% + 2px); }
    }

    @keyframes jawad-ghost-borderFlow {
      0%   { background-position: 0% 0%; }
      100% { background-position: 200% 0%; }
    }

    @keyframes jawad-ghost-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }

    /* ── Overlay wrapper ── */
    .jawad-ghost-overlay {
      position: fixed;
      pointer-events: none;
      z-index: 2147483640;
      border: 2px solid var(--ghost-color);
      border-radius: 6px;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      animation: jawad-ghost-fadeIn 0.3s ease-out both, jawad-ghost-glow 2s ease-in-out infinite;
      --ghost-shadow-base: 0 0 8px var(--ghost-color-alpha), inset 0 0 8px var(--ghost-color-alpha);
      --ghost-shadow-glow: 0 0 16px var(--ghost-color-alpha-strong), inset 0 0 12px var(--ghost-color-alpha);
    }

    .jawad-ghost-overlay:hover {
      border-width: 3px;
      z-index: 2147483645;
    }

    /* ── Scan line effect ── */
    .jawad-ghost-overlay::before {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent, var(--ghost-color), transparent);
      opacity: 0.4;
      animation: jawad-ghost-scanline 2s linear infinite;
    }

    /* ── Color variants ── */
    .jawad-ghost-button {
      --ghost-color: rgba(34, 197, 94, 0.9);
      --ghost-color-alpha: rgba(34, 197, 94, 0.2);
      --ghost-color-alpha-strong: rgba(34, 197, 94, 0.4);
      --ghost-bg: rgba(34, 197, 94, 0.06);
    }

    .jawad-ghost-input {
      --ghost-color: rgba(59, 130, 246, 0.9);
      --ghost-color-alpha: rgba(59, 130, 246, 0.2);
      --ghost-color-alpha-strong: rgba(59, 130, 246, 0.4);
      --ghost-bg: rgba(59, 130, 246, 0.06);
    }

    .jawad-ghost-link {
      --ghost-color: rgba(234, 179, 8, 0.9);
      --ghost-color-alpha: rgba(234, 179, 8, 0.2);
      --ghost-color-alpha-strong: rgba(234, 179, 8, 0.4);
      --ghost-bg: rgba(234, 179, 8, 0.06);
    }

    .jawad-ghost-form {
      --ghost-color: rgba(168, 85, 247, 0.9);
      --ghost-color-alpha: rgba(168, 85, 247, 0.2);
      --ghost-color-alpha-strong: rgba(168, 85, 247, 0.4);
      --ghost-bg: rgba(168, 85, 247, 0.06);
    }

    .jawad-ghost-danger {
      --ghost-color: rgba(239, 68, 68, 0.9);
      --ghost-color-alpha: rgba(239, 68, 68, 0.2);
      --ghost-color-alpha-strong: rgba(239, 68, 68, 0.4);
      --ghost-bg: rgba(239, 68, 68, 0.06);
    }

    .jawad-ghost-select {
      --ghost-color: rgba(6, 182, 212, 0.9);
      --ghost-color-alpha: rgba(6, 182, 212, 0.2);
      --ghost-color-alpha-strong: rgba(6, 182, 212, 0.4);
      --ghost-bg: rgba(6, 182, 212, 0.06);
    }

    /* Background tint */
    .jawad-ghost-overlay-bg {
      position: absolute;
      inset: 0;
      background: var(--ghost-bg);
      border-radius: 4px;
    }

    /* ── Floating label ── */
    .jawad-ghost-label {
      position: absolute;
      top: -26px;
      left: -1px;
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 3px 10px 3px 7px;
      border-radius: 6px 6px 6px 0;
      font-family: -apple-system, 'Segoe UI', system-ui, sans-serif;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.02em;
      white-space: nowrap;
      pointer-events: auto;
      cursor: default;
      animation: jawad-ghost-labelPop 0.25s ease-out both;
      background: var(--ghost-color);
      color: #fff;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      z-index: 2147483646;
    }

    .jawad-ghost-label-icon {
      font-size: 9px;
    }

    /* Simple mode — just colored borders, no labels */
    .jawad-ghost-simple .jawad-ghost-label {
      display: none;
    }

    .jawad-ghost-simple .jawad-ghost-overlay::before {
      display: none;
    }

    /* ── Stats Panel ── */
    .jawad-ghost-stats {
      position: fixed;
      top: 16px;
      right: 16px;
      width: 260px;
      z-index: 2147483647;
      pointer-events: auto;
      font-family: -apple-system, 'Segoe UI', system-ui, sans-serif;
      animation: jawad-ghost-slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .jawad-ghost-stats-inner {
      background: rgba(10, 15, 26, 0.95);
      border: 1px solid rgba(232, 121, 43, 0.3);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(232, 121, 43, 0.08);
    }

    /* Header */
    .jawad-ghost-stats-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 14px 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      background: linear-gradient(135deg, rgba(232, 121, 43, 0.08), rgba(168, 85, 247, 0.04));
    }

    .jawad-ghost-stats-logo {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #e8792b, #c4581a);
      font-size: 14px;
      box-shadow: 0 0 12px rgba(232, 121, 43, 0.3);
    }

    .jawad-ghost-stats-title {
      font-size: 13px;
      font-weight: 800;
      color: #eef2f7;
      letter-spacing: -0.02em;
    }

    .jawad-ghost-stats-subtitle {
      font-size: 8px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #e8792b;
    }

    .jawad-ghost-stats-close {
      margin-left: auto;
      width: 22px;
      height: 22px;
      border-radius: 6px;
      border: none;
      background: rgba(255, 255, 255, 0.05);
      color: #4a5c72;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      transition: all 0.2s;
    }

    .jawad-ghost-stats-close:hover {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }

    /* Element counts grid */
    .jawad-ghost-counts {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 6px;
      padding: 10px 14px;
    }

    .jawad-ghost-count-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 8px 4px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.04);
      transition: all 0.2s;
    }

    .jawad-ghost-count-item:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.08);
      transform: translateY(-1px);
    }

    .jawad-ghost-count-icon {
      font-size: 14px;
    }

    .jawad-ghost-count-num {
      font-size: 16px;
      font-weight: 800;
      line-height: 1;
    }

    .jawad-ghost-count-label {
      font-size: 8px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #4a5c72;
    }

    /* Page type badge */
    .jawad-ghost-page-type {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border-top: 1px solid rgba(255, 255, 255, 0.04);
    }

    .jawad-ghost-page-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 99px;
      font-size: 10px;
      font-weight: 700;
      background: rgba(168, 85, 247, 0.12);
      border: 1px solid rgba(168, 85, 247, 0.25);
      color: #c084fc;
    }

    .jawad-ghost-confidence {
      font-size: 9px;
      font-weight: 600;
      color: #4a5c72;
    }

    .jawad-ghost-confidence-bar {
      width: 40px;
      height: 3px;
      border-radius: 99px;
      background: rgba(255, 255, 255, 0.06);
      overflow: hidden;
      display: inline-block;
      vertical-align: middle;
      margin-left: 5px;
    }

    .jawad-ghost-confidence-fill {
      height: 100%;
      border-radius: 99px;
      background: linear-gradient(90deg, #22c55e, #e8792b);
      transition: width 0.5s ease;
    }

    /* Action buttons */
    .jawad-ghost-actions {
      display: flex;
      gap: 6px;
      padding: 10px 14px 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.04);
    }

    .jawad-ghost-action-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 7px 6px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.03);
      color: #8899ad;
      font-size: 9px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .jawad-ghost-action-btn:hover {
      background: rgba(232, 121, 43, 0.1);
      border-color: rgba(232, 121, 43, 0.3);
      color: #e8792b;
      transform: translateY(-1px);
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
    }

    .jawad-ghost-action-btn:active {
      transform: translateY(0);
    }

    /* Mode toggle */
    .jawad-ghost-mode-toggle {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-top: 1px solid rgba(255, 255, 255, 0.04);
    }

    .jawad-ghost-toggle-btn {
      flex: 1;
      padding: 5px 8px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      background: transparent;
      color: #4a5c72;
      font-size: 9px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }

    .jawad-ghost-toggle-btn.active {
      background: rgba(232, 121, 43, 0.12);
      border-color: rgba(232, 121, 43, 0.3);
      color: #e8792b;
    }

    .jawad-ghost-toggle-btn:hover:not(.active) {
      background: rgba(255, 255, 255, 0.03);
      color: #8899ad;
    }

    /* Keyboard shortcut hints */
    .jawad-ghost-kbd {
      display: inline-flex;
      align-items: center;
      padding: 1px 4px;
      border-radius: 3px;
      font-family: 'Cascadia Code', 'Fira Code', monospace;
      font-size: 7px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #4a5c72;
    }

    /* Footer */
    .jawad-ghost-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 6px 14px 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.04);
    }

    .jawad-ghost-footer-text {
      font-size: 7px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #2e3f58;
    }

    /* ── Detail popup on click ── */
    .jawad-ghost-detail {
      position: fixed;
      z-index: 2147483647;
      width: 220px;
      background: rgba(10, 15, 26, 0.97);
      border: 1px solid rgba(232, 121, 43, 0.25);
      border-radius: 12px;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
      padding: 12px;
      font-family: -apple-system, 'Segoe UI', system-ui, sans-serif;
      pointer-events: auto;
      animation: jawad-ghost-fadeIn 0.2s ease-out;
    }

    .jawad-ghost-detail-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 10px;
    }

    .jawad-ghost-detail-key {
      color: #4a5c72;
      font-weight: 600;
    }

    .jawad-ghost-detail-val {
      color: #dde4ed;
      font-weight: 700;
      max-width: 130px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* ── Transition classes ── */
    .jawad-ghost-exit {
      opacity: 0 !important;
      transform: scale(0.95) !important;
      transition: all 0.25s ease-in !important;
    }
  `;

  document.head.appendChild(style);
}

export function removeGhostStyles(): void {
  const style = document.getElementById(GHOST_STYLE_ID);
  if (style) style.remove();
}

