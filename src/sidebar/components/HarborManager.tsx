import React, { useState } from 'react';
import { useHarbor } from '../hooks/useHarbor';
import { TOOLS } from '../../lib/mcp-tool-registry';
import { PERMISSION_COLORS } from '../../lib/constants';
import { Shield, Trash2, Plus, RotateCcw, Globe, Wrench, Loader2, Lock, Unlock } from 'lucide-react';

const FIELD: React.CSSProperties = {
  backgroundColor: '#0f1726',
  color: '#dde4ed',
  border: '1.5px solid #1e2d45',
  borderRadius: 12,
  padding: '10px 14px',
  fontSize: 12,
  outline: 'none',
  fontFamily: 'inherit',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
};

const SELECT: React.CSSProperties = {
  ...FIELD,
  width: 'auto',
  paddingRight: 32,
  cursor: 'pointer',
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%235d6f85'%3E%3Cpath d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
};

const OPTION: React.CSSProperties = { backgroundColor: '#0f1726', color: '#dde4ed' };

export function HarborManager() {
  const { policy, isLoading, savePolicy, removeSiteTrust, updateDefaults, resetPolicy } = useHarbor();
  const [newSite, setNewSite] = useState('');
  const [newTrust, setNewTrust] = useState('read-only');
  const [tab, setTab] = useState<'sites' | 'defaults' | 'tools'>('sites');

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <Loader2 size={20} className="animate-spin" style={{ color: '#e8792b' }} />
        <span className="text-[11px]" style={{ color: '#4a5c72' }}>Loading Harbor…</span>
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
      <div className="flex items-center gap-0.5 mx-3 mt-3 mb-1 p-[3px] rounded-xl" style={{ background: '#0a0f1a' }}>
        {[
          { id: 'sites' as const, icon: <Globe size={11} />, label: 'Sites' },
          { id: 'defaults' as const, icon: <Shield size={11} />, label: 'Defaults' },
          { id: 'tools' as const, icon: <Wrench size={11} />, label: 'Tools' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-all duration-250"
            style={{
              background: tab === t.id ? '#121c2e' : 'transparent',
              color: tab === t.id ? '#e8792b' : '#4a5c72',
              boxShadow: tab === t.id ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
        <button onClick={resetPolicy} className="btn-ghost ml-1 p-1.5" title="Reset" style={{ color: '#4a5c72' }}>
          <RotateCcw size={11} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* ── Sites ── */}
        {tab === 'sites' && (
          <>
            <Label icon={<Globe size={10} />} text="Per-Site Trust Levels" />
            <div className="flex gap-2">
              <input
                value={newSite}
                onChange={(e) => setNewSite(e.target.value)}
                placeholder="example.com"
                className="flex-1"
                style={{ ...FIELD, flex: 1 }}
              />
              <select value={newTrust} onChange={(e) => setNewTrust(e.target.value)} style={SELECT}>
                {levels.map((l) => <option key={l} value={l} style={OPTION}>{l}</option>)}
              </select>
              <button onClick={addSite} className="btn-accent p-2.5 flex items-center justify-center rounded-xl"><Plus size={14} /></button>
            </div>

            {Object.entries(policy.trustedSites).length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: '#0e1525', border: '1px solid #1a2538' }}>
                  <Lock size={20} style={{ color: '#2e3f58' }} />
                </div>
                <p className="text-[11px] leading-relaxed max-w-[200px]" style={{ color: '#3a4a60' }}>
                  No site rules yet. Add one above or they'll appear when you approve permissions.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(policy.trustedSites).map(([domain, trust]) => {
                  const c = lc[trust.trustLevel] || '#64748b';
                  return (
                    <div
                      key={domain}
                      className="card px-3.5 py-3 flex items-center gap-2.5 card-hover"
                    >
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c, boxShadow: `0 0 8px ${c}50` }} />
                      <span className="text-[12px] flex-1 truncate font-bold" style={{ color: '#eef2f7' }}>{domain}</span>
                      <span className="badge text-white" style={{ background: c, boxShadow: `0 0 8px ${c}30` }}>{trust.trustLevel}</span>
                      <button onClick={() => removeSiteTrust(domain)} className="btn-ghost p-1" style={{ color: '#4a5c72' }}>
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
                  { key: 'readOnly', label: 'Read-Only', color: PERMISSION_COLORS['read-only'], icon: <Eye size={12} /> },
                  { key: 'navigate', label: 'Navigate', color: PERMISSION_COLORS['navigate'], icon: <Globe size={12} /> },
                  { key: 'interact', label: 'Interact', color: PERMISSION_COLORS['interact'], icon: <Wrench size={12} /> },
                  { key: 'submit', label: 'Submit / Modify', color: PERMISSION_COLORS['submit'], icon: <Unlock size={12} /> },
                ] as const
              ).map((item) => (
                <div key={item.key} className="card px-3.5 py-3 flex items-center justify-between card-hover">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${item.color}15`, color: item.color }}>
                      {item.icon}
                    </span>
                    <span className="text-[12px] font-bold" style={{ color: '#eef2f7' }}>{item.label}</span>
                  </div>
                  <select
                    value={policy.defaults[item.key]}
                    onChange={(e) => updateDefaults({ [item.key]: e.target.value })}
                    style={{ ...SELECT, fontSize: 11, padding: '6px 28px 6px 10px' }}
                  >
                    <option value="auto-approve" style={OPTION}>Auto-Approve</option>
                    <option value="ask" style={OPTION}>Ask</option>
                    <option value="deny" style={OPTION}>Deny</option>
                  </select>
                </div>
              ))}
            </div>

            <div className="card p-4 text-[11px] space-y-2" style={{ color: '#3a4a60' }}>
              <strong style={{ color: '#7a8ea5' }}>How permissions work:</strong>
              <ul className="space-y-2 mt-1">
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: '#22c55e', boxShadow: '0 0 4px #22c55e' }} />
                  <span><strong style={{ color: '#bfc9d6' }}>Auto-Approve:</strong> Runs instantly, no confirmation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: '#e8792b', boxShadow: '0 0 4px #e8792b' }} />
                  <span><strong style={{ color: '#bfc9d6' }}>Ask:</strong> Shows permission modal before executing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ background: '#ef4444', boxShadow: '0 0 4px #ef4444' }} />
                  <span><strong style={{ color: '#bfc9d6' }}>Deny:</strong> Blocked entirely — agent can't use it</span>
                </li>
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
                  <div
                    key={tool.name}
                    className="card px-3.5 py-3 transition-all duration-300"
                    style={{ opacity: on ? 1 : 0.3 }}
                  >
                    <div className="flex items-center gap-2.5">
                      <label className="flex items-center gap-2.5 flex-1 cursor-pointer">
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
                          <div
                            className="w-9 rounded-full transition-all duration-300"
                            style={{
                              height: 20,
                              background: on ? '#e8792b' : '#1e2d45',
                              boxShadow: on ? '0 0 10px rgba(232,121,43,0.3)' : 'none',
                            }}
                          >
                            <div
                              className="w-4 h-4 rounded-full bg-white shadow-lg transition-transform duration-300"
                              style={{ marginTop: 2, transform: on ? 'translateX(20px)' : 'translateX(2px)' }}
                            />
                          </div>
                        </div>
                        <span className="text-[12px] font-bold" style={{ color: '#eef2f7' }}>{tool.name}</span>
                      </label>
                      <span className="badge text-white uppercase" style={{ background: c, fontSize: 9, boxShadow: `0 0 6px ${c}30` }}>{tool.permission}</span>
                    </div>
                    <p className="text-[10px] mt-1.5 ml-[46px] leading-relaxed" style={{ color: '#3a4a60' }}>{tool.description}</p>
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
    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: '#4a5c72' }}>{icon} {text}</div>
  );
}

function Eye({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
