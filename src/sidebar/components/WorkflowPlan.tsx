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
    running: <Loader2 size={12} className="text-accent animate-spin" />,
    completed: <CheckCircle size={12} className="text-emerald-400" />,
    error: <XCircle size={12} className="text-red-400" />,
    skipped: <XCircle size={12} className="text-slate-600" />,
  };

  const completedCount = workflow.steps.filter((s) => s.status === 'completed').length;
  const progress = workflow.steps.length > 0 ? (completedCount / workflow.steps.length) * 100 : 0;

  return (
    <div className="flex-shrink-0 border-t border-dark-5/60 bg-dark-2">
      {/* Header bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-dark-3/60 transition-colors"
      >
        {expanded ? <ChevronDown size={13} className="text-slate-500" /> : <ChevronRight size={13} className="text-slate-500" />}
        <FlaskConical size={13} className="text-purple-400" />
        <span className="text-[11px] font-bold text-purple-400">Research Mode</span>
        <div className="flex-1" />
        <span className="text-[10px] text-slate-500 font-semibold">{completedCount}/{workflow.steps.length}</span>
        {workflow.status === 'running' && <Loader2 size={12} className="text-accent animate-spin" />}
      </button>

      {/* Progress bar */}
      <div className="h-[3px] bg-dark-4 mx-3 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #a855f7, #f97316)',
          }}
        />
      </div>

      {expanded && (
        <div className="px-3 pb-2.5 pt-2 space-y-1.5 anim-in">
          <div className="text-[10px] text-slate-500 mb-2 truncate">
            Goal: <span className="text-slate-400 font-medium">{workflow.intent}</span>
          </div>

          {workflow.steps.map((step, i) => (
            <div
              key={step.id}
              className={`flex items-start gap-2.5 px-2.5 py-2 rounded-xl text-xs transition-all duration-200 border ${
                step.status === 'running'
                  ? 'bg-dark-4/80 border-accent/20 anim-shimmer'
                  : step.status === 'completed'
                    ? 'bg-emerald-950/20 border-emerald-600/15'
                    : 'bg-dark-1 border-transparent'
              }`}
            >
              <div className="mt-0.5">{statusIcons[step.status]}</div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-slate-300 text-[11px]">{i + 1}. {step.agent}</span>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">{step.task}</div>
                {step.error && <div className="text-[10px] text-red-400 mt-0.5">{step.error}</div>}
              </div>
            </div>
          ))}

          <div className="flex gap-1.5 pt-1">
            <button
              onClick={llm.cancelWorkflow}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white text-[11px] font-semibold rounded-lg transition-all"
            >
              <X size={12} /> Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
