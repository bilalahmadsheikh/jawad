import { useState, useCallback, useEffect, useRef } from 'react';
import { sendToBackground, addMessageHandler } from '../lib/port';

interface UseVoiceInputReturn {
  isListening: boolean;
  isTranscribing: boolean;
  transcript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  isSupported: boolean;
  clearError: () => void;
}

/**
 * Hook for voice input via content script relay.
 *
 * Flow:
 *   1. User clicks mic → sends START_VOICE to background
 *   2. Background relays to content script → MediaRecorder starts
 *   3. User clicks stop → sends STOP_VOICE
 *   4. Content script stops recording → sends audio to background
 *   5. Background calls Whisper API for transcription
 *   6. Transcribed text returned here as VOICE_RESULT
 */
export function useVoiceInput(
  onResult: (transcript: string) => void
): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported] = useState(true);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    const unsubscribe = addMessageHandler((msg) => {
      switch (msg.type) {
        // Content script confirmed recording has started
        case 'VOICE_STARTED': {
          setIsListening(true);
          setError(null);
          break;
        }

        // Audio is being sent for transcription
        case 'VOICE_TRANSCRIBING': {
          setIsListening(false);
          setIsTranscribing(true);
          setTranscript('');
          break;
        }

        // Transcription result arrived
        case 'VOICE_RESULT': {
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
          break;
        }

        // Recording ended (no transcription needed)
        case 'VOICE_END': {
          setIsListening(false);
          setIsTranscribing(false);
          break;
        }

        // Error at any stage
        case 'VOICE_ERROR': {
          const payload = msg.payload as { error: string };
          console.warn('[Jawad] Voice error:', payload.error);
          setIsListening(false);
          setIsTranscribing(false);

          const raw = payload.error || 'Unknown error';
          if (raw.includes('not-allowed') || raw.includes('permission denied') || raw.includes('NotAllowedError')) {
            setError('Microphone permission denied. Allow mic access for this site and try again.');
          } else if (raw.includes('No speech detected') || raw.includes('no-speech')) {
            setError('No speech detected. Try again and speak clearly.');
          } else if (raw.includes('Cannot access') || raw.includes('No active tab')) {
            setError('Navigate to a regular webpage first, then try voice input.');
          } else if (raw.includes('No LLM provider configured')) {
            setError('Configure an LLM provider in Settings to enable voice transcription.');
          } else if (raw.includes('does not support audio transcription')) {
            setError('Your LLM provider does not support voice transcription. Try OpenAI or a compatible provider.');
          } else if (raw.includes('MediaRecorder not available')) {
            setError('Voice recording is not available on this page.');
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
    setIsListening(true); // Optimistic — will be confirmed by VOICE_STARTED
    setTranscript('');
    setError(null);
    setIsTranscribing(false);
    sendToBackground({ type: 'START_VOICE' });
  }, []);

  const stopListening = useCallback(() => {
    sendToBackground({ type: 'STOP_VOICE' });
    // Don't set isListening = false here; wait for VOICE_TRANSCRIBING or VOICE_END
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isListening,
    isTranscribing,
    transcript,
    error,
    startListening,
    stopListening,
    isSupported,
    clearError,
  };
}
