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
    { id: 'chat',     icon: <MessageSquare size={15} />, label: 'Chat' },
    { id: 'activity', icon: <Activity size={15} />,      label: 'Log' },
    { id: 'settings', icon: <SettingsIcon size={15} />,  label: 'Config' },
    { id: 'harbor',   icon: <Shield size={15} />,        label: 'Harbor' },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: '#0e1525' }}>
      {/* ── Header ── */}
      <header className="flex-shrink-0" style={{ background: '#131b2c', borderBottom: '1px solid #253045' }}>
        {/* Brand row */}
        <div className="flex items-center gap-3 px-4 pt-3.5 pb-2">
          <div className="relative w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e8792b, #d4621a)' }}>
            <img
              src={(() => { try { return browser.runtime.getURL('icons/fox.svg'); } catch { return ''; } })()}
              alt=""
              className="w-[18px] h-[18px] brightness-0 invert"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 anim-alive" style={{ background: '#22c55e', borderColor: '#131b2c' }} />
          </div>
          <div>
            <div className="text-[15px] font-bold tracking-tight" style={{ color: '#eef2f7' }}>
              Jawad<span className="ml-1.5 text-[9px] font-bold uppercase tracking-widest" style={{ color: '#e8792b' }}>AI</span>
            </div>
            <div className="text-[10px]" style={{ color: '#5d6f85' }}>Your browser, supercharged</div>
          </div>
        </div>

        {/* Tab nav */}
        <nav className="flex px-3 gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold transition-all duration-150 border-b-2 ${
                activeTab === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'activity' && logCount > 0 && (
                <span className="absolute -top-0.5 right-1 min-w-[15px] h-[15px] rounded-full text-[8px] text-white font-bold flex items-center justify-center px-1" style={{ background: '#e8792b' }}>
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
