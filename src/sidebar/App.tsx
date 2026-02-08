import React, { useEffect, useState, useCallback } from 'react';
import { useChatStore } from './stores/chat-store';
import { useHarborStore } from './stores/harbor-store';
import { Chat } from './components/Chat';
import { ActionLog } from './components/ActionLog';
import { Settings } from './components/Settings';
import { HarborManager } from './components/HarborManager';
import { PermissionModal } from './components/PermissionModal';
import { WorkflowPlan } from './components/WorkflowPlan';
import { CommandPalette } from './components/CommandPalette';
import { GhostModePanel } from './components/GhostModePanel';
import { Toast } from './components/Toast';
import type { ToastData } from './components/Toast';
import { useLLM } from './hooks/useLLM';
import { useGhostMode } from './hooks/useGhostMode';
import {
  MessageSquare,
  Activity,
  SettingsIcon,
  Shield,
  Wifi,
  Command,
  Sparkles,
  Eye,
} from 'lucide-react';

type TabId = 'chat' | 'ghost' | 'activity' | 'settings' | 'harbor';

export default function App() {
  const activeTab = useChatStore((s) => s.activeTab);
  const setActiveTab = useChatStore((s) => s.setActiveTab);
  const pendingPermissions = useHarborStore((s) => s.pendingPermissions);
  const logCount = useHarborStore((s) => s.actionLog.length);
  const messageCount = useChatStore((s) => s.messages.length);
  const llm = useLLM();
  const ghostMode = useGhostMode();

  // Command palette
  const [cmdOpen, setCmdOpen] = useState(false);
  // Toast
  const [toast, setToast] = useState<ToastData | null>(null);

  // Uptime counter
  const [uptime, setUptime] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setUptime((u) => u + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
      // Ctrl+Shift+G: Toggle Ghost Mode
      if (e.ctrlKey && e.shiftKey && e.key === 'G') {
        e.preventDefault();
        ghostMode.toggle();
        setActiveTab('ghost');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [ghostMode]);

  const showToast = useCallback((type: ToastData['type'], message: string) => {
    setToast({ id: `${Date.now()}`, type, message });
  }, []);

  const handleCmdAction = useCallback((text: string) => {
    llm.sendChatMessage(text);
    showToast('info', `Sent: "${text.substring(0, 40)}…"`);
  }, [llm, showToast]);

  const handleCmdExport = useCallback(() => {
    const messages = useChatStore.getState().messages;
    if (messages.length === 0) { showToast('error', 'No messages to export'); return; }
    const md = messages.map((m) => {
      const role = m.role === 'user' ? '**You**' : '**Jawad**';
      const time = new Date(m.timestamp).toLocaleTimeString();
      return `${role} (${time}):\n${m.content}\n`;
    }).join('\n---\n\n');
    const blob = new Blob([`# Jawad Conversation Export\n\n${md}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jawad-chat-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Conversation exported!');
  }, [showToast]);

  const tabs: { id: TabId; icon: React.ReactNode; label: string; badge?: number }[] = [
    { id: 'chat',     icon: <MessageSquare size={13} />, label: 'Chat', badge: messageCount > 0 ? messageCount : undefined },
    { id: 'ghost',    icon: <Eye size={13} />,           label: 'Ghost', badge: ghostMode.state.active ? ghostMode.state.elementCount : undefined },
    { id: 'activity', icon: <Activity size={13} />,      label: 'Log',  badge: logCount > 0 ? logCount : undefined },
    { id: 'settings', icon: <SettingsIcon size={13} />,  label: 'Config' },
    { id: 'harbor',   icon: <Shield size={13} />,        label: 'Harbor' },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: '#0a0f1a' }}>
      {/* ── Animated gradient line at very top ── */}
      <div className="header-line" />

      {/* ── Header ── */}
      <header className="flex-shrink-0" style={{ background: '#0e1525', borderBottom: '1px solid #1a2538' }}>
        {/* Brand row */}
        <div className="flex items-center gap-2.5 px-3 pt-2.5 pb-1.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center anim-neon" style={{ background: 'linear-gradient(135deg, #e8792b, #c4581a)' }}>
              <img
                src={(() => { try { return browser.runtime.getURL('icons/fox.svg'); } catch { return ''; } })()}
                alt=""
                className="w-4 h-4 brightness-0 invert"
              />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 status-dot border-2" style={{ borderColor: '#0e1525' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-extrabold tracking-tight" style={{ color: '#eef2f7' }}>
                Jawad
              </span>
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gradient">AI</span>
              <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full" style={{
                background: 'rgba(168,85,247,0.1)',
                border: '1px solid rgba(168,85,247,0.2)',
                color: '#a855f7',
              }}>
                v2.0
              </span>
            </div>
            <div className="text-[9px] font-medium" style={{ color: '#4a5c72' }}>Your browser, supercharged</div>
          </div>
          {/* Command palette trigger + status */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCmdOpen(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-200"
              style={{ background: '#0a0f1a', border: '1px solid #1a2538', color: '#4a5c72' }}
              title="Command Palette (Ctrl+K)"
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = '#e8792b40';
                (e.currentTarget as HTMLElement).style.color = '#e8792b';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = '#1a2538';
                (e.currentTarget as HTMLElement).style.color = '#4a5c72';
              }}
            >
              <Command size={9} />
              <span className="text-[7px] font-mono">K</span>
            </button>
            <div className="flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ background: '#0a1020', border: '1px solid #1a2538' }}>
                <Wifi size={7} style={{ color: '#22c55e' }} />
                <span className="text-[7px] font-bold uppercase tracking-wider" style={{ color: '#22c55e' }}>Live</span>
              </div>
              <span className="text-[7px] font-mono" style={{ color: '#2e3f58' }}>
                {formatUptime(uptime)}
              </span>
            </div>
          </div>
        </div>

        {/* Tab nav */}
        <nav className="flex px-2 gap-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-item relative flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-semibold transition-all duration-200 ${
                activeTab === tab.id ? 'tab-active' : ''
              }`}
              style={{
                color: activeTab === tab.id ? '#e8792b' : '#4a5c72',
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.badge && tab.badge > 0 && (
                <span
                  className="absolute -top-0.5 right-1 min-w-[14px] h-[14px] rounded-full text-[7px] text-white font-bold flex items-center justify-center px-0.5"
                  style={{ background: 'linear-gradient(135deg, #e8792b, #c4581a)', boxShadow: '0 2px 8px rgba(232,121,43,0.4)' }}
                >
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'chat' && (
          <Chat
            llm={llm}
            showToast={showToast}
            onGhostMode={() => {
              ghostMode.toggle();
              setActiveTab('ghost');
            }}
          />
        )}
        {activeTab === 'ghost' && (
          <GhostModePanel
            state={ghostMode.state}
            onToggle={ghostMode.toggle}
            onRefresh={ghostMode.refresh}
            showToast={showToast}
          />
        )}
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

      {/* Command Palette */}
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onAction={handleCmdAction}
        onSummarize={() => { llm.summarizePage(); showToast('info', 'Summarizing page…'); }}
        onResearch={(text) => { llm.startWorkflow(text); showToast('info', 'Starting research…'); }}
        onClear={() => { llm.clearHistory(); showToast('success', 'Chat cleared'); }}
        onExport={handleCmdExport}
        onVoice={() => {
          // Voice is triggered from Chat component via ref
          setActiveTab('chat');
          showToast('info', 'Switch to chat and click mic');
        }}
        onTab={(tab) => setActiveTab(tab as TabId)}
      />

      {/* Toast */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
