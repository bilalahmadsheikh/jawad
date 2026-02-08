import React, { useState } from 'react';
import { useHarborStore } from '../stores/harbor-store';
import { PERMISSION_COLORS } from '../../lib/constants';
import type { ActionLogEntry } from '../../lib/types';
import { Trash2, ChevronDown, ChevronRight, Activity, Clock } from 'lucide-react';

export function ActionLog() {
  const actionLog = useHarborStore((s) => s.actionLog);
  const clearActionLog = useHarborStore((s) => s.clearActionLog);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const resultIcons: Record<string, string> = {
    success: '✅',
    denied: '🚫',
    error: '❌',
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (actionLog.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 p-6">
        <div className="w-14 h-14 rounded-2xl bg-surface-200/60 flex items-center justify-center mb-3">
          <Activity size={24} className="text-slate-600" />
        </div>
        <p className="text-sm font-medium text-slate-400">No actions yet</p>
        <p className="text-xs text-slate-600 mt-1 text-center leading-relaxed">
          Actions will appear here as Jawad interacts with pages
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <Activity size={13} className="text-orange-400" />
          <span className="text-xs text-slate-400 font-semibold">
            {actionLog.length} action{actionLog.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={clearActionLog}
          className="flex items-center gap-1 text-xs text-slate-600 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
        >
          <Trash2 size={12} />
          Clear
        </button>
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5">
        {actionLog.map((entry: ActionLogEntry) => {
          const color = PERMISSION_COLORS[entry.permissionLevel] || '#64748b';
          const isExpanded = expandedId === entry.id;

          return (
            <div
              key={entry.id}
              className={`glass-card rounded-xl overflow-hidden transition-all duration-200 ${
                isExpanded ? 'ring-1 ring-slate-600/50' : 'hover:bg-surface-300/40'
              }`}
            >
              <button
                onClick={() => toggleExpand(entry.id)}
                className="w-full text-left px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}40` }}
                  />
                  <span className="text-xs font-medium text-slate-200 truncate flex-1">
                    {entry.toolName}
                  </span>
                  <span className="text-[11px]">
                    {resultIcons[entry.result] || '❓'}
                  </span>
                  {isExpanded ? (
                    <ChevronDown size={12} className="text-slate-500" />
                  ) : (
                    <ChevronRight size={12} className="text-slate-500" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 ml-[18px]">
                  <span className="text-[10px] text-slate-500 truncate">
                    {entry.site}
                  </span>
                  <span className="text-[10px] text-slate-600 flex items-center gap-0.5">
                    <Clock size={8} />
                    {new Date(entry.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-2 animate-fade-in">
                  <div className="h-px bg-slate-700/40" />
                  <div className="flex gap-2 text-xs items-center">
                    <span className="text-slate-500 text-[11px]">Decision:</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        entry.decision === 'auto-approved'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : typeof entry.decision === 'string' && entry.decision.startsWith('allow')
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-red-500/15 text-red-400'
                      }`}
                    >
                      {entry.decision}
                    </span>
                  </div>
                  <div className="flex gap-2 text-xs items-center">
                    <span className="text-slate-500 text-[11px]">Level:</span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                      style={{ backgroundColor: color }}
                    >
                      {entry.permissionLevel}
                    </span>
                  </div>
                  {Object.keys(entry.parameters).length > 0 && (
                    <div className="bg-surface/80 rounded-lg p-2 text-[10px] font-mono text-slate-400 max-h-20 overflow-y-auto border border-slate-700/30">
                      {JSON.stringify(entry.parameters, null, 2)}
                    </div>
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
