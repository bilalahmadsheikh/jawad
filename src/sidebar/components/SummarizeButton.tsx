import React from 'react';
import { FileText } from 'lucide-react';

interface SummarizeButtonProps {
  onSummarize: () => void;
  disabled?: boolean;
}

export function SummarizeButton({ onSummarize, disabled }: SummarizeButtonProps) {
  return (
    <button
      onClick={onSummarize}
      disabled={disabled}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-surface-300/60 text-slate-400 hover:bg-surface-400/60 hover:text-slate-300 disabled:opacity-40 transition-all duration-200 btn-lift"
      title="Summarize current page"
    >
      <FileText size={12} />
      Summarize
    </button>
  );
}
