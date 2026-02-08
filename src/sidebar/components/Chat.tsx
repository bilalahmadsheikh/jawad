import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useChatStore } from '../stores/chat-store';
import { VoiceButton } from './VoiceButton';
import { SummarizeButton } from './SummarizeButton';
import { MicSetupCard } from './MicSetupCard';
import type { LLMActions } from '../hooks/useLLM';
import { Send, Trash2, Zap, Bot, User } from 'lucide-react';

interface ChatProps {
  llm: LLMActions;
}

export function Chat({ llm }: ChatProps) {
  const messages = useChatStore((s) => s.messages);
  const isLoading = useChatStore((s) => s.isLoading);
  const [input, setInput] = useState('');
  const [isResearchMode, setIsResearchMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    if (isResearchMode) {
      llm.startWorkflow(text);
      setIsResearchMode(false);
    } else {
      llm.sendChatMessage(text);
    }
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceResult = (transcript: string) => {
    if (isResearchMode) {
      llm.startWorkflow(transcript);
      setIsResearchMode(false);
    } else {
      llm.sendChatMessage(transcript);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Mic onboarding (one-time) */}
      <MicSetupCard />

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 anim-in ${
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            {/* Avatar */}
            <div
              className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-1 ${
                msg.role === 'user'
                  ? 'gradient-orange shadow-sm shadow-orange-600/20'
                  : 'bg-dark-4'
              }`}
            >
              {msg.role === 'user' ? (
                <User size={13} className="text-white" />
              ) : (
                <Bot size={13} className="text-accent" />
              )}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[82%] px-3.5 py-2.5 text-[13px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bubble-user text-orange-100'
                  : msg.isError
                    ? 'bubble-error text-red-300'
                    : 'bubble-bot text-slate-200'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="md">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
              <div
                className={`text-[10px] mt-1.5 ${
                  msg.role === 'user' ? 'text-orange-500/40 text-right' : 'text-slate-600'
                }`}
              >
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        ))}

        {/* Thinking dots */}
        {isLoading && (
          <div className="flex gap-2.5 anim-in">
            <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-dark-4 flex items-center justify-center mt-1">
              <Bot size={13} className="text-accent animate-pulse" />
            </div>
            <div className="bubble-bot px-4 py-3.5">
              <div className="flex items-center gap-2">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Area ── */}
      <div className="flex-shrink-0 bg-dark-2 border-t border-dark-5/60 p-2.5 space-y-2">
        {/* Quick actions */}
        <div className="flex items-center gap-1.5">
          <SummarizeButton onSummarize={llm.summarizePage} disabled={isLoading} />

          <button
            onClick={() => setIsResearchMode(!isResearchMode)}
            className={`flex items-center gap-1.5 px-2.5 py-[6px] rounded-lg text-[11px] font-semibold transition-all duration-200 ${
              isResearchMode
                ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-500/10'
                : 'bg-dark-4 text-slate-400 hover:text-slate-200 hover:bg-dark-5 border border-transparent'
            }`}
          >
            <Zap size={11} />
            Research
          </button>

          <div className="flex-1" />

          <button
            onClick={llm.clearHistory}
            className="btn-ghost p-1.5"
            title="Clear chat"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* Research mode banner */}
        {isResearchMode && (
          <div className="bg-purple-900/20 border border-purple-600/20 rounded-xl px-3 py-2 text-[11px] text-purple-300 anim-in">
            <strong>🔬 Research Mode</strong>
            <span className="text-purple-400/70"> — Describe a goal. Jawad will open tabs & compile results.</span>
          </div>
        )}

        {/* Input row */}
        <div className="flex items-center gap-1.5 bg-dark-1 border border-dark-5 rounded-xl px-1.5 py-1 transition-all duration-200 focus-within:border-accent/50 focus-within:shadow-[0_0_0_2px_rgba(249,115,22,0.1)]">
          <VoiceButton onResult={handleVoiceResult} disabled={isLoading} />

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isResearchMode
                ? 'Describe your research goal…'
                : 'Ask Jawad anything…'
            }
            disabled={isLoading}
            className="flex-1 bg-transparent py-1.5 text-[13px] text-slate-200 placeholder-slate-600 focus:outline-none disabled:opacity-40"
          />

          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className={`p-2 rounded-lg transition-all duration-200 ${
              input.trim()
                ? 'gradient-orange text-white shadow-md shadow-orange-600/20 hover:shadow-orange-600/40'
                : 'bg-dark-4 text-slate-600'
            } disabled:opacity-40 disabled:shadow-none`}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
