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
  recheckPermission: () => void;
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
 * Voice input hook — records audio **directly in the sidebar** context.
 *
 * Why sidebar and not content script?
 *   Firefox shows the "Allow microphone?" prompt attributed to the caller's
 *   origin. When getUserMedia runs in a content script, the prompt appears
 *   on the *webpage* behind the sidebar — the user never sees it.
 *   Running it in the sidebar (an extension page) makes the prompt appear
 *   right where the user is looking.
 *
 * Flow:
 *   1. User clicks mic → sidebar calls navigator.mediaDevices.getUserMedia()
 *      → Firefox shows permission prompt *in the sidebar area*
 *   2. User allows → MediaRecorder starts capturing audio
 *   3. User clicks stop → MediaRecorder stops → audio blob assembled
 *   4. Audio sent to background as base64 for Whisper transcription
 *   5. Background returns VOICE_RESULT with transcribed text
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

  // Refs for MediaRecorder state (not in React state to avoid re-renders)
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

  // ---- Permission check on mount ----
  useEffect(() => {
    if (!isSupported) {
      setMicPermission('unavailable');
      return;
    }
    checkPermission();
  }, [isSupported]);

  async function checkPermission() {
    setMicPermission('checking');
    try {
      const result = await navigator.permissions.query({
        name: 'microphone' as PermissionName,
      });
      setMicPermission(result.state as MicPermission);

      // Live-update if user changes permission in browser settings
      result.onchange = () => {
        setMicPermission(result.state as MicPermission);
      };
    } catch {
      // Permissions API unavailable — we'll discover the state when getUserMedia runs
      setMicPermission('prompt');
    }
  }

  // ---- Listen for transcription results from background ----
  useEffect(() => {
    const unsubscribe = addMessageHandler((msg) => {
      if (msg.type === 'VOICE_RESULT') {
        const payload = msg.payload as { transcript: string; isFinal: boolean };
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

    // Reset state
    setError(null);
    setTranscript('');
    setIsTranscribing(false);

    try {
      // This triggers Firefox's "Allow microphone?" prompt if needed.
      // Because we're in the sidebar (extension page), the prompt appears
      // right here, not hidden behind the sidebar on the webpage.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Permission was granted!
      streamRef.current = stream;
      chunksRef.current = [];
      setMicPermission('granted');

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
              mimeType: actualMime.split(';')[0], // e.g. "audio/webm"
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

      // Start capturing in 250ms chunks for robustness
      recorder.start(250);
      setIsListening(true);
    } catch (err) {
      const e = err as Error;

      if (
        e.name === 'NotAllowedError' ||
        e.name === 'PermissionDeniedError'
      ) {
        setMicPermission('denied');
        setError(
          'Microphone permission denied. Click the lock/site icon in the address bar to allow mic access, then try again.'
        );
      } else if (e.name === 'NotFoundError') {
        setError(
          'No microphone found. Connect a microphone and try again.'
        );
      } else if (e.name === 'NotReadableError' || e.name === 'AbortError') {
        setError(
          'Microphone is in use by another app. Close other apps using the mic and try again.'
        );
      } else {
        setError(`Microphone error: ${e.message}`);
      }
    }
  }, [isSupported]);

  // ---- Stop recording ----
  const stopListening = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop(); // triggers onstop → sends audio for transcription
    } else {
      // Nothing recording — just clean up
      setIsListening(false);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const recheckPermission = useCallback(() => {
    if (isSupported) checkPermission();
  }, [isSupported]);

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
    recheckPermission,
  };
}
