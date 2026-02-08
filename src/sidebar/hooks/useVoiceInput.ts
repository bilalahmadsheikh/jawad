import { useState, useCallback, useEffect, useRef } from 'react';
import { sendToBackground, addMessageHandler } from '../lib/port';

export type MicPermission =
  | 'unknown'
  | 'checking'
  | 'granted'
  | 'prompt'
  | 'denied'
  | 'unavailable';

interface UseVoiceInputReturn {
  isListening: boolean;
  isTranscribing: boolean;
  transcript: string;
  error: string | null;
  micPermission: MicPermission;
  startListening: () => void;
  stopListening: () => void;
  isSupported: boolean;
  clearError: () => void;
  openMicSetup: () => void;
}

/**
 * Convert a Blob to a base64 data-URL string.
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read audio blob'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Pick the best supported audio MIME type for MediaRecorder.
 */
function getSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const mime of [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ]) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return '';
}

/**
 * Voice input hook — records audio directly in the sidebar context.
 *
 * ### Permission Flow (Siri-like):
 *   1. On mount: check if `jawad_mic_granted` flag exists in storage
 *   2. If not yet granted → sidebar shows a "Voice Setup" banner
 *   3. User clicks banner → opens `mic-setup.html` in a new tab
 *      → this is a full browser tab where Firefox's permission dialog
 *        works reliably (unlike the narrow sidebar panel)
 *   4. User clicks "Allow" → permission is stored for the extension origin
 *   5. Tab auto-closes, sidebar detects the grant via storage listener
 *   6. From then on: getUserMedia works instantly — no more prompts ever
 *
 * ### Recording Flow:
 *   1. User clicks mic → sidebar calls getUserMedia() (already permitted)
 *   2. MediaRecorder captures audio
 *   3. User clicks stop → audio blob → base64
 *   4. Sent to background for Whisper API transcription
 *   5. Background returns VOICE_RESULT with text
 */
