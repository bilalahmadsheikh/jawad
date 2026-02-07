// ============================================================
// Shared Port Manager — singleton connection to background script
// Used by useLLM, useVoiceInput, and any other sidebar hooks
// ============================================================

let port: browser.Port | null = null;
const messageHandlers = new Set<(msg: Record<string, unknown>) => void>();

function ensurePort(): browser.Port {
  if (!port) {
    port = browser.runtime.connect({ name: 'sidebar' });
    port.onMessage.addListener((msg: unknown) => {
      const message = msg as Record<string, unknown>;
      messageHandlers.forEach((h) => h(message));
    });
    port.onDisconnect.addListener(() => {
      port = null;
    });
  }
  return port;
}

/**
 * Send a message to the background script.
 * Automatically reconnects if the port was disconnected.
 */
export function sendToBackground(msg: Record<string, unknown>): void {
  try {
    ensurePort().postMessage(msg);
  } catch {
    // Port disconnected, reconnect and retry
    port = null;
    ensurePort().postMessage(msg);
  }
}

/**
 * Register a handler for messages from the background script.
 * Returns an unsubscribe function.
 */
export function addMessageHandler(
  handler: (msg: Record<string, unknown>) => void
): () => void {
  // Ensure port is connected when first handler is added
  ensurePort();
  messageHandlers.add(handler);
  return () => {
    messageHandlers.delete(handler);
  };
}

