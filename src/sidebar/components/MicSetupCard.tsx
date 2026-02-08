import React, { useState, useEffect } from 'react';
import { Mic, X, ExternalLink } from 'lucide-react';

export function MicSetupCard() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    browser.storage.local
      .get(['jawad_mic_granted', 'jawad_mic_dismissed'])
      .then((data) => {
        if (!data.jawad_mic_granted && !data.jawad_mic_dismissed) setVisible(true);
      })
      .catch(() => {});

    const onChanged = (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>) => {
      if (changes.jawad_mic_granted?.newValue === true) setVisible(false);
    };
    browser.storage.onChanged.addListener(onChanged);
    return () => browser.storage.onChanged.removeListener(onChanged);
  }, []);

  if (!visible || dismissed) return null;

  const openSetup = () => {
    browser.tabs.create({ url: browser.runtime.getURL('mic-setup.html'), active: true });
  };

  const dismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
    browser.storage.local.set({ jawad_mic_dismissed: true }).catch(() => {});
  };

  return (
    <div
      onClick={openSetup}
      className="mx-3 mt-2 card cursor-pointer hover:border-accent/40 transition-all duration-200 group anim-in"
    >
      <div className="flex items-start gap-3 p-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-xl gradient-orange flex items-center justify-center shadow-sm shadow-orange-600/20">
          <Mic size={15} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-bold text-accent">Enable Voice</span>
            <ExternalLink size={10} className="text-accent/40 group-hover:text-accent transition-colors" />
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
            One-time setup — grant mic access to talk hands-free
          </p>
        </div>
        <button
          onClick={dismiss}
          className="btn-ghost flex-shrink-0 p-1.5 hover:text-slate-200"
          title="Dismiss"
          aria-label="Dismiss voice setup"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
