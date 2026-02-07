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
      className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 transition-colors"
      title="Summarize current page"
    >
      <FileText size={12} />
      Summarize
    </button>
  );
}

