import React, { useEffect } from 'react';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { Mic, MicOff, AlertTriangle, X, Loader2, ShieldAlert } from 'lucide-react';

interface VoiceButtonProps {
  onResult: (transcript: string) => void;
  disabled?: boolean;
}

export function VoiceButton({ onResult, disabled }: VoiceButtonProps) {
  const {
    isListening, isTranscribing, transcript, error,
    micPermission, startListening, stopListening,
    isSupported, clearError, openMicSetup,
  } = useVoiceInput(onResult);

  useEffect(() => {
    if (error) { const t = setTimeout(clearError, 12000); return () => clearTimeout(t); }
  }, [error, clearError]);

  if (!isSupported) {
    return (
      <button disabled className="p-2 rounded-lg cursor-not-allowed" style={{ background: '#1d2840', color: '#3d4d65' }} title="Mic not available">
        <MicOff size={14} />
      </button>
    );
  }

  const busy = isListening || isTranscribing;
  const needsSetup = micPermission === 'prompt' || micPermission === 'denied' || micPermission === 'unknown' || micPermission === 'checking';
  const isReady = micPermission === 'granted';

  let title = 'Start voice input';
  if (isListening) title = 'Stop recording';
  else if (isTranscribing) title = 'Transcribing…';
  else if (needsSetup) title = 'Set up voice';
  else if (error) title = 'Voice error — retry';

  const handleClick = () => {
    if (isListening) stopListening();
    else if (isTranscribing) return;
    else if (!isReady) openMicSetup();
    else startListening();
  };

  /* Determine button style based on state */
  let bg = 'transparent';
  let fg = '#5d6f85';
  if (isListening)        { bg = '#dc2626'; fg = '#fff'; }
  else if (isTranscribing) { bg = '#2563eb'; fg = '#fff'; }
  else if (needsSetup)     { bg = '#e8792b'; fg = '#fff'; }
  else if (error)           { bg = '#b45309'; fg = '#fff'; }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={disabled || isTranscribing}
        className={`relative z-10 p-2 rounded-lg transition-all duration-200 ${isListening ? 'voice-ring' : ''}`}
        style={{ background: bg, color: fg }}
        title={title}
      >
        {isListening && <span className="absolute inset-0 rounded-lg animate-ping opacity-25 pointer-events-none" style={{ background: '#dc2626' }} />}
        {isTranscribing ? <Loader2 size={14} className="animate-spin" />
          : needsSetup ? <ShieldAlert size={14} />
          : error ? <AlertTriangle size={14} />
          : <Mic size={14} />}
      </button>

      {/* Recording tooltip */}
      {isListening && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap shadow-lg z-50 pointer-events-none" style={{ background: '#dc2626', color: '#fff' }}>
          🎤 Recording…
        </div>
      )}

      {/* Transcribing tooltip */}
      {isTranscribing && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap shadow-lg z-50 pointer-events-none animate-pulse" style={{ background: '#2563eb', color: '#fff' }}>
          ⏳ Transcribing…
        </div>
      )}

      {/* Error tooltip */}
      {error && !busy && (
        <div className="absolute bottom-full left-0 mb-2 px-2.5 py-1.5 rounded-lg text-[11px] max-w-[220px] shadow-lg z-50" style={{ background: '#44200a', border: '1px solid #7c3a0a', color: '#fbbf6a' }}>
          <div className="flex items-start gap-1.5">
            <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
            <span className="leading-relaxed">{error}</span>
            <button onClick={(e) => { e.stopPropagation(); clearError(); }} className="flex-shrink-0 ml-1 hover:text-white transition-colors" title="Dismiss error" aria-label="Dismiss error">
              <X size={10} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
