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

// ---------- Web Speech API state (fallback when no Whisper) ----------
let speechRecognition: SpeechRecognition | null = null;

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

      // Microphone permission check — returns current state
      case 'CHECK_MIC_PERMISSION': {
        return checkMicPermission();
      }

      // Voice input — uses MediaRecorder for reliable audio capture (Whisper path)
      case 'START_VOICE_INPUT': {
        startVoiceCapture();
        return Promise.resolve({ success: true });
      }

      case 'STOP_VOICE_INPUT': {
        stopVoiceCapture();
        return Promise.resolve({ success: true });
      }

      // Web Speech API — free fallback, real-time transcript
      case 'START_SPEECH_RECOGNITION': {
        return startSpeechRecognition();
      }

      case 'STOP_SPEECH_RECOGNITION': {
        stopSpeechRecognition();
        return Promise.resolve({ success: true });
      }

      default:
        return undefined;
    }
  }
);

// ---------- Microphone permission ----------

/**
 * Check microphone permission state and page capabilities.
 * Returns a status string the sidebar can use to show the right UI.
 */
async function checkMicPermission(): Promise<{ status: string; details?: string }> {
  // 1. Check secure context (getUserMedia requires HTTPS, localhost, or file://)
  if (!window.isSecureContext) {
    return {
      status: 'insecure',
      details: 'This page is not HTTPS. Navigate to a secure (HTTPS) site to use voice input.',
    };
  }

  // 2. Check if mediaDevices API exists
  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    return {
      status: 'unavailable',
      details: 'Microphone API not available on this page.',
    };
  }

  // 3. Check MediaRecorder
  if (typeof MediaRecorder === 'undefined') {
    return {
      status: 'unavailable',
      details: 'MediaRecorder not available on this page.',
    };
  }

  // 4. Query permission state via Permissions API
  try {
    const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    // result.state: 'granted' | 'denied' | 'prompt'
    return { status: result.state };
  } catch {
    // Permissions API not available — we'll need to try getUserMedia to find out
    return { status: 'prompt' };
  }
}

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
 *
 * Pre-flight checks:
 *   1. Secure context (HTTPS) required
 *   2. navigator.mediaDevices must exist
 *   3. MediaRecorder must exist
 *   4. Microphone permission — if 'denied', show instructions;
 *      if 'prompt', getUserMedia will trigger the browser permission dialog
 */
function startVoiceCapture(): void {
  // Stop any existing recording first
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop());
    mediaStream = null;
  }

  // Pre-flight 1: Secure context
  if (!window.isSecureContext) {
    browser.runtime.sendMessage({
      type: 'VOICE_ERROR',
      payload: {
        error: 'INSECURE_CONTEXT: Voice requires a secure (HTTPS) page. Navigate to an HTTPS site and try again.',
      },
    });
    return;
  }

  // Pre-flight 2: mediaDevices API
  if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
    browser.runtime.sendMessage({
      type: 'VOICE_ERROR',
      payload: { error: 'Microphone API not available on this page. Try an HTTPS site.' },
    });
    return;
  }

  // Pre-flight 3: MediaRecorder
  if (typeof MediaRecorder === 'undefined') {
    browser.runtime.sendMessage({
      type: 'VOICE_ERROR',
      payload: { error: 'MediaRecorder not available on this page.' },
    });
    return;
  }

  // Pre-flight 4: Check permission state before calling getUserMedia
  const permCheck = navigator.permissions
    ? navigator.permissions.query({ name: 'microphone' as PermissionName }).catch(() => null)
    : Promise.resolve(null);

  permCheck.then((permResult) => {
    if (permResult && permResult.state === 'denied') {
      browser.runtime.sendMessage({
        type: 'VOICE_ERROR',
        payload: {
          error:
            'MIC_DENIED: Microphone permission was previously denied for this site. ' +
            'Click the lock/site icon in the address bar, find Microphone, change it to Allow, then reload the page.',
        },
      });
      return;
    }

    // Permission is 'granted' or 'prompt' — call getUserMedia.
    // If 'prompt', the browser will show the "Allow microphone?" dialog now.
    browser.runtime.sendMessage({
      type: 'VOICE_REQUESTING_MIC',
      payload: {
        permissionState: permResult ? permResult.state : 'unknown',
      },
    });

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

        // Notify that we are now recording (permission was granted!)
        browser.runtime.sendMessage({ type: 'VOICE_STARTED' });
      })
      .catch((err: Error) => {
        let errorMsg: string;

        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMsg =
            'MIC_DENIED: Microphone access was denied. When Firefox shows the microphone prompt, click "Allow". ' +
            'If you dismissed it, click the lock icon in the address bar to change the permission.';
        } else if (err.name === 'NotFoundError') {
          errorMsg = 'No microphone found. Please connect a microphone and try again.';
        } else if (err.name === 'NotReadableError' || err.name === 'AbortError') {
          errorMsg = 'Microphone is in use by another application. Close other apps using the mic and try again.';
        } else {
          errorMsg = `Microphone error (${err.name}): ${err.message}`;
        }

        browser.runtime.sendMessage({
          type: 'VOICE_ERROR',
          payload: { error: errorMsg },
        });
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

// ---------- Web Speech API (free fallback, real-time transcript) ----------

const SpeechRecognitionAPI =
  (typeof window !== 'undefined' &&
    (window.SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition)) ||
  null;

function startSpeechRecognition(): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    if (!SpeechRecognitionAPI) {
      resolve({
        success: false,
        error: 'Web Speech API not available. Use HTTPS and a supported browser.',
      });
      return;
    }

    if (!window.isSecureContext) {
      resolve({
        success: false,
        error: 'Voice requires a secure (HTTPS) page. Navigate to an HTTPS site.',
      });
      return;
    }

    try {
      stopSpeechRecognition();
      const recognition = new SpeechRecognitionAPI() as SpeechRecognition;
      speechRecognition = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';

      recognition.onstart = () => {
        browser.runtime.sendMessage({ type: 'VOICE_STARTED' });
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0]?.transcript || '';
          if (result.isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }
        const text = (final || interim).trim();
        if (text) {
          browser.runtime.sendMessage({
            type: 'VOICE_SPEECH_RESULT',
            payload: {
              transcript: text,
              isFinal: !!final,
              isInterim: !!interim && !final,
            },
          });
        }
      };

      recognition.onerror = (event: Event) => {
        const e = event as { error?: string; message?: string };
        const err = e.error || e.message || 'Unknown error';
        if (err === 'no-speech') {
          browser.runtime.sendMessage({
            type: 'VOICE_SPEECH_RESULT',
            payload: { transcript: '', isFinal: true, isInterim: false },
          });
        } else if (err !== 'aborted') {
          browser.runtime.sendMessage({
            type: 'VOICE_ERROR',
            payload: {
              error: err === 'not-allowed'
                ? 'Microphone access denied. Click the lock icon to allow.'
                : `Speech recognition error: ${err}`,
            },
          });
        }
      };

      recognition.onend = () => {
        speechRecognition = null;
        browser.runtime.sendMessage({ type: 'VOICE_END' });
      };

      recognition.start();
      resolve({ success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      resolve({ success: false, error: msg });
    }
  });
}

function stopSpeechRecognition(): void {
  if (speechRecognition) {
    try {
      speechRecognition.stop();
    } catch {
      // Ignore
    }
    speechRecognition = null;
  }
}

console.log('[Jawad] Content script loaded on', window.location.href);
