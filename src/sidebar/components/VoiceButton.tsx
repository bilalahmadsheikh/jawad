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

  // API not available at all (very rare)
  if (!isSupported) {
    return (
      <button
        disabled
        className="p-1.5 rounded-lg bg-slate-700 text-slate-500 cursor-not-allowed"
        title="Microphone not available in this browser"
      >
        <MicOff size={16} />
      </button>
    );
  }

  const busy = isListening || isTranscribing;
  const micBlocked = micPermission === 'denied' || micPermission === 'unavailable';

  // Determine button title
  let buttonTitle = 'Start voice input';
  if (isListening) buttonTitle = 'Click to stop recording';
  else if (isTranscribing) buttonTitle = 'Transcribing audio...';
  else if (micPermission === 'denied') buttonTitle = 'Microphone denied — click to retry';
  else if (micPermission === 'prompt') buttonTitle = 'Click to allow microphone and start recording';
  else if (error) buttonTitle = 'Voice error — click to retry';

  const handleClick = () => {
    if (isListening) {
      stopListening();
    } else if (isTranscribing) {
      // Wait for transcription to finish
    } else if (micBlocked && !error) {
      // Re-check permission (user may have changed it in browser settings)
      recheckPermission();
      // Also try to start — getUserMedia will re-prompt if possible
      startListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={disabled || isTranscribing}
        className={`relative z-10 p-1.5 rounded-lg transition-colors duration-200 ${
          isListening
            ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
            : isTranscribing
              ? 'bg-blue-500 text-white animate-pulse cursor-wait'
              : micBlocked
                ? 'bg-orange-600 text-white hover:bg-orange-500'
                : error
                  ? 'bg-amber-600 text-white hover:bg-amber-500'
                  : micPermission === 'prompt'
                    ? 'bg-slate-600 text-yellow-300 hover:bg-slate-500 ring-1 ring-yellow-400/50'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50'
        }`}
        title={buttonTitle}
      >
        {/* Pulsing ring when recording */}
        {isListening && (
          <span className="absolute inset-0 rounded-lg bg-red-500 animate-ping opacity-40 pointer-events-none" />
        )}

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
        <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-yellow-900/90 border border-yellow-600 rounded text-xs text-yellow-200 whitespace-nowrap shadow-lg z-50 pointer-events-none">
          🎤 Click to allow mic access
        </div>
      )}

      {/* Recording indicator */}
      {isListening && (
        <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-red-500/90 border border-red-400 rounded text-xs text-white whitespace-nowrap shadow-lg z-50 pointer-events-none">
          🎤 Recording... click mic to stop
        </div>
      )}

      {/* Transcribing indicator */}
      {isTranscribing && (
        <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-blue-600/90 border border-blue-400 rounded text-xs text-white whitespace-nowrap shadow-lg z-50 pointer-events-none animate-pulse">
          ⏳ Transcribing...
        </div>
      )}

      {/* Transcript result (briefly shown) */}
      {!busy && transcript && !error && (
        <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-slate-200 whitespace-nowrap max-w-[200px] truncate shadow-lg z-50 pointer-events-none">
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
