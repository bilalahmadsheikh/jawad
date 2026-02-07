// ============================================================
// FoxAgent Background Script
// Central hub for LLM calls, tool execution, and message routing.
// ============================================================

import { handleMessage } from './message-handler';

let sidebarPort: browser.Port | null = null;

// Listen for sidebar connection
browser.runtime.onConnect.addListener((port: browser.Port) => {
  if (port.name === 'sidebar') {
    sidebarPort = port;
    console.log('[FoxAgent] Sidebar connected');

    port.onMessage.addListener((msg: unknown) => {
      handleMessage(msg as Record<string, unknown>, port);
    });

    port.onDisconnect.addListener(() => {
      sidebarPort = null;
      console.log('[FoxAgent] Sidebar disconnected');
    });
  }
});

// Listen for content script one-shot messages (if needed)
browser.runtime.onMessage.addListener(
  (msg: unknown, _sender: browser.MessageSender) => {
    const message = msg as Record<string, unknown>;
    // Forward content script results to sidebar if needed
    if (message.type === 'PAGE_CONTENT_READY' && sidebarPort) {
      sidebarPort.postMessage(msg);
    }
    return Promise.resolve(undefined);
  }
);

console.log('[FoxAgent] Background script loaded');

