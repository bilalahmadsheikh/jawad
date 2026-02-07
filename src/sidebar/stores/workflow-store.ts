import { create } from 'zustand';
import type { WorkflowPlan } from '../../lib/types';

interface WorkflowState {
  currentWorkflow: WorkflowPlan | null;

  setWorkflow: (workflow: WorkflowPlan | null) => void;
  updateStepStatus: (
    stepId: string,
    status: string,
    result?: unknown
  ) => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  currentWorkflow: null,

  setWorkflow: (workflow) => set({ currentWorkflow: workflow }),

  updateStepStatus: (stepId, status, result) =>
    set((state) => {
      if (!state.currentWorkflow) return state;
      return {
        currentWorkflow: {
          ...state.currentWorkflow,
          steps: state.currentWorkflow.steps.map((s) =>
            s.id === stepId
              ? { ...s, status: status as typeof s.status, result }
              : s
          ),
        },
      };
    }),
}));

