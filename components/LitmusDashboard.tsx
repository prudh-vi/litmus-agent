"use client";

import { useEffect, useRef, useState } from "react";
import { AgentProgressTracker, type AgentStep } from "@/components/AgentProgressTracker";
import { ThinkingPanel, type LogEntry } from "@/components/ThinkingPanel";
import { StockChart } from "@/components/StockChart";
import { VerdictTable } from "@/components/VerdictTable";

import { getRecentRuns } from "@/lib/supabase/client";
import type { ResearchRun } from "@/lib/types";
import type { Analysis, AgentDecision } from "@/lib/agent/types";

// ------------------------------------------------------------------
// Inline verdict card — shown after a run completes
// ------------------------------------------------------------------
function VerdictCard({
  run,
  analysis,
  decision,
  ticker,
}: {
  run: ResearchRun;
  analysis: Analysis | null;
  decision: AgentDecision | null;
  ticker: string;
}) {
  const isInvest = run.decision.toLowerCase() === "invest";

  return (
    <section
      className={`rounded-[20px] border-[3px] border-ink p-6 shadow-brutal ${
        isInvest ? "bg-lime" : "bg-[#FF8E78]"
      }`}
    >
      {/* Company name + ticker — small label row */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-ink/50">
          Latest Verdict
        </p>
        {ticker && (
          <span className="rounded border-2 border-ink/30 bg-ink/10 px-2 py-0.5 text-[9px] font-black tracking-[0.08em] text-ink/70">
            {ticker}
          </span>
        )}
      </div>
      <p className="mt-1 text-base font-black tracking-[-0.02em] text-ink/70">
        {run.company_name}
      </p>

      {/* VERDICT — the loudest element on the card */}
      <div
        className={`mt-4 flex items-center justify-center rounded-[14px] border-[3px] border-ink px-6 py-4 ${
          isInvest ? "bg-ink" : "bg-ink"
        }`}
      >
        <span className="text-4xl font-black uppercase tracking-[0.12em] text-white sm:text-5xl">
          {run.decision.toUpperCase()}
        </span>
      </div>

      {/* Sentiment badge — solid white bg for lime-safe contrast */}
      {analysis && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full border-2 border-ink bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-ink">
            {analysis.sentiment} sentiment
          </span>
          <span className="rounded-full border-2 border-ink/20 bg-white/80 px-3 py-1 text-[10px] font-black text-ink/70">
            {analysis.strengths.length} strengths · {analysis.risks.length} risks
          </span>
        </div>
      )}

      {/* Reasoning bullets */}
      {decision && decision.reasoning.length > 0 && (
        <ul className="mt-4 space-y-2">
          {decision.reasoning.slice(0, 4).map((point, i) => (
            <li key={i} className="flex gap-2 text-sm font-medium">
              <span className="mt-0.5 shrink-0 text-ink/40">—</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Strengths / Risks — solid white/70 panels for contrast safety */}
      {analysis && (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-[12px] border-2 border-ink/20 bg-white/70 p-3">
            <p className="mb-2 text-[9px] font-black uppercase tracking-[0.14em] text-ink/60">
              Strengths
            </p>
            <ul className="space-y-1.5">
              {analysis.strengths.slice(0, 3).map((s, i) => (
                <li key={i} className="text-[11px] font-semibold leading-snug text-ink">
                  ✦ {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[12px] border-2 border-ink/20 bg-white/70 p-3">
            <p className="mb-2 text-[9px] font-black uppercase tracking-[0.14em] text-ink/60">
              Risks
            </p>
            <ul className="space-y-1.5">
              {analysis.risks.slice(0, 3).map((r, i) => (
                <li key={i} className="text-[11px] font-semibold leading-snug text-ink">
                  ⚠ {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------------------
// Main dashboard
// ------------------------------------------------------------------
export function LitmusDashboard() {
  const [showHistory, setShowHistory]           = useState(false);
  const [searchOpen, setSearchOpen]             = useState(true);
  const [company, setCompany]                   = useState("");
  const [submittedCompany, setSubmittedCompany] = useState("");
  const [status, setStatus]                     = useState<AgentStep>("idle");
  const [thinkingLog, setThinkingLog]           = useState<LogEntry[]>([]);
  const [resolvedName, setResolvedName]         = useState("");
  const [ticker, setTicker]                     = useState("");
  const [currentRun, setCurrentRun]             = useState<ResearchRun | null>(null);
  const [currentAnalysis, setCurrentAnalysis]   = useState<Analysis | null>(null);
  const [currentDecision, setCurrentDecision]   = useState<AgentDecision | null>(null);
  const [runs, setRuns]                         = useState<ResearchRun[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState("");

  useEffect(() => {
    async function getRuns() {
      try { setRuns(await getRecentRuns(12)); }
      catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load research history."); }
      finally { setLoading(false); }
    }
    getRuns();
  }, []);

  function addLog(entry: Omit<LogEntry, "time">) {
    setThinkingLog((prev) => [
      ...prev,
      {
        ...entry,
        time: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      },
    ]);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = company.trim();
    if (!next || (status !== "idle" && status !== "complete")) return;

    setSubmittedCompany(next);
    setStatus("resolving");
    setError("");
    setThinkingLog([]);
    setResolvedName("");
    setTicker("");
    setCurrentRun(null);
    setCurrentAnalysis(null);
    setCurrentDecision(null);

    addLog({ step: "system", phase: "system", message: `Starting research for "${next}"…` });

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ companyName: next }),
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => ({}));
        throw new Error((payload as { error?: string }).error ?? "Unable to start research.");
      }

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          const type = event.match(/^event: (.+)$/m)?.[1];
          const raw  = event.match(/^data: (.+)$/m)?.[1];
          if (!type || !raw) continue;

          const payload = JSON.parse(raw) as {
            step?: string;
            phase?: string;
            message?: string;
            resolvedName?: string;
            ticker?: string;
            error?: string;
            run?: ResearchRun;
            analysis?: Analysis;
            decision?: AgentDecision;
          };

          if (type === "progress") {
            if (payload.phase === "started") {
              if (payload.step === "resolve")  setStatus("resolving");
              if (payload.step === "research") setStatus("researching");
              if (payload.step === "analyze")  setStatus("analyzing");
              if (payload.step === "decide")   setStatus("deciding");
            }
            if (payload.message) {
              addLog({
                step:  (payload.step as LogEntry["step"]) ?? "system",
                phase: (payload.phase as LogEntry["phase"]) ?? "system",
                message: payload.message,
              });
            }
            if (payload.resolvedName) setResolvedName(payload.resolvedName);
            if (payload.ticker)       setTicker(payload.ticker);
          }

          if (type === "complete" && payload.run) {
            setRuns((cur) => [payload.run!, ...cur.filter((r) => r.id !== payload.run!.id)]);
            setCurrentRun(payload.run);
            if (payload.analysis) setCurrentAnalysis(payload.analysis);
            if (payload.decision) setCurrentDecision(payload.decision);
            setStatus("complete");
          }

          if (type === "error") throw new Error(payload.error ?? "Research failed.");
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Research failed.");
      setStatus("idle");
      addLog({
        step: "system",
        phase: "system",
        message: `Error: ${cause instanceof Error ? cause.message : "Research failed."}`,
      });
    }
  }

  const isRunning = status !== "idle" && status !== "complete";




  return (
    /* Outer page — cream bg, padded, bottom gap for the floating search bar */
    <main className="mx-auto max-w-[1340px] px-5 py-8 sm:px-8 sm:py-10 lg:px-10 pb-[120px]">

      {/* ── Hero card ────────────────────────────────────────── */}
      <section className="rounded-[28px] border-[3px] border-ink bg-lime p-6 shadow-brutal sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.22em]">Litmus</p>
        <h1 className="mt-3 text-5xl font-black leading-[0.88] tracking-[-0.07em] sm:text-7xl">
          Investment research,
          <br />with teeth.
        </h1>
        <p className="mt-4 max-w-lg text-base font-bold text-[#25324A] sm:text-lg">
          Invest or pass, with proof. Litmus traces its research so every verdict is inspectable.
        </p>
      </section>

      {/* ── Single two-column grid: step bar + chart left, thinking panel right ── */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px]">

        {/* Left column: step bar → chart → verdict → error */}
        <div className="space-y-5">
          <AgentProgressTracker status={status} />

          {ticker && (
            <div className="h-[280px] sm:h-[320px]">
              <StockChart ticker={ticker} resolvedName={resolvedName || submittedCompany} />
            </div>
          )}

          {currentRun && (
            <VerdictCard
              run={currentRun}
              analysis={currentAnalysis}
              decision={currentDecision}
              ticker={ticker}
            />
          )}

          {error && (
            <div className="rounded-[16px] border-[3px] border-ink bg-[#FF8E78] px-5 py-4 font-bold shadow-brutal-sm">
              ⚠ {error}
            </div>
          )}
        </div>

        {/* Right column: ThinkingPanel (aligned with step bar) → Verdict History button → collapsible table */}
        <div className="space-y-4 lg:sticky lg:top-5 lg:self-start">
          <ThinkingPanel
            entries={thinkingLog}
            resolvedName={resolvedName}
            originalInput={submittedCompany}
            ticker={ticker}
            status={status}
          />

          {/* Verdict History button — below the thinking panel */}
          <div className="flex justify-center">
            <button
              onClick={() => setShowHistory((v) => !v)}
              className={[
                "flex items-center gap-2 rounded-[20px] border-[3px] border-ink px-6 py-3.5 text-sm font-black uppercase tracking-[0.08em] shadow-brutal transition-colors",
                showHistory ? "bg-ink text-white" : "bg-white hover:bg-mist",
              ].join(" ")}
            >
              <span>Verdict History</span>
              {runs.length > 0 && (
                <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${showHistory ? "border-white/30 text-white/60" : "border-ink/30 text-ink"}`}>
                  {runs.length}
                </span>
              )}
            </button>
          </div>

          {showHistory && (
            <div className="rounded-[18px] border-[3px] border-ink bg-white shadow-brutal overflow-hidden">
              {loading ? (
                <p className="py-6 text-center text-xs font-black uppercase tracking-[0.14em] text-slate">Loading…</p>
              ) : (
                <VerdictTable runs={runs} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Floating bottom search bar ───────────────────────── */}
      <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-center lg:left-6 lg:right-6">
        {searchOpen ? (
          /* Expanded */
          <form
            onSubmit={submit}
            className="flex w-full max-w-xl items-center gap-3 rounded-[18px] border-[3px] border-ink bg-white px-4 py-3 shadow-brutal"
          >
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              disabled={isRunning}
              placeholder="Search a company — try 'L&T', 'GOOG'…"
              className="min-w-0 flex-1 bg-transparent font-bold outline-none placeholder:font-normal placeholder:text-[#7C8494] disabled:opacity-50"
              autoFocus
            />
            <button
              type="submit"
              disabled={isRunning || !company.trim()}
              className="shrink-0 rounded-[12px] border-[3px] border-ink bg-ink px-5 py-2.5 text-sm font-black uppercase tracking-[0.08em] text-white transition-transform active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-40"
            >
              {isRunning ? "Running…" : "Run Research"}
            </button>
            {/* Collapse */}
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="shrink-0 rounded-[12px] border-[3px] border-ink bg-mist px-3 py-2.5 font-black text-ink transition-colors hover:bg-paper"
              title="Collapse search"
            >
              ↓
            </button>
          </form>
        ) : (
          /* Collapsed pill */
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 rounded-full border-[3px] border-ink bg-ink px-6 py-2.5 text-sm font-black uppercase tracking-[0.1em] text-white shadow-brutal transition-colors hover:bg-white hover:text-ink"
          >
            Search ↑
          </button>
        )}
      </div>
    </main>
  );
}
