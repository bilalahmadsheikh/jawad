import React, { useState } from 'react';
import { useHarbor } from '../hooks/useHarbor';
import { TOOLS } from '../../lib/mcp-tool-registry';
import { PERMISSION_COLORS } from '../../lib/constants';
import {
  Shield,
  Trash2,
  Plus,
  RotateCcw,
  Globe,
  Wrench,
  Loader2,
} from 'lucide-react';

export function HarborManager() {
  const { policy, isLoading, savePolicy, removeSiteTrust, updateDefaults, resetPolicy } =
    useHarbor();
  const [newSite, setNewSite] = useState('');
  const [newTrust, setNewTrust] = useState('read-only');
  const [activeSection, setActiveSection] = useState<'sites' | 'defaults' | 'tools'>('sites');

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <Loader2 size={20} className="animate-spin text-accent" />
        <span className="text-[11px] text-slate-500">Loading Harbor…</span>
      </div>
    );
  }

  const trustLevels = ['blocked', 'read-only', 'navigate', 'interact', 'full'];
  const trustColor: Record<string, string> = {
    blocked: '#ef4444',
    'read-only': '#22c55e',
    navigate: '#eab308',
    interact: '#f97316',
    full: '#a855f7',
  };

  const handleAddSite = async () => {
    if (!newSite.trim()) return;
    const domain = newSite.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const updated = { ...policy };
    updated.trustedSites = {
      ...updated.trustedSites,
      [domain]: {
        trustLevel: newTrust as 'blocked' | 'read-only' | 'navigate' | 'interact' | 'full',
        autoApprove: [],
        requireConfirm: [],
      },
    };
    await savePolicy(updated);
    setNewSite('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Section tabs */}
      <div className="flex items-center gap-0.5 bg-dark-1 mx-2.5 mt-2 rounded-xl p-[3px]">
        {[
          { id: 'sites' as const, icon: <Globe size={11} />, label: 'Sites' },
          { id: 'defaults' as const, icon: <Shield size={11} />, label: 'Defaults' },
          { id: 'tools' as const, icon: <Wrench size={11} />, label: 'Tools' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-[7px] rounded-lg text-[11px] font-semibold transition-all duration-200 ${
              activeSection === tab.id
                ? 'bg-dark-4 text-accent shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
        <button
          onClick={resetPolicy}
          className="btn-ghost ml-1 p-1.5 hover:text-red-400"
          title="Reset to defaults"
        >
          <RotateCcw size={11} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {/* ── Sites ── */}
        {activeSection === 'sites' && (
          <>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              <Globe size={10} />
              Per-Site Trust Levels
            </div>

            {/* Add site row */}
            <div className="flex gap-1.5">
              <input
                value={newSite}
                onChange={(e) => setNewSite(e.target.value)}
                placeholder="example.com"
                className="input-field flex-1"
              />
              <select
                value={newTrust}
                onChange={(e) => setNewTrust(e.target.value)}
                className="input-field w-auto"
              >
                {trustLevels.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <button onClick={handleAddSite} className="btn-primary p-2 flex items-center justify-center">
                <Plus size={14} />
              </button>
            </div>

            {Object.entries(policy.trustedSites).length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-dark-3 flex items-center justify-center mb-3">
                  <Globe size={20} className="text-slate-600" />
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed max-w-[200px]">
                  No site-specific rules yet. Add a site above or they'll appear when you approve permissions.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {Object.entries(policy.trustedSites).map(([domain, trust]) => {
                  const c = trustColor[trust.trustLevel] || '#64748b';
                  return (
                    <div key={domain} className="card px-3 py-2.5 flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c, boxShadow: `0 0 6px ${c}40` }} />
                      <span className="text-[12px] text-slate-200 flex-1 truncate font-semibold">{domain}</span>
                      <span className="badge text-white" style={{ backgroundColor: c }}>{trust.trustLevel}</span>
                      <button onClick={() => removeSiteTrust(domain)} className="btn-ghost p-1 hover:text-red-400">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Defaults ── */}
        {activeSection === 'defaults' && (
          <>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              <Shield size={10} />
              Default Permission Behavior
            </div>
            <div className="space-y-1.5">
              {(
                [
                  { key: 'readOnly', label: 'Read-Only Actions', color: PERMISSION_COLORS['read-only'] },
                  { key: 'navigate', label: 'Navigation Actions', color: PERMISSION_COLORS['navigate'] },
                  { key: 'interact', label: 'Interaction Actions', color: PERMISSION_COLORS['interact'] },
                  { key: 'submit', label: 'Submit / Modify', color: PERMISSION_COLORS['submit'] },
                ] as const
              ).map((item) => (
                <div key={item.key} className="card px-3 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color, boxShadow: `0 0 6px ${item.color}40` }} />
                    <span className="text-[12px] text-slate-200 font-medium">{item.label}</span>
                  </div>
                  <select
                    value={policy.defaults[item.key]}
                    onChange={(e) => updateDefaults({ [item.key]: e.target.value })}
                    className="input-field w-auto py-1 px-2 text-[11px]"
                  >
                    <option value="auto-approve">Auto-Approve</option>
                    <option value="ask">Ask</option>
                    <option value="deny">Deny</option>
                  </select>
                </div>
              ))}
            </div>

            <div className="card p-3 text-[11px] space-y-2">
              <strong className="text-slate-300">How it works:</strong>
              <ul className="space-y-1.5 text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">●</span>
                  <span><strong className="text-slate-300">Auto-Approve:</strong> Runs without asking</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 mt-0.5">●</span>
                  <span><strong className="text-slate-300">Ask:</strong> Shows permission modal</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">●</span>
                  <span><strong className="text-slate-300">Deny:</strong> Blocked entirely</span>
                </li>
              </ul>
            </div>
          </>
        )}

        {/* ── Tools ── */}
        {activeSection === 'tools' && (
          <>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              <Wrench size={10} />
              Available Tools
            </div>
            <div className="space-y-1.5">
              {TOOLS.map((tool) => {
                const override = policy.toolOverrides[tool.name];
                const isEnabled = override ? override.enabled : true;
                const color = PERMISSION_COLORS[tool.permission] || '#64748b';

                return (
                  <div
                    key={tool.name}
                    className={`card px-3 py-2.5 transition-opacity duration-200 ${isEnabled ? '' : 'opacity-40'}`}
                  >
                    <div className="flex items-center gap-2.5 mb-1">
                      <label className="flex items-center gap-2.5 flex-1 cursor-pointer">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={(e) => {
                              const newPolicy = { ...policy };
                              newPolicy.toolOverrides = {
                                ...newPolicy.toolOverrides,
                                [tool.name]: { enabled: e.target.checked, globalAutoApprove: override?.globalAutoApprove || false },
                              };
                              savePolicy(newPolicy);
                            }}
                            className="sr-only"
                          />
                          {/* Toggle switch */}
                          <div className={`w-8 rounded-full transition-colors duration-200 ${isEnabled ? 'bg-accent' : 'bg-dark-6'}`} style={{ height: '18px' }}>
                            <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 mt-[2px] ${isEnabled ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                          </div>
                        </div>
                        <span className="text-[12px] font-semibold text-slate-200">{tool.name}</span>
                      </label>
                      <span className="badge text-white uppercase" style={{ backgroundColor: color, fontSize: '9px' }}>
                        {tool.permission}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 ml-[42px] leading-relaxed">{tool.description}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
