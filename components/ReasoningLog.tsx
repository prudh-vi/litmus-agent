import type { ResearchRun } from "@/lib/types";

function summary(reasoning: unknown) {
  if (typeof reasoning === "string") return reasoning;
  if (Array.isArray(reasoning)) return reasoning.filter((item): item is string => typeof item === "string").join(" ");
  if (reasoning && typeof reasoning === "object") {
    const value = reasoning as Record<string, unknown>;
    return typeof value.summary === "string" ? value.summary : "Evidence and risk assessment recorded.";
  }
  return "Evidence and risk assessment recorded.";
}

export function ReasoningLog({ runs }: { runs: ResearchRun[] }) {
  return (
    <section className="rounded-[20px] border-[3px] border-ink bg-white p-6 shadow-brutal sm:p-7">
      <div className="flex items-end justify-between gap-4"><h2 className="text-3xl font-black tracking-[-0.06em]">Recent Reasoning Log</h2><p className="hidden text-xs font-black uppercase tracking-[0.12em] text-slate sm:block">Click to expand</p></div>
      <div className="mt-6 space-y-3">
        {runs.length === 0 ? <p className="py-8 text-center text-sm font-medium text-slate">No reasoning logs yet.</p> : runs.map((run, index) => (
          <details key={run.id} className={`group rounded-[16px] border-2 border-[#DCE1E8] ${index % 2 === 0 ? "bg-[#F7F8FA]" : "bg-white"}`}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 sm:p-5">
              <div><p className="font-black uppercase tracking-[-0.02em]">{run.company_name}</p><p className="mt-1 text-xs font-bold text-slate">{new Date(run.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p></div>
              <div className="flex items-center gap-3"><span className="hidden text-sm font-bold sm:block">{run.decision}</span><span className="text-xl font-black">{run.confidence}%</span><span className="text-lg font-black transition-transform group-open:rotate-45">+</span></div>
            </summary>
            <p className="border-t-2 border-[#DCE1E8] px-5 py-4 text-sm leading-6 text-[#334155]">{summary(run.reasoning)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
