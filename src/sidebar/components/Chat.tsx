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

  // Auto-scroll to bottom when messages change
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
      {/* Voice Setup Banner (one-time) */}
      <MicSetupCard />

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={msg.id}
            className={`flex gap-2 animate-fade-in ${
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            {/* Avatar */}
            <div
              className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 ${
                msg.role === 'user'
                  ? 'bg-orange-500/20 text-orange-400'
                  : 'bg-slate-700/60 text-slate-400'
              }`}
            >
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                msg.role === 'user'
                  ? 'msg-user text-orange-50 rounded-tr-md'
                  : msg.isError
                    ? 'msg-error text-red-300 rounded-tl-md'
                    : 'msg-assistant text-slate-200 rounded-tl-md'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="markdown-content">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
              <div
                className={`text-[10px] mt-1.5 ${
                  msg.role === 'user' ? 'text-orange-400/40 text-right' : 'text-slate-600'
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

        {/* Thinking indicator */}
        {isLoading && (
          <div className="flex gap-2 animate-fade-in">
            <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-slate-700/60 flex items-center justify-center mt-0.5">
              <Bot size={14} className="text-orange-400 animate-pulse" />
            </div>
            <div className="msg-assistant rounded-2xl rounded-tl-md px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="thinking-dot" />
                <span className="thinking-dot" />
                <span className="thinking-dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Area ── */}
      <div className="flex-shrink-0 border-t border-slate-700/50 bg-surface-100/80 p-2.5 space-y-2">
        {/* Quick Actions Bar */}
        <div className="flex items-center gap-1.5">
          <SummarizeButton onSummarize={llm.summarizePage} disabled={isLoading} />
          <button
            onClick={() => setIsResearchMode(!isResearchMode)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 btn-lift ${
              isResearchMode
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-500/10'
                : 'bg-surface-300/60 text-slate-400 hover:bg-surface-400/60 hover:text-slate-300'
            }`}
          >
            <Zap size={12} />
            Research
          </button>
          <div className="flex-1" />
          <button
            onClick={llm.clearHistory}
            className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
            title="Clear chat"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* Research Mode Banner */}
        {isResearchMode && (
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl px-3 py-2 text-xs text-purple-300 animate-fade-in">
            <span className="font-medium">🔬 Research Mode</span>
            <span className="text-purple-400/70"> — Describe your goal. Jawad will open tabs & compile results.</span>
          </div>
        )}

        {/* Input Row */}
        <div className="flex items-center gap-1.5 input-glow rounded-xl bg-surface-200/60 border border-slate-700/50 px-1.5 py-1 transition-all duration-200">
          <VoiceButton onResult={handleVoiceResult} disabled={isLoading} />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isResearchMode
                ? 'Describe your research goal...'
                : 'Ask Jawad anything...'
            }
            disabled={isLoading}
            className="flex-1 bg-transparent py-1.5 text-[13px] text-slate-200 placeholder-slate-600 focus:outline-none disabled:opacity-40"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className={`p-2 rounded-lg transition-all duration-200 btn-lift ${
              input.trim()
                ? 'gradient-accent text-white shadow-md shadow-orange-500/20'
                : 'bg-surface-400/50 text-slate-600'
            } disabled:opacity-40 disabled:shadow-none`}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
