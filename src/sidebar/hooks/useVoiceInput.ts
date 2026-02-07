import { useState, useCallback, useEffect, useRef } from 'react';
import { sendToBackground, addMessageHandler } from '../lib/port';

interface UseVoiceInputReturn {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  isSupported: boolean;
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
  // Always report as supported — the content script will check at runtime
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
          break;
        }
      }
    });

    return unsubscribe;
  }, []);

  const startListening = useCallback(() => {
    setIsListening(true);
    setTranscript('');
    sendToBackground({ type: 'START_VOICE' });
  }, []);

  const stopListening = useCallback(() => {
    sendToBackground({ type: 'STOP_VOICE' });
    setIsListening(false);
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported,
  };
}
