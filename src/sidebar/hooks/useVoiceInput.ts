import { useState, useCallback, useEffect, useRef } from 'react';
import { sendToBackground, addMessageHandler } from '../lib/port';

interface UseVoiceInputReturn {
  isListening: boolean;
  transcript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  isSupported: boolean;
  clearError: () => void;
}

/**
 * Hook for voice input via content script relay.
 * SpeechRecognition is NOT available in Firefox sidebar contexts,
 * so we send START_VOICE / STOP_VOICE to the background script,
 * which relays to the content script where the API IS available.
 */
export function useVoiceInput(
  onResult: (transcript: string) => void
): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported] = useState(true);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    const unsubscribe = addMessageHandler((msg) => {
      switch (msg.type) {
        case 'VOICE_RESULT': {
          const payload = msg.payload as {
            transcript: string;
            isFinal: boolean;
          };
          setTranscript(payload.transcript);
          setError(null);
          if (payload.isFinal) {
            setIsListening(false);
            onResultRef.current(payload.transcript);
          }
          break;
        }

        case 'VOICE_END': {
          setIsListening(false);
          break;
        }

        case 'VOICE_ERROR': {
          const payload = msg.payload as { error: string };
          console.warn('[FoxAgent] Voice error:', payload.error);
          setIsListening(false);

          // User-friendly error message
          const raw = payload.error || 'Unknown error';
          if (
            raw.includes('not available') ||
            raw.includes('force_enable') ||
            raw.includes('not supported')
          ) {
            setError(
              'Voice not enabled in Firefox. Open about:config and set media.webspeech.recognition.enable and media.webspeech.recognition.force_enable to true, then reload.'
            );
          } else if (raw.includes('not-allowed') || raw.includes('permission')) {
            setError('Microphone permission denied. Allow mic access and try again.');
          } else if (raw.includes('no-speech')) {
            setError('No speech detected. Try again and speak clearly.');
          } else if (raw.includes('Cannot access') || raw.includes('No active tab')) {
            setError('Navigate to a regular webpage first, then try voice input.');
          } else {
            setError(`Voice error: ${raw}`);
          }
          break;
        }
      }
    });

    return unsubscribe;
  }, []);

  const startListening = useCallback(() => {
    setIsListening(true);
    setTranscript('');
    setError(null);
    sendToBackground({ type: 'START_VOICE' });
  }, []);

  const stopListening = useCallback(() => {
    sendToBackground({ type: 'STOP_VOICE' });
    setIsListening(false);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    isSupported,
    clearError,
  };
}
