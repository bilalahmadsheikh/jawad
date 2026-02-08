import React, { useEffect } from 'react';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { Mic, MicOff, AlertTriangle, X, Loader2, ShieldAlert } from 'lucide-react';

interface VoiceButtonProps {
  onResult: (transcript: string) => void;
  disabled?: boolean;
}

export function VoiceButton({ onResult, disabled }: VoiceButtonProps) {
  const {
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
  } = useVoiceInput(onResult);

  // Auto-dismiss error after 15 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 15000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  if (!isSupported) {
    return (
      <button
        disabled
        className="p-1.5 rounded-lg bg-slate-700 text-slate-500 cursor-not-allowed"
        title="Voice input not supported in this browser"
      >
        <MicOff size={16} />
      </button>
    );
  }

  const busy = isListening || isTranscribing;
  const micBlocked = micPermission === 'denied' || micPermission === 'insecure' || micPermission === 'unavailable';

  // Determine button title and behavior
  let buttonTitle = 'Start voice input';
  if (isListening) buttonTitle = 'Stop recording';
  else if (isTranscribing) buttonTitle = 'Transcribing audio...';
  else if (micPermission === 'denied') buttonTitle = 'Microphone denied — click to see how to fix';
  else if (micPermission === 'insecure') buttonTitle = 'HTTPS required for voice input';
  else if (micPermission === 'prompt') buttonTitle = 'Click to allow microphone and record';
  else if (error) buttonTitle = 'Voice error — click to retry';

  const handleClick = () => {
    if (isListening) {
      stopListening();
    } else if (isTranscribing) {
      // Do nothing while transcribing
    } else if (micBlocked && !error) {
      // Show the error tooltip with instructions
      recheckPermission();
    } else {
      // Start recording — this will trigger the browser permission prompt if needed
      startListening();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={disabled || isTranscribing}
        className={`p-1.5 rounded-lg transition-all ${
          isListening
            ? 'bg-red-500 text-white voice-active shadow-lg shadow-red-500/30'
            : isTranscribing
              ? 'bg-blue-500 text-white animate-pulse cursor-wait'
              : micBlocked
                ? 'bg-orange-600 text-white'
                : error
                  ? 'bg-amber-600 text-white'
                  : micPermission === 'prompt'
                    ? 'bg-slate-600 text-yellow-300 hover:bg-slate-500 ring-1 ring-yellow-400/50'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50'
        }`}
        title={buttonTitle}
      >
        {isTranscribing ? (
          <Loader2 size={16} className="animate-spin" />
        ) : micBlocked ? (
          <ShieldAlert size={16} />
        ) : error ? (
          <AlertTriangle size={16} />
        ) : (
          <Mic size={16} />
        )}
      </button>

      {/* First-time hint: permission not yet granted */}
      {!busy && !error && micPermission === 'prompt' && (
        <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-yellow-900/90 border border-yellow-600 rounded text-xs text-yellow-200 whitespace-nowrap shadow-lg z-50">
          🎤 Click to allow mic access
        </div>
      )}

      {/* Recording indicator — mic is active */}
      {isListening && (
        <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-red-500/90 border border-red-400 rounded text-xs text-white whitespace-nowrap shadow-lg z-50 animate-pulse">
          🎤 Recording... click to stop
        </div>
      )}

      {/* Transcribing indicator — audio sent to Whisper */}
      {isTranscribing && (
        <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-blue-600/90 border border-blue-400 rounded text-xs text-white whitespace-nowrap shadow-lg z-50 animate-pulse">
          ⏳ Transcribing...
        </div>
      )}

      {/* Transcript result (briefly shown) */}
      {!busy && transcript && !error && (
        <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-slate-200 whitespace-nowrap max-w-[200px] truncate shadow-lg z-50">
          ✅ {transcript}
        </div>
      )}

      {/* Error tooltip */}
      {error && !busy && (
        <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-amber-900 border border-amber-600 rounded text-xs text-amber-200 max-w-[280px] shadow-lg z-50">
          <div className="flex items-start gap-1">
            <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
            <button
              onClick={(e) => { e.stopPropagation(); clearError(); }}
              className="flex-shrink-0 ml-1 hover:text-white"
              title="Dismiss error"
              aria-label="Dismiss error"
            >
              <X size={10} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
