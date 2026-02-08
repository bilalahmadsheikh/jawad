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
    { id: 'chat', icon: <MessageSquare size={16} />, label: 'Chat' },
    { id: 'activity', icon: <Activity size={16} />, label: 'Log' },
    { id: 'settings', icon: <SettingsIcon size={16} />, label: 'Config' },
    { id: 'harbor', icon: <Shield size={16} />, label: 'Harbor' },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="flex-shrink-0 bg-slate-800 border-b border-slate-700 px-3 py-2">
        <div className="flex items-center gap-2 mb-2">
          <img
            src={(() => {
              try {
                return browser.runtime.getURL('icons/fox.svg');
              } catch {
                return '';
              }
            })()}
            alt="Jawad"
            className="w-6 h-6"
          />
          <span className="font-bold text-orange-400 text-sm">Jawad</span>
          <span className="text-xs text-slate-500 ml-auto">Browser OS</span>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                activeTab === tab.id
                  ? 'bg-orange-500/20 text-orange-400 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'activity' && (
                <span className="ml-1 text-xs text-slate-500">
                  {useHarborStore.getState().actionLog.length || ''}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
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

