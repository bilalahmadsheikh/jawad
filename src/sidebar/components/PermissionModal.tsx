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

  const decide = (decision: string) => {
    onDecision(request.id, decision);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end justify-center z-50 p-2">
      <div className="bg-surface-100 border border-slate-700/50 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 gradient-header">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            <ShieldAlert size={18} style={{ color }} />
          </div>
          <div>
            <span className="font-semibold text-sm text-slate-100 block">
              Permission Request
            </span>
            <span className="text-[10px] text-slate-500">Jawad needs your approval</span>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-3">
          {/* What */}
          <div className="glass-card rounded-xl p-2.5">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-1">Action</div>
            <div className="text-sm text-slate-200 font-medium">
              Use{' '}
              <span className="text-orange-400 font-semibold">{request.toolName}</span>
            </div>
          </div>

          {/* Where */}
          <div className="glass-card rounded-xl p-2.5">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-1">Site</div>
            <div className="text-sm text-slate-200">{request.site}</div>
          </div>

          {/* Parameters */}
          {Object.keys(request.parameters).length > 0 && (
            <div className="glass-card rounded-xl p-2.5">
              <div className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-1">Details</div>
              <div className="bg-surface/80 rounded-lg p-2 text-[11px] font-mono text-slate-400 max-h-20 overflow-y-auto">
                {JSON.stringify(request.parameters, null, 2)}
              </div>
            </div>
          )}

          {/* Permission Level Badge */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">Level:</span>
            <span
              className="px-2.5 py-1 rounded-full text-[10px] font-semibold text-white"
              style={{ backgroundColor: color }}
            >
              {levelLabels[request.permissionLevel] || request.permissionLevel}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 py-3 border-t border-slate-700/30 space-y-2 bg-surface-50/50">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => decide('allow-once')}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all duration-200 btn-lift shadow-sm shadow-emerald-500/20"
            >
              <Check size={14} />
              Allow Once
            </button>
            <button
              onClick={() => decide('allow-site')}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl transition-all duration-200 btn-lift"
            >
              <Check size={14} />
              Allow for Site
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => decide('allow-session')}
              className="flex items-center justify-center gap-1 px-2 py-2 bg-surface-400/60 hover:bg-surface-500/60 text-slate-200 text-[11px] font-medium rounded-xl transition-all duration-200"
            >
              <Clock size={12} />
              Session
            </button>
            <button
              onClick={() => decide('deny')}
              className="flex items-center justify-center gap-1 px-2 py-2 bg-red-600/70 hover:bg-red-500 text-white text-[11px] font-medium rounded-xl transition-all duration-200"
            >
              <X size={12} />
              Deny
            </button>
            <button
              onClick={() => decide('deny-all')}
              className="flex items-center justify-center gap-1 px-2 py-2 bg-red-800/70 hover:bg-red-700 text-white text-[11px] font-medium rounded-xl transition-all duration-200"
            >
              <Ban size={12} />
              Block
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
