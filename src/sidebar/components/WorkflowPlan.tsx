import React from 'react';
import { useWorkflowStore } from '../stores/workflow-store';
import type { LLMActions } from '../hooks/useLLM';
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Pause,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface WorkflowPlanProps {
  llm: LLMActions;
}

export function WorkflowPlan({ llm }: WorkflowPlanProps) {
  const workflow = useWorkflowStore((s) => s.currentWorkflow);
  const [expanded, setExpanded] = React.useState(true);

  if (!workflow || workflow.status === 'completed' || workflow.status === 'cancelled') {
    return null;
  }

  const statusIcons: Record<string, React.ReactNode> = {
    pending: <Clock size={12} className="text-slate-400" />,
    running: <Loader2 size={12} className="text-orange-400 animate-spin" />,
    completed: <CheckCircle size={12} className="text-green-400" />,
    error: <XCircle size={12} className="text-red-400" />,
    skipped: <XCircle size={12} className="text-slate-500" />,
  };

  const completedCount = workflow.steps.filter(
    (s) => s.status === 'completed'
  ).length;

  return (
    <div className="flex-shrink-0 border-t border-slate-700 bg-slate-800/90">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown size={14} className="text-slate-400" />
        ) : (
          <ChevronRight size={14} className="text-slate-400" />
        )}
        <span className="text-xs font-medium text-purple-400">
          🔬 Research Mode
        </span>
        <span className="text-[10px] text-slate-500 ml-auto">
          {completedCount}/{workflow.steps.length} steps
        </span>
        {workflow.status === 'running' && (
          <Loader2 size={12} className="text-orange-400 animate-spin" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-2 space-y-1">
          {/* Intent */}
          <div className="text-[10px] text-slate-400 mb-2 truncate">
            Goal: {workflow.intent}
          </div>

          {/* Steps */}
          {workflow.steps.map((step, i) => (
            <div
              key={step.id}
              className={`flex items-start gap-2 px-2 py-1.5 rounded text-xs ${
                step.status === 'running'
                  ? 'bg-orange-500/10 border border-orange-500/30'
                  : 'bg-slate-700/50'
              }`}
            >
              {statusIcons[step.status]}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-medium text-slate-300">
                    {i + 1}. {step.agent}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {step.task}
                </div>
                {step.error && (
                  <div className="text-[10px] text-red-400 mt-0.5">
                    {step.error}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Controls */}
          <div className="flex gap-1 pt-1">
            <button
              onClick={llm.cancelWorkflow}
              className="flex items-center gap-1 px-2 py-1 bg-red-600/80 hover:bg-red-500 text-white text-xs rounded transition-colors"
            >
              <X size={12} />
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

