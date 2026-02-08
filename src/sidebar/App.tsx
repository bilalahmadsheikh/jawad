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

  // Initialize LLM connection
  const llm = useLLM();

  const tabs: { id: TabId; icon: React.ReactNode; label: string }[] = [
    { id: 'chat', icon: <MessageSquare size={15} />, label: 'Chat' },
    { id: 'activity', icon: <Activity size={15} />, label: 'Log' },
    { id: 'settings', icon: <SettingsIcon size={15} />, label: 'Config' },
    { id: 'harbor', icon: <Shield size={15} />, label: 'Harbor' },
  ];

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* ── Header ── */}
      <div className="flex-shrink-0 gradient-header px-3 pt-3 pb-2">
        {/* Brand row */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-xl gradient-accent flex items-center justify-center shadow-lg shadow-orange-500/20">
              <img
                src={(() => {
                  try { return browser.runtime.getURL('icons/fox.svg'); }
                  catch { return ''; }
                })()}
                alt="Jawad"
                className="w-5 h-5 brightness-0 invert"
              />
            </div>
            {/* Online indicator */}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-surface-50 status-dot-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-sm text-white tracking-tight">Jawad</span>
              <span className="text-[10px] text-orange-400/60 font-medium">AI</span>
            </div>
            <span className="text-[10px] text-slate-500 leading-none">Browser OS • Ready</span>
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <div className="flex gap-0.5 bg-surface-100 rounded-xl p-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-orange-500/15 text-orange-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-surface-200/50'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.id === 'activity' && useHarborStore.getState().actionLog.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center shadow">
                  {useHarborStore.getState().actionLog.length > 9
                    ? '9+'
                    : useHarborStore.getState().actionLog.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && <Chat llm={llm} />}
        {activeTab === 'activity' && <ActionLog />}
        {activeTab === 'settings' && <Settings llm={llm} />}
        {activeTab === 'harbor' && <HarborManager />}
      </div>

      {/* Workflow Overlay */}
      <WorkflowPlan llm={llm} />

      {/* Permission Modal */}
      {pendingPermissions.length > 0 && (
        <PermissionModal
          request={pendingPermissions[0]}
          onDecision={llm.respondToPermission}
        />
      )}
    </div>
  );
}
