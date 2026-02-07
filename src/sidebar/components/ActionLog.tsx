import React, { useState } from 'react';
import { useHarborStore } from '../stores/harbor-store';
import { PERMISSION_COLORS } from '../../lib/constants';
import type { ActionLogEntry } from '../../lib/types';
import { Trash2, ChevronDown, ChevronRight } from 'lucide-react';

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
      <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm p-4">
        <div className="text-4xl mb-2">📋</div>
        <p>No actions yet</p>
        <p className="text-xs mt-1">
          Actions will appear here as FoxAgent interacts with pages
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
        <span className="text-xs text-slate-400 font-medium">
          {actionLog.length} action{actionLog.length !== 1 ? 's' : ''} logged
        </span>
        <button
          onClick={clearActionLog}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 transition-colors"
        >
          <Trash2 size={12} />
          Clear
        </button>
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto">
        {actionLog.map((entry: ActionLogEntry) => {
          const color = PERMISSION_COLORS[entry.permissionLevel] || '#64748b';
          const isExpanded = expandedId === entry.id;

          return (
            <div
              key={entry.id}
              className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
            >
              <button
                onClick={() => toggleExpand(entry.id)}
                className="w-full text-left px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-medium text-slate-200 truncate flex-1">
                    {entry.toolName}
                  </span>
                  <span className="text-[10px]">
                    {resultIcons[entry.result] || '❓'}
                  </span>
                  {isExpanded ? (
                    <ChevronDown size={12} className="text-slate-500" />
                  ) : (
                    <ChevronRight size={12} className="text-slate-500" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-slate-500">
                    {entry.site}
                  </span>
                  <span className="text-[10px] text-slate-600">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="px-3 pb-2 space-y-1">
                  <div className="flex gap-2 text-xs">
                    <span className="text-slate-500">Decision:</span>
                    <span
                      className={`font-medium ${
                        entry.decision === 'auto-approved'
                          ? 'text-green-400'
                          : typeof entry.decision === 'string' && entry.decision.startsWith('allow')
                            ? 'text-green-400'
                            : 'text-red-400'
                      }`}
                    >
                      {entry.decision}
                    </span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="text-slate-500">Level:</span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] text-white"
                      style={{ backgroundColor: color }}
                    >
                      {entry.permissionLevel}
                    </span>
                  </div>
                  {Object.keys(entry.parameters).length > 0 && (
                    <div className="bg-slate-900 rounded p-1.5 text-[10px] font-mono text-slate-400 max-h-16 overflow-y-auto">
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

