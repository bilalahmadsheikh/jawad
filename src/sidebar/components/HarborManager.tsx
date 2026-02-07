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
} from 'lucide-react';

export function HarborManager() {
  const { policy, isLoading, savePolicy, removeSiteTrust, updateDefaults, resetPolicy } =
    useHarbor();
  const [newSite, setNewSite] = useState('');
  const [newTrust, setNewTrust] = useState('read-only');
  const [activeSection, setActiveSection] = useState<'sites' | 'defaults' | 'tools'>('sites');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        Loading Harbor...
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
      <div className="flex border-b border-slate-700 px-2">
        {[
          { id: 'sites' as const, icon: <Globe size={12} />, label: 'Sites' },
          { id: 'defaults' as const, icon: <Shield size={12} />, label: 'Defaults' },
          { id: 'tools' as const, icon: <Wrench size={12} />, label: 'Tools' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex items-center gap-1 px-3 py-2 text-xs border-b-2 transition-colors ${
              activeSection === tab.id
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
        <button
          onClick={resetPolicy}
          className="ml-auto flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-red-400 transition-colors"
          title="Reset to defaults"
        >
          <RotateCcw size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Sites Section */}
        {activeSection === 'sites' && (
          <>
            <div className="text-xs text-slate-400 font-medium">
              Per-Site Trust Levels
            </div>

            {/* Add Site */}
            <div className="flex gap-1">
              <input
                value={newSite}
                onChange={(e) => setNewSite(e.target.value)}
                placeholder="example.com"
                className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
              <select
                value={newTrust}
                onChange={(e) => setNewTrust(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded px-1 py-1 text-xs text-slate-200"
              >
                {trustLevels.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddSite}
                className="p-1 bg-orange-500 hover:bg-orange-600 rounded text-white"
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Site List */}
            {Object.entries(policy.trustedSites).length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-4">
                No site-specific rules yet. Add a site above or they will be
                created automatically when you approve permissions.
              </div>
            ) : (
              Object.entries(policy.trustedSites).map(([domain, trust]) => (
                <div
                  key={domain}
                  className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 border border-slate-700"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: trustColors[trust.trustLevel] || '#64748b',
                    }}
                  />
                  <span className="text-xs text-slate-200 flex-1 truncate">
                    {domain}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] text-white"
                    style={{
                      backgroundColor: trustColors[trust.trustLevel] || '#64748b',
                    }}
                  >
                    {trust.trustLevel}
                  </span>
                  <button
                    onClick={() => removeSiteTrust(domain)}
                    className="text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </>
        )}

        {/* Defaults Section */}
        {activeSection === 'defaults' && (
          <>
            <div className="text-xs text-slate-400 font-medium">
              Default Permission Behavior
            </div>
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
                className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2 border border-slate-700"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-slate-200">{item.label}</span>
                </div>
                <select
                  value={policy.defaults[item.key]}
                  onChange={(e) =>
                    updateDefaults({ [item.key]: e.target.value })
                  }
                  className="bg-slate-700 border border-slate-600 rounded px-2 py-0.5 text-xs text-slate-200"
                >
                  <option value="auto-approve">Auto-Approve</option>
                  <option value="ask">Ask</option>
                  <option value="deny">Deny</option>
                </select>
              </div>
            ))}

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-2 text-xs text-slate-400">
              <strong className="text-slate-300">How it works:</strong>
              <ul className="mt-1 space-y-1 list-disc list-inside">
                <li>
                  <strong>Auto-Approve:</strong> Tool runs without asking
                </li>
                <li>
                  <strong>Ask:</strong> Shows permission modal for user
                  confirmation
                </li>
                <li>
                  <strong>Deny:</strong> Tool is blocked entirely
                </li>
              </ul>
            </div>
          </>
        )}

        {/* Tools Section */}
        {activeSection === 'tools' && (
          <>
            <div className="text-xs text-slate-400 font-medium">
              Available Tools
            </div>
            {TOOLS.map((tool) => {
              const override = policy.toolOverrides[tool.name];
              const isEnabled = override ? override.enabled : true;
              const color = PERMISSION_COLORS[tool.permission] || '#64748b';

              return (
                <div
                  key={tool.name}
                  className={`bg-slate-800 rounded-lg px-3 py-2 border transition-opacity ${
                    isEnabled
                      ? 'border-slate-700'
                      : 'border-slate-800 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <label className="flex items-center gap-2 flex-1">
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
                        className="rounded border-slate-600 bg-slate-700"
                      />
                      <span className="text-xs font-medium text-slate-200">
                        {tool.name}
                      </span>
                    </label>
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] text-white"
                      style={{ backgroundColor: color }}
                    >
                      {tool.permission}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 ml-6">
                    {tool.description}
                  </p>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

