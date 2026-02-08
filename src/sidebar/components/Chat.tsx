import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useChatStore } from '../stores/chat-store';
import { VoiceButton } from './VoiceButton';
import type { VoiceButtonHandle } from './VoiceButton';
import type { LLMActions } from '../hooks/useLLM';
import type { ToastData } from './Toast';
import {
  Send, Trash2, Zap, Bot, User, FileText, Sparkles, Globe,
  MousePointer, Mic, ShoppingCart, Bookmark, ArrowRight,
  Brain, Shield, Command, Wand2, Copy, Check, ThumbsUp,
  ThumbsDown, RefreshCw, Download, ChevronDown, Table2,
  Languages, Bell, Hash, Keyboard, Search, Code,
  Star, Crosshair, PenTool, BookOpen, Layers, Eye,
  TrendingUp, Clock, MessageCircle,
} from 'lucide-react';

interface ChatProps {
  llm: LLMActions;
  showToast?: (type: ToastData['type'], message: string) => void;
  onGhostMode?: () => void;
}

/* ── Welcome screen ── */
function WelcomeScreen({ onChip, onVoice, onGhostMode }: { onChip: (text: string) => void; onVoice: () => void; onGhostMode?: () => void }) {
  const quickActions = [
    { icon: <FileText size={14} />, label: 'Summarize', desc: 'Get page summary', action: 'Summarize this page', color: '#22c55e', hotkey: 'S' },
    { icon: <Globe size={14} />, label: 'Analyze', desc: 'What is this?', action: 'What is this website about?', color: '#3b82f6', hotkey: 'A' },
    { icon: <MousePointer size={14} />, label: 'Find CTA', desc: 'Locate button', action: 'Find the main call-to-action button', color: '#a855f7', hotkey: 'F' },
    { icon: <ShoppingCart size={14} />, label: 'Compare', desc: 'Price check', action: 'Find similar products at lower prices', color: '#f59e0b', hotkey: 'C' },
    { icon: <Table2 size={14} />, label: 'Tables', desc: 'Extract data', action: 'Extract all tables from this page', color: '#ec4899', hotkey: 'T' },
    { icon: <Bookmark size={14} />, label: 'Key Points', desc: 'Extract facts', action: 'Extract the key points and facts from this page', color: '#06b6d4', hotkey: 'K' },
    { icon: <Languages size={14} />, label: 'Translate', desc: 'Any language', action: 'Translate the main content of this page to Spanish', color: '#8b5cf6', hotkey: 'L' },
    { icon: <Bell size={14} />, label: 'Watch Price', desc: 'Track changes', action: 'Watch this product for price changes', color: '#ef4444', hotkey: 'W' },
    { icon: <Eye size={14} />, label: 'Ghost Mode', desc: 'AI Vision', action: '__GHOST_MODE__', color: '#10b981', hotkey: 'G' },
  ];

  // Animated text
  const [textIdx, setTextIdx] = useState(0);
  const taglines = ['Summarize any page', 'Compare prices', 'Extract data', 'Navigate the web', 'Draft emails', 'Research topics'];
  useEffect(() => {
    const t = setInterval(() => setTextIdx((i) => (i + 1) % taglines.length), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 fade-up" style={{ paddingBottom: '5%' }}>
      {/* Hero icon with glow */}
      <div className="hero-icon relative mb-5 anim-float">
        <div className="hero-orbit" />
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #e8792b, #c4581a)',
            boxShadow: '0 8px 40px rgba(232,121,43,0.35)',
          }}
        >
          <Sparkles size={24} className="text-white" />
        </div>
      </div>

      <h1 className="text-[22px] font-extrabold text-center leading-tight mb-1 anim-text-glow" style={{ color: '#eef2f7' }}>
        Hey, I'm Jawad
      </h1>
      <p className="text-[11px] text-center leading-relaxed mb-0.5" style={{ color: '#4a5c72', maxWidth: 220 }}>
        Your AI-powered browser companion
      </p>

      {/* Animated tagline */}
      <div className="h-5 flex items-center justify-center mb-3">
        <span
          key={textIdx}
          className="text-[10px] font-bold fade-up"
          style={{ color: '#e8792b' }}
        >
          ✦ {taglines[textIdx]}
        </span>
      </div>

      {/* Feature badges */}
      <div className="flex items-center gap-1.5 mb-4">
        {[
          { icon: <Brain size={8} />, label: 'Smart', color: '#a855f7' },
          { icon: <Shield size={8} />, label: 'Secure', color: '#22c55e' },
          { icon: <Zap size={8} />, label: 'Fast', color: '#f59e0b' },
          { icon: <Star size={8} />, label: '13 Tools', color: '#3b82f6' },
        ].map((b) => (
          <span
            key={b.label}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[7px] font-bold uppercase tracking-wider"
            style={{ background: `${b.color}15`, border: `1px solid ${b.color}30`, color: b.color }}
          >
            {b.icon} {b.label}
          </span>
        ))}
      </div>

      {/* Quick action grid — 2x4 */}
      <div className="grid grid-cols-2 gap-1.5 w-full max-w-[280px] mb-3">
        {quickActions.map((c, i) => (
            <button
              key={c.label}
              onClick={() => {
                if (c.action === '__GHOST_MODE__' && onGhostMode) {
                  onGhostMode();
                } else if (c.action !== '__GHOST_MODE__') {
                  onChip(c.action);
                }
              }}
              className="group flex items-center gap-2 p-2 rounded-xl text-left transition-all duration-200 fade-up"
            style={{
              background: '#0e1525',
              border: '1px solid #1a2538',
              animationDelay: `${i * 40}ms`,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = `${c.color}40`;
              (e.currentTarget as HTMLElement).style.background = '#121c2e';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
              (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 15px ${c.color}15`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = '#1a2538';
              (e.currentTarget as HTMLElement).style.background = '#0e1525';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${c.color}15`, color: c.color }}
            >
              {c.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold flex items-center justify-between" style={{ color: '#dde4ed' }}>
                {c.label}
                <span className="text-[7px] font-mono opacity-40 ml-1">{c.hotkey}</span>
              </div>
              <div className="text-[8px]" style={{ color: '#4a5c72' }}>{c.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Voice CTA + Keyboard hint */}
      <div className="flex items-center gap-2">
        <button
          onClick={onVoice}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, rgba(232,121,43,0.12), rgba(168,85,247,0.08))',
            border: '1.5px solid rgba(232,121,43,0.25)',
            color: '#e8792b',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(232,121,43,0.5)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 0 25px rgba(232,121,43,0.15)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(232,121,43,0.25)';
            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
          }}
        >
          <Mic size={12} />
          <span className="text-[11px] font-bold">Voice</span>
        </button>
        <div className="flex items-center gap-1 px-3 py-2 rounded-full" style={{ background: '#0e1525', border: '1px solid #1a2538' }}>
          <Command size={10} style={{ color: '#4a5c72' }} />
          <span className="text-[9px] font-mono" style={{ color: '#4a5c72' }}>Ctrl+K</span>
        </div>
      </div>
    </div>
  );
}

/* ── Copy button for bot messages ── */
function CopyButton({ text, onCopy }: { text: string; onCopy?: () => void }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-1 rounded-md"
      style={{
        background: copied ? 'rgba(34,197,94,0.1)' : '#121c2e',
        color: copied ? '#22c55e' : '#4a5c72',
      }}
      title={copied ? 'Copied!' : 'Copy message'}
    >
      {copied ? <Check size={10} /> : <Copy size={10} />}
    </button>
  );
}

/* ── Reaction buttons for bot messages ── */
function ReactionButtons({ messageId }: { messageId: string }) {
  const [reaction, setReaction] = useState<'up' | 'down' | null>(null);

  return (
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <button
        onClick={() => setReaction(reaction === 'up' ? null : 'up')}
        className="p-1 rounded-md transition-all duration-200 reaction-btn"
        style={{
          background: reaction === 'up' ? 'rgba(34,197,94,0.15)' : 'transparent',
          color: reaction === 'up' ? '#22c55e' : '#4a5c72',
        }}
        title="Helpful"
      >
        <ThumbsUp size={9} />
      </button>
      <button
        onClick={() => setReaction(reaction === 'down' ? null : 'down')}
        className="p-1 rounded-md transition-all duration-200 reaction-btn"
        style={{
          background: reaction === 'down' ? 'rgba(239,68,68,0.15)' : 'transparent',
          color: reaction === 'down' ? '#ef4444' : '#4a5c72',
        }}
        title="Not helpful"
      >
        <ThumbsDown size={9} />
      </button>
    </div>
  );
}

/* ── Message count badge ── */
function MessageCounter({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <div
      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold"
      style={{ background: '#0e1525', border: '1px solid #1a2538', color: '#4a5c72' }}
    >
      <Hash size={7} /> {count} messages
    </div>
  );
}

/* ── Session stats mini-bar ── */
function SessionStats() {
  const messages = useChatStore((s) => s.messages);
  const userMsgs = messages.filter((m) => m.role === 'user').length;
  const botMsgs = messages.filter((m) => m.role === 'assistant').length;
  const errors = messages.filter((m) => m.isError).length;

  if (messages.length < 3) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 mx-3 mb-1 rounded-xl fade-up" style={{ background: '#0a0f1a', border: '1px solid #1a2538' }}>
      <div className="flex items-center gap-1">
        <MessageCircle size={8} style={{ color: '#e8792b' }} />
        <span className="text-[8px] font-bold" style={{ color: '#4a5c72' }}>{userMsgs}</span>
      </div>
      <div className="flex items-center gap-1">
        <Bot size={8} style={{ color: '#a855f7' }} />
        <span className="text-[8px] font-bold" style={{ color: '#4a5c72' }}>{botMsgs}</span>
      </div>
      {errors > 0 && (
        <div className="flex items-center gap-1">
          <span className="text-[8px]" style={{ color: '#f87171' }}>⚠ {errors}</span>
        </div>
      )}
      <div className="flex-1" />
      <div className="power-meter" style={{ width: 40 }}>
        <div
          className="power-meter-fill"
          style={{ width: `${Math.min((messages.length / 50) * 100, 100)}%` }}
        />
      </div>
      <span className="text-[7px] font-mono" style={{ color: '#2e3f58' }}>
        {messages.length}/50
      </span>
    </div>
  );
}

