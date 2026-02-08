import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText, Globe, MousePointer, ShoppingCart, Table2, Bookmark,
  Languages, Bell, Mic, Zap, Trash2, Download, RefreshCw,
  Search, Settings as SettingsIcon, Shield, Activity, Code,
  Eye, Wand2, Command, ArrowRight,
} from 'lucide-react';

interface CommandItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  desc: string;
  shortcut?: string;
  color: string;
  action: () => void;
  category: 'actions' | 'tools' | 'navigation';
}

interface Props {
  open: boolean;
  onClose: () => void;
  onAction: (text: string) => void;
  onSummarize: () => void;
  onResearch: (text: string) => void;
  onClear: () => void;
  onExport: () => void;
  onVoice: () => void;
  onTab: (tab: string) => void;
}

export function CommandPalette({
  open, onClose, onAction, onSummarize, onResearch, onClear, onExport, onVoice, onTab,
}: Props) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands: CommandItem[] = [
    // Actions
    { id: 'summarize', icon: <FileText size={13} />, label: 'Summarize Page', desc: 'Get a summary of the current page', shortcut: 'Ctrl+Shift+S', color: '#22c55e', action: onSummarize, category: 'actions' },
    { id: 'analyze', icon: <Globe size={13} />, label: 'Analyze Website', desc: 'What is this website about?', color: '#3b82f6', action: () => onAction('What is this website about?'), category: 'actions' },
    { id: 'compare', icon: <ShoppingCart size={13} />, label: 'Compare Prices', desc: 'Find similar products at lower prices', color: '#f59e0b', action: () => onAction('Find similar products at lower prices'), category: 'actions' },
    { id: 'tables', icon: <Table2 size={13} />, label: 'Extract Tables', desc: 'Extract all tables from this page', color: '#ec4899', action: () => onAction('Extract all tables from this page'), category: 'actions' },
    { id: 'keypoints', icon: <Bookmark size={13} />, label: 'Key Points', desc: 'Extract key facts as bullet points', color: '#06b6d4', action: () => onAction('Extract the key points and facts from this page'), category: 'actions' },
    { id: 'translate', icon: <Languages size={13} />, label: 'Translate Page', desc: 'Translate page content to another language', color: '#8b5cf6', action: () => onAction('Translate the main content of this page to Spanish'), category: 'actions' },
    { id: 'watch', icon: <Bell size={13} />, label: 'Watch Price', desc: 'Track this product for price changes', color: '#ef4444', action: () => onAction('Watch this product for price changes'), category: 'actions' },
    { id: 'findcta', icon: <MousePointer size={13} />, label: 'Find CTA Button', desc: 'Locate the main call-to-action', color: '#a855f7', action: () => onAction('Find the main call-to-action button'), category: 'actions' },
    { id: 'code', icon: <Code size={13} />, label: 'Extract Code', desc: 'Extract code snippets from the page', color: '#f0a050', action: () => onAction('Extract all code snippets from this page'), category: 'actions' },
    { id: 'readability', icon: <Eye size={13} />, label: 'Reading Mode', desc: 'Clean up page for easy reading', color: '#22d3ee', action: () => onAction('Extract the main article content in clean readable format'), category: 'actions' },

    // Tools
    { id: 'voice', icon: <Mic size={13} />, label: 'Voice Input', desc: 'Start voice command', shortcut: 'Ctrl+Shift+V', color: '#e8792b', action: onVoice, category: 'tools' },
    { id: 'research', icon: <Zap size={13} />, label: 'Research Mode', desc: 'Multi-step research across tabs', color: '#a855f7', action: () => { const q = query || 'research this topic'; onResearch(q); }, category: 'tools' },
    { id: 'clear', icon: <Trash2 size={13} />, label: 'Clear Chat', desc: 'Clear conversation history', shortcut: 'Ctrl+Shift+X', color: '#f87171', action: onClear, category: 'tools' },
    { id: 'export', icon: <Download size={13} />, label: 'Export Chat', desc: 'Download conversation as Markdown', color: '#60a5fa', action: onExport, category: 'tools' },

    // Navigation
    { id: 'nav-chat', icon: <Wand2 size={13} />, label: 'Go to Chat', desc: 'Open chat panel', color: '#e8792b', action: () => onTab('chat'), category: 'navigation' },
    { id: 'nav-log', icon: <Activity size={13} />, label: 'Go to Activity Log', desc: 'View action history', color: '#f59e0b', action: () => onTab('activity'), category: 'navigation' },
    { id: 'nav-settings', icon: <SettingsIcon size={13} />, label: 'Go to Settings', desc: 'Configure LLM and voice', color: '#3b82f6', action: () => onTab('settings'), category: 'navigation' },
    { id: 'nav-harbor', icon: <Shield size={13} />, label: 'Go to Harbor', desc: 'Manage permissions', color: '#22c55e', action: () => onTab('harbor'), category: 'navigation' },
  ];

  const filtered = query.trim()
    ? commands.filter((c) =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.desc.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  const execute = useCallback((cmd: CommandItem) => {
    onClose();
    setTimeout(() => cmd.action(), 50);
  }, [onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && filtered[activeIdx]) { execute(filtered[activeIdx]); }
  };

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const active = listRef.current.querySelector('.cmd-active');
      active?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIdx]);

  if (!open) return null;

  const categories = [
    { key: 'actions', label: 'Quick Actions' },
    { key: 'tools', label: 'Tools' },
    { key: 'navigation', label: 'Navigate' },
  ];

  return (
    <div className="cmd-palette-overlay" onClick={onClose}>
      <div className="cmd-palette" onClick={(e) => e.stopPropagation()}>
        {/* Search input */}
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#4a5c72' }}>
            <Command size={14} />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search…"
            style={{
              backgroundColor: '#0a0f1a',
              color: '#dde4ed',
              paddingLeft: '40px',
              fontSize: 14,
            }}
          />
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[300px] overflow-y-auto py-1 fancy-scroll">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center">
              <Search size={20} style={{ color: '#2e3f58', margin: '0 auto 8px' }} />
              <p className="text-[12px]" style={{ color: '#4a5c72' }}>No commands found</p>
            </div>
          )}

          {categories.map((cat) => {
            const items = filtered.filter((c) => c.category === cat.key);
            if (items.length === 0) return null;
            return (
              <div key={cat.key}>
                <div className="px-4 py-1.5 text-[8px] font-bold uppercase tracking-[0.15em]" style={{ color: '#2e3f58' }}>
                  {cat.label}
                </div>
                {items.map((cmd) => {
                  const globalIdx = filtered.indexOf(cmd);
                  return (
                    <div
                      key={cmd.id}
                      className={`cmd-item ${globalIdx === activeIdx ? 'cmd-active' : ''}`}
                      onClick={() => execute(cmd)}
                      onMouseEnter={() => setActiveIdx(globalIdx)}
                    >
                      <div className="cmd-icon" style={{ background: `${cmd.color}15`, color: cmd.color }}>
                        {cmd.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="cmd-label">{cmd.label}</div>
                        <div className="cmd-desc">{cmd.desc}</div>
                      </div>
                      {cmd.shortcut && <span className="cmd-shortcut">{cmd.shortcut}</span>}
                      <ArrowRight size={10} style={{ color: '#2e3f58', flexShrink: 0 }} />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2" style={{ borderTop: '1px solid #1a2538' }}>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[8px]" style={{ color: '#2e3f58' }}>
              <span className="kbd">↑↓</span> navigate
            </span>
            <span className="flex items-center gap-1 text-[8px]" style={{ color: '#2e3f58' }}>
              <span className="kbd">↵</span> select
            </span>
            <span className="flex items-center gap-1 text-[8px]" style={{ color: '#2e3f58' }}>
              <span className="kbd">esc</span> close
            </span>
          </div>
          <span className="text-[7px] font-bold uppercase tracking-wider" style={{ color: '#2e3f58' }}>
            {filtered.length} commands
          </span>
        </div>
      </div>
    </div>
  );
}

