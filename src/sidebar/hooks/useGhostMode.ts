// ============================================================
// Ghost Mode Hook — Manages Ghost Mode state from the sidebar
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { sendToBackground, addMessageHandler } from '../lib/port';

export interface GhostModeState {
  active: boolean;
  elementCount: number;
  pageType: string;
  pageTypeConfidence: number;
  counts: Record<string, number>;
  error?: string;
  lastAction?: { action: string; result: string };
}

export interface GhostModeActions {
  toggle: () => void;
  activate: () => void;
  deactivate: () => void;
  refresh: () => void;
  state: GhostModeState;
}

export function useGhostMode(): GhostModeActions {
  const [state, setState] = useState<GhostModeState>({
    active: false,
    elementCount: 0,
    pageType: 'Unknown',
    pageTypeConfidence: 0,
    counts: {},
  });

  useEffect(() => {
    const unsubscribe = addMessageHandler((msg) => {
      if (msg.type === 'GHOST_MODE_STATE') {
        const payload = msg.payload as Record<string, unknown>;
        setState((prev) => ({
          ...prev,
          active: (payload.active as boolean) ?? prev.active,
          elementCount: (payload.elementCount as number) ?? prev.elementCount,
          pageType: (payload.pageType as { type: string })?.type ?? prev.pageType,
          pageTypeConfidence: (payload.pageType as { confidence: number })?.confidence ?? prev.pageTypeConfidence,
          counts: (payload.counts as Record<string, number>) ?? prev.counts,
          error: payload.error as string | undefined,
        }));
      }

      if (msg.type === 'GHOST_MODE_ACTION_RESULT') {
        const payload = msg.payload as { action: string; result: string };
        setState((prev) => ({
          ...prev,
          lastAction: payload,
        }));
      }
    });

    return unsubscribe;
  }, []);

  const toggle = useCallback(() => {
    sendToBackground({ type: 'GHOST_MODE_TOGGLE' });
  }, []);

  const activate = useCallback(() => {
    sendToBackground({ type: 'GHOST_MODE_ACTIVATE' });
  }, []);

  const deactivate = useCallback(() => {
    sendToBackground({ type: 'GHOST_MODE_DEACTIVATE' });
  }, []);

  const refresh = useCallback(() => {
    sendToBackground({ type: 'GHOST_MODE_REFRESH' });
  }, []);

  return { toggle, activate, deactivate, refresh, state };
}

