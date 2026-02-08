import React, { useState, useEffect, useCallback } from 'react';
import { DEFAULT_MODELS } from '../../lib/constants';
import type { LLMActions } from '../hooks/useLLM';
import { sendToBackground, addMessageHandler } from '../lib/port';
import {
  Save, CheckCircle, AlertCircle, Loader2, Server, Key, Cpu,
  MessageSquareText, Mic, Zap, RefreshCw, Sparkles, ExternalLink,
} from 'lucide-react';

const VOICE_MODE_KEY = 'jawad_voice_mode';

interface SettingsProps { llm: LLMActions; }

interface SettingsState {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl: string;
  customSystemPrompt: string;
}

const FIELD: React.CSSProperties = {
  backgroundColor: '#0f1726',
  color: '#dde4ed',
  border: '1.5px solid #1e2d45',
  borderRadius: 12,
  padding: '10px 14px',
  fontSize: 12,
  width: '100%',
  outline: 'none',
  fontFamily: 'inherit',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
};

const SELECT: React.CSSProperties = {
  ...FIELD,
  paddingRight: 32,
  cursor: 'pointer',
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%235d6f85'%3E%3Cpath d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
};

const TEXTAREA: React.CSSProperties = {
  ...FIELD,
  resize: 'none',
  minHeight: 60,
};