export function Chat({ llm, showToast, onGhostMode }: ChatProps) {
  const messages = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);
  const [input, setInput] = useState('');
  const [isResearchMode, setIsResearchMode] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const voiceRef = useRef<VoiceButtonHandle>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Show/hide scroll-to-bottom button
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 100);
  }, []);

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const send = (text: string) => {
    const t = text.trim();
    if (!t || isLoading) return;
    if (isResearchMode) {
      llm.startWorkflow(t);
      setIsResearchMode(false);
    } else {
      llm.sendChatMessage(t);
    }
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
    if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); send(input); }
    if (e.key === 'Escape') { setInput(''); inputRef.current?.blur(); }
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        voiceRef.current?.startListening();
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        llm.summarizePage();
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'X') {
        e.preventDefault();
        llm.clearHistory();
      }
      if (e.key === '/' && !e.ctrlKey && !e.shiftKey && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [llm]);

  const handleVoiceResult = (transcript: string) => {
    if (isResearchMode) { llm.startWorkflow(transcript); setIsResearchMode(false); }
    else llm.sendChatMessage(transcript);
  };

  // Export conversation
  const exportConversation = () => {
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
    showToast?.('success', 'Conversation exported!');
  };

  const hasMessages = messages.length > 0;

  // Regenerate last message
  const regenerateLastMessage = () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      llm.sendChatMessage(lastUserMsg.content);
    }
  };

  // Word count for current message
  const wordCount = input.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="flex flex-col h-full">

      {!hasMessages && !isLoading ? (
        <WelcomeScreen onChip={send} onVoice={() => voiceRef.current?.startListening()} onGhostMode={onGhostMode} />
      ) : (
        <>
          {/* Session stats */}
          <SessionStats />

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3 py-4 space-y-3 relative fancy-scroll"
            onScroll={handleScroll}
          >
            {messages.map((msg, idx) => (
              <div
                key={msg.id}
                className={`group flex gap-2.5 fade-up ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                style={{ animationDelay: `${Math.min(idx * 30, 200)}ms` }}
              >
                {/* Avatar */}
                <div
                  className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5"
                  style={{
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #e8792b, #c4581a)'
                      : '#0e1525',
                    border: msg.role === 'user' ? 'none' : '1px solid #1a2538',
                    boxShadow: msg.role === 'user' ? '0 2px 8px rgba(232,121,43,0.3)' : 'none',
                  }}
                >
                  {msg.role === 'user'
                    ? <User size={12} className="text-white" />
                    : <Bot size={12} style={{ color: '#e8792b' }} />
                  }
                </div>

                {/* Bubble */}
                <div className="max-w-[82%] relative">
                  <div
                    className={`px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bubble-user'
                        : msg.isError
                          ? 'bubble-err'
                          : 'bubble-bot'
                    }`}
                    style={{ color: msg.role === 'user' ? '#f5d4b3' : msg.isError ? '#fca5a5' : '#bfc9d6' }}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="md-body"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>

                  {/* Timestamp + actions */}
                  <div className="flex items-center gap-1.5 mt-1 px-1">
                    <span className="text-[9px]" style={{ color: '#2e3f58' }}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.role === 'assistant' && !msg.isError && (
                      <>
                        <CopyButton
                          text={msg.content}
                          onCopy={() => showToast?.('success', 'Copied to clipboard!')}
                        />
                        <ReactionButtons messageId={msg.id} />
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-2.5 fade-up">
                <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5" style={{ background: '#0e1525', border: '1px solid #1a2538' }}>
                  <Wand2 size={12} style={{ color: '#e8792b' }} className="animate-spin" />
                </div>
                <div className="bubble-bot px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <span className="dot" /><span className="dot" /><span className="dot" />
                    <span className="text-[10px] ml-2 typing-cursor" style={{ color: '#4a5c72' }}>Thinking</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={endRef} />

            {/* Scroll to bottom */}
            {showScrollDown && (
              <button
                onClick={scrollToBottom}
                className="sticky bottom-2 left-1/2 -translate-x-1/2 p-2 rounded-full z-20 transition-all duration-300 fade-up"
                style={{
                  background: 'linear-gradient(135deg, #e8792b, #c4581a)',
                  boxShadow: '0 4px 20px rgba(232,121,43,0.4)',
                  color: '#fff',
                }}
              >
                <ChevronDown size={14} />
              </button>
            )}
          </div>
        </>
      )}

      {/* ── Bottom bar ── */}
      <div className="flex-shrink-0 p-2 space-y-1.5" style={{ background: '#0e1525', borderTop: '1px solid #1a2538' }}>
        {/* Quick chips row */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button onClick={() => llm.summarizePage()} disabled={isLoading} className="chip">
            <FileText size={10} /> Summarize
          </button>
          <button
            onClick={() => setIsResearchMode(!isResearchMode)}
            className={`chip ${isResearchMode ? 'chip-active' : ''}`}
          >
            <Zap size={10} /> Research
          </button>
          <button
            onClick={() => send('Extract all tables from this page')}
            disabled={isLoading}
            className="chip"
          >
            <Table2 size={10} /> Tables
          </button>
          <button
            onClick={() => send('Extract the key facts from this page as bullet points')}
            disabled={isLoading}
            className="chip"
          >
            <Bookmark size={10} /> Extract
          </button>
          <button
            onClick={() => send('Extract all code snippets from this page')}
            disabled={isLoading}
            className="chip"
          >
            <Code size={10} /> Code
          </button>
          <div className="flex-shrink-0 flex items-center gap-0.5 ml-auto">
            {hasMessages && (
              <>
                <button
                  onClick={regenerateLastMessage}
                  disabled={isLoading || messages.length === 0}
                  className="btn-ghost p-1.5"
                  title="Regenerate last response"
                >
                  <RefreshCw size={11} />
                </button>
                <button
                  onClick={exportConversation}
                  disabled={messages.length === 0}
                  className="btn-ghost p-1.5"
                  title="Export conversation"
                >
                  <Download size={11} />
                </button>
              </>
            )}
            <button onClick={llm.clearHistory} className="btn-ghost p-1.5" title="Clear chat (Ctrl+Shift+X)">
              <Trash2 size={11} />
            </button>
          </div>
        </div>

        {/* Research mode banner */}
        {isResearchMode && (
          <div className="px-3 py-2 rounded-xl text-[11px] fade-up focus-mode-banner" style={{ color: '#c084fc' }}>
            <strong>🔬 Research Mode</strong> — Describe a goal. Jawad will open tabs and compile results.
          </div>
        )}

        {/* Input row */}
        <div
          className={`input-bar flex items-center gap-1.5 px-2 py-0.5 rounded-2xl transition-all duration-300 ${inputFocused ? 'anim-border-glow' : ''}`}
          style={{
            background: '#0f1726',
            border: `1.5px solid ${inputFocused ? 'rgba(232,121,43,0.3)' : '#1e2d45'}`,
          }}
        >
          <VoiceButton ref={voiceRef} onResult={handleVoiceResult} disabled={isLoading} />

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder={isResearchMode ? 'Describe your research goal…' : 'Ask Jawad anything… (/ to focus)'}
            disabled={isLoading}
            className="flex-1 py-1.5 text-[13px] focus:outline-none disabled:opacity-40"
            style={{
              background: 'transparent',
              backgroundColor: 'transparent',
              border: 'none',
              borderWidth: 0,
              color: '#dde4ed',
              caretColor: '#e8792b',
              outline: 'none',
              boxShadow: 'none',
              padding: '6px 0',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
            }}
          />

          {/* Word count indicator */}
          {input.trim().length > 0 && (
            <span className="text-[7px] font-mono flex-shrink-0" style={{ color: '#2e3f58' }}>
              {wordCount}w
            </span>
          )}

          <button
            onClick={() => send(input)}
            disabled={isLoading || !input.trim()}
            className="p-2 rounded-xl transition-all duration-300 disabled:opacity-20"
            style={{
              background: input.trim()
                ? 'linear-gradient(135deg, #e8792b, #c4581a)'
                : '#121c2e',
              color: input.trim() ? '#fff' : '#2a3a50',
              boxShadow: input.trim() ? '0 3px 15px rgba(232,121,43,0.3)' : 'none',
            }}
          >
            <Send size={13} />
          </button>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between px-1 pt-0.5">
          <MessageCounter count={messages.length} />
          <div className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full" style={{ background: '#22c55e', boxShadow: '0 0 4px #22c55e' }} />
            <span className="text-[7px] font-medium tracking-wider uppercase" style={{ color: '#2e3f58' }}>
              Powered by your AI · Privacy first
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
