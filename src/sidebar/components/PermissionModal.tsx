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
    <div className="fixed inset-0 flex items-end justify-center z-50 p-2" style={{ background: 'rgba(0,0,0,0.8)' }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl slide-up" style={{ background: '#151e30', border: '1px solid #253045' }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3.5" style={{ background: '#131b2c', borderBottom: '1px solid #253045' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
            <ShieldAlert size={18} style={{ color }} />
          </div>
          <div>
            <span className="font-bold text-[14px] block" style={{ color: '#eef2f7' }}>Permission Request</span>
            <span className="text-[10px]" style={{ color: '#5d6f85' }}>Jawad needs your approval</span>
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
              <pre className="rounded-lg p-2 text-[10px] font-mono max-h-20 overflow-y-auto" style={{ background: '#0a1020', border: '1px solid #253045', color: '#8899ad' }}>
                {JSON.stringify(request.parameters, null, 2)}
              </pre>
            </InfoRow>
          )}

          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-wider font-bold" style={{ color: '#5d6f85' }}>Level:</span>
            <span className="badge text-white" style={{ background: color }}>{labels[request.permissionLevel] || request.permissionLevel}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="px-4 py-3.5 space-y-2" style={{ background: '#131b2c', borderTop: '1px solid #253045' }}>
          <div className="grid grid-cols-2 gap-2">
            <Btn onClick={() => decide('allow-once')} bg="#16a34a" icon={<Check size={13} />}>Allow Once</Btn>
            <Btn onClick={() => decide('allow-site')} bg="#15803d" icon={<Check size={13} />}>Allow Site</Btn>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Btn onClick={() => decide('allow-session')} bg="#1d2840" fg="#8899ad" icon={<Clock size={11} />}>Session</Btn>
            <Btn onClick={() => decide('deny')} bg="#b91c1c" icon={<X size={11} />}>Deny</Btn>
            <Btn onClick={() => decide('deny-all')} bg="#7f1d1d" icon={<Ban size={11} />}>Block</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-2.5" style={{ background: '#172033', border: '1px solid #253045' }}>
      <div className="text-[9px] uppercase tracking-wider font-bold mb-1" style={{ color: '#5d6f85' }}>{label}</div>
      <div className="text-[13px]" style={{ color: '#bfc9d6' }}>{children}</div>
    </div>
  );
}

function Btn({ onClick, bg, fg = '#fff', icon, children }: { onClick: () => void; bg: string; fg?: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-200 hover:brightness-110"
      style={{ background: bg, color: fg }}
    >
      {icon} {children}
    </button>
  );
}
