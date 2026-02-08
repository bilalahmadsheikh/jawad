import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export interface ToastData {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  duration?: number;
}

interface Props {
  toast: ToastData | null;
  onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: Props) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!toast) return;
    setExiting(false);
    const dur = toast.duration || 3000;
    const t = setTimeout(() => {
      setExiting(true);
      setTimeout(onDismiss, 300);
    }, dur);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const icons = {
    success: <CheckCircle size={14} style={{ color: '#4ade80' }} />,
    error: <AlertCircle size={14} style={{ color: '#f87171' }} />,
    info: <Info size={14} style={{ color: '#60a5fa' }} />,
  };

  return (
    <div className={`toast toast-${toast.type} ${exiting ? 'toast-exit' : ''}`}>
      {icons[toast.type]}
      <span>{toast.message}</span>
      <button
        onClick={() => { setExiting(true); setTimeout(onDismiss, 300); }}
        className="ml-2 transition-opacity hover:opacity-100 opacity-50"
        style={{ color: 'inherit' }}
        title="Dismiss"
      >
        <X size={12} />
      </button>
    </div>
  );
}

