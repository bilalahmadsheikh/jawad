// ============================================================
// Jawad Background Script
// Central hub for LLM calls, tool execution, message routing.
// Handles voice relay: content script → transcription → sidebar.
// Supports Whisper (OpenAI/OpenRouter) and Browser Speech (free fallback).
// ============================================================

import { handleMessage } from './message-handler';
import {
  transcribeAudio,
  supportsTranscription,
} from '../lib/any-llm-router';
import type { LLMConfig } from '../lib/types';

let sidebarPort: browser.Port | null = null;

// Listen for sidebar connection
browser.runtime.onConnect.addListener((port: browser.Port) => {
  if (port.name === 'sidebar') {
    sidebarPort = port;
    console.log('[Jawad] Sidebar connected');

    port.onMessage.addListener((msg: unknown) => {
      const message = msg as Record<string, unknown>;

      // Voice audio sent directly from sidebar (Whisper path)
      if (message.type === 'VOICE_AUDIO_DIRECT') {
        const payload = message.payload as { audio: string; mimeType: string };
        handleVoiceTranscription(payload);
        return;
      }

      // Relay voice commands to content script (Browser Speech or legacy Whisper)
      if (message.type === 'START_VOICE') {
        relayVoiceCommand('START_VOICE_INPUT');
        return;
      }
      if (message.type === 'STOP_VOICE') {
        relayVoiceCommand('STOP_VOICE_INPUT');
        return;
      }
      if (message.type === 'START_SPEECH_RECOGNITION') {
        relayVoiceCommand('START_SPEECH_RECOGNITION');
        return;
      }
      if (message.type === 'STOP_SPEECH_RECOGNITION') {
        relayVoiceCommand('STOP_SPEECH_RECOGNITION');
        return;
      }

      handleMessage(message, port);
    });

    port.onDisconnect.addListener(() => {
      sidebarPort = null;
      console.log('[Jawad] Sidebar disconnected');
    });
  }
});

// Listen for content script messages (voice audio, voice events, page events)
browser.runtime.onMessage.addListener(
  (msg: unknown, _sender: browser.MessageSender) => {
    const message = msg as Record<string, unknown>;

    // Voice audio: transcribe via Whisper API, then forward result to sidebar
    if (message.type === 'VOICE_AUDIO') {
      const payload = message.payload as { audio: string; mimeType: string };
      handleVoiceTranscription(payload);
      return Promise.resolve(undefined);
    }

    // Voice state / result messages: forward from content script to sidebar
    if (
      message.type === 'VOICE_RESULT' ||
      message.type === 'VOICE_SPEECH_RESULT' ||
      message.type === 'VOICE_END' ||
      message.type === 'VOICE_ERROR' ||
      message.type === 'VOICE_STARTED' ||
      message.type === 'VOICE_TRANSCRIBING' ||
      message.type === 'VOICE_REQUESTING_MIC'
    ) {
      if (sidebarPort) {
        sidebarPort.postMessage(msg);
      }
      return Promise.resolve(undefined);
    }

    // Other content script messages
    if (message.type === 'PAGE_CONTENT_READY' && sidebarPort) {
      sidebarPort.postMessage(msg);
    }

    return Promise.resolve(undefined);
  }
);

/**
 * Handle audio transcription: load LLM config and call Whisper API.
 * Uses supportsTranscription to give clear guidance when provider doesn't support it.
 */
async function handleVoiceTranscription(payload: {
  audio: string;
  mimeType: string;
}): Promise<void> {
  try {
    const data = await browser.storage.local.get('jawad_config');
    const config = data.jawad_config as LLMConfig | undefined;

    if (!config || !config.baseUrl) {
      sidebarPort?.postMessage({
        type: 'VOICE_ERROR',
        payload: {
          error:
            'Configure an LLM (OpenAI or OpenRouter) in Settings for voice, or use "Browser Speech" mode (free, no API key).',
        },
      });
      return;
    }

    if (!supportsTranscription(config)) {
      sidebarPort?.postMessage({
        type: 'VOICE_ERROR',
        payload: {
          error:
            'Voice requires OpenAI or OpenRouter. Ollama doesn\'t support Whisper. Switch provider or use "Browser Speech" mode.',
        },
      });
      return;
    }

    const transcript = await transcribeAudio(
      config,
      payload.audio,
      payload.mimeType
    );

    if (!transcript || !transcript.trim()) {
      sidebarPort?.postMessage({
        type: 'VOICE_ERROR',
        payload: { error: 'No speech detected. Please try again and speak clearly.' },
      });
      return;
    }

    if (sidebarPort) {
      sidebarPort.postMessage({
        type: 'VOICE_RESULT',
        payload: { transcript: transcript.trim(), isFinal: true },
      });
    }
  } catch (e) {
    if (sidebarPort) {
      sidebarPort.postMessage({
        type: 'VOICE_ERROR',
        payload: {
          error: e instanceof Error ? e.message : String(e),
        },
      });
    }
  }
}

/**
 * Send a voice command to the content script on the active tab.
 * For START_SPEECH_RECOGNITION, the content script returns { success, error }.
 */
async function relayVoiceCommand(type: string): Promise<void> {
  try {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    const tab = tabs[0];
    if (!tab?.id) {
      sidebarPort?.postMessage({
        type: 'VOICE_ERROR',
        payload: { error: 'No active tab. Navigate to an HTTPS webpage first.' },
      });
      return;
    }

    const result = await browser.tabs.sendMessage(tab.id, { type });

    // START_SPEECH_RECOGNITION returns { success, error }
    if (type === 'START_SPEECH_RECOGNITION' && result && typeof result === 'object') {
      const r = result as { success?: boolean; error?: string };
      if (!r.success && r.error && sidebarPort) {
        sidebarPort.postMessage({
          type: 'VOICE_ERROR',
          payload: { error: r.error },
        });
      }
    }
  } catch {
    if (sidebarPort) {
      sidebarPort.postMessage({
        type: 'VOICE_ERROR',
        payload: {
          error:
            'Cannot access this page. Use an HTTPS site and ensure the extension is loaded.',
        },
      });
    }
  }
}

console.log('[Jawad] Background script loaded');
