import React, { useState, useEffect, useCallback } from 'react';
import { DEFAULT_MODELS } from '../../lib/constants';
import type { LLMActions } from '../hooks/useLLM';
import { sendToBackground, addMessageHandler } from '../lib/port';
import { Save, CheckCircle, AlertCircle, Loader2, Server, Key, Cpu, MessageSquareText, Mic, Zap, RefreshCw } from 'lucide-react';

const VOICE_MODE_KEY = 'jawad_voice_mode';

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

/* Firefox sidebar ignores CSS on form elements —
   inline style is the only reliable override. */
const FIELD: React.CSSProperties = {
  backgroundColor: '#172033',
  color: '#dde4ed',
  border: '1.5px solid #293548',
  borderRadius: 10,
  padding: '9px 12px',
  fontSize: 12,
  width: '100%',
  outline: 'none',
  fontFamily: 'inherit',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
};

const SELECT: React.CSSProperties = {
  ...FIELD,
  paddingRight: 30,
  cursor: 'pointer',
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%236b7a8f'%3E%3Cpath d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
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

  // Listen for TEST_RESULT and OLLAMA_MODELS from background script
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
        if (p.models && p.models.length > 0) {
          setOllamaModels(p.models);
        }
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
        // Fetch Ollama models if provider is ollama
        if (provider === 'ollama') {
          fetchOllamaModels(c.baseUrl || 'http://localhost:11434/v1');
        }
      } else {
        // First load, fetch Ollama models
        fetchOllamaModels('http://localhost:11434/v1');
      }
    } catch { /* defaults */ }
  };

  const fetchOllamaModels = (baseUrl: string) => {
    setFetchingModels(true);
    sendToBackground({
      type: 'FETCH_OLLAMA_MODELS',
      payload: { baseUrl },
    });
    // Timeout
    setTimeout(() => setFetchingModels(false), 10000);
  };

  const handleProvider = (provider: string) => {
    const d: Record<string, { baseUrl: string; model: string }> = {
      ollama:     { baseUrl: 'http://localhost:11434/v1', model: 'llama3' },
      openrouter: { baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' },
      openai:     { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
    };
    const newState = { ...s, provider, baseUrl: d[provider]?.baseUrl || s.baseUrl, model: d[provider]?.model || s.model };
    setS(newState);

    // Auto-switch voice to Browser for Ollama (Whisper doesn't work with Ollama)
    if (provider === 'ollama' && voiceMode === 'whisper') {
      handleVoiceMode('browser');
    }

    // Fetch Ollama models when switching to Ollama
    if (provider === 'ollama') {
      fetchOllamaModels(d[provider].baseUrl);
    }

    // Clear test result when switching providers
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
    // Route test through background script — sidebar can't fetch localhost directly
    sendToBackground({
      type: 'TEST_CONNECTION',
      payload: { provider: s.provider, baseUrl: s.baseUrl, model: s.model, apiKey: s.apiKey },
    });
    // Timeout fallback in case background never responds
    // 30s for Ollama (cold start can be slow), 20s for cloud providers
    const timeoutMs = s.provider === 'ollama' ? 30000 : 20000;
    setTimeout(() => {
      setTesting((prev) => {
        if (prev) {
          setTestResult('error');
          setTestError(
            s.provider === 'ollama'
              ? 'Test timed out — is Ollama running? Run: ollama serve'
              : 'Test timed out — check your API key and endpoint.'
          );
        }
        return false;
      });
    }, timeoutMs);
  }, [s.baseUrl, s.model, s.apiKey, s.provider]);

  // Build model list: for Ollama, prefer fetched models; fallback to defaults
  const models = s.provider === 'ollama' && ollamaModels.length > 0
    ? ollamaModels
    : (DEFAULT_MODELS[s.provider] || []);

  // Make sure current model is in the list
  const modelOptions = models.includes(s.model) ? models : [s.model, ...models];

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
            style={FIELD}
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
          className="mt-2"
          style={{ ...FIELD, fontFamily: 'monospace' }}
        />
      </section>

      {/* ── Model ── */}
      <section>
        <div className="flex items-center justify-between">
          <Label icon={<Cpu size={11} />} text="Model" />
          {s.provider === 'ollama' && (
            <button
              onClick={() => fetchOllamaModels(s.baseUrl)}
              disabled={fetchingModels}
              className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider transition-colors"
              style={{ color: fetchingModels ? '#3d4d65' : '#e8792b' }}
              title="Refresh models from Ollama"
            >
              <RefreshCw size={9} className={fetchingModels ? 'animate-spin' : ''} />
              {fetchingModels ? 'Loading…' : 'Refresh'}
            </button>
          )}
        </div>
        {modelOptions.length > 0 && (
          <select
            value={s.model}
            onChange={(e) => setS({ ...s, model: e.target.value })}
            className="mt-2"
            style={SELECT}
          >
            {modelOptions.map((m) => <option key={m} value={m} style={{ backgroundColor: '#172033', color: '#dde4ed' }}>{m}</option>)}
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
          <p className="text-[9px] mt-1" style={{ color: '#4ade80' }}>
            ✓ {ollamaModels.length} model{ollamaModels.length > 1 ? 's' : ''} found on your machine
          </p>
        )}
        {s.provider === 'ollama' && ollamaModels.length === 0 && !fetchingModels && (
          <p className="text-[9px] mt-1" style={{ color: '#f0a050' }}>
            Could not fetch models. Is Ollama running? Using defaults.
          </p>
        )}
      </section>

      {/* ── Voice Mode ── */}
      <section>
        <Label icon={<Mic size={11} />} text="Voice Input" />
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button
            onClick={() => handleVoiceMode('whisper')}
            className="flex flex-col items-center gap-1 py-3 rounded-xl text-center transition-all duration-200"
            style={{
              background: voiceMode === 'whisper' ? '#1d2840' : '#151e30',
              border: voiceMode === 'whisper' ? '1.5px solid #e8792b' : '1.5px solid #253045',
              color: voiceMode === 'whisper' ? '#eef2f7' : '#5d6f85',
              opacity: s.provider === 'ollama' ? 0.4 : 1,
            }}
            disabled={s.provider === 'ollama'}
            title={s.provider === 'ollama' ? 'Whisper not available with Ollama' : ''}
          >
            <Zap size={14} style={{ color: voiceMode === 'whisper' ? '#e8792b' : '#5d6f85' }} />
            <span className="text-[11px] font-bold">Whisper</span>
            <span className="text-[8px]" style={{ color: '#3d4d65' }}>OpenAI/OpenRouter</span>
          </button>
          <button
            onClick={() => handleVoiceMode('browser')}
            className="flex flex-col items-center gap-1 py-3 rounded-xl text-center transition-all duration-200"
            style={{
              background: voiceMode === 'browser' ? '#1d2840' : '#151e30',
              border: voiceMode === 'browser' ? '1.5px solid #e8792b' : '1.5px solid #253045',
              color: voiceMode === 'browser' ? '#eef2f7' : '#5d6f85',
            }}
          >
            <Mic size={14} style={{ color: voiceMode === 'browser' ? '#e8792b' : '#5d6f85' }} />
            <span className="text-[11px] font-bold">Browser</span>
            <span className="text-[8px]" style={{ color: '#3d4d65' }}>Free · No API · Real-time</span>
          </button>
        </div>
        <p className="text-[10px] mt-1.5" style={{ color: '#3d4d65' }}>
          {s.provider === 'ollama'
            ? 'Ollama doesn\'t support Whisper. Browser Speech is selected (free, works on HTTPS).'
            : voiceMode === 'whisper'
              ? 'Uses your LLM provider for transcription. Requires OpenAI or OpenRouter.'
              : 'Uses browser speech recognition. Works on HTTPS pages. No API key needed.'}
        </p>
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
          style={TEXTAREA}
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

      {/* ── Test error detail ── */}
      {testResult === 'error' && testError && (
        <div className="px-3 py-2.5 rounded-xl text-[11px] fade-up" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
          <div className="flex items-start gap-2">
            <AlertCircle size={12} className="flex-shrink-0 mt-0.5" style={{ color: '#f87171' }} />
            <span className="leading-relaxed">{testError}</span>
          </div>
        </div>
      )}

      {/* ── Test success detail ── */}
      {testResult === 'success' && (
        <div className="px-3 py-2.5 rounded-xl text-[11px] fade-up" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80' }}>
          <div className="flex items-center gap-2">
            <CheckCircle size={12} className="flex-shrink-0" />
            <span>Connected! {s.provider === 'ollama' ? `Model "${s.model}" is responding.` : `${s.provider} is working.`}</span>
          </div>
        </div>
      )}

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

function Label({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: '#5d6f85' }}>
      {icon} {text}
    </div>
  );
}
