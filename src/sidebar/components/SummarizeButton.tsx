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
      className="flex items-center gap-1.5 px-2.5 py-[6px] rounded-lg text-[11px] font-semibold bg-dark-4 text-slate-400 hover:text-slate-200 hover:bg-dark-5 border border-transparent disabled:opacity-40 transition-all duration-200"
      title="Summarize current page"
    >
      <FileText size={11} />
      Summarize
    </button>
  );
}
