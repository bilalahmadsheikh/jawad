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

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const data = await browser.storage.local.get(['jawad_config', 'jawad_systemPrompt']);
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
    } catch { /* defaults */ }
  };

  const handleProviderChange = (provider: string) => {
    const defaults: Record<string, { baseUrl: string; model: string }> = {
      ollama: { baseUrl: 'http://localhost:11434/v1', model: 'llama3' },
      openrouter: { baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' },
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
    llm.saveSettings({
      provider: settings.provider,
      apiKey: settings.apiKey,
      model: settings.model,
      baseUrl: settings.baseUrl,
    });
    await browser.storage.local.set({ jawad_systemPrompt: settings.customSystemPrompt });
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
          ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}),
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

  const providers = [
    { id: 'ollama', emoji: '🦙', name: 'Ollama', tag: 'Local' },
    { id: 'openrouter', emoji: '🌐', name: 'OpenRouter', tag: 'Cloud' },
    { id: 'openai', emoji: '🤖', name: 'OpenAI', tag: 'Direct' },
  ];

  return (
    <div className="h-full overflow-y-auto p-3 space-y-3">
      {/* Section title */}
      <div className="flex items-center gap-2">
        <Sparkles size={13} className="text-accent" />
        <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">AI Configuration</span>
      </div>

      {/* ── Provider ── */}
      <div className="card p-3 space-y-2.5">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          <Server size={10} />
          Provider
        </div>
        <div className="grid grid-cols-3 gap-2">
          {providers.map((p) => (
            <button
              key={p.id}
              onClick={() => handleProviderChange(p.id)}
              className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-[11px] font-semibold transition-all duration-200 border ${
                settings.provider === p.id
                  ? 'bg-dark-4 text-accent border-accent/40 shadow-sm shadow-orange-600/10'
                  : 'bg-dark-1 text-slate-500 border-dark-5/50 hover:text-slate-300 hover:border-dark-6'
              }`}
            >
              <span className="text-lg leading-none">{p.emoji}</span>
              <span>{p.name}</span>
              <span className={`text-[8px] uppercase tracking-wide ${settings.provider === p.id ? 'text-accent/50' : 'text-slate-600'}`}>
                {p.tag}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── API Key ── */}
      {settings.provider !== 'ollama' && (
        <div className="card p-3 space-y-2 anim-in">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <Key size={10} />
            API Key
          </div>
          <input
            type="password"
            value={settings.apiKey}
            onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
            placeholder={settings.provider === 'openrouter' ? 'sk-or-…' : 'sk-…'}
            className="input-field"
          />
        </div>
      )}

      {/* ── Base URL ── */}
      <div className="card p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          <Server size={10} />
          API Endpoint
        </div>
        <input
          type="text"
          value={settings.baseUrl}
          onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
          className="input-field font-mono"
        />
      </div>

      {/* ── Model ── */}
      <div className="card p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          <Cpu size={10} />
          Model
        </div>
        <select
          value={settings.model}
          onChange={(e) => setSettings({ ...settings, model: e.target.value })}
          className="input-field"
        >
          {models.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <input
          type="text"
          value={settings.model}
          onChange={(e) => setSettings({ ...settings, model: e.target.value })}
          placeholder="Or type a custom model name…"
          className="input-field"
        />
      </div>

      {/* ── Custom prompt ── */}
      <div className="card p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          <MessageSquareText size={10} />
          Custom Instructions
        </div>
        <textarea
          value={settings.customSystemPrompt}
          onChange={(e) => setSettings({ ...settings, customSystemPrompt: e.target.value })}
          placeholder="e.g. Always respond in bullet points, I prefer budget options…"
          rows={3}
          className="input-field"
        />
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
            saved
              ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-600/30'
              : 'btn-primary'
          }`}
        >
          {saved ? <><CheckCircle size={14} /> Saved!</> : <><Save size={14} /> Save Settings</>}
        </button>
        <button
          onClick={handleTest}
          disabled={testing}
          className="btn-secondary flex items-center justify-center gap-1.5 px-4 py-2.5 disabled:opacity-40"
        >
          {testing ? (
            <Loader2 size={14} className="animate-spin text-accent" />
          ) : testResult === 'success' ? (
            <CheckCircle size={14} className="text-emerald-400" />
          ) : testResult === 'error' ? (
            <AlertCircle size={14} className="text-red-400" />
          ) : null}
          Test
        </button>
      </div>

      {/* ── Provider help card ── */}
      <div className="card p-3 text-[11px] text-slate-400 space-y-1.5">
        {settings.provider === 'ollama' && (
          <>
            <p>
              <strong className="text-slate-200">Local AI</strong> — Install{' '}
              <a href="https://ollama.ai" target="_blank" rel="noreferrer" className="text-accent underline">Ollama</a>, then run:{' '}
              <code className="px-1.5 py-0.5 bg-dark-1 rounded text-accent text-[10px] font-mono">ollama run llama3</code>
            </p>
            <p className="text-slate-600">🔒 Data stays on your machine. Free, no API key.</p>
          </>
        )}
        {settings.provider === 'openrouter' && (
          <>
            <p>
              <strong className="text-slate-200">Cloud AI</strong> — Free key at{' '}
              <a href="https://openrouter.ai" target="_blank" rel="noreferrer" className="text-accent underline">openrouter.ai</a>
            </p>
            <p className="text-slate-600">Access GPT-4o, Claude, Llama, Gemini and more.</p>
          </>
        )}
        {settings.provider === 'openai' && (
          <>
            <p><strong className="text-slate-200">OpenAI Direct</strong> — Use your OpenAI API key.</p>
            <p className="text-slate-600">Supports GPT-4o, GPT-4o-mini, and more.</p>
          </>
        )}
      </div>
    </div>
  );
}
