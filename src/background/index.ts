// ============================================================
// Jawad Background Script
// Central hub for LLM calls, tool execution, message routing.
// Now also handles voice relay from content script → sidebar.
// ============================================================

import { handleMessage } from './message-handler';

let sidebarPort: browser.Port | null = null;

// Listen for sidebar connection
browser.runtime.onConnect.addListener((port: browser.Port) => {
  if (port.name === 'sidebar') {
    sidebarPort = port;
    console.log('[Jawad] Sidebar connected');

    port.onMessage.addListener((msg: unknown) => {
      const message = msg as Record<string, unknown>;

      // Voice commands: relay to content script
      if (message.type === 'START_VOICE') {
        relayVoiceCommand('START_VOICE_INPUT');
        return;
      }
      if (message.type === 'STOP_VOICE') {
        relayVoiceCommand('STOP_VOICE_INPUT');
        return;
      }

      handleMessage(message, port);
    });

    port.onDisconnect.addListener(() => {
      sidebarPort = null;
      console.log('[Jawad] Sidebar disconnected');
    });
  }
});

// Listen for content script messages (voice results, page events)
browser.runtime.onMessage.addListener(
  (msg: unknown, _sender: browser.MessageSender) => {
    const message = msg as Record<string, unknown>;

    // Voice relay: forward from content script to sidebar
    if (
      message.type === 'VOICE_RESULT' ||
      message.type === 'VOICE_END' ||
      message.type === 'VOICE_ERROR'
    ) {
      if (sidebarPort) {
        sidebarPort.postMessage(msg);
      }
      return Promise.resolve(undefined);
    }

    // Other content script messages
    if (message.type === 'PAGE_CONTENT_READY' && sidebarPort) {
      sidebarPort.postMessage(msg);
    }

    return Promise.resolve(undefined);
  }
);

/**
 * Send a voice command to the content script on the active tab.
 */
async function relayVoiceCommand(type: string): Promise<void> {
  try {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    const tab = tabs[0];
    if (tab?.id) {
      await browser.tabs.sendMessage(tab.id, { type });
    } else if (sidebarPort) {
      sidebarPort.postMessage({
        type: 'VOICE_ERROR',
        payload: { error: 'No active tab. Navigate to a webpage first.' },
      });
    }
  } catch {
    if (sidebarPort) {
      sidebarPort.postMessage({
        type: 'VOICE_ERROR',
        payload: {
          error:
            'Cannot access this page for voice input. Try navigating to a regular webpage.',
        },
      });
    }
  }
}

console.log('[Jawad] Background script loaded');
