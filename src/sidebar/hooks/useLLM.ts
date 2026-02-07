import { useEffect, useRef } from 'react';
import { useChatStore } from '../stores/chat-store';
import { useHarborStore } from '../stores/harbor-store';
import { useWorkflowStore } from '../stores/workflow-store';
import { sendToBackground, addMessageHandler } from '../lib/port';
import type { PermissionRequest, ActionLogEntry, WorkflowPlan } from '../../lib/types';

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
 * Uses the shared port manager and bridges messages to Zustand stores.
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

    const unsubscribe = addMessageHandler((msg) => {
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
    });

    return unsubscribe;
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
