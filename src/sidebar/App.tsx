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
    { id: 'chat', icon: <MessageSquare size={14} />, label: 'Chat' },
    { id: 'activity', icon: <Activity size={14} />, label: 'Log' },
    { id: 'settings', icon: <SettingsIcon size={14} />, label: 'Config' },
    { id: 'harbor', icon: <Shield size={14} />, label: 'Harbor' },
  ];

  return (
    <div className="flex flex-col h-full bg-dark-0">
      {/* ── Header ── */}
      <header className="flex-shrink-0 bg-dark-2 border-b border-dark-5/60">
        {/* Brand */}
        <div className="flex items-center gap-3 px-3.5 pt-3 pb-2">
          <div className="relative w-9 h-9 rounded-xl gradient-orange flex items-center justify-center shadow-lg shadow-orange-600/20">
            <img
              src={(() => {
                try { return browser.runtime.getURL('icons/fox.svg'); }
                catch { return ''; }
              })()}
              alt="Jawad"
              className="w-5 h-5 brightness-0 invert"
            />
            {/* Online dot */}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-dark-2 status-pulse" />
          </div>
          <div>
            <div className="text-[15px] font-bold text-white tracking-tight leading-none">
              Jawad
              <span className="ml-1.5 text-[9px] font-semibold text-accent/60 uppercase tracking-widest">AI</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Your browser, supercharged</div>
          </div>
        </div>

        {/* Tab nav */}
        <nav className="flex mx-2.5 mb-2 bg-dark-1 rounded-xl p-[3px]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex-1 flex items-center justify-center gap-1.5 py-[7px] rounded-lg text-[11px] font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-dark-4 text-accent shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'activity' && logCount > 0 && (
                <span className="absolute -top-1.5 -right-0.5 min-w-[16px] h-[16px] bg-accent rounded-full text-[8px] text-white font-bold flex items-center justify-center px-1 shadow-md shadow-orange-600/30">
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
