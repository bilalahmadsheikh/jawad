import React, { useState } from 'react';
import { useHarbor } from '../hooks/useHarbor';
import { TOOLS } from '../../lib/mcp-tool-registry';
import { PERMISSION_COLORS } from '../../lib/constants';
import { Shield, Trash2, Plus, RotateCcw, Globe, Wrench, Loader2 } from 'lucide-react';

export function HarborManager() {
  const { policy, isLoading, savePolicy, removeSiteTrust, updateDefaults, resetPolicy } = useHarbor();
  const [newSite, setNewSite] = useState('');
  const [newTrust, setNewTrust] = useState('read-only');
  const [tab, setTab] = useState<'sites' | 'defaults' | 'tools'>('sites');

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <Loader2 size={20} className="animate-spin" style={{ color: '#e8792b' }} />
        <span className="text-[11px]" style={{ color: '#5d6f85' }}>Loading Harbor…</span>
      </div>
    );
  }

  const levels = ['blocked', 'read-only', 'navigate', 'interact', 'full'];
  const lc: Record<string, string> = { blocked: '#ef4444', 'read-only': '#22c55e', navigate: '#eab308', interact: '#f97316', full: '#a855f7' };

  const addSite = async () => {
    if (!newSite.trim()) return;
    const domain = newSite.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const u = { ...policy };
    u.trustedSites = { ...u.trustedSites, [domain]: { trustLevel: newTrust as any, autoApprove: [], requireConfirm: [] } };
    await savePolicy(u);
    setNewSite('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center gap-0.5 mx-3 mt-3 mb-1 p-[3px] rounded-xl" style={{ background: '#131b2c' }}>
        {[
          { id: 'sites' as const, icon: <Globe size={11} />, label: 'Sites' },
          { id: 'defaults' as const, icon: <Shield size={11} />, label: 'Defaults' },
          { id: 'tools' as const, icon: <Wrench size={11} />, label: 'Tools' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-[7px] rounded-lg text-[11px] font-semibold transition-all duration-150"
            style={{
              background: tab === t.id ? '#1d2840' : 'transparent',
              color: tab === t.id ? '#e8792b' : '#5d6f85',
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
        <button onClick={resetPolicy} className="btn-ghost ml-1 p-1.5" title="Reset" style={{ color: '#5d6f85' }}>
          <RotateCcw size={11} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* ── Sites ── */}
        {tab === 'sites' && (
          <>
            <Label icon={<Globe size={10} />} text="Per-Site Trust Levels" />

            {/* Add row */}
            <div className="flex gap-2">
              <input value={newSite} onChange={(e) => setNewSite(e.target.value)} placeholder="example.com" className="flex-1" />
              <select value={newTrust} onChange={(e) => setNewTrust(e.target.value)} style={{ width: 'auto' }}>
                {levels.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <button onClick={addSite} className="btn-accent p-2 flex items-center justify-center"><Plus size={14} /></button>
            </div>

            {Object.entries(policy.trustedSites).length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: '#1d2840' }}>
                  <Globe size={20} style={{ color: '#3d4d65' }} />
                </div>
                <p className="text-[11px] leading-relaxed max-w-[200px]" style={{ color: '#5d6f85' }}>
                  No site rules yet. Add one above or they'll appear when you approve permissions.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(policy.trustedSites).map(([domain, trust]) => {
                  const c = lc[trust.trustLevel] || '#64748b';
                  return (
                    <div key={domain} className="card px-3 py-2.5 flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c, boxShadow: `0 0 8px ${c}40` }} />
                      <span className="text-[12px] flex-1 truncate font-semibold" style={{ color: '#eef2f7' }}>{domain}</span>
                      <span className="badge text-white" style={{ background: c }}>{trust.trustLevel}</span>
                      <button onClick={() => removeSiteTrust(domain)} className="btn-ghost p-1" style={{ color: '#5d6f85' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Defaults ── */}
        {tab === 'defaults' && (
          <>
            <Label icon={<Shield size={10} />} text="Default Behavior" />
            <div className="space-y-2">
              {(
                [
                  { key: 'readOnly', label: 'Read-Only', color: PERMISSION_COLORS['read-only'] },
                  { key: 'navigate', label: 'Navigate', color: PERMISSION_COLORS['navigate'] },
                  { key: 'interact', label: 'Interact', color: PERMISSION_COLORS['interact'] },
                  { key: 'submit', label: 'Submit / Modify', color: PERMISSION_COLORS['submit'] },
                ] as const
              ).map((item) => (
                <div key={item.key} className="card px-3 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: item.color, boxShadow: `0 0 8px ${item.color}40` }} />
                    <span className="text-[12px] font-semibold" style={{ color: '#eef2f7' }}>{item.label}</span>
                  </div>
                  <select
                    value={policy.defaults[item.key]}
                    onChange={(e) => updateDefaults({ [item.key]: e.target.value })}
                    style={{ width: 'auto', padding: '5px 28px 5px 10px', fontSize: 11 }}
                  >
                    <option value="auto-approve">Auto-Approve</option>
                    <option value="ask">Ask</option>
                    <option value="deny">Deny</option>
                  </select>
                </div>
              ))}
            </div>

            <div className="card p-3.5 text-[11px] space-y-2" style={{ color: '#5d6f85' }}>
              <strong style={{ color: '#8899ad' }}>How it works:</strong>
              <ul className="space-y-1.5">
                <li className="flex items-start gap-2"><span style={{ color: '#22c55e' }}>●</span><span><strong style={{ color: '#bfc9d6' }}>Auto-Approve:</strong> Runs without asking</span></li>
                <li className="flex items-start gap-2"><span style={{ color: '#e8792b' }}>●</span><span><strong style={{ color: '#bfc9d6' }}>Ask:</strong> Shows permission modal</span></li>
                <li className="flex items-start gap-2"><span style={{ color: '#ef4444' }}>●</span><span><strong style={{ color: '#bfc9d6' }}>Deny:</strong> Blocked entirely</span></li>
              </ul>
            </div>
          </>
        )}

        {/* ── Tools ── */}
        {tab === 'tools' && (
          <>
            <Label icon={<Wrench size={10} />} text="Available Tools" />
            <div className="space-y-2">
              {TOOLS.map((tool) => {
                const override = policy.toolOverrides[tool.name];
                const on = override ? override.enabled : true;
                const c = PERMISSION_COLORS[tool.permission] || '#64748b';
                return (
                  <div key={tool.name} className="card px-3 py-3 transition-opacity duration-200" style={{ opacity: on ? 1 : 0.35 }}>
                    <div className="flex items-center gap-2.5">
                      <label className="flex items-center gap-2.5 flex-1 cursor-pointer">
                        {/* Toggle */}
                        <div className="relative flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={(e) => {
                              const np = { ...policy };
                              np.toolOverrides = { ...np.toolOverrides, [tool.name]: { enabled: e.target.checked, globalAutoApprove: override?.globalAutoApprove || false } };
                              savePolicy(np);
                            }}
                            className="sr-only"
                          />
                          <div className="w-8 rounded-full transition-colors duration-200" style={{ height: 18, background: on ? '#e8792b' : '#293548' }}>
                            <div className="w-3.5 h-3.5 rounded-full bg-white shadow transition-transform duration-200" style={{ marginTop: 2, transform: on ? 'translateX(18px)' : 'translateX(2px)' }} />
                          </div>
                        </div>
                        <span className="text-[12px] font-semibold" style={{ color: '#eef2f7' }}>{tool.name}</span>
                      </label>
                      <span className="badge text-white uppercase" style={{ background: c, fontSize: 9 }}>{tool.permission}</span>
                    </div>
                    <p className="text-[10px] mt-1.5 ml-[42px] leading-relaxed" style={{ color: '#5d6f85' }}>{tool.description}</p>
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

function Label({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: '#5d6f85' }}>{icon} {text}</div>
  );
}
