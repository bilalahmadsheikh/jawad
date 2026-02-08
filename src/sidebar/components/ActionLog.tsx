import React, { useState } from 'react';
import { useHarborStore } from '../stores/harbor-store';
import { PERMISSION_COLORS } from '../../lib/constants';
import type { ActionLogEntry } from '../../lib/types';
import { Trash2, ChevronDown, ChevronRight, Activity, Clock } from 'lucide-react';

export function ActionLog() {
  const actionLog = useHarborStore((s) => s.actionLog);
  const clearActionLog = useHarborStore((s) => s.clearActionLog);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const resultIcon: Record<string, string> = {
    success: '✅',
    denied: '🚫',
    error: '❌',
  };

  if (actionLog.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-dark-3 flex items-center justify-center mb-3">
          <Activity size={22} className="text-slate-600" />
        </div>
        <p className="text-sm font-semibold text-slate-400">No actions yet</p>
        <p className="text-[11px] text-slate-600 mt-1 max-w-[200px] leading-relaxed">
          Actions will show here as Jawad interacts with pages
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-dark-5/60">
        <div className="flex items-center gap-2">
          <Activity size={12} className="text-accent" />
          <span className="text-[11px] text-slate-400 font-bold">
            {actionLog.length} action{actionLog.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button onClick={clearActionLog} className="btn-ghost flex items-center gap-1 text-[11px] hover:text-red-400">
          <Trash2 size={11} />
          Clear
        </button>
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1.5">
        {actionLog.map((entry: ActionLogEntry) => {
          const color = PERMISSION_COLORS[entry.permissionLevel] || '#64748b';
          const open = expandedId === entry.id;

          return (
            <div
              key={entry.id}
              className={`card overflow-hidden transition-all duration-200 ${
                open ? 'ring-1 ring-dark-6' : 'hover:bg-dark-3/60'
              }`}
            >
              <button
                onClick={() => setExpandedId(open ? null : entry.id)}
                className="w-full text-left px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}40` }}
                  />
                  <span className="text-[12px] font-semibold text-slate-200 truncate flex-1">
                    {entry.toolName}
                  </span>
                  <span className="text-[11px]">{resultIcon[entry.result] || '❓'}</span>
                  {open ? <ChevronDown size={12} className="text-slate-500" /> : <ChevronRight size={12} className="text-slate-500" />}
                </div>
                <div className="flex items-center gap-2 mt-1 ml-[18px]">
                  <span className="text-[10px] text-slate-500 truncate">{entry.site}</span>
                  <span className="text-[10px] text-slate-600 flex items-center gap-0.5">
                    <Clock size={8} />
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </button>

              {open && (
                <div className="px-3 pb-3 space-y-2 anim-in">
                  <div className="h-px bg-dark-5" />
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-slate-500">Decision:</span>
                    <span
                      className={`badge ${
                        entry.decision === 'auto-approved' || (typeof entry.decision === 'string' && entry.decision.startsWith('allow'))
                          ? 'bg-emerald-900/40 text-emerald-400'
                          : 'bg-red-900/40 text-red-400'
                      }`}
                    >
                      {entry.decision}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-slate-500">Level:</span>
                    <span className="badge text-white" style={{ backgroundColor: color }}>
                      {entry.permissionLevel}
                    </span>
                  </div>
                  {Object.keys(entry.parameters).length > 0 && (
                    <pre className="bg-dark-0 rounded-lg p-2 text-[10px] font-mono text-slate-400 max-h-20 overflow-y-auto border border-dark-5">
                      {JSON.stringify(entry.parameters, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
