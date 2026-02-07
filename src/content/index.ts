// ============================================================
// FoxAgent Content Script
// Injected into every page.
// Handles: page reading, actions, voice relay, product extraction
// ============================================================

import { readPage } from './dom-reader';
import { clickElement, fillForm, scrollPage } from './page-actions';

// ---------- Voice capture state ----------
let activeRecognition: SpeechRecognition | null = null;

// ---------- Message listener ----------
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
          message.payload!.text as string,
          (message.payload!.submit as boolean) || false
        );

      case 'SCROLL_PAGE':
        return scrollPage(message.payload!.direction as 'up' | 'down');

      // Voice input relay — sidebar can't use SpeechRecognition directly
      case 'START_VOICE_INPUT': {
        startVoiceCapture();
        return Promise.resolve({ success: true });
      }

      case 'STOP_VOICE_INPUT': {
        stopVoiceCapture();
        return Promise.resolve({ success: true });
      }

      default:
        return undefined;
    }
  }
);

// ---------- Voice capture ----------

function startVoiceCapture(): void {
  if (activeRecognition) {
    activeRecognition.stop();
    activeRecognition = null;
  }

  const SpeechRecognitionAPI = (
    window as unknown as {
      SpeechRecognition?: new () => SpeechRecognition;
      webkitSpeechRecognition?: new () => SpeechRecognition;
    }
  ).SpeechRecognition ||
    (
      window as unknown as {
        webkitSpeechRecognition?: new () => SpeechRecognition;
      }
    ).webkitSpeechRecognition;

  if (!SpeechRecognitionAPI) {
    browser.runtime.sendMessage({
      type: 'VOICE_ERROR',
      payload: { error: 'Speech recognition not available on this page. Try enabling media.webspeech.recognition.enable in about:config.' },
    });
    return;
  }

  try {
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      browser.runtime.sendMessage({
        type: 'VOICE_RESULT',
        payload: { transcript, isFinal: result.isFinal },
      });
    };

    recognition.onerror = (event: Event) => {
      const errorEvent = event as Event & { error?: string };
      browser.runtime.sendMessage({
        type: 'VOICE_ERROR',
        payload: { error: errorEvent.error || 'Recognition error' },
      });
      activeRecognition = null;
    };

    recognition.onend = () => {
      browser.runtime.sendMessage({ type: 'VOICE_END' });
      activeRecognition = null;
    };

    activeRecognition = recognition;
    recognition.start();
  } catch (e) {
    browser.runtime.sendMessage({
      type: 'VOICE_ERROR',
      payload: { error: `Failed to start: ${e instanceof Error ? e.message : String(e)}` },
    });
  }
}

function stopVoiceCapture(): void {
  if (activeRecognition) {
    activeRecognition.stop();
    activeRecognition = null;
  }
}

console.log('[FoxAgent] Content script loaded on', window.location.href);
