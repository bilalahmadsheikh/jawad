import React, { useState, useEffect } from 'react';
import { DEFAULT_MODELS } from '../../lib/constants';
import type { LLMActions } from '../hooks/useLLM';
import { Save, CheckCircle, AlertCircle, Loader2, Server, Key, Cpu, MessageSquareText } from 'lucide-react';

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
  const [s, setS] = useState<SettingsState>({
    provider: 'ollama', apiKey: '', model: 'llama3',
    baseUrl: 'http://localhost:11434/v1', customSystemPrompt: '',
  });
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const data = await browser.storage.local.get(['jawad_config', 'jawad_systemPrompt']);
      if (data.jawad_config) {
        const c = data.jawad_config as SettingsState;
        setS({
          provider: c.provider || 'ollama', apiKey: c.apiKey || '',
          model: c.model || 'llama3', baseUrl: c.baseUrl || 'http://localhost:11434/v1',
          customSystemPrompt: (data.jawad_systemPrompt as string) || '',
        });
      }
    } catch { /* defaults */ }
  };

  const handleProvider = (provider: string) => {
    const d: Record<string, { baseUrl: string; model: string }> = {
      ollama:     { baseUrl: 'http://localhost:11434/v1', model: 'llama3' },
      openrouter: { baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' },
      openai:     { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
    };
    setS({ ...s, provider, baseUrl: d[provider]?.baseUrl || s.baseUrl, model: d[provider]?.model || s.model });
  };

  const handleSave = async () => {
    llm.saveSettings({ provider: s.provider, apiKey: s.apiKey, model: s.model, baseUrl: s.baseUrl });
    await browser.storage.local.set({ jawad_systemPrompt: s.customSystemPrompt });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    setTesting(true); setTestResult(null);
    try {
      const r = await fetch(`${s.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(s.apiKey ? { Authorization: `Bearer ${s.apiKey}` } : {}) },
        body: JSON.stringify({ model: s.model, messages: [{ role: 'user', content: 'Say ok' }], max_tokens: 5 }),
      });
      setTestResult(r.ok ? 'success' : 'error');
    } catch { setTestResult('error'); }
    setTesting(false);
  };

  const models = DEFAULT_MODELS[s.provider] || [];

  const providers = [
    { id: 'ollama',     emoji: '🦙', name: 'Ollama',     sub: 'Local' },
    { id: 'openrouter', emoji: '🌐', name: 'OpenRouter', sub: 'Cloud' },
    { id: 'openai',     emoji: '🤖', name: 'OpenAI',     sub: 'Direct' },
  ];

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* ── Provider ── */}
      <section>
        <Label icon={<Server size={11} />} text="Provider" />
        <div className="grid grid-cols-3 gap-2 mt-2">
          {providers.map((p) => {
            const active = s.provider === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleProvider(p.id)}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-center transition-all duration-200"
                style={{
                  background: active ? '#1d2840' : '#151e30',
                  border: active ? '1.5px solid #e8792b' : '1.5px solid #253045',
                  boxShadow: active ? '0 0 12px rgba(232,121,43,0.1)' : 'none',
                  color: active ? '#eef2f7' : '#5d6f85',
                }}
              >
                <span className="text-xl leading-none">{p.emoji}</span>
                <span className="text-[11px] font-bold">{p.name}</span>
                <span className="text-[8px] uppercase tracking-wider font-bold" style={{ color: active ? '#e8792b' : '#3d4d65' }}>
                  {p.sub}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── API Key ── */}
      {s.provider !== 'ollama' && (
        <section className="fade-up">
          <Label icon={<Key size={11} />} text="API Key" />
          <input
            type="password"
            value={s.apiKey}
            onChange={(e) => setS({ ...s, apiKey: e.target.value })}
            placeholder={s.provider === 'openrouter' ? 'sk-or-…' : 'sk-…'}
            className="mt-2"
          />
        </section>
      )}

      {/* ── Endpoint ── */}
      <section>
        <Label icon={<Server size={11} />} text="API Endpoint" />
        <input
          type="text"
          value={s.baseUrl}
          onChange={(e) => setS({ ...s, baseUrl: e.target.value })}
          className="mt-2 font-mono"
        />
      </section>

      {/* ── Model ── */}
      <section>
        <Label icon={<Cpu size={11} />} text="Model" />
        {models.length > 0 && (
          <select value={s.model} onChange={(e) => setS({ ...s, model: e.target.value })} className="mt-2">
            {models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        )}
        <input
          type="text"
          value={s.model}
          onChange={(e) => setS({ ...s, model: e.target.value })}
          placeholder="Or type a custom model…"
          className="mt-1.5"
        />
      </section>

      {/* ── Custom prompt ── */}
      <section>
        <Label icon={<MessageSquareText size={11} />} text="Custom Instructions" />
        <textarea
          value={s.customSystemPrompt}
          onChange={(e) => setS({ ...s, customSystemPrompt: e.target.value })}
          placeholder="e.g. Always respond in bullet points, I prefer budget options…"
          rows={3}
          className="mt-2"
        />
      </section>

      {/* ── Buttons ── */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className={saved ? 'btn-flat flex-1 flex items-center justify-center gap-1.5' : 'btn-accent flex-1 flex items-center justify-center gap-1.5'}
          style={saved ? { background: '#0f2e1c', border: '1px solid #166534', color: '#4ade80' } : {}}
        >
          {saved ? <><CheckCircle size={14} /> Saved!</> : <><Save size={14} /> Save Settings</>}
        </button>
        <button onClick={handleTest} disabled={testing} className="btn-flat flex items-center gap-1.5 px-5">
          {testing ? <Loader2 size={14} className="animate-spin" style={{ color: '#e8792b' }} />
            : testResult === 'success' ? <CheckCircle size={14} style={{ color: '#4ade80' }} />
            : testResult === 'error' ? <AlertCircle size={14} style={{ color: '#f87171' }} />
            : null}
          Test
        </button>
      </div>

      {/* ── Help card ── */}
      <div className="card p-3.5 text-[11px] space-y-1.5" style={{ color: '#5d6f85' }}>
        {s.provider === 'ollama' && (
          <>
            <p><strong style={{ color: '#eef2f7' }}>Local AI</strong> — Install <a href="https://ollama.ai" target="_blank" rel="noreferrer" style={{ color: '#e8792b', textDecoration: 'underline' }}>Ollama</a>, then run: <code style={{ background: '#0a1020', color: '#f0a050', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>ollama run llama3</code></p>
            <p>🔒 Data stays on your machine. Free, no API key.</p>
          </>
        )}
        {s.provider === 'openrouter' && (
          <>
            <p><strong style={{ color: '#eef2f7' }}>Cloud AI</strong> — Free key at <a href="https://openrouter.ai" target="_blank" rel="noreferrer" style={{ color: '#e8792b', textDecoration: 'underline' }}>openrouter.ai</a></p>
            <p>Access GPT-4o, Claude, Llama, Gemini and more.</p>
          </>
        )}
        {s.provider === 'openai' && (
          <>
            <p><strong style={{ color: '#eef2f7' }}>OpenAI Direct</strong> — Use your OpenAI API key.</p>
            <p>Supports GPT-4o, GPT-4o-mini, and more.</p>
          </>
        )}
      </div>
    </div>
  );
}

/* Tiny helper for section labels */
function Label({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: '#5d6f85' }}>
      {icon} {text}
    </div>
  );
}
