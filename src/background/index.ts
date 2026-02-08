// ============================================================
// Jawad Background Script
// Central hub for LLM calls, tool execution, message routing.
// Handles voice relay: content script → transcription → sidebar.
// ============================================================

import { handleMessage } from './message-handler';
import { transcribeAudio } from '../lib/any-llm-router';
import type { LLMConfig } from '../lib/types';

let sidebarPort: browser.Port | null = null;

// Listen for sidebar connection
browser.runtime.onConnect.addListener((port: browser.Port) => {
  if (port.name === 'sidebar') {
    sidebarPort = port;
    console.log('[Jawad] Sidebar connected');

    port.onMessage.addListener((msg: unknown) => {
      const message = msg as Record<string, unknown>;

      // Voice audio sent directly from sidebar (sidebar-based recording)
      if (message.type === 'VOICE_AUDIO_DIRECT') {
        const payload = message.payload as { audio: string; mimeType: string };
        handleVoiceTranscription(payload);
        return;
      }

      // Legacy: relay voice commands to content script (fallback path)
      if (message.type === 'START_VOICE') {
        relayVoiceCommand('START_VOICE_INPUT');
        return;
      }
      if (message.type === 'STOP_VOICE') {
        relayVoiceCommand('STOP_VOICE_INPUT');
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

    // Voice state messages: forward from content script to sidebar
    if (
      message.type === 'VOICE_RESULT' ||
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
            'No LLM provider configured. Go to Settings and configure a provider to enable voice transcription.',
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
 */
async function relayVoiceCommand(type: string): Promise<void> {
  try {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    const tab = tabs[0];
    if (tab?.id) {
      await browser.tabs.sendMessage(tab.id, { type });
    } else if (sidebarPort) {
      sidebarPort.postMessage({
        type: 'VOICE_ERROR',
        payload: { error: 'No active tab. Navigate to a webpage first.' },
      });
    }
  } catch {
    if (sidebarPort) {
      sidebarPort.postMessage({
        type: 'VOICE_ERROR',
        payload: {
          error:
            'Cannot access this page for voice input. Try navigating to a regular webpage.',
        },
      });
    }
  }
}

console.log('[Jawad] Background script loaded');
