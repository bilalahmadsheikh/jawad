// ============================================================
// Jawad Content Script
// Injected into every page.
// Handles: page reading, actions, voice relay, product extraction
// ============================================================

import { readPage } from './dom-reader';
import { clickElement, fillForm, scrollPage } from './page-actions';

// ---------- Voice capture state (MediaRecorder-based) ----------
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let mediaStream: MediaStream | null = null;

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

      // Voice input — uses MediaRecorder for reliable audio capture
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

// ---------- Voice capture (MediaRecorder) ----------

/**
 * Convert a Blob to a base64 string (without the data: prefix).
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Strip "data:audio/webm;base64," prefix → pure base64
      const base64 = dataUrl.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read audio blob'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Determine the best supported audio MIME type for MediaRecorder.
 */
function getSupportedMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return ''; // browser default
}

/**
 * Start recording audio from the microphone using MediaRecorder.
 * When stopped, the recorded audio is sent to the background script
 * for transcription via the user's configured LLM provider (Whisper API).
 */
function startVoiceCapture(): void {
  // Stop any existing recording
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop());
    mediaStream = null;
  }

  // Check if MediaRecorder is available
  if (typeof MediaRecorder === 'undefined') {
    browser.runtime.sendMessage({
      type: 'VOICE_ERROR',
      payload: { error: 'MediaRecorder not available on this page.' },
    });
    return;
  }

  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      mediaStream = stream;
      audioChunks = [];

      const mimeType = getSupportedMimeType();
      const recorderOptions: MediaRecorderOptions = {};
      if (mimeType) recorderOptions.mimeType = mimeType;

      mediaRecorder = new MediaRecorder(stream, recorderOptions);

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Release the microphone
        mediaStream?.getTracks().forEach((t) => t.stop());
        mediaStream = null;

        if (audioChunks.length === 0) {
          browser.runtime.sendMessage({
            type: 'VOICE_ERROR',
            payload: { error: 'No audio was captured. Please try again.' },
          });
          return;
        }

        const actualMime = mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunks, { type: actualMime });

        // Notify sidebar we're now processing the audio
        browser.runtime.sendMessage({ type: 'VOICE_TRANSCRIBING' });

        try {
          const base64 = await blobToBase64(audioBlob);
          // Send audio to background for Whisper transcription
          browser.runtime.sendMessage({
            type: 'VOICE_AUDIO',
            payload: {
              audio: base64,
              mimeType: actualMime.split(';')[0], // e.g. "audio/webm"
            },
          });
        } catch (err) {
          browser.runtime.sendMessage({
            type: 'VOICE_ERROR',
            payload: {
              error: `Failed to process audio: ${err instanceof Error ? err.message : String(err)}`,
            },
          });
        }
      };

      mediaRecorder.onerror = () => {
        browser.runtime.sendMessage({
          type: 'VOICE_ERROR',
          payload: { error: 'Recording error occurred.' },
        });
      };

      // Start recording — collect data in chunks for robustness
      mediaRecorder.start(250);

      // Notify that we are now recording
      browser.runtime.sendMessage({ type: 'VOICE_STARTED' });
    })
    .catch((err: Error) => {
      browser.runtime.sendMessage({
        type: 'VOICE_ERROR',
        payload: {
          error: err.name === 'NotAllowedError'
            ? 'Microphone permission denied. Allow mic access for this site and try again.'
            : `Microphone error: ${err.message}`,
        },
      });
    });
}

/**
 * Stop the active recording. This triggers onstop which sends
 * the recorded audio to the background for transcription.
 */
function stopVoiceCapture(): void {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  } else {
    // No active recording — release stream and notify
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      mediaStream = null;
    }
    browser.runtime.sendMessage({ type: 'VOICE_END' });
  }
}

console.log('[Jawad] Content script loaded on', window.location.href);
