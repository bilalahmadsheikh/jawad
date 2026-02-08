import React from 'react';
import { useWorkflowStore } from '../stores/workflow-store';
import type { LLMActions } from '../hooks/useLLM';
import { Loader2, CheckCircle, XCircle, Clock, X, ChevronDown, ChevronRight, FlaskConical, Sparkles } from 'lucide-react';

interface Props { llm: LLMActions; }

export function WorkflowPlan({ llm }: Props) {
  const wf = useWorkflowStore((s) => s.currentWorkflow);
  const [open, setOpen] = React.useState(true);

  if (!wf || wf.status === 'completed' || wf.status === 'cancelled') return null;

  const icons: Record<string, React.ReactNode> = {
    pending:   <Clock size={12} style={{ color: '#3a4a60' }} />,
    running:   <Loader2 size={12} style={{ color: '#e8792b' }} className="animate-spin" />,
    completed: <CheckCircle size={12} style={{ color: '#4ade80' }} />,
    error:     <XCircle size={12} style={{ color: '#f87171' }} />,
    skipped:   <XCircle size={12} style={{ color: '#2e3f58' }} />,
  };

  const done = wf.steps.filter((s) => s.status === 'completed').length;
  const pct = wf.steps.length > 0 ? (done / wf.steps.length) * 100 : 0;

  return (
    <div className="flex-shrink-0" style={{ background: '#0e1525', borderTop: '1px solid #1a2538' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3.5 py-3 transition-colors duration-200"
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#121c2e'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        {open ? <ChevronDown size={13} style={{ color: '#4a5c72' }} /> : <ChevronRight size={13} style={{ color: '#4a5c72' }} />}
        <FlaskConical size={13} style={{ color: '#a855f7' }} />
        <span className="text-[11px] font-bold" style={{ color: '#a855f7' }}>Research Mode</span>
        <div className="flex-1" />
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7' }}>
          {done}/{wf.steps.length}
        </span>
        {wf.status === 'running' && <Sparkles size={12} style={{ color: '#e8792b' }} className="animate-pulse" />}
      </button>

      {/* Progress bar */}
      <div className="h-[3px] mx-3.5 rounded-full overflow-hidden" style={{ background: '#121c2e' }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #a855f7, #e8792b)',
            boxShadow: '0 0 10px rgba(168,85,247,0.3)',
          }}
        />
      </div>

      {open && (
        <div className="px-3.5 pb-3 pt-2.5 space-y-2 fade-up">
          <div className="text-[10px] mb-2 truncate" style={{ color: '#3a4a60' }}>
            Goal: <span style={{ color: '#7a8ea5' }} className="font-medium">{wf.intent}</span>
          </div>

          {wf.steps.map((step, i) => (
            <div
              key={step.id}
              className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-xs transition-all duration-300"
              style={{
                background: step.status === 'running' ? 'rgba(232,121,43,0.05)' : step.status === 'completed' ? 'rgba(74,222,128,0.03)' : '#0e1525',
                border: step.status === 'running' ? '1px solid rgba(232,121,43,0.15)' : '1px solid #1a2538',
                boxShadow: step.status === 'running' ? '0 0 15px rgba(232,121,43,0.05)' : 'none',
              }}
            >
              <div className="mt-0.5">{icons[step.status]}</div>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-[11px]" style={{ color: '#bfc9d6' }}>{i + 1}. {step.agent}</span>
                <div className="text-[10px] truncate mt-0.5" style={{ color: '#3a4a60' }}>{step.task}</div>
                {step.error && <div className="text-[10px] mt-0.5" style={{ color: '#f87171' }}>{step.error}</div>}
              </div>
            </div>
          ))}

          <button
            onClick={llm.cancelWorkflow}
            className="flex items-center gap-1.5 px-4 py-2 mt-1 rounded-xl text-[11px] font-bold transition-all duration-200"
            style={{ background: '#200a0a', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#2e0a0a';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.4)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = '#200a0a';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(239,68,68,0.2)';
            }}
          >
            <X size={12} /> Cancel Research
          </button>
        </div>
      )}
    </div>
  );
}
