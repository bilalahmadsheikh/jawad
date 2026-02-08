import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useChatStore } from '../stores/chat-store';
import { VoiceButton } from './VoiceButton';
import { MicSetupCard } from './MicSetupCard';
import type { LLMActions } from '../hooks/useLLM';
import { Send, Trash2, Zap, Bot, User, FileText, Sparkles, Globe, MousePointer, Mic } from 'lucide-react';

interface ChatProps {
  llm: LLMActions;
}

/* ── Welcome screen (shown when no messages) ── */
function WelcomeScreen({ onChip }: { onChip: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 fade-up" style={{ paddingBottom: '20%' }}>
      {/* Logo */}
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'linear-gradient(135deg, #e8792b, #d4621a)', boxShadow: '0 8px 30px rgba(232,121,43,0.25)' }}>
        <Sparkles size={26} className="text-white" />
      </div>

      {/* Greeting */}
      <h1 className="text-[22px] font-bold text-center leading-tight mb-2" style={{ color: '#eef2f7' }}>
        Hi! I'm Jawad
      </h1>
      <p className="text-[13px] text-center leading-relaxed mb-8" style={{ color: '#5d6f85', maxWidth: 240 }}>
        Your AI browser companion. Ask me anything, or try a quick action below.
      </p>

      {/* Quick action chips */}
      <div className="flex flex-wrap gap-2 justify-center max-w-[280px]">
        {[
          { icon: <FileText size={12} />, label: 'Summarize page', action: 'Summarize this page' },
          { icon: <Globe size={12} />, label: 'What is this site?', action: 'What is this website about?' },
          { icon: <MousePointer size={12} />, label: 'Find a button', action: 'Find the main call-to-action button' },
          { icon: <Mic size={12} />, label: 'Voice commands', action: '' },
        ].map((c) => (
          <button
            key={c.label}
            onClick={() => c.action && onChip(c.action)}
            className="chip"
            disabled={!c.action}
          >
            {c.icon}
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Chat({ llm }: ChatProps) {
  const messages = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);
  const [input, setInput] = useState('');
  const [isResearchMode, setIsResearchMode] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      {/* Mic onboarding */}
      <MicSetupCard />

      {/* ── Messages or Welcome ── */}
      {!hasMessages && !isLoading ? (
        <WelcomeScreen onChip={send} />
      ) : (
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 fade-up ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5"
                style={{
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #e8792b, #d4621a)'
                    : '#1d2840',
                }}
              >
                {msg.role === 'user'
                  ? <User size={13} className="text-white" />
                  : <Bot size={13} style={{ color: '#e8792b' }} />
                }
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[82%] px-3.5 py-2.5 text-[13px] leading-relaxed ${
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
                <div className="text-[10px] mt-1.5" style={{ color: msg.role === 'user' ? '#8b6230' : '#3d4d65' }}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {/* Thinking */}
          {isLoading && (
            <div className="flex gap-2.5 fade-up">
              <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5" style={{ background: '#1d2840' }}>
                <Bot size={13} style={{ color: '#e8792b' }} className="animate-pulse" />
              </div>
              <div className="bubble-bot px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="dot" /><span className="dot" /><span className="dot" />
                </div>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>
      )}

      {/* ── Bottom bar ── */}
      <div className="flex-shrink-0 p-2.5 space-y-2" style={{ background: '#131b2c', borderTop: '1px solid #253045' }}>
        {/* Chips row */}
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
          <div className="flex-1" />
          <button onClick={llm.clearHistory} className="btn-ghost p-1.5" title="Clear chat">
            <Trash2 size={13} />
          </button>
        </div>

        {/* Research banner */}
        {isResearchMode && (
          <div className="px-3 py-2 rounded-xl text-[11px] fade-up" style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', color: '#c084fc' }}>
            <strong>🔬 Research Mode</strong> — Describe a goal. Jawad will open tabs and compile results.
          </div>
        )}

        {/* Input row */}
        <div className="flex items-center gap-1.5 px-1.5 py-1 rounded-xl transition-all duration-200" style={{ background: '#172033', border: '1.5px solid #293548' }}>
          <VoiceButton onResult={handleVoiceResult} disabled={isLoading} />

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isResearchMode ? 'Describe your research goal…' : 'Message Jawad…'}
            disabled={isLoading}
            className="flex-1 py-1.5 text-[13px] focus:outline-none disabled:opacity-40"
            style={{ background: 'transparent', border: 'none', color: '#dde4ed', caretColor: '#e8792b' }}
          />

          <button
            onClick={() => send(input)}
            disabled={isLoading || !input.trim()}
            className="p-2 rounded-lg transition-all duration-200 disabled:opacity-30"
            style={{
              background: input.trim() ? 'linear-gradient(135deg, #e8792b, #d4621a)' : '#1d2840',
              color: input.trim() ? '#fff' : '#3d4d65',
            }}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
