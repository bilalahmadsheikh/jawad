import React from 'react';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { Mic, MicOff } from 'lucide-react';

interface VoiceButtonProps {
  onResult: (transcript: string) => void;
  disabled?: boolean;
}

export function VoiceButton({ onResult, disabled }: VoiceButtonProps) {
  const { isListening, transcript, startListening, stopListening, isSupported } =
    useVoiceInput(onResult);

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

  return (
    <div className="relative">
      <button
        onClick={isListening ? stopListening : startListening}
        disabled={disabled}
        className={`p-1.5 rounded-lg transition-all ${
          isListening
            ? 'bg-red-500 text-white voice-active shadow-lg shadow-red-500/30'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50'
        }`}
        title={isListening ? 'Stop listening' : 'Start voice input'}
      >
        <Mic size={16} />
      </button>

      {/* Live transcript tooltip */}
      {isListening && transcript && (
        <div className="absolute bottom-full left-0 mb-2 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-slate-200 whitespace-nowrap max-w-[200px] truncate shadow-lg">
          🎤 {transcript}
        </div>
      )}
    </div>
  );
}

