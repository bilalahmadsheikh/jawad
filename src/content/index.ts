// ============================================================
// FoxAgent Content Script
// Injected into every page. Handles page reading and actions.
// ============================================================

import { readPage } from './dom-reader';
import { clickElement, fillForm, scrollPage } from './page-actions';
import { highlightElement } from './visual-highlighter';

// Listen for messages from the background script
browser.runtime.onMessage.addListener(
  (msg: unknown): Promise<unknown> | undefined => {
    const message = msg as { type: string; payload?: Record<string, unknown> };

    switch (message.type) {
      case 'READ_PAGE':
        return Promise.resolve(readPage());

      case 'CLICK_ELEMENT':
        return clickElement(message.payload!.selector as string);

      case 'FILL_FORM':
        return fillForm(
          message.payload!.selector as string,
          message.payload!.text as string
        );

      case 'SCROLL_PAGE':
        return scrollPage(message.payload!.direction as 'up' | 'down');

      case 'HIGHLIGHT_ELEMENT':
        highlightElement(message.payload!.selector as string);
        return Promise.resolve({ success: true });

      default:
        return undefined;
    }
  }
);

console.log('[FoxAgent] Content script loaded on', window.location.href);

