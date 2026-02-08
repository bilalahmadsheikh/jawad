import { useState, useCallback, useEffect, useRef } from 'react';
import { sendToBackground, addMessageHandler } from '../lib/port';

export type VoiceMode = 'whisper' | 'browser';

const VOICE_MODE_KEY = 'jawad_voice_mode';

interface UseVoiceInputReturn {
  isListening: boolean;
  isTranscribing: boolean;
  transcript: string;
  error: string | null;
  voiceMode: VoiceMode;
  startListening: () => void;
  stopListening: () => void;
  clearError: () => void;
  setVoiceMode: (mode: VoiceMode) => void;
}

/**
 * Voice input hook — supports two modes, BOTH delegated to the content script:
 *
 * **Whisper mode** (default):
 *   Sidebar → START_VOICE → Background → START_VOICE_INPUT → Content Script
 *   Content script records audio via MediaRecorder → sends VOICE_AUDIO to background
 *   Background transcribes via Whisper API → sends VOICE_RESULT to sidebar
 *   Best accuracy. Requires OpenAI or OpenRouter.
 *
 * **Browser Speech mode**:
 *   Sidebar → START_SPEECH_RECOGNITION → Background → Content Script
 *   Content script uses Web Speech API → sends VOICE_SPEECH_RESULT to sidebar
 *   Free, no API key. Real-time transcript. Requires HTTPS page.
 *
 * The sidebar NEVER touches getUserMedia or MediaRecorder directly.
 * Recording always happens in the content script (page context) where
 * Web APIs work reliably, unlike the Firefox sidebar panel.
 */
export function useVoiceInput(
  onResult: (transcript: string) => void
): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [voiceMode, setVoiceModeState] = useState<VoiceMode>('whisper');

  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const browserModeActiveRef = useRef(false);

  const setVoiceMode = useCallback((mode: VoiceMode) => {
    setVoiceModeState(mode);
    browser.storage.local.set({ [VOICE_MODE_KEY]: mode }).catch(() => {});
  }, []);

  // Load saved voice mode on mount; auto-detect if not set
  useEffect(() => {
    Promise.all([
      browser.storage.local.get(VOICE_MODE_KEY),
      browser.storage.local.get('jawad_config'),
    ]).then(([modeData, configData]) => {
      const saved = modeData[VOICE_MODE_KEY];
      if (saved === 'browser' || saved === 'whisper') {
        setVoiceModeState(saved as VoiceMode);
      } else {
        // No saved preference — auto-detect based on provider
        const config = configData.jawad_config as { provider?: string } | undefined;
        if (config?.provider === 'ollama') {
          // Ollama doesn't support Whisper, default to browser speech
          setVoiceModeState('browser');
        }
        // Otherwise keep default 'whisper' for OpenAI/OpenRouter
      }
    });
  }, []);

  // Listen for voice messages from background (relayed from content script)
  useEffect(() => {
    const unsubscribe = addMessageHandler((msg) => {
      switch (msg.type) {
        case 'VOICE_STARTED':
          setIsListening(true);
          setIsTranscribing(false);
          setError(null);
          break;

        case 'VOICE_TRANSCRIBING':
          setIsListening(false);
          setIsTranscribing(true);
          break;

        case 'VOICE_RESULT': {
          // Whisper transcription result
          const payload = msg.payload as { transcript: string; isFinal: boolean };
          setTranscript(payload.transcript);
          setIsTranscribing(false);
          setIsListening(false);
          setError(null);
          if (payload.isFinal && payload.transcript?.trim()) {
            onResultRef.current(payload.transcript.trim());
          }
          break;
        }

        case 'VOICE_SPEECH_RESULT': {
          // Browser Speech API real-time result
          const payload = msg.payload as {
            transcript: string;
            isFinal: boolean;
            isInterim?: boolean;
          };
          setTranscript(payload.transcript);
          setError(null);
          if (payload.isFinal && payload.transcript?.trim()) {
            setIsListening(false);
            onResultRef.current(payload.transcript.trim());
          }
          if (payload.isFinal && !payload.transcript?.trim()) {
            setIsListening(false);
          }
          break;
        }

        case 'VOICE_END':
          setIsListening(false);
          setIsTranscribing(false);
          break;

        case 'VOICE_ERROR': {
          const payload = msg.payload as { error: string };
          setIsListening(false);
          setIsTranscribing(false);

          // Map raw error to user-friendly message
          const raw = payload.error || 'Unknown error';
          if (raw.includes('No LLM provider configured') || raw.includes('Configure an LLM')) {
            setError('Configure an LLM in Settings first, or use "Browser Speech" mode.');
          } else if (raw.includes('does not support') || raw.includes('Whisper')) {
            setError('Provider doesn\'t support Whisper. Use "Browser Speech" mode or switch to OpenAI/OpenRouter.');
          } else if (raw.includes('No speech detected') || raw.includes('no-speech')) {
            setError('No speech detected. Speak clearly and try again.');
          } else if (raw.includes('No active tab')) {
            setError('Navigate to a webpage first.');
          } else if (raw.includes('Cannot access this page') || raw.includes('Use an HTTPS site')) {
            setError('Voice doesn\'t work here. Navigate to a regular HTTPS website.');
          } else if (raw.includes('Microphone permission denied') || raw.includes('Microphone access was denied') || raw.includes('not-allowed') || raw.includes('MIC_DENIED')) {
            setError('Mic blocked. Click the lock icon in the address bar → Allow microphone.');
          } else if (raw.includes('No microphone found') || raw.includes('NotFoundError')) {
            setError('No mic found. Connect a microphone and try again.');
          } else if (raw.includes('Microphone is in use') || raw.includes('NotReadableError')) {
            setError('Mic in use by another app. Close it and retry.');
          } else if (raw.includes('secure (HTTPS)') || raw.includes('INSECURE_CONTEXT')) {
            setError('Voice requires HTTPS. Navigate to a secure site.');
          } else if (raw.includes('Web Speech API not available')) {
            setError('Browser Speech not available. Use Whisper mode or try a different browser.');
          } else {
            setError(raw.length > 120 ? raw.substring(0, 120) + '…' : raw);
          }
          break;
        }
      }
    });
    return unsubscribe;
  }, []);

  // Start recording: send command to background → content script
  const startListening = useCallback(() => {
    setError(null);
    setTranscript('');
    setIsTranscribing(false);

    if (voiceMode === 'browser') {
      browserModeActiveRef.current = true;
      sendToBackground({ type: 'START_SPEECH_RECOGNITION' });
      // We'll get VOICE_STARTED from content script to confirm
    } else {
      // Whisper mode: content script records, background transcribes
      sendToBackground({ type: 'START_VOICE' });
      // We'll get VOICE_STARTED from content script to confirm
    }
  }, [voiceMode]);

  // Stop recording: send command to background → content script
  const stopListening = useCallback(() => {
    if (voiceMode === 'browser') {
      browserModeActiveRef.current = false;
      sendToBackground({ type: 'STOP_SPEECH_RECOGNITION' });
    } else {
      sendToBackground({ type: 'STOP_VOICE' });
    }
    // isListening will be updated when we receive VOICE_TRANSCRIBING / VOICE_END
  }, [voiceMode]);

  const clearError = useCallback(() => setError(null), []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (browserModeActiveRef.current) {
        sendToBackground({ type: 'STOP_SPEECH_RECOGNITION' });
      }
    };
  }, []);

  return {
    isListening,
    isTranscribing,
    transcript,
    error,
    voiceMode,
    startListening,
    stopListening,
    clearError,
    setVoiceMode,
  };
}
