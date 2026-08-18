import { Button } from '../components/ui.jsx';

import { LayoutTemplate, Settings } from'lucide-react';
;


export const WorkspaceGuidePanel = ({ guide, onManage }) => {
  const Icon = guide.icon;

  return (
    <section className="bg-white overflow-hidden print:hidden animate-in fade-in duration-300">
      <div className="p-4 md:px-5 md:py-4 bg-gradient-to-br from-[var(--ui-primary)]/10 via-white to-[var(--ui-accent)]/20 border-b border-slate-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-[var(--ui-radius-small)] bg-white text-[var(--ui-primary)] border border-white shadow-sm flex items-center justify-center shrink-0">
              <Icon size={19} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--ui-primary)]">
                <LayoutTemplate size={13} /> Panduan {guide.title}
              </div>
              <h2 className="mt-1 text-lg md:text-xl font-black text-slate-800 tracking-tight">Selesaikan tiga langkah ini dengan urut</h2>
              <p className="mt-1 max-w-3xl text-xs text-slate-600 font-medium leading-relaxed">{guide.description}</p>
            </div>
          </div>
          <Button type="button" variant="secondary" onClick={onManage} className="shrink-0 px-3 py-2 text-xs hidden">
            <Settings size={14} /> Buka Kelola
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 md:p-5">
        {guide.steps.map((step, index) => {
          const StepIcon = step.icon;
          return (
            <article key={step.title} className="rounded-[var(--ui-radius-small)] border-none bg-slate-50/70 p-3.5">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-[var(--ui-radius-small)] bg-[var(--ui-primary)] text-white text-[11px] font-black flex items-center justify-center shrink-0">0{index + 1}</span>
                <StepIcon size={16} className="text-[var(--ui-primary)]" />
                <h3 className="text-sm font-black text-slate-800">{step.title}</h3>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 font-medium">{step.detail}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
};
