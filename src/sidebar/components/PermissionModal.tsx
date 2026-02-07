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
    <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50 p-2">
      <div className="bg-slate-800 border border-slate-600 rounded-xl w-full max-w-sm shadow-2xl overflow-hidden animate-in slide-in-from-bottom">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-700/50 border-b border-slate-600">
          <ShieldAlert size={20} style={{ color }} />
          <span className="font-semibold text-sm text-slate-200">
            Permission Request
          </span>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-3">
          {/* What */}
          <div>
            <div className="text-xs text-slate-400 mb-1">Action</div>
            <div className="text-sm text-slate-200 font-medium">
              FoxAgent wants to use{' '}
              <span className="text-orange-400">{request.toolName}</span>
            </div>
          </div>

          {/* Where */}
          <div>
            <div className="text-xs text-slate-400 mb-1">Site</div>
            <div className="text-sm text-slate-200">{request.site}</div>
          </div>

          {/* Parameters */}
          {Object.keys(request.parameters).length > 0 && (
            <div>
              <div className="text-xs text-slate-400 mb-1">Details</div>
              <div className="bg-slate-900 rounded p-2 text-xs font-mono text-slate-300 max-h-20 overflow-y-auto">
                {JSON.stringify(request.parameters, null, 2)}
              </div>
            </div>
          )}

          {/* Permission Level Badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Level:</span>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: color }}
            >
              {levelLabels[request.permissionLevel] || request.permissionLevel}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 py-3 border-t border-slate-700 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => decide('allow-once')}
              className="flex items-center justify-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <Check size={14} />
              Allow Once
            </button>
            <button
              onClick={() => decide('allow-site')}
              className="flex items-center justify-center gap-1 px-3 py-2 bg-green-700 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors"
            >
              <Check size={14} />
              Allow for Site
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => decide('allow-session')}
              className="flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-600 hover:bg-slate-500 text-slate-200 text-xs rounded-lg transition-colors"
            >
              <Clock size={12} />
              Session
            </button>
            <button
              onClick={() => decide('deny')}
              className="flex items-center justify-center gap-1 px-2 py-1.5 bg-red-600/80 hover:bg-red-500 text-white text-xs rounded-lg transition-colors"
            >
              <X size={12} />
              Deny
            </button>
            <button
              onClick={() => decide('deny-all')}
              className="flex items-center justify-center gap-1 px-2 py-1.5 bg-red-800 hover:bg-red-700 text-white text-xs rounded-lg transition-colors"
            >
              <Ban size={12} />
              Deny All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

