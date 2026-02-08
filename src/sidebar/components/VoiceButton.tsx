import React, { useEffect } from 'react';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { Mic, MicOff, AlertTriangle, X, Loader2 } from 'lucide-react';

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
    startListening,
    stopListening,
    isSupported,
    clearError,
  } = useVoiceInput(onResult);

  // Auto-dismiss error after 12 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 12000);
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

  return (
    <div className="relative">
      <button
        onClick={isListening ? stopListening : isTranscribing ? undefined : startListening}
        disabled={disabled || isTranscribing}
        className={`p-1.5 rounded-lg transition-all ${
          isListening
            ? 'bg-red-500 text-white voice-active shadow-lg shadow-red-500/30'
            : isTranscribing
              ? 'bg-blue-500 text-white animate-pulse cursor-wait'
              : error
                ? 'bg-amber-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50'
        }`}
        title={
          isListening
            ? 'Stop recording'
            : isTranscribing
              ? 'Transcribing audio...'
              : error
                ? 'Voice error — click to retry'
                : 'Start voice input'
        }
      >
        {isTranscribing ? (
          <Loader2 size={16} className="animate-spin" />
        ) : error ? (
          <AlertTriangle size={16} />
        ) : (
          <Mic size={16} />
        )}
      </button>

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
      {!busy && transcript && (
        <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-slate-200 whitespace-nowrap max-w-[200px] truncate shadow-lg z-50">
          ✅ {transcript}
        </div>
      )}

      {/* Error tooltip */}
      {error && !busy && (
        <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-amber-900 border border-amber-600 rounded text-xs text-amber-200 max-w-[260px] shadow-lg z-50">
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
