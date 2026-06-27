export type AgentStep = "idle" | "researching" | "analyzing" | "deciding" | "complete";

const steps = [
  { key: "researching", title: "Research", detail: "Collecting primary evidence and market context." },
  { key: "analyzing", title: "Analyze", detail: "Testing thesis, risks, and key operating signals." },
  { key: "deciding", title: "Decide", detail: "Writing the evidence-backed verdict." },
] as const;

const activeIndex = (status: AgentStep) =>
  status === "researching" ? 0 : status === "analyzing" ? 1 : status === "deciding" ? 2 : status === "complete" ? 3 : -1;

export function AgentProgressTracker({ status, company }: { status: AgentStep; company?: string }) {
  const current = activeIndex(status);
  return (
    <section className="rounded-[20px] border-[3px] border-ink bg-white p-6 shadow-brutal sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-[-0.06em]">Research Agent</h2>
          <p className="mt-1 text-sm font-medium text-slate">
            {company ? `Running a trace for ${company}.` : "Ready to inspect a company."}
          </p>
        </div>
        <span className="rounded-full border-2 border-ink bg-lime px-3 py-1 text-[10px] font-black uppercase tracking-[0.13em]">
          LangGraph
        </span>
      </div>

      <ol className="mt-8 space-y-0">
        {steps.map((step, index) => {
          const isActive = current === index;
          const isDone = current > index || status === "complete";
          return (
            <li key={step.key} className="relative flex gap-4 pb-7 last:pb-0">
              {index < steps.length - 1 && <span className="absolute left-[15px] top-8 h-[calc(100%-18px)] w-[3px] bg-ink" />}
              <span className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[3px] border-ink text-xs font-black ${isDone ? "bg-lime" : isActive ? "bg-white" : "bg-mist"}`}>
                {isDone ? "✓" : index + 1}
              </span>
              <div className="pt-0.5">
                <p className="font-black uppercase tracking-[0.08em]">{step.title}</p>
                <p className="mt-1 text-sm text-slate">{isActive ? "In progress…" : step.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
