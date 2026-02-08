import { useState, useCallback, useEffect, useRef } from 'react';
import { sendToBackground, addMessageHandler } from '../lib/port';

export type MicPermission =
  | 'unknown'
  | 'checking'
  | 'granted'
  | 'prompt'
  | 'denied'
  | 'unavailable';

export type VoiceMode = 'whisper' | 'browser';

interface UseVoiceInputReturn {
  isListening: boolean;
  isTranscribing: boolean;
  transcript: string;
  error: string | null;
  micPermission: MicPermission;
  voiceMode: VoiceMode;
  startListening: () => void;
  stopListening: () => void;
  isSupported: boolean;
  clearError: () => void;
  openMicSetup: () => void;
  setVoiceMode: (mode: VoiceMode) => void;
}

const VOICE_MODE_KEY = 'jawad_voice_mode';

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
 * Voice input hook — supports two modes:
 *
 * **Whisper mode** (default): Records in sidebar → Whisper API transcription.
 *   Requires OpenAI or OpenRouter. Best accuracy. Needs mic-setup one-time.
 *
 * **Browser Speech mode**: Uses Web Speech API in content script.
 *   Free, no API key. Real-time transcript. Requires HTTPS page.
 */
export function useVoiceInput(
  onResult: (transcript: string) => void
): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [micPermission, setMicPermission] = useState<MicPermission>('unknown');
  const [voiceMode, setVoiceModeState] = useState<VoiceMode>('whisper');

  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const mimeRef = useRef<string>('');
  const browserModeActiveRef = useRef(false);

  const hasMediaRecorder =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined';

  const isSupported = hasMediaRecorder || true; // Browser mode works via content script

  const setVoiceMode = useCallback((mode: VoiceMode) => {
    setVoiceModeState(mode);
    browser.storage.local.set({ [VOICE_MODE_KEY]: mode }).catch(() => {});
  }, []);

  // ---- Load voice mode and permission on mount ----
  useEffect(() => {
    browser.storage.local.get(VOICE_MODE_KEY).then((d) => {
      if (d[VOICE_MODE_KEY] === 'browser' || d[VOICE_MODE_KEY] === 'whisper') {
        setVoiceModeState(d[VOICE_MODE_KEY]);
      }
    });

    const onStorageChanged = (
      changes: Record<string, { oldValue?: unknown; newValue?: unknown }>
    ) => {
      if (changes[VOICE_MODE_KEY]?.newValue === 'browser' || changes[VOICE_MODE_KEY]?.newValue === 'whisper') {
        setVoiceModeState(changes[VOICE_MODE_KEY].newValue as VoiceMode);
      }
      if (changes.jawad_mic_granted?.newValue === true) {
        setMicPermission('granted');
      }
    };
    browser.storage.onChanged.addListener(onStorageChanged);
    return () => browser.storage.onChanged.removeListener(onStorageChanged);
  }, []);

  useEffect(() => {
    if (voiceMode === 'browser') return;
    if (!hasMediaRecorder) {
      setMicPermission('unavailable');
      return;
    }
    checkPermissionState();

    const onStorageChanged = (
      changes: Record<string, { oldValue?: unknown; newValue?: unknown }>
    ) => {
      if (changes.jawad_mic_granted?.newValue === true) {
        setMicPermission('granted');
      }
    };
    browser.storage.onChanged.addListener(onStorageChanged);
    return () => browser.storage.onChanged.removeListener(onStorageChanged);
  }, [voiceMode, hasMediaRecorder]);

  async function checkPermissionState() {
    setMicPermission('checking');
    try {
      const data = await browser.storage.local.get('jawad_mic_granted');
      if (data.jawad_mic_granted === true) {
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
          await browser.storage.local.remove('jawad_mic_granted');
        } catch {
          setMicPermission('granted');
          return;
        }
      }
      try {
        const perm = await navigator.permissions.query({
          name: 'microphone' as PermissionName,
        });
        setMicPermission(perm.state as MicPermission);
        perm.onchange = () => setMicPermission(perm.state as MicPermission);
      } catch {
        setMicPermission('prompt');
      }
    } catch {
      setMicPermission('prompt');
    }
  }

  // ---- Listen for voice results ----
  useEffect(() => {
    const unsubscribe = addMessageHandler((msg) => {
      if (msg.type === 'VOICE_RESULT') {
        const payload = msg.payload as { transcript: string; isFinal: boolean };
        setTranscript(payload.transcript);
        setIsTranscribing(false);
        setIsListening(false);
        setError(null);
        if (payload.isFinal && payload.transcript) {
          onResultRef.current(payload.transcript);
        }
      } else if (msg.type === 'VOICE_SPEECH_RESULT') {
        const payload = msg.payload as {
          transcript: string;
          isFinal: boolean;
          isInterim?: boolean;
        };
        setTranscript(payload.transcript);
        setError(null);
        if (payload.isFinal && payload.transcript) {
          setIsListening(false);
          onResultRef.current(payload.transcript);
        }
        if (payload.isFinal && !payload.transcript) {
          setIsListening(false);
        }
      } else if (msg.type === 'VOICE_STARTED') {
        setIsListening(true);
        setError(null);
      } else if (msg.type === 'VOICE_END') {
        if (browserModeActiveRef.current) {
          setIsListening(false);
        }
      } else if (msg.type === 'VOICE_ERROR') {
        const payload = msg.payload as { error: string };
        const raw = payload.error || 'Unknown error';
        setError(raw);
        setIsTranscribing(false);
        setIsListening(false);
      }
    });
    return unsubscribe;
  }, []);

  // ---- Start recording ----
  const startListening = useCallback(async () => {
    setError(null);
    setTranscript('');
    setIsTranscribing(false);

    if (voiceMode === 'browser') {
      browserModeActiveRef.current = true;
      sendToBackground({ type: 'START_SPEECH_RECOGNITION' });
      setIsListening(true);
      return;
    }

    if (!hasMediaRecorder) {
      setError('Voice requires MediaRecorder. Try "Browser Speech" mode in Settings.');
      return;
    }

    if (micPermission !== 'granted') {
      openMicSetupTab();
      return;
    }

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
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        if (chunksRef.current.length === 0) {
          setError('No audio captured. Speak clearly and try again.');
          setIsListening(false);
          return;
        }

        setIsListening(false);
        setIsTranscribing(true);

        try {
          const actualMime = mimeRef.current || 'audio/webm';
          const audioBlob = new Blob(chunksRef.current, { type: actualMime });
          const base64 = await blobToBase64(audioBlob);
          const pureBase64 = base64.includes(',') ? base64.split(',')[1] : base64;

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

      recorder.start(250);
      setIsListening(true);
    } catch (err) {
      const e = err as Error;
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setMicPermission('denied');
        await browser.storage.local.remove('jawad_mic_granted');
        setError('Microphone denied. Click the mic to set up again.');
      } else if (e.name === 'NotFoundError') {
        setError('No microphone found.');
      } else if (e.name === 'NotReadableError' || e.name === 'AbortError') {
        setError('Microphone in use by another app.');
      } else {
        setError(`Microphone error: ${e.message}`);
      }
    }
  }, [voiceMode, micPermission, hasMediaRecorder]);

  // ---- Stop recording ----
  const stopListening = useCallback(() => {
    if (voiceMode === 'browser') {
      browserModeActiveRef.current = false;
      sendToBackground({ type: 'STOP_SPEECH_RECOGNITION' });
      setIsListening(false);
      return;
    }

    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    } else {
      setIsListening(false);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, [voiceMode]);

  function openMicSetupTab() {
    browser.tabs.create({
      url: browser.runtime.getURL('mic-setup.html'),
      active: true,
    });
  }

  const clearError = useCallback(() => setError(null), []);
  const openMicSetup = useCallback(openMicSetupTab, []);

  useEffect(() => {
    return () => {
      if (voiceMode === 'browser') {
        sendToBackground({ type: 'STOP_SPEECH_RECOGNITION' });
      }
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [voiceMode]);

  return {
    isListening,
    isTranscribing,
    transcript,
    error,
    micPermission: voiceMode === 'browser' ? 'granted' : micPermission,
    voiceMode,
    startListening,
    stopListening,
    isSupported,
    clearError,
    openMicSetup,
    setVoiceMode,
  };
}
