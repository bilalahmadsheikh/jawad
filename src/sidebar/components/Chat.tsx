import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useChatStore } from '../stores/chat-store';
import { VoiceButton } from './VoiceButton';
import type { VoiceButtonHandle } from './VoiceButton';
import type { LLMActions } from '../hooks/useLLM';
import {
  Send, Trash2, Zap, Bot, User, FileText, Sparkles, Globe,
  MousePointer, Mic, ShoppingCart, Eye, Bookmark, ArrowRight,
  Brain, Shield, Command, Wand2, Copy, Check,
} from 'lucide-react';

interface ChatProps {
  llm: LLMActions;
}

/* ── Welcome screen ── */
function WelcomeScreen({ onChip, onVoice }: { onChip: (text: string) => void; onVoice: () => void }) {
  const quickActions = [
    { icon: <FileText size={13} />, label: 'Summarize', desc: 'Get page summary', action: 'Summarize this page', color: '#22c55e' },
    { icon: <Globe size={13} />, label: 'Analyze Site', desc: 'What is this?', action: 'What is this website about?', color: '#3b82f6' },
    { icon: <MousePointer size={13} />, label: 'Find Button', desc: 'Locate CTA', action: 'Find the main call-to-action button', color: '#a855f7' },
    { icon: <ShoppingCart size={13} />, label: 'Compare', desc: 'Price check', action: 'Find similar products at lower prices', color: '#f59e0b' },
    { icon: <Eye size={13} />, label: 'Read Aloud', desc: 'Text to speech', action: 'Read the main content of this page aloud', color: '#ec4899' },
    { icon: <Bookmark size={13} />, label: 'Key Points', desc: 'Extract facts', action: 'Extract the key points and facts from this page', color: '#06b6d4' },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-5 fade-up" style={{ paddingBottom: '10%' }}>
      {/* Hero icon with glow */}
      <div className="hero-icon relative mb-6 anim-float">
        <div className="hero-orbit" />
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #e8792b, #c4581a)',
            boxShadow: '0 8px 40px rgba(232,121,43,0.35)',
          }}
        >
          <Sparkles size={28} className="text-white" />
        </div>
      </div>

      <h1 className="text-[24px] font-extrabold text-center leading-tight mb-1 anim-text-glow" style={{ color: '#eef2f7' }}>
        Hey, I'm Jawad
      </h1>
      <p className="text-[12px] text-center leading-relaxed mb-1" style={{ color: '#4a5c72', maxWidth: 220 }}>
        Your AI-powered browser companion
      </p>

      {/* Feature badges */}
      <div className="flex items-center gap-2 mb-6 mt-2">
        {[
          { icon: <Brain size={9} />, label: 'Smart', color: '#a855f7' },
          { icon: <Shield size={9} />, label: 'Secure', color: '#22c55e' },
          { icon: <Zap size={9} />, label: 'Fast', color: '#f59e0b' },
        ].map((b) => (
          <span
            key={b.label}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider"
            style={{ background: `${b.color}15`, border: `1px solid ${b.color}30`, color: b.color }}
          >
            {b.icon} {b.label}
          </span>
        ))}
      </div>

      {/* Quick action grid */}
      <div className="grid grid-cols-2 gap-2 w-full max-w-[280px] mb-4">
        {quickActions.map((c, i) => (
          <button
            key={c.label}
            onClick={() => onChip(c.action)}
            className="group flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-all duration-200 fade-up"
            style={{
              background: '#0e1525',
              border: '1px solid #1a2538',
              animationDelay: `${i * 50}ms`,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = `${c.color}40`;
              (e.currentTarget as HTMLElement).style.background = '#121c2e';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
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
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${c.color}15`, color: c.color }}
            >
              {c.icon}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold" style={{ color: '#dde4ed' }}>{c.label}</div>
              <div className="text-[9px]" style={{ color: '#4a5c72' }}>{c.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Voice CTA */}
      <button
        onClick={onVoice}
        className="flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300"
        style={{
          background: 'linear-gradient(135deg, rgba(232,121,43,0.12), rgba(168,85,247,0.08))',
          border: '1.5px solid rgba(232,121,43,0.25)',
          color: '#e8792b',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(232,121,43,0.5)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 0 25px rgba(232,121,43,0.15)';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(232,121,43,0.25)';
          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        }}
      >
        <Mic size={14} />
        <span className="text-[12px] font-bold">Try voice commands</span>
        <ArrowRight size={12} />
      </button>
    </div>
  );
}

/* ── Copy button for bot messages ── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded-md"
      style={{ background: '#121c2e', color: copied ? '#22c55e' : '#4a5c72' }}
      title={copied ? 'Copied!' : 'Copy message'}
    >
      {copied ? <Check size={10} /> : <Copy size={10} />}
    </button>
  );
}

export function Chat({ llm }: ChatProps) {
  const messages = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);
  const [input, setInput] = useState('');
  const [isResearchMode, setIsResearchMode] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const voiceRef = useRef<VoiceButtonHandle>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
  };

  const handleVoiceResult = (transcript: string) => {
    if (isResearchMode) { llm.startWorkflow(transcript); setIsResearchMode(false); }
    else llm.sendChatMessage(transcript);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full">

      {!hasMessages && !isLoading ? (
        <WelcomeScreen onChip={send} onVoice={() => voiceRef.current?.startListening()} />
      ) : (
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
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

                {/* Timestamp + copy */}
                <div className="flex items-center gap-2 mt-1 px-1">
                  <span className="text-[9px]" style={{ color: '#2e3f58' }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.role === 'assistant' && !msg.isError && <CopyButton text={msg.content} />}
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
                  <span className="text-[10px] ml-2" style={{ color: '#4a5c72' }}>Thinking…</span>
                </div>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>
      )}

      {/* ── Bottom bar ── */}
      <div className="flex-shrink-0 p-2.5 space-y-2" style={{ background: '#0e1525', borderTop: '1px solid #1a2538' }}>
        {/* Quick chips */}
        <div className="flex items-center gap-1.5">
          <button onClick={() => llm.summarizePage()} disabled={isLoading} className="chip">
            <FileText size={11} /> Summarize
          </button>
          <button
            onClick={() => setIsResearchMode(!isResearchMode)}
            className={`chip ${isResearchMode ? 'chip-active' : ''}`}
          >
            <Zap size={11} /> Research
          </button>
          <button
            onClick={() => send('Extract the key facts from this page as bullet points')}
            disabled={isLoading}
            className="chip"
          >
            <Command size={11} /> Extract
          </button>
          <div className="flex-1" />
          <button onClick={llm.clearHistory} className="btn-ghost p-1.5" title="Clear chat">
            <Trash2 size={12} />
          </button>
        </div>

        {/* Research mode banner */}
        {isResearchMode && (
          <div className="px-3 py-2 rounded-xl text-[11px] fade-up" style={{
            background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(59,130,246,0.05))',
            border: '1px solid rgba(168,85,247,0.2)',
            color: '#c084fc',
          }}>
            <strong>🔬 Research Mode</strong> — Describe a goal. Jawad will open tabs and compile results.
          </div>
        )}

        {/* Input row */}
        <div
          className="input-bar flex items-center gap-1.5 px-2 py-1 rounded-2xl"
          style={{ background: '#0f1726', border: '1.5px solid #1e2d45' }}
        >
          <VoiceButton ref={voiceRef} onResult={handleVoiceResult} disabled={isLoading} />

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isResearchMode ? 'Describe your research goal…' : 'Ask Jawad anything…'}
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

          <button
            onClick={() => send(input)}
            disabled={isLoading || !input.trim()}
            className="p-2.5 rounded-xl transition-all duration-300 disabled:opacity-20"
            style={{
              background: input.trim()
                ? 'linear-gradient(135deg, #e8792b, #c4581a)'
                : '#121c2e',
              color: input.trim() ? '#fff' : '#2a3a50',
              boxShadow: input.trim() ? '0 3px 15px rgba(232,121,43,0.3)' : 'none',
            }}
          >
            <Send size={14} />
          </button>
        </div>

        {/* Powered by line */}
        <div className="flex items-center justify-center gap-1.5 pt-0.5">
          <span className="w-1 h-1 rounded-full" style={{ background: '#22c55e', boxShadow: '0 0 4px #22c55e' }} />
          <span className="text-[8px] font-medium tracking-wider uppercase" style={{ color: '#2e3f58' }}>
            Powered by your AI · Privacy first
          </span>
        </div>
      </div>
    </div>
  );
}
