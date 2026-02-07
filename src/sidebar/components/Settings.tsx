import React, { useState, useEffect } from 'react';
import { DEFAULT_MODELS } from '../../lib/constants';
import type { LLMActions } from '../hooks/useLLM';
import { Save, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

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
        'foxagent_config',
        'foxagent_systemPrompt',
      ]);
      if (data.foxagent_config) {
        const config = data.foxagent_config as SettingsState;
        setSettings({
          provider: config.provider || 'ollama',
          apiKey: config.apiKey || '',
          model: config.model || 'llama3',
          baseUrl: config.baseUrl || 'http://localhost:11434/v1',
          customSystemPrompt: (data.foxagent_systemPrompt as string) || '',
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
      foxagent_systemPrompt: settings.customSystemPrompt,
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

  return (
    <div className="h-full overflow-y-auto p-3 space-y-4">
      <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">
        AI Provider Configuration
      </div>

      {/* Provider Selection */}
      <div>
        <label className="block text-xs text-slate-400 mb-1">Provider</label>
        <div className="grid grid-cols-3 gap-1">
          {['ollama', 'openrouter', 'openai'].map((p) => (
            <button
              key={p}
              onClick={() => handleProviderChange(p)}
              className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                settings.provider === p
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600 border border-transparent'
              }`}
            >
              {p === 'ollama' ? '🦙 Ollama' : p === 'openrouter' ? '🌐 OpenRouter' : '🤖 OpenAI'}
            </button>
          ))}
        </div>
      </div>

      {/* API Key (not needed for Ollama) */}
      {settings.provider !== 'ollama' && (
        <div>
          <label className="block text-xs text-slate-400 mb-1">API Key</label>
          <input
            type="password"
            value={settings.apiKey}
            onChange={(e) =>
              setSettings({ ...settings, apiKey: e.target.value })
            }
            placeholder={
              settings.provider === 'openrouter'
                ? 'sk-or-...'
                : 'sk-...'
            }
            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>
      )}

      {/* Base URL */}
      <div>
        <label className="block text-xs text-slate-400 mb-1">
          API Endpoint
        </label>
        <input
          type="text"
          value={settings.baseUrl}
          onChange={(e) =>
            setSettings({ ...settings, baseUrl: e.target.value })
          }
          className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
      </div>

      {/* Model Selection */}
      <div>
        <label className="block text-xs text-slate-400 mb-1">Model</label>
        <select
          value={settings.model}
          onChange={(e) =>
            setSettings({ ...settings, model: e.target.value })
          }
          className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
        >
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        {/* Custom model input */}
        <input
          type="text"
          value={settings.model}
          onChange={(e) =>
            setSettings({ ...settings, model: e.target.value })
          }
          placeholder="Or type a custom model name..."
          className="w-full mt-1 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
      </div>

      {/* Custom System Prompt */}
      <div>
        <label className="block text-xs text-slate-400 mb-1">
          Custom Instructions (optional)
        </label>
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
          className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded-lg transition-colors"
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
          className="flex items-center justify-center gap-1 px-3 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {testing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : testResult === 'success' ? (
            <CheckCircle size={14} className="text-green-400" />
          ) : testResult === 'error' ? (
            <AlertCircle size={14} className="text-red-400" />
          ) : null}
          Test
        </button>
      </div>

      {/* Provider Info */}
      <div className="bg-slate-800 rounded-lg p-2 text-xs text-slate-400 space-y-1 border border-slate-700">
        {settings.provider === 'ollama' && (
          <>
            <p>
              <strong className="text-slate-300">Local AI:</strong> Install{' '}
              <a
                href="https://ollama.ai"
                target="_blank"
                rel="noreferrer"
                className="text-orange-400 underline"
              >
                Ollama
              </a>
              , then run: <code className="bg-slate-700 px-1 rounded">ollama run llama3</code>
            </p>
            <p>
              🔒 Data never leaves your machine. Free, no API key needed.
            </p>
          </>
        )}
        {settings.provider === 'openrouter' && (
          <>
            <p>
              <strong className="text-slate-300">Cloud AI:</strong> Get a free key at{' '}
              <a
                href="https://openrouter.ai"
                target="_blank"
                rel="noreferrer"
                className="text-orange-400 underline"
              >
                openrouter.ai
              </a>
            </p>
            <p>Access GPT-4o, Claude, Llama, Gemini and more.</p>
          </>
        )}
        {settings.provider === 'openai' && (
          <>
            <p>
              <strong className="text-slate-300">OpenAI Direct:</strong> Use your OpenAI API key.
            </p>
            <p>Supports GPT-4o, GPT-4o-mini, and more.</p>
          </>
        )}
      </div>
    </div>
  );
}

