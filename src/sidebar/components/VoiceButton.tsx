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
    openMicSetup,
  } = useVoiceInput(onResult);

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
        className="p-2 rounded-lg bg-dark-4 text-slate-600 cursor-not-allowed"
        title="Microphone not available"
      >
        <MicOff size={14} />
      </button>
    );
  }

  const busy = isListening || isTranscribing;
  const needsSetup =
    micPermission === 'prompt' ||
    micPermission === 'denied' ||
    micPermission === 'unknown' ||
    micPermission === 'checking';

  const isReady = micPermission === 'granted';

  let buttonTitle = 'Start voice input';
  if (isListening) buttonTitle = 'Click to stop recording';
  else if (isTranscribing) buttonTitle = 'Transcribing audio…';
  else if (needsSetup) buttonTitle = 'Click to set up voice';
  else if (error) buttonTitle = 'Voice error — click to retry';

  const handleClick = () => {
    if (isListening) stopListening();
    else if (isTranscribing) return;
    else if (!isReady) openMicSetup();
    else startListening();
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={disabled || isTranscribing}
        className={`relative z-10 p-2 rounded-lg transition-all duration-200 ${
          isListening
            ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 voice-active'
            : isTranscribing
              ? 'bg-blue-600 text-white animate-pulse cursor-wait'
              : needsSetup
                ? 'bg-accent text-white hover:brightness-110'
                : error
                  ? 'bg-amber-600 text-white hover:brightness-110'
                  : 'bg-transparent text-slate-400 hover:text-accent hover:bg-dark-4'
        }`}
        title={buttonTitle}
      >
        {isListening && (
          <span className="absolute inset-0 rounded-lg bg-red-500 animate-ping opacity-30 pointer-events-none" />
        )}
        {isTranscribing ? (
          <Loader2 size={14} className="animate-spin" />
        ) : needsSetup ? (
          <ShieldAlert size={14} />
        ) : error ? (
          <AlertTriangle size={14} />
        ) : (
          <Mic size={14} />
        )}
      </button>

      {/* Recording tag */}
      {isListening && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-red-600 rounded-lg text-[10px] text-white font-semibold whitespace-nowrap shadow-lg z-50 pointer-events-none">
          🎤 Recording…
        </div>
      )}

      {/* Transcribing tag */}
      {isTranscribing && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-blue-600 rounded-lg text-[10px] text-white font-semibold whitespace-nowrap shadow-lg z-50 pointer-events-none animate-pulse">
          ⏳ Transcribing…
        </div>
      )}

      {/* Transcript result (idle only) */}
      {!busy && transcript && !error && (
        <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-dark-4 border border-dark-6 rounded-lg text-[10px] text-emerald-400 font-medium whitespace-nowrap max-w-[180px] truncate shadow-lg z-50 pointer-events-none">
          ✅ {transcript}
        </div>
      )}

      {/* Error tooltip */}
      {error && !busy && (
        <div className="absolute bottom-full left-0 mb-2 px-2.5 py-1.5 bg-amber-950 border border-amber-700/40 rounded-lg text-[11px] text-amber-200 max-w-[240px] shadow-lg z-50">
          <div className="flex items-start gap-1.5">
            <AlertTriangle size={11} className="flex-shrink-0 mt-0.5 text-amber-400" />
            <span className="leading-relaxed">{error}</span>
            <button
              onClick={(e) => { e.stopPropagation(); clearError(); }}
              className="flex-shrink-0 ml-1 text-amber-400 hover:text-white transition-colors"
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
