import React, { useState } from 'react';
import { useHarborStore } from '../stores/harbor-store';
import { PERMISSION_COLORS } from '../../lib/constants';
import type { ActionLogEntry } from '../../lib/types';
import { Trash2, ChevronDown, ChevronRight, Activity, Clock, Shield, Zap } from 'lucide-react';

export function ActionLog() {
  const actionLog = useHarborStore((s) => s.actionLog);
  const clearActionLog = useHarborStore((s) => s.clearActionLog);
  const [openId, setOpenId] = useState<string | null>(null);

  const icon: Record<string, string> = { success: '✅', denied: '🚫', error: '❌' };

  if (actionLog.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#0e1525', border: '1px solid #1a2538' }}>
            <Activity size={24} style={{ color: '#2e3f58' }} />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#121c2e', border: '1px solid #1a2538' }}>
            <Shield size={10} style={{ color: '#4a5c72' }} />
          </div>
        </div>
        <p className="text-[14px] font-bold" style={{ color: '#7a8ea5' }}>No actions yet</p>
        <p className="text-[11px] mt-1.5 max-w-[200px] leading-relaxed" style={{ color: '#3a4a60' }}>
          Actions will appear here as Jawad interacts with pages on your behalf
        </p>
      </div>
    );
  }

  const successCount = actionLog.filter((e) => e.result === 'success').length;
  const deniedCount = actionLog.filter((e) => e.result === 'denied').length;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3.5 py-3" style={{ borderBottom: '1px solid #1a2538' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Zap size={12} style={{ color: '#e8792b' }} />
            <span className="text-[12px] font-bold" style={{ color: '#7a8ea5' }}>
              {actionLog.length} action{actionLog.length !== 1 ? 's' : ''}
            </span>
          </div>
          {/* Mini stats */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}>
              {successCount}✓
            </span>
            {deniedCount > 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                {deniedCount}✗
              </span>
            )}
          </div>
        </div>
        <button onClick={clearActionLog} className="btn-ghost flex items-center gap-1 text-[11px]" style={{ color: '#4a5c72' }}>
          <Trash2 size={11} /> Clear
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2">
        {actionLog.map((entry: ActionLogEntry, idx: number) => {
          const c = PERMISSION_COLORS[entry.permissionLevel] || '#64748b';
          const isOpen = openId === entry.id;
          return (
            <div
              key={entry.id}
              className="card overflow-hidden transition-all duration-300 fade-up"
              style={{
                borderColor: isOpen ? '#253550' : '#1a2538',
                boxShadow: isOpen ? '0 4px 20px rgba(0,0,0,0.3)' : 'none',
                animationDelay: `${Math.min(idx * 30, 150)}ms`,
              }}
            >
              <button
                onClick={() => setOpenId(isOpen ? null : entry.id)}
                className="w-full text-left px-3.5 py-3 transition-colors duration-200"
                style={{ background: isOpen ? '#121c2e' : 'transparent' }}
                onMouseEnter={(e) => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = '#0f1828'; }}
                onMouseLeave={(e) => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: c, boxShadow: `0 0 8px ${c}50` }}
                  />
                  <span className="text-[12px] font-bold truncate flex-1" style={{ color: '#eef2f7' }}>{entry.toolName}</span>
                  <span className="text-[11px]">{icon[entry.result] || '❓'}</span>
                  {isOpen ? <ChevronDown size={12} style={{ color: '#4a5c72' }} /> : <ChevronRight size={12} style={{ color: '#4a5c72' }} />}
                </div>
                <div className="flex items-center gap-2 mt-1.5 ml-5">
                  <span className="text-[10px] truncate" style={{ color: '#3a4a60' }}>{entry.site}</span>
                  <span className="text-[10px] flex items-center gap-0.5" style={{ color: '#2e3f58' }}>
                    <Clock size={8} />
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="px-3.5 pb-3 space-y-2.5 fade-up" style={{ borderTop: '1px solid #1a2538' }}>
                  <div className="pt-2.5 flex items-center gap-2 text-[11px]">
                    <span style={{ color: '#4a5c72' }}>Decision:</span>
                    <span className="badge" style={{
                      background: (entry.decision === 'auto-approved' || (typeof entry.decision === 'string' && entry.decision.startsWith('allow'))) ? '#0a2015' : '#200a0a',
                      color: (entry.decision === 'auto-approved' || (typeof entry.decision === 'string' && entry.decision.startsWith('allow'))) ? '#4ade80' : '#f87171',
                      border: `1px solid ${(entry.decision === 'auto-approved' || (typeof entry.decision === 'string' && entry.decision.startsWith('allow'))) ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
                    }}>
                      {entry.decision}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span style={{ color: '#4a5c72' }}>Level:</span>
                    <span className="badge text-white" style={{ background: c, boxShadow: `0 0 8px ${c}30` }}>{entry.permissionLevel}</span>
                  </div>
                  {Object.keys(entry.parameters).length > 0 && (
                    <pre className="rounded-xl p-3 text-[10px] font-mono max-h-24 overflow-y-auto" style={{ background: '#060b14', border: '1px solid #1a2538', color: '#7a8ea5' }}>
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