export function Settings({ llm }: SettingsProps) {
  const [s, setS] = useState<SettingsState>({
    provider: 'ollama', apiKey: '', model: 'llama3',
    baseUrl: 'http://localhost:11434/v1', customSystemPrompt: '',
  });
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [voiceMode, setVoiceMode] = useState<'whisper' | 'browser'>('whisper');
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);

  useEffect(() => {
    browser.storage.local.get(VOICE_MODE_KEY).then((d) => {
      if (d[VOICE_MODE_KEY] === 'browser' || d[VOICE_MODE_KEY] === 'whisper') {
        setVoiceMode(d[VOICE_MODE_KEY]);
      }
    });
  }, []);

  const handleVoiceMode = (mode: 'whisper' | 'browser') => {
    setVoiceMode(mode);
    browser.storage.local.set({ [VOICE_MODE_KEY]: mode }).catch(() => {});
  };

  useEffect(() => {
    const unsub = addMessageHandler((msg) => {
      if (msg.type === 'TEST_RESULT') {
        const p = msg.payload as { success: boolean; error?: string };
        setTestResult(p.success ? 'success' : 'error');
        setTestError(p.success ? null : (p.error || 'Unknown error'));
        setTesting(false);
      }
      if (msg.type === 'OLLAMA_MODELS') {
        const p = msg.payload as { models: string[] };
        if (p.models && p.models.length > 0) setOllamaModels(p.models);
        setFetchingModels(false);
      }
    });
    return unsub;
  }, []);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const data = await browser.storage.local.get(['jawad_config', 'jawad_systemPrompt']);
      if (data.jawad_config) {
        const c = data.jawad_config as SettingsState;
        const provider = c.provider || 'ollama';
        setS({
          provider, apiKey: c.apiKey || '',
          model: c.model || 'llama3', baseUrl: c.baseUrl || 'http://localhost:11434/v1',
          customSystemPrompt: (data.jawad_systemPrompt as string) || '',
        });
        if (provider === 'ollama') fetchOllamaModels(c.baseUrl || 'http://localhost:11434/v1');
      } else {
        fetchOllamaModels('http://localhost:11434/v1');
      }
    } catch { /* defaults */ }
  };

  const fetchOllamaModels = (baseUrl: string) => {
    setFetchingModels(true);
    sendToBackground({ type: 'FETCH_OLLAMA_MODELS', payload: { baseUrl } });
    setTimeout(() => setFetchingModels(false), 10000);
  };

  const handleProvider = (provider: string) => {
    const d: Record<string, { baseUrl: string; model: string }> = {
      ollama:     { baseUrl: 'http://localhost:11434/v1', model: 'llama3' },
      openrouter: { baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' },
      openai:     { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
    };
    setS({ ...s, provider, baseUrl: d[provider]?.baseUrl || s.baseUrl, model: d[provider]?.model || s.model });
    if (provider === 'ollama' && voiceMode === 'whisper') handleVoiceMode('browser');
    if (provider === 'ollama') fetchOllamaModels(d[provider].baseUrl);
    setTestResult(null);
    setTestError(null);
  };

  const handleSave = async () => {
    llm.saveSettings({ provider: s.provider, apiKey: s.apiKey, model: s.model, baseUrl: s.baseUrl });
    await browser.storage.local.set({ jawad_systemPrompt: s.customSystemPrompt });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = useCallback(() => {
    setTesting(true); setTestResult(null); setTestError(null);
    sendToBackground({
      type: 'TEST_CONNECTION',
      payload: { provider: s.provider, baseUrl: s.baseUrl, model: s.model, apiKey: s.apiKey },
    });
    const timeoutMs = s.provider === 'ollama' ? 30000 : 20000;
    setTimeout(() => {
      setTesting((prev) => {
        if (prev) {
          setTestResult('error');
          setTestError(s.provider === 'ollama' ? 'Test timed out — is Ollama running? Run: ollama serve' : 'Test timed out — check your API key and endpoint.');
        }
        return false;
      });
    }, timeoutMs);
  }, [s.baseUrl, s.model, s.apiKey, s.provider]);

  const models = s.provider === 'ollama' && ollamaModels.length > 0 ? ollamaModels : (DEFAULT_MODELS[s.provider] || []);
  const modelOptions = models.includes(s.model) ? models : [s.model, ...models];

  const providers = [
    { id: 'ollama',     icon: '🦙', name: 'Ollama',     sub: 'Local AI', color: '#22c55e' },
    { id: 'openrouter', icon: '🌐', name: 'OpenRouter', sub: 'Multi-model', color: '#3b82f6' },
    { id: 'openai',     icon: '🤖', name: 'OpenAI',     sub: 'GPT Direct', color: '#a855f7' },
  ];

  return (
    <div className="h-full overflow-y-auto p-4 space-y-5">
      {/* ── Provider ── */}
      <section>
        <SectionLabel icon={<Server size={11} />} text="Provider" />
        <div className="grid grid-cols-3 gap-2 mt-2.5">
          {providers.map((p) => {
            const active = s.provider === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleProvider(p.id)}
                className="relative flex flex-col items-center gap-1.5 py-3.5 rounded-xl text-center transition-all duration-300"
                style={{
                  background: active ? '#121c2e' : '#0e1525',
                  border: active ? `1.5px solid ${p.color}` : '1.5px solid #1a2538',
                  boxShadow: active ? `0 0 20px ${p.color}15, 0 4px 12px rgba(0,0,0,0.3)` : '0 2px 8px rgba(0,0,0,0.15)',
                  color: active ? '#eef2f7' : '#4a5c72',
                  transform: active ? 'translateY(-2px)' : 'none',
                }}
              >
                {active && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: p.color, boxShadow: `0 0 6px ${p.color}` }} />
                )}
                <span className="text-2xl leading-none">{p.icon}</span>
                <span className="text-[11px] font-bold">{p.name}</span>
                <span className="text-[8px] uppercase tracking-wider font-bold" style={{ color: active ? p.color : '#2e3f58' }}>
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
          <SectionLabel icon={<Key size={11} />} text="API Key" />
          <input
            type="password"
            value={s.apiKey}
            onChange={(e) => setS({ ...s, apiKey: e.target.value })}
            placeholder={s.provider === 'openrouter' ? 'sk-or-…' : 'sk-…'}
            className="mt-2"
            style={FIELD}
          />
          {s.provider === 'openrouter' && (
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 mt-1.5 text-[9px] font-bold"
              style={{ color: '#e8792b' }}
            >
              <ExternalLink size={8} /> Get free API key →
            </a>
          )}
        </section>
      )}

      {/* ── Endpoint ── */}
      <section>
        <SectionLabel icon={<Server size={11} />} text="API Endpoint" />
        <input
          type="text"
          value={s.baseUrl}
          onChange={(e) => setS({ ...s, baseUrl: e.target.value })}
          className="mt-2"
          style={{ ...FIELD, fontFamily: "'Cascadia Code', 'Fira Code', monospace", fontSize: 11 }}
        />
      </section>

      {/* ── Model ── */}
      <section>
        <div className="flex items-center justify-between">
          <SectionLabel icon={<Cpu size={11} />} text="Model" />
          {s.provider === 'ollama' && (
            <button
              onClick={() => fetchOllamaModels(s.baseUrl)}
              disabled={fetchingModels}
              className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider transition-all duration-200"
              style={{ color: fetchingModels ? '#2e3f58' : '#e8792b' }}
              title="Refresh models from Ollama"
            >
              <RefreshCw size={9} className={fetchingModels ? 'animate-spin' : ''} />
              {fetchingModels ? 'Loading…' : 'Refresh'}
            </button>
          )}
        </div>
        {modelOptions.length > 0 && (
          <select value={s.model} onChange={(e) => setS({ ...s, model: e.target.value })} className="mt-2" style={SELECT}>
            {modelOptions.map((m) => <option key={m} value={m} style={{ backgroundColor: '#0f1726', color: '#dde4ed' }}>{m}</option>)}
          </select>
        )}
        <input
          type="text"
          value={s.model}
          onChange={(e) => setS({ ...s, model: e.target.value })}
          placeholder="Or type a custom model…"
          className="mt-1.5"
          style={FIELD}
        />
        {s.provider === 'ollama' && ollamaModels.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e', boxShadow: '0 0 4px #22c55e' }} />
            <span className="text-[9px] font-bold" style={{ color: '#22c55e' }}>
              {ollamaModels.length} model{ollamaModels.length > 1 ? 's' : ''} detected
            </span>
          </div>
        )}
        {s.provider === 'ollama' && ollamaModels.length === 0 && !fetchingModels && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#f59e0b' }} />
            <span className="text-[9px] font-medium" style={{ color: '#f59e0b' }}>
              No models found. Is Ollama running?
            </span>
          </div>
        )}
      </section>

      {/* ── Voice Mode ── */}
      <section>
        <SectionLabel icon={<Mic size={11} />} text="Voice Input" />
        <div className="grid grid-cols-2 gap-2 mt-2.5">
          {[
            { mode: 'whisper' as const, icon: <Zap size={14} />, name: 'Whisper', desc: 'Cloud · Best quality', color: '#e8792b', disabled: s.provider === 'ollama' },
            { mode: 'browser' as const, icon: <Mic size={14} />, name: 'Browser', desc: 'Free · Real-time', color: '#22c55e', disabled: false },
          ].map((v) => {
            const active = voiceMode === v.mode;
            return (
              <button
                key={v.mode}
                onClick={() => handleVoiceMode(v.mode)}
                disabled={v.disabled}
                className="flex flex-col items-center gap-1.5 py-3.5 rounded-xl text-center transition-all duration-300"
                style={{
                  background: active ? '#121c2e' : '#0e1525',
                  border: active ? `1.5px solid ${v.color}` : '1.5px solid #1a2538',
                  boxShadow: active ? `0 0 15px ${v.color}15` : 'none',
                  color: active ? '#eef2f7' : '#4a5c72',
                  opacity: v.disabled ? 0.35 : 1,
                  cursor: v.disabled ? 'not-allowed' : 'pointer',
                }}
              >
                <span style={{ color: active ? v.color : '#4a5c72' }}>{v.icon}</span>
                <span className="text-[11px] font-bold">{v.name}</span>
                <span className="text-[8px]" style={{ color: '#2e3f58' }}>{v.desc}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[9px] mt-1.5 leading-relaxed" style={{ color: '#2e3f58' }}>
          {s.provider === 'ollama'
            ? 'Ollama doesn\'t support Whisper. Browser Speech selected (free, HTTPS).'
            : voiceMode === 'whisper'
              ? 'Uses your LLM provider for transcription. Best accuracy.'
              : 'Uses browser speech recognition. Free, no API key.'}
        </p>
      </section>

      {/* ── Custom prompt ── */}
      <section>
        <SectionLabel icon={<MessageSquareText size={11} />} text="Custom Instructions" />
        <textarea
          value={s.customSystemPrompt}
          onChange={(e) => setS({ ...s, customSystemPrompt: e.target.value })}
          placeholder="e.g. Always respond in bullet points, I prefer budget options…"
          rows={3}
          className="mt-2"
          style={TEXTAREA}
        />
      </section>

      {/* ── Buttons ── */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className={saved ? 'btn-flat flex-1 flex items-center justify-center gap-1.5' : 'btn-accent flex-1 flex items-center justify-center gap-1.5'}
          style={saved ? { background: '#0a2015', border: '1px solid #166534', color: '#4ade80', boxShadow: '0 0 15px rgba(74,222,128,0.1)' } : {}}
        >
          {saved ? <><CheckCircle size={14} /> Saved!</> : <><Save size={14} /> Save</>}
        </button>
        <button onClick={handleTest} disabled={testing} className="btn-flat flex items-center gap-1.5 px-5">
          {testing ? <Loader2 size={14} className="animate-spin" style={{ color: '#e8792b' }} />
            : testResult === 'success' ? <CheckCircle size={14} style={{ color: '#4ade80' }} />
            : testResult === 'error' ? <AlertCircle size={14} style={{ color: '#f87171' }} />
            : <Sparkles size={14} style={{ color: '#4a5c72' }} />}
          Test
        </button>
      </div>

      {/* ── Test results ── */}
      {testResult === 'error' && testError && (
        <div className="px-3.5 py-3 rounded-xl text-[11px] fade-up" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.03))', border: '1px solid rgba(239,68,68,0.15)', color: '#fca5a5' }}>
          <div className="flex items-start gap-2">
            <AlertCircle size={12} className="flex-shrink-0 mt-0.5" style={{ color: '#f87171' }} />
            <span className="leading-relaxed">{testError}</span>
          </div>
        </div>
      )}
      {testResult === 'success' && (
        <div className="px-3.5 py-3 rounded-xl text-[11px] fade-up" style={{ background: 'linear-gradient(135deg, rgba(74,222,128,0.08), rgba(74,222,128,0.03))', border: '1px solid rgba(74,222,128,0.15)', color: '#86efac' }}>
          <div className="flex items-center gap-2">
            <CheckCircle size={12} className="flex-shrink-0" style={{ color: '#4ade80' }} />
            <span>Connected! {s.provider === 'ollama' ? `Model "${s.model}" is live.` : `${s.provider} is ready.`}</span>
          </div>
        </div>
      )}

      {/* ── Help card ── */}
      <div className="card p-4 text-[11px] space-y-2" style={{ color: '#4a5c72' }}>
        {s.provider === 'ollama' && (
          <>
            <p><strong style={{ color: '#eef2f7' }}>🦙 Local AI</strong> — Install <a href="https://ollama.ai" target="_blank" rel="noreferrer" style={{ color: '#e8792b', textDecoration: 'underline' }}>Ollama</a>, then run:</p>
            <code className="block px-3 py-2 rounded-lg text-[11px]" style={{ background: '#060b14', color: '#f0a050', border: '1px solid #1a2538' }}>ollama run llama3</code>
            <p className="flex items-center gap-1.5">🔒 <span>Data stays on your machine. Free, no API key.</span></p>
          </>
        )}
        {s.provider === 'openrouter' && (
          <>
            <p><strong style={{ color: '#eef2f7' }}>🌐 Cloud AI</strong> — Access 100+ models through one API.</p>
            <p>Free tier available. Get key at <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" style={{ color: '#e8792b', textDecoration: 'underline' }}>openrouter.ai/keys</a></p>
            <p className="flex items-center gap-1.5">⚡ <span>GPT-4o, Claude, Llama, Gemini and more.</span></p>
          </>
        )}
        {s.provider === 'openai' && (
          <>
            <p><strong style={{ color: '#eef2f7' }}>🤖 OpenAI Direct</strong> — Use your OpenAI API key.</p>
            <p>Supports GPT-4o, GPT-4o-mini, and more.</p>
          </>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: '#4a5c72' }}>
      {icon} {text}
    </div>
  );
}
