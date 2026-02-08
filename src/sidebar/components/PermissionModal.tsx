import React from 'react';
import type { PermissionRequest } from '../../lib/types';
import { PERMISSION_COLORS } from '../../lib/constants';
import { ShieldAlert, Check, X, Clock, Ban } from 'lucide-react';

interface PermissionModalProps {
  request: PermissionRequest;
  onDecision: (requestId: string, decision: string) => void;
}

export function PermissionModal({ request, onDecision }: PermissionModalProps) {
  const color = PERMISSION_COLORS[request.permissionLevel] || '#f97316';
  const levelLabels: Record<string, string> = {
    'read-only': 'Read Only',
    navigate: 'Navigate',
    interact: 'Interact',
    submit: 'Submit / Modify',
  };

  const decide = (decision: string) => onDecision(request.id, decision);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-50 p-2">
      <div className="bg-dark-2 border border-dark-5 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden anim-slide">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-dark-3 border-b border-dark-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
            <ShieldAlert size={18} style={{ color }} />
          </div>
          <div>
            <span className="font-bold text-[14px] text-white block">Permission Request</span>
            <span className="text-[10px] text-slate-500">Jawad needs your approval</span>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-2.5">
          <div className="card-elevated p-2.5">
            <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-1">Action</div>
            <div className="text-[13px] text-slate-200 font-semibold">
              Use <span className="text-accent">{request.toolName}</span>
            </div>
          </div>

          <div className="card-elevated p-2.5">
            <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-1">Site</div>
            <div className="text-[13px] text-slate-200">{request.site}</div>
          </div>

          {Object.keys(request.parameters).length > 0 && (
            <div className="card-elevated p-2.5">
              <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-1">Details</div>
              <pre className="bg-dark-0 rounded-lg p-2 text-[10px] font-mono text-slate-400 max-h-20 overflow-y-auto border border-dark-5">
                {JSON.stringify(request.parameters, null, 2)}
              </pre>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Level:</span>
            <span className="badge text-white" style={{ backgroundColor: color }}>
              {levelLabels[request.permissionLevel] || request.permissionLevel}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 py-3 border-t border-dark-5 space-y-2 bg-dark-1">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => decide('allow-once')}
              className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-xl transition-all shadow-sm shadow-emerald-600/20"
            >
              <Check size={13} /> Allow Once
            </button>
            <button
              onClick={() => decide('allow-site')}
              className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold rounded-xl transition-all"
            >
              <Check size={13} /> Allow for Site
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => decide('allow-session')}
              className="flex items-center justify-center gap-1 py-2 bg-dark-4 hover:bg-dark-5 text-slate-300 text-[10px] font-semibold rounded-xl transition-all"
            >
              <Clock size={11} /> Session
            </button>
            <button
              onClick={() => decide('deny')}
              className="flex items-center justify-center gap-1 py-2 bg-red-700 hover:bg-red-600 text-white text-[10px] font-semibold rounded-xl transition-all"
            >
              <X size={11} /> Deny
            </button>
            <button
              onClick={() => decide('deny-all')}
              className="flex items-center justify-center gap-1 py-2 bg-red-900 hover:bg-red-800 text-white text-[10px] font-semibold rounded-xl transition-all"
            >
              <Ban size={11} /> Block
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
