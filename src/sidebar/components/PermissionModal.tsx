import React from 'react';
import type { PermissionRequest } from '../../lib/types';
import { PERMISSION_COLORS } from '../../lib/constants';
import { ShieldAlert, Check, X, Clock, Ban } from 'lucide-react';

interface Props {
  request: PermissionRequest;
  onDecision: (id: string, decision: string) => void;
}

export function PermissionModal({ request, onDecision }: Props) {
  const color = PERMISSION_COLORS[request.permissionLevel] || '#f97316';
  const labels: Record<string, string> = { 'read-only': 'Read Only', navigate: 'Navigate', interact: 'Interact', submit: 'Submit / Modify' };
  const decide = (d: string) => onDecision(request.id, d);

  return (
    <div className="fixed inset-0 flex items-end justify-center z-50 p-3" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl slide-up" style={{ background: '#0e1525', border: '1px solid #1a2538', boxShadow: `0 -8px 40px rgba(0,0,0,0.5), 0 0 30px ${color}10` }}>
        {/* Gradient line */}
        <div className="h-[2px]" style={{ background: `linear-gradient(90deg, ${color}, #e8792b)` }} />

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: '1px solid #1a2538' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
            <ShieldAlert size={20} style={{ color }} />
          </div>
          <div>
            <span className="font-extrabold text-[14px] block" style={{ color: '#eef2f7' }}>Permission Request</span>
            <span className="text-[10px] font-medium" style={{ color: '#4a5c72' }}>Jawad needs your approval to proceed</span>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-3.5 space-y-2.5">
          <InfoRow label="Action">
            Use <strong style={{ color: '#e8792b' }}>{request.toolName}</strong>
          </InfoRow>
          <InfoRow label="Site">{request.site}</InfoRow>

          {Object.keys(request.parameters).length > 0 && (
            <InfoRow label="Details">
              <pre className="rounded-xl p-2.5 text-[10px] font-mono max-h-20 overflow-y-auto" style={{ background: '#060b14', border: '1px solid #1a2538', color: '#7a8ea5' }}>
                {JSON.stringify(request.parameters, null, 2)}
              </pre>
            </InfoRow>
          )}

          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-wider font-bold" style={{ color: '#4a5c72' }}>Level:</span>
            <span className="badge text-white" style={{ background: color, boxShadow: `0 0 8px ${color}30` }}>{labels[request.permissionLevel] || request.permissionLevel}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="px-4 py-4 space-y-2" style={{ borderTop: '1px solid #1a2538' }}>
          <div className="grid grid-cols-2 gap-2">
            <Btn onClick={() => decide('allow-once')} bg="#0a2015" border="#16a34a" fg="#4ade80" icon={<Check size={13} />}>Allow Once</Btn>
            <Btn onClick={() => decide('allow-site')} bg="#0a2015" border="#15803d" fg="#22c55e" icon={<Check size={13} />}>Allow Site</Btn>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Btn onClick={() => decide('allow-session')} bg="#121c2e" border="#1e2d45" fg="#7a8ea5" icon={<Clock size={11} />}>Session</Btn>
            <Btn onClick={() => decide('deny')} bg="#200a0a" border="#b91c1c" fg="#f87171" icon={<X size={11} />}>Deny</Btn>
            <Btn onClick={() => decide('deny-all')} bg="#200a0a" border="#7f1d1d" fg="#ef4444" icon={<Ban size={11} />}>Block</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-3" style={{ background: '#0a0f1a', border: '1px solid #1a2538' }}>
      <div className="text-[9px] uppercase tracking-[0.1em] font-bold mb-1" style={{ color: '#4a5c72' }}>{label}</div>
      <div className="text-[13px]" style={{ color: '#bfc9d6' }}>{children}</div>
    </div>
  );
}

function Btn({ onClick, bg, border, fg = '#fff', icon, children }: { onClick: () => void; bg: string; border: string; fg?: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-250"
      style={{ background: bg, color: fg, border: `1px solid ${border}30` }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = `${border}60`;
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 15px ${border}15`;
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = `${border}30`;
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      }}
    >
      {icon} {children}
    </button>
  );
}
