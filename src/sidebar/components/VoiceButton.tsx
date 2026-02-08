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
    micPermission, voiceMode, startListening, stopListening,
    isSupported, clearError, openMicSetup,
  } = useVoiceInput(onResult);

  useEffect(() => {
    if (error) { const t = setTimeout(clearError, 12000); return () => clearTimeout(t); }
  }, [error, clearError]);

  if (!isSupported) {
    return (
      <button disabled className="vbtn-disabled p-2 rounded-lg cursor-not-allowed" title="Mic not available">
        <MicOff size={14} />
      </button>
    );
  }

  const busy = isListening || isTranscribing;
  const needsSetup = voiceMode === 'whisper' && (micPermission === 'prompt' || micPermission === 'denied' || micPermission === 'unknown' || micPermission === 'checking');
  const isReady = voiceMode === 'browser' || micPermission === 'granted';

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

  /* CSS class for button state */
  let stateClass = 'vbtn';
  if (isListening)        stateClass = 'vbtn-listening';
  else if (isTranscribing) stateClass = 'vbtn-transcribing';
  else if (needsSetup)     stateClass = 'vbtn-setup';
  else if (error)           stateClass = 'vbtn-error';

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={disabled || isTranscribing}
        className={`relative z-10 p-2 rounded-lg transition-all duration-200 ${stateClass} ${isListening ? 'voice-ring' : ''}`}
        title={title}
      >
        {isListening && <span className="absolute inset-0 rounded-lg animate-ping opacity-25 pointer-events-none vbtn-ping" />}
        {isTranscribing ? <Loader2 size={14} className="animate-spin" />
          : needsSetup ? <ShieldAlert size={14} />
          : error ? <AlertTriangle size={14} />
          : <Mic size={14} />}
      </button>

      {/* Recording tooltip */}
      {isListening && !transcript && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap shadow-lg z-50 pointer-events-none tooltip-recording">
          🎤 {voiceMode === 'browser' ? 'Listening…' : 'Recording…'}
        </div>
      )}

      {/* Live transcript (Browser Speech real-time) */}
      {isListening && transcript && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 rounded-lg text-[11px] max-w-[180px] shadow-lg z-50 pointer-events-none tooltip-recording line-clamp-2">
          {transcript}
        </div>
      )}

      {/* Transcribing tooltip */}
      {isTranscribing && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap shadow-lg z-50 pointer-events-none animate-pulse tooltip-transcribing">
          ⏳ Transcribing…
        </div>
      )}

      {/* Error tooltip */}
      {error && !busy && (
        <div className="absolute bottom-full left-0 mb-2 px-2.5 py-1.5 rounded-lg text-[11px] max-w-[220px] shadow-lg z-50 tooltip-error">
          <div className="flex items-start gap-1.5">
            <AlertTriangle size={11} className="flex-shrink-0 mt-0.5 tooltip-error-icon" />
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
