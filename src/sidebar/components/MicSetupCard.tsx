import React, { useState, useEffect } from 'react';
import { Mic, X, ExternalLink } from 'lucide-react';

export function MicSetupCard() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    browser.storage.local
      .get(['jawad_mic_granted', 'jawad_mic_dismissed'])
      .then((d) => { if (!d.jawad_mic_granted && !d.jawad_mic_dismissed) setVisible(true); })
      .catch(() => {});

    const onChange = (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>) => {
      if (changes.jawad_mic_granted?.newValue === true) setVisible(false);
    };
    browser.storage.onChanged.addListener(onChange);
    return () => browser.storage.onChanged.removeListener(onChange);
  }, []);

  if (!visible || dismissed) return null;

  const open = () => browser.tabs.create({ url: browser.runtime.getURL('mic-setup.html'), active: true });
  const dismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
    browser.storage.local.set({ jawad_mic_dismissed: true }).catch(() => {});
  };

  return (
    <div onClick={open} className="mx-3 mt-3 card cursor-pointer transition-all duration-200 fade-up group" style={{ borderColor: '#253045' }}>
      <div className="flex items-start gap-3 p-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e8792b, #d4621a)' }}>
          <Mic size={15} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-bold" style={{ color: '#e8792b' }}>Enable Voice</span>
            <ExternalLink size={10} style={{ color: '#5d6f85' }} className="group-hover:text-accent transition-colors" />
          </div>
          <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: '#5d6f85' }}>
            One-time setup — grant mic access to talk hands-free
          </p>
        </div>
        <button onClick={dismiss} className="btn-ghost flex-shrink-0 p-1.5" title="Dismiss" aria-label="Dismiss voice setup">
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
