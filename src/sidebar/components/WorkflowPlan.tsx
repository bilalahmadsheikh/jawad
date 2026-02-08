import React from 'react';
import { useWorkflowStore } from '../stores/workflow-store';
import type { LLMActions } from '../hooks/useLLM';
import { Loader2, CheckCircle, XCircle, Clock, X, ChevronDown, ChevronRight, FlaskConical } from 'lucide-react';

interface Props { llm: LLMActions; }

export function WorkflowPlan({ llm }: Props) {
  const wf = useWorkflowStore((s) => s.currentWorkflow);
  const [open, setOpen] = React.useState(true);

  if (!wf || wf.status === 'completed' || wf.status === 'cancelled') return null;

  const icons: Record<string, React.ReactNode> = {
    pending:   <Clock size={12} style={{ color: '#5d6f85' }} />,
    running:   <Loader2 size={12} style={{ color: '#e8792b' }} className="animate-spin" />,
    completed: <CheckCircle size={12} style={{ color: '#4ade80' }} />,
    error:     <XCircle size={12} style={{ color: '#f87171' }} />,
    skipped:   <XCircle size={12} style={{ color: '#3d4d65' }} />,
  };

  const done = wf.steps.filter((s) => s.status === 'completed').length;
  const pct = wf.steps.length > 0 ? (done / wf.steps.length) * 100 : 0;

  return (
    <div className="flex-shrink-0" style={{ background: '#131b2c', borderTop: '1px solid #253045' }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-3 py-2.5 transition-colors hover:bg-[#192438]">
        {open ? <ChevronDown size={13} style={{ color: '#5d6f85' }} /> : <ChevronRight size={13} style={{ color: '#5d6f85' }} />}
        <FlaskConical size={13} style={{ color: '#a855f7' }} />
        <span className="text-[11px] font-bold" style={{ color: '#a855f7' }}>Research Mode</span>
        <div className="flex-1" />
        <span className="text-[10px] font-bold" style={{ color: '#5d6f85' }}>{done}/{wf.steps.length}</span>
        {wf.status === 'running' && <Loader2 size={12} style={{ color: '#e8792b' }} className="animate-spin" />}
      </button>

      {/* Progress */}
      <div className="h-[3px] mx-3 rounded-full overflow-hidden" style={{ background: '#1d2840' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #a855f7, #e8792b)' }} />
      </div>

      {open && (
        <div className="px-3 pb-2.5 pt-2 space-y-1.5 fade-up">
          <div className="text-[10px] mb-2 truncate" style={{ color: '#5d6f85' }}>
            Goal: <span style={{ color: '#8899ad' }} className="font-medium">{wf.intent}</span>
          </div>

          {wf.steps.map((step, i) => (
            <div
              key={step.id}
              className="flex items-start gap-2.5 px-2.5 py-2 rounded-xl text-xs transition-all duration-200"
              style={{
                background: step.status === 'running' ? 'rgba(232,121,43,0.06)' : step.status === 'completed' ? 'rgba(74,222,128,0.04)' : '#151e30',
                border: step.status === 'running' ? '1px solid rgba(232,121,43,0.15)' : '1px solid transparent',
              }}
            >
              <div className="mt-0.5">{icons[step.status]}</div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-[11px]" style={{ color: '#bfc9d6' }}>{i + 1}. {step.agent}</span>
                <div className="text-[10px] truncate mt-0.5" style={{ color: '#5d6f85' }}>{step.task}</div>
                {step.error && <div className="text-[10px] mt-0.5" style={{ color: '#f87171' }}>{step.error}</div>}
              </div>
            </div>
          ))}

          <button onClick={llm.cancelWorkflow} className="flex items-center gap-1 px-3 py-1.5 mt-1 rounded-lg text-[11px] font-semibold transition-all duration-200 hover:brightness-110" style={{ background: '#b91c1c', color: '#fff' }}>
            <X size={12} /> Cancel
          </button>
        </div>
      )}
    </div>
  );
}
