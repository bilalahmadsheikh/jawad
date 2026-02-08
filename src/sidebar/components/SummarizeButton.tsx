import React from 'react';
import { FileText } from 'lucide-react';

interface Props {
  onSummarize: () => void;
  disabled?: boolean;
}

export function SummarizeButton({ onSummarize, disabled }: Props) {
  return (
    <button onClick={onSummarize} disabled={disabled} className="chip" title="Summarize current page">
      <FileText size={11} /> Summarize
    </button>
  );
}
