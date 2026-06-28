"use client";

import { useEffect, useRef } from "react";

export type LogEntry = {
  time: string;
  message: string;
  step: "resolve" | "research" | "analyze" | "decide" | "system";
  phase: "started" | "done" | "system";
};

const stepColors: Record<LogEntry["step"], string> = {
  resolve:  "bg-[#C8F0FF] border-[#5BC8F5]",
  research: "bg-lime border-ink",
  analyze:  "bg-[#FFE7A0] border-[#DDAA00]",
  decide:   "bg-[#FFD0C8] border-[#FF6B55]",
  system:   "bg-mist border-[#C0C5CC]",
};

const stepLabels: Record<LogEntry["step"], string> = {
  resolve:  "RESOLVE",
  research: "RESEARCH",
  analyze:  "ANALYZE",
  decide:   "DECIDE",
  system:   "SYSTEM",
};

interface ThinkingPanelProps {
  entries: LogEntry[];
  resolvedName: string;
  originalInput: string;
  ticker: string;
  status: string;
  onExpand?: () => void;
}

export function ThinkingPanel({
  entries,
  resolvedName,
  originalInput,
  ticker,
  status,
  onExpand,
}: ThinkingPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll as new entries arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  const hasResolution = resolvedName && originalInput && resolvedName.toLowerCase() !== originalInput.toLowerCase();

  return (
    <div className="flex flex-col rounded-[20px] border-[3px] border-ink bg-white shadow-brutal overflow-hidden" style={{ minHeight: "520px" }}>
      {/* Panel header */}
      <div className="flex items-center justify-between border-b-[3px] border-ink px-5 py-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate">
            {status === "idle" ? "Agent Reasoning" : "Execution State"}
          </p>
          <h2 className="mt-0.5 text-xl font-black tracking-[-0.04em] flex items-center gap-2">
            <span>{status === "idle" ? "Thinking Log" : "Result"}</span>
            {status !== "idle" && status !== "complete" && (
              <span className="inline-block animate-spin text-sm" style={{ animationDuration: "1.5s" }}>🔄</span>
            )}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {onExpand && entries.length > 0 && (
            <button
              onClick={onExpand}
              className="flex items-center justify-center p-1.5 rounded-lg border-2 border-ink bg-white hover:bg-mist transition-all text-xs font-black shadow-brutal-sm active:translate-x-0.5 active:translate-y-0.5"
              title="Expanded view of thinking"
            >
              ⤢
            </button>
          )}
          <span className="rounded-full border-2 border-ink bg-lime px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em]">
            LangGraph
          </span>
        </div>
      </div>

      {/* Scrollable log body */}
      <div className="overflow-y-auto px-5 py-4 space-y-3 font-mono text-xs thinking-scroll" style={{ maxHeight: "520px" }}>
        {entries.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-3 text-center"
            style={{
              minHeight: "360px",
              backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
              borderRadius: "12px",
            }}
          >
            <span className="text-5xl opacity-25">🔬</span>
            <p className="font-bold text-slate">
              Enter a company below to start.<br />
              <span className="font-normal text-slate/60">Try: L&T, GOOG, Reliance, Apple</span>
            </p>
          </div>
        ) : (
          <>
            {/* Company resolution callout */}
            {hasResolution && (
              <div className="rounded-[10px] border-[2.5px] border-ink bg-lime p-3 shadow-brutal-sm log-entry-animate">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-ink/60">Company Resolved</p>
                <p className="mt-1 font-black text-sm text-ink">
                  <span className="opacity-60">"{originalInput}"</span>
                  <span className="mx-2 opacity-40">→</span>
                  <span>{resolvedName}</span>
                  {ticker && <span className="ml-2 opacity-60">[{ticker}]</span>}
                </p>
              </div>
            )}

            {/* Log entries with dynamic slide-up fade-in animation */}
            {entries.map((entry, i) => (
              <div key={i} className="flex gap-2 log-entry-animate">
                {/* Step badge */}
                <span
                  className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] ${stepColors[entry.step]}`}
                >
                  {stepLabels[entry.step]}
                </span>
                {/* Message + time */}
                <div className="min-w-0">
                  <p className="leading-relaxed text-ink break-words">{entry.message}</p>
                  <p className="text-[9px] text-slate">{entry.time}</p>
                </div>
              </div>
            ))}

            {/* Blinking cursor while running */}
            {status !== "idle" && status !== "complete" && (
              <div className="flex gap-2 log-entry-animate">
                <span className="mt-0.5 shrink-0 rounded border border-ink/30 bg-mist px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-slate">
                  …
                </span>
                <span className="animate-pulse font-bold text-slate">working</span>
              </div>
            )}

            {/* Done summary */}
            {status === "complete" && (
              <div className="rounded-[10px] border-[2.5px] border-ink bg-paper p-3 shadow-brutal-sm log-entry-animate">
                <p className="font-black text-[10px] uppercase tracking-[0.12em] text-slate">Run complete</p>
                <p className="mt-0.5 text-ink font-bold">All steps finished. See verdict below ↙</p>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
