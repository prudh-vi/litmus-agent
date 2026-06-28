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
    <section className="inline-flex items-center gap-2 rounded-[20px] border-[3px] border-ink bg-white px-5 py-4 shadow-brutal">
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

      <span className="ml-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate">
        {isRunning ? "In progress…" : status === "complete" ? "Done ✓" : "Ready"}
      </span>
    </section>
  );
}
