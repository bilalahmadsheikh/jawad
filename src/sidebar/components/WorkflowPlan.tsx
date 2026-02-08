import React from 'react';
import { useWorkflowStore } from '../stores/workflow-store';
import type { LLMActions } from '../hooks/useLLM';
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  X,
  ChevronDown,
  ChevronRight,
  FlaskConical,
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
    pending: <Clock size={12} className="text-slate-500" />,
    running: <Loader2 size={12} className="text-orange-400 animate-spin" />,
    completed: <CheckCircle size={12} className="text-emerald-400" />,
    error: <XCircle size={12} className="text-red-400" />,
    skipped: <XCircle size={12} className="text-slate-600" />,
  };

  const completedCount = workflow.steps.filter(
    (s) => s.status === 'completed'
  ).length;

  const progress = workflow.steps.length > 0
    ? (completedCount / workflow.steps.length) * 100
    : 0;

  return (
    <div className="flex-shrink-0 border-t border-slate-700/50 bg-surface-100/90">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-surface-200/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown size={13} className="text-slate-500" />
        ) : (
          <ChevronRight size={13} className="text-slate-500" />
        )}
        <FlaskConical size={13} className="text-purple-400" />
        <span className="text-xs font-semibold text-purple-400">
          Research Mode
        </span>
        <div className="flex-1" />
        <span className="text-[10px] text-slate-500">
          {completedCount}/{workflow.steps.length}
        </span>
        {workflow.status === 'running' && (
          <Loader2 size={12} className="text-orange-400 animate-spin" />
        )}
      </button>

      {/* Progress bar */}
      <div className="h-0.5 bg-surface-200 mx-3">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-orange-400 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {expanded && (
        <div className="px-3 pb-2.5 pt-2 space-y-1.5 animate-fade-in">
          {/* Intent */}
          <div className="text-[10px] text-slate-500 mb-2 truncate">
            Goal: <span className="text-slate-400">{workflow.intent}</span>
          </div>

          {/* Steps */}
          {workflow.steps.map((step, i) => (
            <div
              key={step.id}
              className={`flex items-start gap-2.5 px-2.5 py-2 rounded-xl text-xs transition-all duration-200 ${
                step.status === 'running'
                  ? 'bg-orange-500/10 border border-orange-500/20 animate-shimmer'
                  : step.status === 'completed'
                    ? 'bg-emerald-500/5 border border-emerald-500/10'
                    : 'bg-surface-200/40 border border-transparent'
              }`}
            >
              <div className="mt-0.5">{statusIcons[step.status]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-slate-300 text-[11px]">
                    {i + 1}. {step.agent}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">
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
          <div className="flex gap-1.5 pt-1">
            <button
              onClick={llm.cancelWorkflow}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-600/70 hover:bg-red-500 text-white text-[11px] font-medium rounded-lg transition-all duration-200 btn-lift"
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
