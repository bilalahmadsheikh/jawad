import { useEffect, useRef } from 'react';
import { useChatStore } from '../stores/chat-store';
import { useHarborStore } from '../stores/harbor-store';
import { useWorkflowStore } from '../stores/workflow-store';
import type { PermissionRequest, ActionLogEntry, WorkflowPlan } from '../../lib/types';

// Module-level port management (singleton across hook instances)
let port: browser.Port | null = null;
const messageHandlers = new Set<(msg: Record<string, unknown>) => void>();

function ensurePort(): browser.Port {
  if (!port) {
    port = browser.runtime.connect({ name: 'sidebar' });
    port.onMessage.addListener((msg: unknown) => {
      const message = msg as Record<string, unknown>;
      messageHandlers.forEach((h) => h(message));
    });
    port.onDisconnect.addListener(() => {
      port = null;
    });
  }
  return port;
}

function sendToBackground(msg: Record<string, unknown>): void {
  try {
    ensurePort().postMessage(msg);
  } catch {
    // Port disconnected, try to reconnect
    port = null;
    ensurePort().postMessage(msg);
  }
}

export interface LLMActions {
  sendChatMessage: (content: string) => void;
  summarizePage: () => void;
  respondToPermission: (requestId: string, decision: string) => void;
  startWorkflow: (intent: string) => void;
  cancelWorkflow: () => void;
  saveSettings: (config: Record<string, unknown>) => void;
  clearHistory: () => void;
}

/**
 * Hook that manages communication between the sidebar and background script.
 * Bridges messages to Zustand stores.
 */
export function useLLM(): LLMActions {
  const addMessage = useChatStore((s) => s.addMessage);
  const setLoading = useChatStore((s) => s.setLoading);
  const addPendingPermission = useHarborStore((s) => s.addPendingPermission);
  const addActionLogEntry = useHarborStore((s) => s.addActionLogEntry);
  const setWorkflow = useWorkflowStore((s) => s.setWorkflow);

  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Ensure port connection
    ensurePort();

    const handler = (msg: Record<string, unknown>) => {
      switch (msg.type) {
        case 'CHAT_RESPONSE': {
          const payload = msg.payload as { content: string; isError?: boolean };
          addMessage({
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            role: 'assistant',
            content: payload.content,
            timestamp: Date.now(),
            isError: payload.isError,
          });
          setLoading(false);
          break;
        }

        case 'PERMISSION_REQUEST': {
          addPendingPermission(msg.payload as PermissionRequest);
          break;
        }

        case 'ACTION_LOG_UPDATE': {
          addActionLogEntry(msg.payload as ActionLogEntry);
          break;
        }

        case 'WORKFLOW_UPDATE': {
          setWorkflow(msg.payload as WorkflowPlan);
          break;
        }
      }
    };

    messageHandlers.add(handler);

    return () => {
      messageHandlers.delete(handler);
    };
  }, [addMessage, setLoading, addPendingPermission, addActionLogEntry, setWorkflow]);

  const sendChatMessage = (content: string) => {
    addMessage({
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    });
    setLoading(true);
    sendToBackground({ type: 'CHAT_MESSAGE', payload: { content } });
  };

  const summarizePage = () => {
    addMessage({
      id: `msg_${Date.now()}`,
      role: 'user',
      content: '📄 Summarize this page',
      timestamp: Date.now(),
    });
    setLoading(true);
    sendToBackground({ type: 'SUMMARIZE_PAGE' });
  };

  const respondToPermission = (requestId: string, decision: string) => {
    useHarborStore.getState().removePendingPermission(requestId);
    sendToBackground({
      type: 'PERMISSION_RESPONSE',
      payload: { requestId, decision },
    });
  };

  const startWorkflow = (intent: string) => {
    addMessage({
      id: `msg_${Date.now()}`,
      role: 'user',
      content: `🔬 Research: ${intent}`,
      timestamp: Date.now(),
    });
    setLoading(true);
    sendToBackground({ type: 'START_WORKFLOW', payload: { intent } });
  };

  const cancelWorkflow = () => {
    sendToBackground({ type: 'CANCEL_WORKFLOW' });
    setWorkflow(null);
  };

  const saveSettings = (config: Record<string, unknown>) => {
    sendToBackground({ type: 'SAVE_SETTINGS', payload: config });
  };

  const clearHistory = () => {
    useChatStore.getState().clearMessages();
    sendToBackground({ type: 'CLEAR_HISTORY' });
  };

  return {
    sendChatMessage,
    summarizePage,
    respondToPermission,
    startWorkflow,
    cancelWorkflow,
    saveSettings,
    clearHistory,
  };
}

