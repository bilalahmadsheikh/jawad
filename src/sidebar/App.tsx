import React from 'react';
import { useChatStore } from './stores/chat-store';
import { useHarborStore } from './stores/harbor-store';
import { Chat } from './components/Chat';
import { ActionLog } from './components/ActionLog';
import { Settings } from './components/Settings';
import { HarborManager } from './components/HarborManager';
import { PermissionModal } from './components/PermissionModal';
import { WorkflowPlan } from './components/WorkflowPlan';
import { useLLM } from './hooks/useLLM';
import {
  MessageSquare,
  Activity,
  SettingsIcon,
  Shield,
} from 'lucide-react';

type TabId = 'chat' | 'activity' | 'settings' | 'harbor';

export default function App() {
  const activeTab = useChatStore((s) => s.activeTab);
  const setActiveTab = useChatStore((s) => s.setActiveTab);
  const pendingPermissions = useHarborStore((s) => s.pendingPermissions);
  const logCount = useHarborStore((s) => s.actionLog.length);
  const llm = useLLM();

  const tabs: { id: TabId; icon: React.ReactNode; label: string }[] = [
    { id: 'chat',     icon: <MessageSquare size={14} />, label: 'Chat' },
    { id: 'activity', icon: <Activity size={14} />,      label: 'Log' },
    { id: 'settings', icon: <SettingsIcon size={14} />,  label: 'Config' },
    { id: 'harbor',   icon: <Shield size={14} />,        label: 'Harbor' },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: '#0a0f1a' }}>
      {/* ── Animated gradient line at very top ── */}
      <div className="header-line" />

      {/* ── Header ── */}
      <header className="flex-shrink-0" style={{ background: '#0e1525', borderBottom: '1px solid #1a2538' }}>
        {/* Brand row */}
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center anim-neon" style={{ background: 'linear-gradient(135deg, #e8792b, #c4581a)' }}>
              <img
                src={(() => { try { return browser.runtime.getURL('icons/fox.svg'); } catch { return ''; } })()}
                alt=""
                className="w-[18px] h-[18px] brightness-0 invert"
              />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 status-dot border-2" style={{ borderColor: '#0e1525' }} />
          </div>
          <div className="flex-1">
            <div className="text-[15px] font-extrabold tracking-tight" style={{ color: '#eef2f7' }}>
              Jawad<span className="ml-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-gradient">AI</span>
            </div>
            <div className="text-[10px] font-medium" style={{ color: '#4a5c72' }}>Your browser, supercharged</div>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: '#0a1020', border: '1px solid #1a2538' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
            <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: '#22c55e' }}>Live</span>
          </div>
        </div>

        {/* Tab nav */}
        <nav className="flex px-3 gap-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-item relative flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold transition-all duration-200 ${
                activeTab === tab.id ? 'tab-active' : ''
              }`}
              style={{
                color: activeTab === tab.id ? '#e8792b' : '#4a5c72',
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'activity' && logCount > 0 && (
                <span
                  className="absolute -top-0.5 right-2 min-w-[16px] h-[16px] rounded-full text-[8px] text-white font-bold flex items-center justify-center px-1"
                  style={{ background: 'linear-gradient(135deg, #e8792b, #c4581a)', boxShadow: '0 2px 8px rgba(232,121,43,0.4)' }}
                >
                  {logCount > 9 ? '9+' : logCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'chat' && <Chat llm={llm} />}
        {activeTab === 'activity' && <ActionLog />}
        {activeTab === 'settings' && <Settings llm={llm} />}
        {activeTab === 'harbor' && <HarborManager />}
      </main>

      {/* Overlays */}
      <WorkflowPlan llm={llm} />
      {pendingPermissions.length > 0 && (
        <PermissionModal
          request={pendingPermissions[0]}
          onDecision={llm.respondToPermission}
        />
      )}
    </div>
  );
}
