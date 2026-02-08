import React, { useState, useEffect } from 'react';
import { Mic, X, ExternalLink } from 'lucide-react';

/**
 * One-time onboarding banner for microphone voice setup.
 * Shown in the chat panel when `jawad_mic_granted` hasn't been set in storage.
 * Once the user completes setup (or dismisses), it disappears forever.
 */
export function MicSetupCard() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if mic has already been granted or dismissed
    browser.storage.local
      .get(['jawad_mic_granted', 'jawad_mic_dismissed'])
      .then((data) => {
        if (!data.jawad_mic_granted && !data.jawad_mic_dismissed) {
          setVisible(true);
        }
      })
      .catch(() => {
        // Storage not available — don't show banner
      });

    // Live-listen for the grant flag (set by mic-setup.html)
    const onChanged = (
      changes: Record<string, { oldValue?: unknown; newValue?: unknown }>
    ) => {
      if (changes.jawad_mic_granted?.newValue === true) {
        setVisible(false);
      }
    };
    browser.storage.onChanged.addListener(onChanged);
    return () => browser.storage.onChanged.removeListener(onChanged);
  }, []);

  if (!visible || dismissed) return null;

  const openSetup = () => {
    const url = browser.runtime.getURL('mic-setup.html');
    browser.tabs.create({ url, active: true });
  };

  const dismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
    browser.storage.local.set({ jawad_mic_dismissed: true }).catch(() => {});
  };

  return (
    <div
      onClick={openSetup}
      className="mx-3 mt-2 bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-lg px-3 py-2.5 cursor-pointer hover:border-orange-400/50 transition-colors group"
    >
      <div className="flex items-start gap-2.5">
        {/* Mic icon */}
        <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
          <Mic size={16} className="text-orange-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-orange-300">
              Enable Voice Commands
            </span>
            <ExternalLink
              size={11}
              className="text-orange-500/60 group-hover:text-orange-400 transition-colors"
            />
          </div>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
            One-time setup — grant microphone access so you can talk to Jawad
            hands-free, just like Siri.
          </p>
        </div>

        {/* Dismiss button */}
        <button
          onClick={dismiss}
          className="flex-shrink-0 p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition-colors"
          title="Dismiss"
          aria-label="Dismiss voice setup"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

