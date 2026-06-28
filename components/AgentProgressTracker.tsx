export type AgentStep = "idle" | "resolving" | "researching" | "analyzing" | "deciding" | "complete";

const steps = [
  { key: "resolving",   label: "Resolve",  num: "01" },
  { key: "researching", label: "Research", num: "02" },
  { key: "analyzing",   label: "Analyze",  num: "03" },
  { key: "deciding",    label: "Decide",   num: "04" },
] as const;

const activeIndex = (status: AgentStep) => {
  if (status === "resolving")   return 0;
  if (status === "researching") return 1;
  if (status === "analyzing")   return 2;
  if (status === "deciding")    return 3;
  if (status === "complete")    return 4;
  return -1;
};

export function AgentProgressTracker({ status }: { status: AgentStep }) {
  const current   = activeIndex(status);
  const isRunning = status !== "idle" && status !== "complete";

  return (
    <section className="flex w-full flex-wrap items-center justify-between gap-4 rounded-[20px] border-[3px] border-ink bg-white px-6 py-4 shadow-brutal">
      {status === "idle" ? (
        // Idle status bar state
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded bg-ink px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-lime">
              LITMUS
            </span>
            <span className="text-xs font-black uppercase tracking-[0.2em] text-ink">
              AI Investment Research Verification Agent
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#10B981]" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate">
              System Ready
            </span>
          </div>
        </div>
      ) : (
        // Active/Complete steps state
        <>
          <div className="flex flex-wrap items-center gap-3">
            {steps.map((step, index) => {
              const isDone   = current > index || status === "complete";
              const isActive = current === index;
              return (
                <div key={step.key} className="flex items-center gap-2">
                  <div
                    className={[
                      "flex items-center gap-2 rounded-full border-[2.5px] border-ink px-4 py-1.5 text-sm font-black uppercase tracking-[0.08em] transition-colors",
                      isDone   ? "bg-lime"                        : "",
                      isActive ? "bg-white shadow-brutal-sm"      : "",
                      !isDone && !isActive ? "bg-mist opacity-60" : "",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[2px] border-ink text-[9px] font-black",
                        isDone ? "bg-ink text-lime" : "bg-transparent",
                      ].join(" ")}
                    >
                      {isDone ? "✓" : step.num}
                    </span>

                    <span>{step.label}.</span>

                    {isActive && (
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ink opacity-60" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-ink" />
                      </span>
                    )}
                  </div>

                  {index < steps.length - 1 && (
                    <span className="text-xs font-black text-ink/30">→</span>
                  )}
                </div>
              );
            })}
          </div>

          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate">
            {isRunning ? "In progress…" : status === "complete" ? "Done ✓" : "Ready"}
          </span>
        </>
      )}
    </section>
  );
}