export function useVoiceInput(
  onResult: (transcript: string) => void
): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [micPermission, setMicPermission] = useState<MicPermission>('unknown');

  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  // Refs for MediaRecorder state
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const mimeRef = useRef<string>('');

  // Detect if getUserMedia is available in this context
  const isSupported =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined';

  // ---- Check permission state on mount ----
  useEffect(() => {
    if (!isSupported) {
      setMicPermission('unavailable');
      return;
    }
    checkPermissionState();

    // Listen for storage changes — detects when mic-setup.html grants permission
    const onStorageChanged = (
      changes: Record<string, { oldValue?: unknown; newValue?: unknown }>
    ) => {
      if (changes.jawad_mic_granted?.newValue === true) {
        setMicPermission('granted');
      }
    };
    browser.storage.onChanged.addListener(onStorageChanged);
    return () => {
      browser.storage.onChanged.removeListener(onStorageChanged);
    };
  }, [isSupported]);

  async function checkPermissionState() {
    setMicPermission('checking');
    try {
      // First check the storage flag (fast path)
      const data = await browser.storage.local.get('jawad_mic_granted');
      if (data.jawad_mic_granted === true) {
        // Verify the actual browser permission hasn't been revoked
        try {
          const perm = await navigator.permissions.query({
            name: 'microphone' as PermissionName,
          });
          if (perm.state === 'granted') {
            setMicPermission('granted');
            perm.onchange = () =>
              setMicPermission(perm.state as MicPermission);
            return;
          }
          // Permission was revoked — reset the flag
          await browser.storage.local.remove('jawad_mic_granted');
        } catch {
          // Permissions API not available — trust the flag
          setMicPermission('granted');
          return;
        }
      }

      // No flag — check raw permission state
      try {
        const perm = await navigator.permissions.query({
          name: 'microphone' as PermissionName,
        });
        setMicPermission(perm.state as MicPermission);
        perm.onchange = () => setMicPermission(perm.state as MicPermission);
      } catch {
        // Permissions API unavailable — assume prompt needed
        setMicPermission('prompt');
      }
    } catch {
      setMicPermission('prompt');
    }
  }

  // ---- Listen for transcription results from background ----
  useEffect(() => {
    const unsubscribe = addMessageHandler((msg) => {
      if (msg.type === 'VOICE_RESULT') {
        const payload = msg.payload as {
          transcript: string;
          isFinal: boolean;
        };
        setTranscript(payload.transcript);
        setIsTranscribing(false);
        setIsListening(false);
        setError(null);
        if (payload.isFinal) {
          onResultRef.current(payload.transcript);
        }
      } else if (msg.type === 'VOICE_ERROR') {
        const payload = msg.payload as { error: string };
        console.warn('[Jawad] Transcription error:', payload.error);
        setIsTranscribing(false);
        setIsListening(false);

        const raw = payload.error || 'Unknown error';
        if (raw.includes('No LLM provider configured')) {
          setError(
            'Configure an LLM provider in Settings to enable voice transcription.'
          );
        } else if (raw.includes('does not support audio transcription')) {
          setError(
            'Your LLM provider does not support voice. Try OpenAI or a compatible provider.'
          );
        } else if (raw.includes('No speech detected')) {
          setError('No speech detected. Speak clearly and try again.');
        } else {
          setError(`Transcription error: ${raw}`);
        }
      }
    });
    return unsubscribe;
  }, []);

  // ---- Start recording ----
  const startListening = useCallback(async () => {
    if (!isSupported) {
      setError('Microphone not available in this browser context.');
      return;
    }

    // If permission hasn't been granted, open the setup page instead
    if (micPermission !== 'granted') {
      openMicSetupTab();
      return;
    }

    // Reset state
    setError(null);
    setTranscript('');
    setIsTranscribing(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = getSupportedMimeType();
      mimeRef.current = mimeType;
      const options: MediaRecorderOptions = {};
      if (mimeType) options.mimeType = mimeType;

      const recorder = new MediaRecorder(stream, options);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Release microphone immediately
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        if (chunksRef.current.length === 0) {
          setError('No audio captured. Speak clearly and try again.');
          setIsListening(false);
          return;
        }

        // Switch to transcribing state
        setIsListening(false);
        setIsTranscribing(true);

        try {
          const actualMime = mimeRef.current || 'audio/webm';
          const audioBlob = new Blob(chunksRef.current, { type: actualMime });
          const base64 = await blobToBase64(audioBlob);

          // Strip the data URL prefix → pure base64
          const pureBase64 = base64.includes(',')
            ? base64.split(',')[1]
            : base64;

          // Send to background for Whisper API transcription
          sendToBackground({
            type: 'VOICE_AUDIO_DIRECT',
            payload: {
              audio: pureBase64,
              mimeType: actualMime.split(';')[0],
            },
          });
        } catch (err) {
          setIsTranscribing(false);
          setError(
            `Failed to process audio: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      };

      recorder.onerror = () => {
        setIsListening(false);
        setError('Recording error. Please try again.');
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      // Start capturing
      recorder.start(250);
      setIsListening(true);
    } catch (err) {
      const e = err as Error;

      if (
        e.name === 'NotAllowedError' ||
        e.name === 'PermissionDeniedError'
      ) {
        // Permission was revoked — need to re-setup
        setMicPermission('denied');
        await browser.storage.local.remove('jawad_mic_granted');
        setError(
          'Microphone permission was revoked. Click the mic button to set up again.'
        );
      } else if (e.name === 'NotFoundError') {
        setError('No microphone found. Connect a microphone and try again.');
      } else if (e.name === 'NotReadableError' || e.name === 'AbortError') {
        setError(
          'Microphone is in use by another app. Close it and try again.'
        );
      } else {
        setError(`Microphone error: ${e.message}`);
      }
    }
  }, [isSupported, micPermission]);

  // ---- Stop recording ----
  const stopListening = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop(); // triggers onstop → sends audio for transcription
    } else {
      setIsListening(false);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // ---- Open the one-time mic setup page in a new tab ----
  function openMicSetupTab() {
    const url = browser.runtime.getURL('mic-setup.html');
    browser.tabs.create({ url, active: true });
  }

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const openMicSetup = useCallback(() => {
    openMicSetupTab();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  return {
    isListening,
    isTranscribing,
    transcript,
    error,
    micPermission,
    startListening,
    stopListening,
    isSupported,
    clearError,
    openMicSetup,
  };
}
