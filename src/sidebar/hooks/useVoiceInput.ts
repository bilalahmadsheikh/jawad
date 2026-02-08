import { useState, useCallback, useEffect, useRef } from 'react';
import { sendToBackground, addMessageHandler } from '../lib/port';

type MicPermission = 'unknown' | 'checking' | 'granted' | 'prompt' | 'denied' | 'insecure' | 'unavailable' | 'no-tab' | 'error';

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
 * Hook for voice input via content script relay.
 *
 * Flow:
 *   1. On mount, check mic permission on active tab
 *   2. User clicks mic → sends START_VOICE to background
 *   3. Content script checks permission → calls getUserMedia (triggers browser prompt if needed)
 *   4. MediaRecorder starts → user speaks → clicks stop
 *   5. Content script sends audio → background transcribes via Whisper
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
  const [micPermission, setMicPermission] = useState<MicPermission>('unknown');
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  // Check mic permission on mount and when tab changes
  useEffect(() => {
    setMicPermission('checking');
    sendToBackground({ type: 'CHECK_MIC_PERMISSION' });
  }, []);

  useEffect(() => {
    const unsubscribe = addMessageHandler((msg) => {
      switch (msg.type) {
        // Mic permission status from content script (via background)
        case 'MIC_PERMISSION_STATUS': {
          const payload = msg.payload as { status: string; details?: string };
          setMicPermission(payload.status as MicPermission);
          break;
        }

        // Content script is requesting mic permission (browser prompt is showing)
        case 'VOICE_REQUESTING_MIC': {
          // Keep isListening true — waiting for user to accept the prompt
          setError(null);
          break;
        }

        // Content script confirmed recording has started (permission was granted!)
        case 'VOICE_STARTED': {
          setIsListening(true);
          setMicPermission('granted');
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

          // Permission-specific errors
          if (raw.includes('MIC_DENIED')) {
            setMicPermission('denied');
            setError(
              'Microphone permission denied. Click the 🔒 lock icon in the address bar → find Microphone → set to Allow → reload the page.'
            );
          } else if (raw.includes('INSECURE_CONTEXT')) {
            setMicPermission('insecure');
            setError('Voice requires a secure (HTTPS) page. Navigate to an HTTPS site first.');
          } else if (raw.includes('No microphone found') || raw.includes('NotFoundError')) {
            setError('No microphone found. Please connect a microphone and try again.');
          } else if (raw.includes('in use by another')) {
            setError('Microphone is busy. Close other apps using the mic and try again.');
          } else if (raw.includes('No speech detected') || raw.includes('no-speech')) {
            setError('No speech detected. Try again and speak clearly.');
          } else if (raw.includes('Cannot access') || raw.includes('No active tab')) {
            setMicPermission('no-tab');
            setError('Navigate to a regular webpage first, then try voice input.');
          } else if (raw.includes('No LLM provider configured')) {
            setError('Configure an LLM provider in Settings to enable voice transcription.');
          } else if (raw.includes('does not support audio transcription')) {
            setError('Your LLM provider does not support voice transcription. Try OpenAI or a compatible provider.');
          } else if (raw.includes('MediaRecorder not available') || raw.includes('unavailable')) {
            setMicPermission('unavailable');
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

  const recheckPermission = useCallback(() => {
    setMicPermission('checking');
    sendToBackground({ type: 'CHECK_MIC_PERMISSION' });
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
