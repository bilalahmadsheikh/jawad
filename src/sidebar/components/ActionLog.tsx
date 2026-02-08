import React, { useState } from 'react';
import { useHarborStore } from '../stores/harbor-store';
import { PERMISSION_COLORS } from '../../lib/constants';
import type { ActionLogEntry } from '../../lib/types';
import { Trash2, ChevronDown, ChevronRight, Activity, Clock } from 'lucide-react';

export function ActionLog() {
  const actionLog = useHarborStore((s) => s.actionLog);
  const clearActionLog = useHarborStore((s) => s.clearActionLog);
  const [openId, setOpenId] = useState<string | null>(null);

  const icon: Record<string, string> = { success: '✅', denied: '🚫', error: '❌' };

  if (actionLog.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: '#1d2840' }}>
          <Activity size={22} style={{ color: '#3d4d65' }} />
        </div>
        <p className="text-[14px] font-bold" style={{ color: '#8899ad' }}>No actions yet</p>
        <p className="text-[11px] mt-1.5 max-w-[200px] leading-relaxed" style={{ color: '#5d6f85' }}>
          Actions appear here as Jawad interacts with pages
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3.5 py-2.5" style={{ borderBottom: '1px solid #253045' }}>
        <div className="flex items-center gap-2">
          <Activity size={12} style={{ color: '#e8792b' }} />
          <span className="text-[11px] font-bold" style={{ color: '#8899ad' }}>
            {actionLog.length} action{actionLog.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button onClick={clearActionLog} className="btn-ghost flex items-center gap-1 text-[11px]" style={{ color: '#5d6f85' }}>
          <Trash2 size={11} /> Clear
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2">
        {actionLog.map((entry: ActionLogEntry) => {
          const c = PERMISSION_COLORS[entry.permissionLevel] || '#64748b';
          const isOpen = openId === entry.id;
          return (
            <div key={entry.id} className={`card overflow-hidden transition-all duration-200 ${isOpen ? '' : 'card-hover'}`} style={isOpen ? { borderColor: '#364966' } : {}}>
              <button onClick={() => setOpenId(isOpen ? null : entry.id)} className="w-full text-left px-3.5 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c, boxShadow: `0 0 8px ${c}40` }} />
                  <span className="text-[12px] font-semibold truncate flex-1" style={{ color: '#eef2f7' }}>{entry.toolName}</span>
                  <span className="text-[11px]">{icon[entry.result] || '❓'}</span>
                  {isOpen ? <ChevronDown size={12} style={{ color: '#5d6f85' }} /> : <ChevronRight size={12} style={{ color: '#5d6f85' }} />}
                </div>
                <div className="flex items-center gap-2 mt-1 ml-5">
                  <span className="text-[10px] truncate" style={{ color: '#5d6f85' }}>{entry.site}</span>
                  <span className="text-[10px] flex items-center gap-0.5" style={{ color: '#3d4d65' }}>
                    <Clock size={8} />
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="px-3.5 pb-3 space-y-2 fade-up" style={{ borderTop: '1px solid #253045' }}>
                  <div className="pt-2 flex items-center gap-2 text-[11px]">
                    <span style={{ color: '#5d6f85' }}>Decision:</span>
                    <span className="badge" style={{
                      background: (entry.decision === 'auto-approved' || (typeof entry.decision === 'string' && entry.decision.startsWith('allow'))) ? '#0f2e1c' : '#2e0f0f',
                      color: (entry.decision === 'auto-approved' || (typeof entry.decision === 'string' && entry.decision.startsWith('allow'))) ? '#4ade80' : '#f87171',
                    }}>
                      {entry.decision}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span style={{ color: '#5d6f85' }}>Level:</span>
                    <span className="badge text-white" style={{ background: c }}>{entry.permissionLevel}</span>
                  </div>
                  {Object.keys(entry.parameters).length > 0 && (
                    <pre className="rounded-lg p-2.5 text-[10px] font-mono max-h-20 overflow-y-auto" style={{ background: '#0a1020', border: '1px solid #253045', color: '#8899ad' }}>
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
