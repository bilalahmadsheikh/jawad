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
      <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
        <Loader2 size={20} className="animate-spin text-orange-400" />
        <span className="text-xs">Loading Harbor...</span>
      </div>
    );
  }

  const trustLevels = ['blocked', 'read-only', 'navigate', 'interact', 'full'];
  const trustColors: Record<string, string> = {
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
      {/* Section Tabs */}
      <div className="flex items-center gap-0.5 bg-surface-100 mx-2 mt-2 rounded-xl p-0.5">
        {[
          { id: 'sites' as const, icon: <Globe size={12} />, label: 'Sites' },
          { id: 'defaults' as const, icon: <Shield size={12} />, label: 'Defaults' },
          { id: 'tools' as const, icon: <Wrench size={12} />, label: 'Tools' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              activeSection === tab.id
                ? 'bg-orange-500/15 text-orange-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-300 hover:bg-surface-200/50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
        <button
          onClick={resetPolicy}
          className="ml-1 p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
          title="Reset to defaults"
        >
          <RotateCcw size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {/* ── Sites Section ── */}
        {activeSection === 'sites' && (
          <>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium uppercase tracking-wide">
              <Globe size={11} />
              Per-Site Trust Levels
            </div>

            {/* Add Site */}
            <div className="flex gap-1.5">
              <input
                value={newSite}
                onChange={(e) => setNewSite(e.target.value)}
                placeholder="example.com"
                className="flex-1 bg-surface-200/80 border border-slate-700/50 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition-all"
              />
              <select
                value={newTrust}
                onChange={(e) => setNewTrust(e.target.value)}
                className="bg-surface-200/80 border border-slate-700/50 rounded-lg px-2 py-2 text-xs text-slate-200"
              >
                {trustLevels.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddSite}
                className="p-2 gradient-accent rounded-lg text-white shadow-sm shadow-orange-500/20 btn-lift"
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Site List */}
            {Object.entries(policy.trustedSites).length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-surface-200/60 flex items-center justify-center mb-3">
                  <Globe size={20} className="text-slate-600" />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed max-w-[200px]">
                  No site-specific rules yet. Add a site above or they'll be
                  created when you approve permissions.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {Object.entries(policy.trustedSites).map(([domain, trust]) => (
                  <div
                    key={domain}
                    className="glass-card rounded-xl px-3 py-2.5 flex items-center gap-2.5"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: trustColors[trust.trustLevel] || '#64748b',
                        boxShadow: `0 0 6px ${trustColors[trust.trustLevel] || '#64748b'}40`,
                      }}
                    />
                    <span className="text-xs text-slate-200 flex-1 truncate font-medium">
                      {domain}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                      style={{
                        backgroundColor: trustColors[trust.trustLevel] || '#64748b',
                      }}
                    >
                      {trust.trustLevel}
                    </span>
                    <button
                      onClick={() => removeSiteTrust(domain)}
                      className="text-slate-600 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-500/10"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Defaults Section ── */}
        {activeSection === 'defaults' && (
          <>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium uppercase tracking-wide">
              <Shield size={11} />
              Default Permission Behavior
            </div>
            <div className="space-y-1.5">
              {(
                [
                  { key: 'readOnly', label: 'Read-Only Actions', color: PERMISSION_COLORS['read-only'] },
                  { key: 'navigate', label: 'Navigation Actions', color: PERMISSION_COLORS['navigate'] },
                  { key: 'interact', label: 'Interaction Actions', color: PERMISSION_COLORS['interact'] },
                  { key: 'submit', label: 'Submit/Modify Actions', color: PERMISSION_COLORS['submit'] },
                ] as const
              ).map((item) => (
                <div
                  key={item.key}
                  className="glass-card rounded-xl px-3 py-2.5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: item.color, boxShadow: `0 0 6px ${item.color}40` }}
                    />
                    <span className="text-xs text-slate-200 font-medium">{item.label}</span>
                  </div>
                  <select
                    value={policy.defaults[item.key]}
                    onChange={(e) =>
                      updateDefaults({ [item.key]: e.target.value })
                    }
                    className="bg-surface-200/80 border border-slate-700/50 rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                  >
                    <option value="auto-approve">Auto-Approve</option>
                    <option value="ask">Ask</option>
                    <option value="deny">Deny</option>
                  </select>
                </div>
              ))}
            </div>

            <div className="glass-card rounded-xl p-3 text-xs text-slate-400 space-y-1.5">
              <strong className="text-slate-300 text-[11px]">How it works:</strong>
              <ul className="space-y-1 text-[11px]">
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-400 mt-0.5">●</span>
                  <span><strong className="text-slate-300">Auto-Approve:</strong> Tool runs without asking</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-orange-400 mt-0.5">●</span>
                  <span><strong className="text-slate-300">Ask:</strong> Shows permission modal for confirmation</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-red-400 mt-0.5">●</span>
                  <span><strong className="text-slate-300">Deny:</strong> Tool is blocked entirely</span>
                </li>
              </ul>
            </div>
          </>
        )}

        {/* ── Tools Section ── */}
        {activeSection === 'tools' && (
          <>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium uppercase tracking-wide">
              <Wrench size={11} />
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
                    className={`glass-card rounded-xl px-3 py-2.5 transition-all duration-200 ${
                      isEnabled ? '' : 'opacity-40'
                    }`}
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
                                [tool.name]: {
                                  enabled: e.target.checked,
                                  globalAutoApprove:
                                    override?.globalAutoApprove || false,
                                },
                              };
                              savePolicy(newPolicy);
                            }}
                            className="sr-only"
                          />
                          <div
                            className={`w-8 h-4.5 rounded-full transition-colors duration-200 ${
                              isEnabled ? 'bg-orange-500' : 'bg-surface-500'
                            }`}
                            style={{ height: '18px' }}
                          >
                            <div
                              className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 mt-[2px] ${
                                isEnabled ? 'translate-x-[18px]' : 'translate-x-[2px]'
                              }`}
                            />
                          </div>
                        </div>
                        <span className="text-xs font-medium text-slate-200">
                          {tool.name}
                        </span>
                      </label>
                      <span
                        className="px-2 py-0.5 rounded-full text-[9px] font-semibold text-white uppercase tracking-wide"
                        style={{ backgroundColor: color }}
                      >
                        {tool.permission}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 ml-[42px] leading-relaxed">
                      {tool.description}
                    </p>
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
