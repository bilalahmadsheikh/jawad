import React from 'react';
import type { GhostModeState } from '../hooks/useGhostMode';
import type { ToastData } from './Toast';
import { sendToBackground } from '../lib/port';
import {
  Eye, EyeOff, RefreshCw, Crosshair, PenTool, Download,
  Zap, AlertTriangle, Layers,
} from 'lucide-react';

interface GhostModePanelProps {
  state: GhostModeState;
  onToggle: () => void;
  onRefresh: () => void;
  showToast?: (type: ToastData['type'], message: string) => void;
}

export function GhostModePanel({ state, onToggle, onRefresh, showToast }: GhostModePanelProps) {
  const { active, elementCount, pageType, pageTypeConfidence, counts, error, lastAction } = state;

  // Show toast for last action
  React.useEffect(() => {
    if (lastAction?.result) {
      showToast?.('success', lastAction.result);
    }
  }, [lastAction, showToast]);

  if (!active) {
    return (
      <div className="p-4 fade-up">
        {/* Hero activation card */}
        <div
          className="relative overflow-hidden rounded-2xl p-5 text-center"
          style={{
            background: 'linear-gradient(135deg, #0e1525, #121c2e)',
            border: '1px solid #1a2538',
          }}
        >
          {/* Animated background */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: 'radial-gradient(circle at 50% 0%, rgba(232,121,43,0.15), transparent 60%)',
            }}
          />

          <div className="relative z-10">
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center anim-breathe"
              style={{
                background: 'linear-gradient(135deg, rgba(232,121,43,0.15), rgba(168,85,247,0.1))',
                border: '1.5px solid rgba(232,121,43,0.25)',
              }}
            >
              <Eye size={28} style={{ color: '#e8792b' }} />
            </div>

            <h3 className="text-[16px] font-extrabold mb-1" style={{ color: '#eef2f7' }}>
              Ghost Mode
            </h3>
            <p className="text-[11px] mb-4 leading-relaxed" style={{ color: '#4a5c72', maxWidth: 220, margin: '0 auto' }}>
              See what AI sees. Real-time visual overlay showing every interactive element on the page.
            </p>

            {/* Feature list */}
            <div className="flex flex-wrap justify-center gap-1.5 mb-4">
              {[
                { icon: '🟢', label: 'Buttons' },
                { icon: '🔵', label: 'Inputs' },
                { icon: '🟡', label: 'Links' },
                { icon: '🟣', label: 'Forms' },
                { icon: '🔴', label: 'Danger' },
              ].map((item) => (
                <span
                  key={item.label}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-[8px] font-bold"
                  style={{ background: '#0a0f1a', border: '1px solid #1a2538', color: '#8899ad' }}
                >
                  {item.icon} {item.label}
                </span>
              ))}
            </div>

            <button
              onClick={onToggle}
              className="btn-accent w-full flex items-center justify-center gap-2"
              style={{ padding: '12px 20px' }}
            >
              <Eye size={16} />
              <span>Enable Ghost Mode</span>
            </button>

            <div className="flex items-center justify-center gap-2 mt-3">
              <span className="kbd">Ctrl</span>
              <span className="text-[8px]" style={{ color: '#2e3f58' }}>+</span>
              <span className="kbd">Shift</span>
              <span className="text-[8px]" style={{ color: '#2e3f58' }}>+</span>
              <span className="kbd">G</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active state — show element breakdown
  return (
    <div className="p-3 space-y-2.5 fade-up overflow-y-auto h-full fancy-scroll">
      {/* Status header */}
      <div
        className="flex items-center gap-2.5 p-3 rounded-xl"
        style={{
          background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(232,121,43,0.05))',
          border: '1px solid rgba(34,197,94,0.2)',
        }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(34,197,94,0.15)' }}
        >
          <Eye size={16} style={{ color: '#22c55e' }} className="anim-alive" />
        </div>
        <div className="flex-1">
          <div className="text-[11px] font-bold" style={{ color: '#22c55e' }}>
            Ghost Mode Active
          </div>
          <div className="text-[9px]" style={{ color: '#4a5c72' }}>
            {elementCount} elements detected
          </div>
        </div>
        <button
          onClick={onRefresh}
          className="p-1.5 rounded-lg transition-all duration-200"
          style={{ background: 'rgba(255,255,255,0.05)', color: '#4a5c72' }}
          title="Refresh scan"
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#e8792b'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#4a5c72'; }}
        >
          <RefreshCw size={12} />
        </button>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg transition-all duration-200"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
          title="Disable Ghost Mode"
        >
          <EyeOff size={12} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          className="flex items-center gap-2 p-2.5 rounded-xl text-[10px]"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
        >
          <AlertTriangle size={12} />
          {error}
        </div>
      )}

      {/* Element counts grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { icon: '🟢', count: counts.buttons || 0, label: 'Buttons', color: '#22c55e' },
          { icon: '🔵', count: counts.inputs || 0, label: 'Inputs', color: '#3b82f6' },
          { icon: '🟡', count: counts.links || 0, label: 'Links', color: '#eab308' },
          { icon: '🟣', count: counts.forms || 0, label: 'Forms', color: '#a855f7' },
          { icon: '🔵', count: counts.selects || 0, label: 'Selects', color: '#06b6d4' },
          { icon: '📊', count: counts.total || 0, label: 'Total', color: '#e8792b' },
        ].map((item) => (
          <div
            key={item.label}
            className="flex flex-col items-center gap-0.5 p-2.5 rounded-xl transition-all duration-200"
            style={{ background: '#0e1525', border: '1px solid #1a2538' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = `${item.color}40`;
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = '#1a2538';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}
          >
            <span className="text-[12px]">{item.icon}</span>
            <span className="text-[16px] font-extrabold" style={{ color: item.color }}>{item.count}</span>
            <span className="text-[7px] font-bold uppercase tracking-wider" style={{ color: '#4a5c72' }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Page type */}
      <div
        className="flex items-center justify-between p-3 rounded-xl"
        style={{ background: '#0e1525', border: '1px solid #1a2538' }}
      >
        <div className="flex items-center gap-2">
          <Layers size={12} style={{ color: '#a855f7' }} />
          <span className="text-[10px] font-bold" style={{ color: '#8899ad' }}>Page Type</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 rounded-full text-[9px] font-bold"
            style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)', color: '#c084fc' }}
          >
            📄 {pageType}
          </span>
          <span className="text-[8px] font-bold" style={{ color: '#4a5c72' }}>
            {pageTypeConfidence}%
          </span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="space-y-1.5">
        <div className="text-[9px] font-bold uppercase tracking-wider px-1" style={{ color: '#2e3f58' }}>
          Quick Actions
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {[
            {
              icon: <PenTool size={12} />,
              label: 'Fill All Fields',
              desc: 'Auto-fill detected inputs with sample data',
              color: '#22c55e',
              action: 'fill-all',
            },
            {
              icon: <Crosshair size={12} />,
              label: 'Click Primary CTA',
              desc: 'Click the main action button',
              color: '#e8792b',
              action: 'click-cta',
            },
            {
              icon: <Download size={12} />,
              label: 'Export Structure',
              desc: 'Copy page structure as JSON',
              color: '#3b82f6',
              action: 'export',
            },
          ].map((item) => (
            <button
              key={item.action}
              onClick={() => {
                sendToBackground({ type: 'GHOST_MODE_ACTION', payload: { action: item.action } });
              }}
              className="flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all duration-200"
              style={{ background: '#0e1525', border: '1px solid #1a2538' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = `${item.color}40`;
                (e.currentTarget as HTMLElement).style.background = '#121c2e';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = '#1a2538';
                (e.currentTarget as HTMLElement).style.background = '#0e1525';
              }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${item.color}15`, color: item.color }}
              >
                {item.icon}
              </div>
              <div>
                <div className="text-[10px] font-bold" style={{ color: '#dde4ed' }}>{item.label}</div>
                <div className="text-[8px]" style={{ color: '#4a5c72' }}>{item.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Keyboard shortcuts */}
      <div
        className="p-3 rounded-xl"
        style={{ background: '#0e1525', border: '1px solid #1a2538' }}
      >
        <div className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: '#2e3f58' }}>
          Shortcuts
        </div>
        <div className="space-y-1.5">
          {[
            { keys: ['Ctrl', 'Shift', 'G'], desc: 'Toggle Ghost Mode' },
            { keys: ['Ctrl', 'Shift', 'H'], desc: 'Toggle labels' },
            { keys: ['Esc'], desc: 'Exit Ghost Mode' },
          ].map((shortcut) => (
            <div key={shortcut.desc} className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, i) => (
                  <React.Fragment key={key}>
                    {i > 0 && <span className="text-[7px]" style={{ color: '#2e3f58' }}>+</span>}
                    <span className="kbd">{key}</span>
                  </React.Fragment>
                ))}
              </div>
              <span className="text-[8px]" style={{ color: '#4a5c72' }}>{shortcut.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Last action result */}
      {lastAction && (
        <div
          className="flex items-center gap-2 p-2.5 rounded-xl text-[10px] fade-up"
          style={{
            background: 'rgba(34,197,94,0.06)',
            border: '1px solid rgba(34,197,94,0.15)',
            color: '#4ade80',
          }}
        >
          <Zap size={10} />
          <span>{lastAction.result}</span>
        </div>
      )}
    </div>
  );
}

