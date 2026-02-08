import React, { useState, useEffect } from 'react';
import { DEFAULT_MODELS } from '../../lib/constants';
import type { LLMActions } from '../hooks/useLLM';
import { Save, CheckCircle, AlertCircle, Loader2, Sparkles, Server, Key, Cpu, MessageSquareText } from 'lucide-react';

interface SettingsProps {
  llm: LLMActions;
}

interface SettingsState {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl: string;
  customSystemPrompt: string;
}

export function Settings({ llm }: SettingsProps) {
  const [settings, setSettings] = useState<SettingsState>({
    provider: 'ollama',
    apiKey: '',
    model: 'llama3',
    baseUrl: 'http://localhost:11434/v1',
    customSystemPrompt: '',
  });
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await browser.storage.local.get([
        'jawad_config',
        'jawad_systemPrompt',
      ]);
      if (data.jawad_config) {
        const config = data.jawad_config as SettingsState;
        setSettings({
          provider: config.provider || 'ollama',
          apiKey: config.apiKey || '',
          model: config.model || 'llama3',
          baseUrl: config.baseUrl || 'http://localhost:11434/v1',
          customSystemPrompt: (data.jawad_systemPrompt as string) || '',
        });
      }
    } catch {
      // Use defaults
    }
  };

  const handleProviderChange = (provider: string) => {
    const defaults: Record<string, { baseUrl: string; model: string }> = {
      ollama: { baseUrl: 'http://localhost:11434/v1', model: 'llama3' },
      openrouter: {
        baseUrl: 'https://openrouter.ai/api/v1',
        model: 'openai/gpt-4o-mini',
      },
      openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
    };

    setSettings({
      ...settings,
      provider,
      baseUrl: defaults[provider]?.baseUrl || settings.baseUrl,
      model: defaults[provider]?.model || settings.model,
    });
  };

  const handleSave = async () => {
    const config = {
      provider: settings.provider,
      apiKey: settings.apiKey,
      model: settings.model,
      baseUrl: settings.baseUrl,
    };

    llm.saveSettings(config);

    // Also save custom system prompt separately
    await browser.storage.local.set({
      jawad_systemPrompt: settings.customSystemPrompt,
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(`${settings.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(settings.apiKey
            ? { Authorization: `Bearer ${settings.apiKey}` }
            : {}),
        },
        body: JSON.stringify({
          model: settings.model,
          messages: [{ role: 'user', content: 'Say "ok"' }],
          max_tokens: 5,
        }),
      });
      setTestResult(response.ok ? 'success' : 'error');
    } catch {
      setTestResult('error');
    }
    setTesting(false);
  };

  const models = DEFAULT_MODELS[settings.provider] || [];

  const providerInfo: Record<string, { icon: string; name: string; color: string }> = {
    ollama: { icon: '🦙', name: 'Ollama', color: 'text-emerald-400' },
    openrouter: { icon: '🌐', name: 'OpenRouter', color: 'text-blue-400' },
    openai: { icon: '🤖', name: 'OpenAI', color: 'text-purple-400' },
  };

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={14} className="text-orange-400" />
        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
          AI Configuration
        </span>
      </div>

      {/* ── Provider Selection ── */}
      <div className="glass-card rounded-xl p-3 space-y-2.5">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium uppercase tracking-wide">
          <Server size={11} />
          Provider
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {(['ollama', 'openrouter', 'openai'] as const).map((p) => {
            const info = providerInfo[p];
            return (
              <button
                key={p}
                onClick={() => handleProviderChange(p)}
                className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                  settings.provider === p
                    ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-sm shadow-orange-500/10'
                    : 'bg-surface-200/60 text-slate-500 hover:bg-surface-300/60 hover:text-slate-300 border border-transparent'
                }`}
              >
                <span className="text-base">{info.icon}</span>
                <span>{info.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── API Key ── */}
      {settings.provider !== 'ollama' && (
        <div className="glass-card rounded-xl p-3 space-y-2 animate-fade-in">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium uppercase tracking-wide">
            <Key size={11} />
            API Key
          </div>
          <input
            type="password"
            value={settings.apiKey}
            onChange={(e) =>
              setSettings({ ...settings, apiKey: e.target.value })
            }
            placeholder={
              settings.provider === 'openrouter' ? 'sk-or-...' : 'sk-...'
            }
            className="w-full bg-surface-200/80 border border-slate-700/50 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/30 transition-all"
          />
        </div>
      )}

      {/* ── Base URL ── */}
      <div className="glass-card rounded-xl p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium uppercase tracking-wide">
          <Server size={11} />
          API Endpoint
        </div>
        <input
          type="text"
          value={settings.baseUrl}
          onChange={(e) =>
            setSettings({ ...settings, baseUrl: e.target.value })
          }
          className="w-full bg-surface-200/80 border border-slate-700/50 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/30 transition-all"
        />
      </div>

      {/* ── Model Selection ── */}
      <div className="glass-card rounded-xl p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium uppercase tracking-wide">
          <Cpu size={11} />
          Model
        </div>
        <select
          value={settings.model}
          onChange={(e) =>
            setSettings({ ...settings, model: e.target.value })
          }
          className="w-full bg-surface-200/80 border border-slate-700/50 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/30 transition-all"
        >
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={settings.model}
          onChange={(e) =>
            setSettings({ ...settings, model: e.target.value })
          }
          placeholder="Or type a custom model name..."
          className="w-full bg-surface-200/80 border border-slate-700/50 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/30 transition-all"
        />
      </div>

      {/* ── Custom System Prompt ── */}
      <div className="glass-card rounded-xl p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium uppercase tracking-wide">
          <MessageSquareText size={11} />
          Custom Instructions
        </div>
        <textarea
          value={settings.customSystemPrompt}
          onChange={(e) =>
            setSettings({
              ...settings,
              customSystemPrompt: e.target.value,
            })
          }
          placeholder="e.g., Always respond in bullet points, I prefer budget options..."
          rows={3}
          className="w-full bg-surface-200/80 border border-slate-700/50 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/30 resize-none transition-all"
        />
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 btn-lift ${
            saved
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'gradient-accent text-white shadow-md shadow-orange-500/20'
          }`}
        >
          {saved ? (
            <>
              <CheckCircle size={14} />
              Saved!
            </>
          ) : (
            <>
              <Save size={14} />
              Save Settings
            </>
          )}
        </button>
        <button
          onClick={handleTest}
          disabled={testing}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-surface-300/60 hover:bg-surface-400/60 text-slate-300 text-xs font-medium rounded-xl transition-all duration-200 disabled:opacity-40 btn-lift"
        >
          {testing ? (
            <Loader2 size={14} className="animate-spin text-orange-400" />
          ) : testResult === 'success' ? (
            <CheckCircle size={14} className="text-emerald-400" />
          ) : testResult === 'error' ? (
            <AlertCircle size={14} className="text-red-400" />
          ) : null}
          Test
        </button>
      </div>

      {/* ── Provider Info Card ── */}
      <div className="glass-card rounded-xl p-3 text-xs text-slate-400 space-y-1.5">
        {settings.provider === 'ollama' && (
          <>
            <p>
              <strong className="text-slate-200">Local AI</strong> — Install{' '}
              <a
                href="https://ollama.ai"
                target="_blank"
                rel="noreferrer"
                className="text-orange-400 underline decoration-orange-400/30 hover:decoration-orange-400/60"
              >
                Ollama
              </a>
              , then run:{' '}
              <code className="px-1.5 py-0.5 bg-surface-200/80 rounded text-orange-300 text-[11px]">
                ollama run llama3
              </code>
            </p>
            <p className="text-slate-500">
              🔒 Data never leaves your machine. Free, no API key needed.
            </p>
          </>
        )}
        {settings.provider === 'openrouter' && (
          <>
            <p>
              <strong className="text-slate-200">Cloud AI</strong> — Get a free key at{' '}
              <a
                href="https://openrouter.ai"
                target="_blank"
                rel="noreferrer"
                className="text-orange-400 underline decoration-orange-400/30 hover:decoration-orange-400/60"
              >
                openrouter.ai
              </a>
            </p>
            <p className="text-slate-500">Access GPT-4o, Claude, Llama, Gemini and more.</p>
          </>
        )}
        {settings.provider === 'openai' && (
          <>
            <p>
              <strong className="text-slate-200">OpenAI Direct</strong> — Use your OpenAI API key.
            </p>
            <p className="text-slate-500">Supports GPT-4o, GPT-4o-mini, and more.</p>
          </>
        )}
      </div>
    </div>
  );
}
