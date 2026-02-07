import { create } from 'zustand';
import type { PermissionRequest, ActionLogEntry } from '../../lib/types';

interface HarborState {
  pendingPermissions: PermissionRequest[];
  actionLog: ActionLogEntry[];

  addPendingPermission: (req: PermissionRequest) => void;
  removePendingPermission: (id: string) => void;
  addActionLogEntry: (entry: ActionLogEntry) => void;
  clearActionLog: () => void;
}

export const useHarborStore = create<HarborState>((set) => ({
  pendingPermissions: [],
  actionLog: [],

  addPendingPermission: (req) =>
    set((state) => ({
      pendingPermissions: [...state.pendingPermissions, req],
    })),

  removePendingPermission: (id) =>
    set((state) => ({
      pendingPermissions: state.pendingPermissions.filter((p) => p.id !== id),
    })),

  addActionLogEntry: (entry) =>
    set((state) => ({
      actionLog: [entry, ...state.actionLog].slice(0, 100), // Keep last 100
    })),

  clearActionLog: () => set({ actionLog: [] }),
}));

