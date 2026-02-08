import React, { useEffect, useImperativeHandle, forwardRef } from 'react';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { Mic, MicOff, AlertTriangle, X, Loader2 } from 'lucide-react';

export interface VoiceButtonHandle {
  startListening: () => void;
}

interface VoiceButtonProps {
  onResult: (transcript: string) => void;
  disabled?: boolean;
}

/**
 * Voice input button with premium visual states:
 *   - Idle: mic icon with subtle glow on hover
 *   - Recording/Listening: pulsing red ring, click to stop
 *   - Transcribing: blue spinner (Whisper mode only)
 *   - Error: amber icon with tooltip
 */
export const VoiceButton = forwardRef<VoiceButtonHandle, VoiceButtonProps>(function VoiceButton({ onResult, disabled }, ref) {
  const {
    isListening, isTranscribing, transcript, error,
    voiceMode, startListening, stopListening, clearError,
  } = useVoiceInput(onResult);

  useImperativeHandle(ref, () => ({ startListening }), [startListening]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(clearError, 10000);
      return () => clearTimeout(t);
    }
  }, [error, clearError]);

  const busy = isListening || isTranscribing;

  let title = 'Start voice input';
  if (isListening) title = 'Click to stop';
  else if (isTranscribing) title = 'Transcribing your voice…';
  else if (error) title = 'Voice error — click to retry';

  const handleClick = () => {
    if (isTranscribing) return;
    if (isListening) stopListening();
    else startListening();
  };

  // Dynamic button styles
  const btnStyle: React.CSSProperties = isListening
    ? { background: '#dc2626', color: '#fff', boxShadow: '0 0 20px rgba(220,38,38,0.5), 0 0 40px rgba(220,38,38,0.2)' }
    : isTranscribing
      ? { background: '#2563eb', color: '#fff', boxShadow: '0 0 20px rgba(37,99,235,0.5)' }
      : error
        ? { background: '#b45309', color: '#fff' }
        : { background: 'transparent', color: '#4a5c72' };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={disabled || isTranscribing}
        className={`relative z-10 p-2.5 rounded-xl transition-all duration-300 ${isListening ? 'voice-ring' : ''}`}
        style={btnStyle}
        title={title}
        onMouseEnter={(e) => {
          if (!isListening && !isTranscribing && !error) {
            (e.currentTarget as HTMLElement).style.color = '#e8792b';
            (e.currentTarget as HTMLElement).style.background = 'rgba(232,121,43,0.08)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isListening && !isTranscribing && !error) {
            (e.currentTarget as HTMLElement).style.color = '#4a5c72';
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }
        }}
      >
        {/* Ping animation while recording */}
        {isListening && (
          <span
            className="absolute inset-0 rounded-xl animate-ping pointer-events-none"
            style={{ background: 'rgba(220,38,38,0.3)' }}
          />
        )}

        {isTranscribing ? (
          <Loader2 size={15} className="animate-spin" />
        ) : error ? (
          <AlertTriangle size={15} />
        ) : isListening ? (
          <MicOff size={15} />
        ) : (
          <Mic size={15} />
        )}
      </button>

      {/* Recording tooltip */}
      {isListening && !transcript && (
        <div
          className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap z-50 pointer-events-none anim-slide-in"
          style={{ background: '#dc2626', color: '#fff', boxShadow: '0 4px 15px rgba(220,38,38,0.3)' }}
        >
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white anim-alive" />
            {voiceMode === 'browser' ? 'Listening…' : 'Recording…'}
          </span>
        </div>
      )}

      {/* Live transcript */}
      {isListening && transcript && (
        <div
          className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-3 py-2 rounded-lg text-[11px] max-w-[180px] z-50 pointer-events-none anim-slide-in"
          style={{ background: '#dc2626', color: '#fff', boxShadow: '0 4px 15px rgba(220,38,38,0.3)' }}
        >
          <span className="line-clamp-2">{transcript}</span>
        </div>
      )}

      {/* Transcribing tooltip */}
      {isTranscribing && (
        <div
          className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap z-50 pointer-events-none animate-pulse anim-slide-in"
          style={{ background: '#2563eb', color: '#fff', boxShadow: '0 4px 15px rgba(37,99,235,0.3)' }}
        >
          ⏳ Transcribing…
        </div>
      )}

      {/* Error tooltip */}
      {error && !busy && (
        <div
          className="absolute bottom-full left-0 mb-2.5 px-3 py-2 rounded-xl text-[11px] max-w-[220px] z-50 anim-slide-in"
          style={{ background: '#301808', border: '1px solid #5c2a0a', color: '#fbbf6a', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}
        >
          <div className="flex items-start gap-1.5">
            <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
            <span className="leading-relaxed">{error}</span>
            <button
              onClick={(e) => { e.stopPropagation(); clearError(); }}
              className="flex-shrink-0 ml-1 transition-colors"
              style={{ color: '#8b6230' }}
              title="Dismiss error"
              aria-label="Dismiss error"
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#fbbf6a'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#8b6230'; }}
            >
              <X size={10} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
