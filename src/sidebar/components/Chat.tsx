import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useChatStore } from '../stores/chat-store';
import { VoiceButton } from './VoiceButton';
import { SummarizeButton } from './SummarizeButton';
import { MicSetupCard } from './MicSetupCard';
import type { LLMActions } from '../hooks/useLLM';
import { Send, Trash2, Loader2, Zap } from 'lucide-react';

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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-orange-500/20 text-orange-100 border border-orange-500/30'
                  : msg.isError
                    ? 'bg-red-500/10 text-red-300 border border-red-500/30'
                    : 'bg-slate-800 text-slate-200 border border-slate-700'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="markdown-content">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
              <div className="text-[10px] text-slate-500 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 rounded-lg px-3 py-2 border border-slate-700">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 size={14} className="animate-spin" />
                Thinking...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-slate-700 bg-slate-800 p-2 space-y-2">
        {/* Quick Actions */}
        <div className="flex gap-1">
          <SummarizeButton onSummarize={llm.summarizePage} disabled={isLoading} />
          <button
            onClick={() => setIsResearchMode(!isResearchMode)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
              isResearchMode
                ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <Zap size={12} />
            Research
          </button>
          <button
            onClick={llm.clearHistory}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-slate-700 text-slate-400 hover:bg-slate-600 ml-auto"
            title="Clear chat"
          >
            <Trash2 size={12} />
          </button>
        </div>

        {/* Research Mode Banner */}
        {isResearchMode && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded px-2 py-1 text-xs text-purple-300">
            🔬 <strong>Research Mode:</strong> Describe your research goal. Jawad will open
            multiple tabs and compile results.
          </div>
        )}

        {/* Input Row */}
        <div className="flex items-center gap-1">
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
            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="p-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-600 disabled:opacity-50 rounded-lg text-white transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

