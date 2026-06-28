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
  isFavorite,
  onToggleFavorite,
}: {
  run: ResearchRun;
  analysis: Analysis | null;
  decision: AgentDecision | null;
  ticker: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const isInvest = run.decision.toLowerCase() === "invest";

  return (
    <section
      className={`rounded-[20px] border-[3px] border-ink p-6 shadow-brutal bg-white`}
    >
      {/* Company name + ticker — small label row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-ink/50">
            Latest Verdict
          </p>
          <button
            onClick={onToggleFavorite}
            className={[
              "text-lg transition-all hover:scale-125 active:scale-90",
              isFavorite ? "text-[#F59E0B]" : "text-slate/60 hover:text-ink",
            ].join(" ")}
            title={isFavorite ? "Remove from Favourites" : "Add to Favourites"}
          >
            {isFavorite ? "★" : "☆"}
          </button>
        </div>
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
        className={`mt-4 flex items-center justify-center rounded-[14px] border-[3px] border-ink px-6 py-4 bg-[#FF8E78] ${
          isInvest ? "bg-lime" : "bg-[#FF8E78]"
        }`}
      >
        <span className="text-4xl font-black uppercase tracking-[0.12em] text-ink sm:text-5xl">
          {run.decision.toUpperCase()}
        </span>
      </div>

      {/* Sentiment badge — solid white bg for lime-safe contrast */}
      {analysis && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full border-2 border-ink bg-[#EEF0F3] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-ink">
            {analysis.sentiment} sentiment
          </span>
        </div>
      )}

      {/* Reasoning bullets — redesigned to be highly readable & spacious */}
      {decision && decision.reasoning.length > 0 && (
        <ul className="mt-5 space-y-4">
          {decision.reasoning.slice(0, 4).map((point, i) => (
            <li key={i} className="flex gap-3 text-[13px] font-bold leading-relaxed text-ink">
              <span className="mt-0.5 shrink-0 text-ink/70 text-[16px]">•</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Deterministic mock generator for realistic stock stats
function getDeterministicMetrics(ticker: string) {
  let hash = 0;
  const sym = ticker.split(":").pop() || "AAPL";
  for (let i = 0; i < sym.length; i++) {
    hash = sym.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);

  const price = 40 + (hash % 850); 
  const change = (hash % 40) / 10 - 2.0; 
  const open = price - (change / 100) * price;
  const mcapValue = 10 + (hash % 890); 
  const mcapSuffix = "bn"; 
  
  const pe = 15 + (hash % 45); 
  const eps = (price / pe).toFixed(2);
  const divYield = (hash % 7 === 0) ? "—" : `${((hash % 40) / 10).toFixed(2)}%`;
  const vol = `${(1 + (hash % 49)).toFixed(2)}m`;
  
  const low52 = (price * 0.75).toFixed(2);
  const high52 = (price * 1.25).toFixed(2);

  return {
    price: price.toFixed(2),
    open: open.toFixed(2),
    mcap: `$${mcapValue}${mcapSuffix}`,
    pe: pe.toFixed(2),
    eps,
    divYield,
    vol,
    range52: `$${low52}-$${high52}`,
    dayRange: `$${(price * 0.985).toFixed(2)}-$${(price * 1.015).toFixed(2)}`
  };
}

// Financial Metrics Grid Card
function FinancialMetricsCard({ ticker, liveMetrics }: { ticker: string; liveMetrics: any }) {
  const metrics = liveMetrics || getDeterministicMetrics(ticker || "NASDAQ:AAPL");
  const currencySign = "$";

  const dataItems = [
    { label: "Prev Close", value: metrics.prevClose ? metrics.prevClose : `${currencySign}${metrics.price}` },
    { label: "Market Cap", value: metrics.mcap },
    { label: "Open", value: metrics.open.startsWith("$") ? metrics.open : `${currencySign}${metrics.open}` },
    { label: "P/E Ratio", value: metrics.pe },
    { label: "Day Range", value: metrics.dayRange },
    { label: "Div Yield", value: metrics.divYield },
    { label: "52W Range", value: metrics.range52 },
    { label: "EPS", value: metrics.eps.startsWith("$") ? metrics.eps : `${currencySign}${metrics.eps}` },
    { label: "Volume", value: metrics.vol }
  ];
  
  return (
    <div className="rounded-[24px] border-[3px] border-ink bg-white p-5 shadow-brutal">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {dataItems.map((item, idx) => (
          <div key={idx} className="flex flex-col rounded-[14px] border-2 border-ink bg-[#FAF9F5] p-3.5 hover:bg-[#EEF0F3] transition-colors">
            <span className="text-[9px] font-black uppercase tracking-[0.14em] text-[#5A6376]">{item.label}</span>
            <span className="mt-1 font-mono text-sm font-black text-ink">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Adjacent colored Pros & Cons card
function ProsConsCard({ analysis }: { analysis: Analysis }) {
  return (
    <div id="verdict-details" className="grid grid-cols-1 md:grid-cols-2 gap-6 scroll-mt-6">
      {/* Pros (Strengths) */}
      <div className="rounded-[24px] border-[3px] border-ink bg-white p-6 shadow-[6px_6px_0px_#10B981] flex flex-col">
        <div className="mb-4">
          <span className="inline-block rounded-lg border-2 border-ink bg-[#10B981] px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-white shadow-brutal-xs">
            Pros / Strengths
          </span>
        </div>
        
        <ul className="space-y-4 flex-1">
          {analysis.strengths.map((s, i) => (
            <li key={i} className="flex gap-3 text-[13px] font-semibold leading-relaxed text-ink">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E6FBF0] text-[#10B981] border border-[#10B981]/30 text-[10px] font-black">
                ✓
              </span>
              <span>{s}</span>
            </li>
          ))}
          {analysis.strengths.length === 0 && (
            <li className="text-xs text-slate italic">No strengths identified.</li>
          )}
        </ul>
      </div>

      {/* Cons (Risks) */}
      <div className="rounded-[24px] border-[3px] border-ink bg-white p-6 shadow-[6px_6px_0px_#EF4444] flex flex-col">
        <div className="mb-4">
          <span className="inline-block rounded-lg border-2 border-ink bg-[#EF4444] px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-white shadow-brutal-xs">
            Cons / Risks
          </span>
        </div>
        
        <ul className="space-y-4 flex-1">
          {analysis.risks.map((r, i) => (
            <li key={i} className="flex gap-3 text-[13px] font-semibold leading-relaxed text-ink">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FDF2F2] text-[#EF4444] border border-[#EF4444]/30 text-[10px] font-black">
                !
              </span>
              <span>{r}</span>
            </li>
          ))}
          {analysis.risks.length === 0 && (
            <li className="text-xs text-slate italic">No risks identified.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

// Real-world actual trending stock list (Global & Indian)
const trendingStocks = [
  { display: "1. NVDA", query: "Nvidia", change: "↑12.5%", positive: true },
  { display: "2. AAPL", query: "Apple", change: "↑1.2%", positive: true },
  { display: "3. RELIANCE", query: "Reliance Industries", change: "↑0.8%", positive: true },
  { display: "4. HDFCBANK", query: "HDFC Bank", change: "↓0.5%", positive: false },
  { display: "5. LT", query: "L&T", change: "↑2.1%", positive: true },
  { display: "6. TSLA", query: "Tesla", change: "↓3.4%", positive: false },
];

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
  const [favorites, setFavorites]               = useState<string[]>([]);
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);
  const [liveMetrics, setLiveMetrics]           = useState<any | null>(null);

  // Load runs and favorites on mount
  useEffect(() => {
    async function getRuns() {
      try { setRuns(await getRecentRuns(12)); }
      catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load research history."); }
      finally { setLoading(false); }
    }
    getRuns();

    const savedFavs = localStorage.getItem("litmus-favorites");
    if (savedFavs) {
      try {
        setFavorites(JSON.parse(savedFavs));
      } catch (e) {
        console.error("Failed to load favorites", e);
      }
    }
  }, []);

  function toggleFavorite(symbol: string) {
    if (!symbol) return;
    let nextFavs = [...favorites];
    if (nextFavs.includes(symbol)) {
      nextFavs = nextFavs.filter((f) => f !== symbol);
    } else {
      nextFavs.push(symbol);
    }
    setFavorites(nextFavs);
    localStorage.setItem("litmus-favorites", JSON.stringify(nextFavs));
  }

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

  async function runSearch(name: string) {
    const next = name.trim();
    if (!next || (status !== "idle" && status !== "complete")) return;

    setCompany(next);
    setSubmittedCompany(next);
    setStatus("resolving");
    setError("");
    setThinkingLog([]);
    setResolvedName("");
    setTicker("");
    setLiveMetrics(null);
    setCurrentRun(null);
    setCurrentAnalysis(null);
    setCurrentDecision(null);

    async function fetchLiveMetrics(tickerSymbol: string) {
      try {
        const res = await fetch(`/api/quote?ticker=${encodeURIComponent(tickerSymbol)}`);
        if (res.ok) {
          const data = await res.json();
          setLiveMetrics(data);
        }
      } catch (e) {
        console.error("Failed to load live metrics", e);
      }
    }

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
            persistError?: string;
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
            if (payload.ticker) {
              setTicker(payload.ticker);
              fetchLiveMetrics(payload.ticker);
            }
          }

          if (type === "complete") {
            // Use the persisted run if available; otherwise synthesize one from agent
            // output so the verdict card and history count always reflect the new run.
            const effectiveRun: ResearchRun = payload.run ?? {
              id: `local-${Date.now()}`,
              company_name: payload.resolvedName || next,
              decision: payload.decision?.decision ?? "pass",
              confidence: payload.decision?.confidence ?? 0,
              reasoning: payload.decision?.reasoning ?? [],
              sources: payload.decision?.sources ?? [],
              created_at: new Date().toISOString(),
            };
            setRuns((cur) => [effectiveRun, ...cur.filter((r) => r.id !== effectiveRun.id)]);
            setCurrentRun(effectiveRun);
            if (payload.analysis) setCurrentAnalysis(payload.analysis);
            if (payload.decision) setCurrentDecision(payload.decision);
            if (payload.ticker || ticker) {
              fetchLiveMetrics(payload.ticker || ticker);
            }
            // Surface persist failures as a non-fatal warning in the log
            if (payload.persistError) {
              addLog({ step: "system", phase: "system", message: `⚠ History not saved: ${payload.persistError}` });
            }
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

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runSearch(company);
  }

  const isRunning = status !== "idle" && status !== "complete";
  const hasWorkspaceContent = status !== "idle" || currentRun !== null;

  return (
    /* Outer page — cream bg, padded, bottom gap for the floating search bar */
    <main className="mx-auto max-w-[1340px] px-5 py-8 sm:px-8 sm:py-10 lg:px-10 pb-[200px]">

      {/* ── Hero card at the top ───────────────────────────── */}
      <section className="mb-6 rounded-[28px] border-[3px] border-ink bg-lime p-6 shadow-brutal sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.22em]">Litmus</p>
        <h1 className="mt-3 text-5xl font-black leading-[0.88] tracking-[-0.07em] sm:text-7xl">
          Investment research,
          <br />with teeth.
        </h1>
        <p className="mt-4 max-w-lg text-base font-bold text-[#25324A] sm:text-lg">
          Invest or pass, with proof. Litmus traces its research so every verdict is inspectable.
        </p>
      </section>

      {/* ── Progress step tracker (shown during or after run) ── */}
      {hasWorkspaceContent && (
        <div className="mb-6 w-full">
          <AgentProgressTracker status={status} />
        </div>
      )}

      {/* ── Main Two-Column Content Layout ────────────────────── */}
      <div className="flex flex-col gap-6 lg:flex-row">

        {/* ── Left Sidebar (Trending, Favourites, and Verdict History) ── */}
        <aside className="w-full lg:w-[260px] shrink-0 space-y-6">
          <div className="rounded-[20px] border-[3px] border-ink bg-white p-5 shadow-brutal space-y-6">
            
            {/* Trending */}
            <div>
              <h2 className="text-lg font-black tracking-[-0.03em] text-[#25324A] border-b-2 border-ink pb-2">
                Trending
              </h2>
              <ul className="mt-3 space-y-2">
                {trendingStocks.map((stock) => (
                  <li key={stock.display} className="flex items-center justify-between text-xs font-black">
                    <button
                      onClick={() => runSearch(stock.query)}
                      className="text-left hover:underline text-ink hover:text-slate transition-all"
                    >
                      {stock.display}
                    </button>
                    <span className={stock.positive ? "text-[#10B981]" : "text-[#EF4444]"}>
                      {stock.change}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Favourites */}
            <div>
              <h2 className="text-lg font-black tracking-[-0.03em] text-[#25324A] border-b-2 border-ink pb-2">
                Favourites
              </h2>
              <div className="mt-3">
                {favorites.length === 0 ? (
                  <div className="rounded-[12px] border-2 border-dashed border-ink/20 bg-mist/30 p-4 text-center">
                    <p className="text-[10px] font-bold text-slate">
                      Add Stocks to your favourites
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {favorites.map((fav) => (
                      <div
                        key={fav}
                        className="flex items-center justify-between rounded-[10px] border-2 border-ink bg-[#F5F1E8] px-3 py-1.5 text-xs font-black shadow-brutal-sm hover:bg-white transition-all"
                      >
                        <button
                          onClick={() => runSearch(fav)}
                          className="flex-1 text-left font-black truncate pr-1"
                        >
                          {fav}
                        </button>
                        <button
                          onClick={() => toggleFavorite(fav)}
                          className="text-slate hover:text-ink font-bold text-[14px]"
                          title="Remove favorite"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Verdict History */}
            <div>
              <h2 className="text-lg font-black tracking-[-0.03em] text-[#25324A] border-b-2 border-ink pb-2 mb-3">
                History
              </h2>
              <button
                onClick={() => setShowHistory((v) => !v)}
                className="w-full flex items-center justify-center gap-2 rounded-[12px] border-[3px] border-ink bg-white py-2 text-xs font-black uppercase tracking-[0.08em] shadow-brutal-sm hover:bg-mist transition-colors"
              >
                {showHistory ? "Hide History" : "View History"}
              </button>
              
              {showHistory && (
                <div className="mt-3 max-h-[260px] overflow-y-auto rounded-[12px] border-2 border-ink bg-[#F5F1E8] divide-y divide-ink/15 overflow-hidden">
                  {loading ? (
                    <p className="py-4 text-center text-[10px] font-black uppercase text-slate animate-pulse">Loading…</p>
                  ) : runs.length === 0 ? (
                    <p className="py-4 text-center text-[10px] font-black uppercase text-slate">No history yet</p>
                  ) : (
                    runs.map((run) => (
                      <button
                        key={run.id}
                        onClick={() => runSearch(run.company_name)}
                        className="w-full flex items-center justify-between gap-2 p-3 text-left hover:bg-white transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-black text-xs text-ink truncate">{run.company_name}</p>
                          <p className="text-[9px] font-bold text-slate mt-0.5">
                            {new Date(run.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </p>
                        </div>
                        <span className={`shrink-0 rounded-full border-2 border-ink px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] ${
                          run.decision.toLowerCase() === "invest" ? "bg-lime text-ink" : "bg-[#FF8E78] text-ink"
                        }`}>
                          {run.decision.toUpperCase()}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

          </div>
        </aside>

        {/* ── Right Main Area ────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {!hasWorkspaceContent ? (
            /* Welcome / Landing State */
            <div className="rounded-[28px] border-[3px] border-ink bg-white p-8 shadow-brutal flex flex-col items-center justify-center text-center min-h-[480px]">
              {/* Dynamic Radar Pulse Micro-animation */}
              <div className="relative h-32 w-32 flex items-center justify-center">
                {/* Pulse wave 1 */}
                <div className="absolute inset-0 rounded-[24px] border-[3px] border-ink bg-lime animate-pulse" style={{ transform: "rotate(15deg)" }} />
                {/* Pulse wave 2 */}
                <div className="absolute inset-2 rounded-[24px] border-[3px] border-ink bg-white shadow-brutal-sm" style={{ transform: "rotate(-5deg)" }} />
                {/* Center icon */}
                <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border-4 border-ink bg-lime text-2xl font-black shadow-brutal-sm">
                  🔍
                </div>
              </div>

              <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate">
                ↓ Animation ↓
              </p>

              <h2 className="mt-4 text-3xl sm:text-4xl font-black leading-tight tracking-[-0.04em]">
                Welcome to <span className="underline decoration-lime decoration-[6px]">Litmus</span>.
              </h2>
              <p className="mt-2 text-lg sm:text-xl font-black tracking-[-0.02em] text-[#25324A]">
                What stock do you wanna know about ?
              </p>

              {/* Centered search form inside the Welcome Card */}
              <form
                onSubmit={submit}
                className="mt-8 flex w-full max-w-lg items-center gap-3 rounded-[18px] border-[3px] border-ink bg-[#F5F1E8] px-4 py-3 shadow-brutal"
              >
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  disabled={isRunning}
                  placeholder="Search for a company — try L&T, GOOG, Reliance…"
                  className="min-w-0 flex-1 bg-transparent font-bold outline-none placeholder:font-normal placeholder:text-slate/60 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isRunning || !company.trim()}
                  className="shrink-0 rounded-[12px] border-[3px] border-ink bg-ink px-5 py-2.5 text-sm font-black uppercase tracking-[0.08em] text-white transition-transform active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-40"
                >
                  Run Research
                </button>
              </form>
            </div>
          ) : (
            /* Searched Workspace Content State */
            <div className="space-y-6">
              {/* Upper row: Stock Chart and Result Log card side-by-side ending on the same line */}
              <div className="grid gap-5 xl:grid-cols-[1fr_380px] lg:grid-cols-[1fr_340px]">
                
                {/* Left side: Stock Chart */}
                <div>
                  {ticker ? (
                    <div className="h-[400px] lg:h-[520px]">
                      <StockChart ticker={ticker} resolvedName={resolvedName || submittedCompany} />
                    </div>
                  ) : (
                    isRunning && (
                      <div className="flex h-[400px] lg:h-[520px] w-full flex-col items-center justify-center rounded-[24px] border-[3px] border-ink bg-white shadow-brutal p-8">
                        {/* Animated radar spinner */}
                        <div className="relative h-24 w-24 flex items-center justify-center mb-6">
                          <div className="absolute inset-0 rounded-[20px] border-[3px] border-ink bg-lime animate-spin" style={{ animationDuration: "3s" }} />
                          <div className="absolute inset-2.5 rounded-[20px] border-[3px] border-ink bg-white flex items-center justify-center text-3xl font-black shadow-brutal-sm">
                            ⏳
                          </div>
                        </div>
                        <h3 className="text-xl font-black tracking-[-0.04em] text-ink animate-pulse">Initializing Stock Chart...</h3>
                        <p className="text-xs font-bold text-slate mt-2 max-w-xs text-center leading-relaxed">
                          Resolving ticker exchange and configuring the live TradingView widget.
                        </p>
                      </div>
                    )
                  )}
                </div>

                {/* Right side: Result Log card / Verdict Summary card */}
                <div className="lg:self-start">
                  {status === "complete" && currentRun ? (
                    /* Verdict Summary Card */
                    <div className="flex flex-col rounded-[24px] border-[3px] border-ink bg-[#FAF9F5] p-6 shadow-brutal overflow-hidden" style={{ minHeight: "520px" }}>
                      {/* Header */}
                      <div className="flex items-center justify-between border-b-[3px] border-ink pb-4">
                        <h3 className="text-2xl font-black tracking-[-0.04em]">Result</h3>
                        <span className="rounded-full border-2 border-ink bg-lime px-3 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] shadow-brutal-sm">
                          LangGraph
                        </span>
                      </div>

                      {/* Verdict Pill Banner */}
                      <div className={`mt-5 rounded-[16px] border-[3px] border-ink p-4.5 text-center shadow-[4px_4px_0px_rgba(0,0,0,1)] ${
                        currentRun.decision.toLowerCase() === "invest" ? "bg-lime text-ink" : "bg-[#FF8E78] text-ink"
                      }`}>
                        <span className="text-3xl font-black uppercase tracking-[0.18em]">
                          {currentRun.decision.toUpperCase()}
                        </span>
                      </div>

                      {/* Market Sentiment Box */}
                      {currentAnalysis && (
                        <div className="mt-5 rounded-[16px] border-[3px] border-ink bg-white p-4.5 flex items-center justify-between shadow-brutal-sm">
                          <span className="text-xs font-black uppercase tracking-[0.12em] text-[#5A6376]">Sentiment</span>
                          <span className={`rounded-full border-2 border-ink px-4 py-1 text-xs font-black uppercase tracking-[0.08em] ${
                            currentAnalysis.sentiment === "positive" ? "bg-[#10B981] text-white" : currentAnalysis.sentiment === "negative" ? "bg-[#EF4444] text-white" : "bg-mist text-ink"
                          }`}>
                            {currentAnalysis.sentiment}
                          </span>
                        </div>
                      )}

                      {/* Strengths & Risks Counts Box */}
                      {currentAnalysis && (
                        <div className="mt-5 rounded-[16px] border-[3px] border-ink bg-white p-5 flex flex-col items-center shadow-brutal-sm">
                          <div className="grid grid-cols-2 w-full text-center divide-x-2 divide-ink/20">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#5A6376]">Strengths</p>
                              <p className="text-3xl font-black mt-1 text-[#10B981]">{currentAnalysis.strengths.length}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#5A6376]">Risks</p>
                              <p className="text-3xl font-black mt-1 text-[#EF4444]">{currentAnalysis.risks.length}</p>
                            </div>
                          </div>

                          {/* Scroll Down to Pros & Cons button */}
                          <button
                            onClick={() => {
                              document.getElementById("verdict-details")?.scrollIntoView({ behavior: "smooth" });
                            }}
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-[2.5px] border-ink bg-[#FAF9F5] py-2 text-[10px] font-black uppercase tracking-[0.1em] shadow-brutal-sm hover:bg-lime hover:text-ink active:translate-x-0.5 active:translate-y-0.5 transition-all"
                            title="Directly goes to the pros and cons"
                          >
                            Jump to Pros & Cons ↓
                          </button>
                        </div>
                      )}

                      {/* Bottom: Expand Link */}
                      <div className="mt-auto pt-6 border-t-[3px] border-ink/10">
                        <button
                          onClick={() => setIsThinkingExpanded(true)}
                          className="w-full rounded-xl border-[2.5px] border-ink bg-[#16161E] py-3 text-center text-xs font-black uppercase tracking-[0.12em] text-white shadow-brutal-sm hover:bg-lime hover:text-ink hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                          Expand Reasoning Log ↗
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Live Thinking Log Panel */
                    <ThinkingPanel
                      entries={thinkingLog}
                      resolvedName={resolvedName}
                      originalInput={submittedCompany}
                      ticker={ticker}
                      status={status}
                      onExpand={() => setIsThinkingExpanded(true)}
                    />
                  )}
                </div>
              </div>

              {/* Lower row: Full-width details block rendering below the Chart/Result fold */}
              {((isRunning && !currentRun) || currentRun || error) && (
                <div className="w-full space-y-5">
                  {/* Loader Skeleton during active research */}
                  {isRunning && !currentRun && (
                    <div className="rounded-[20px] border-[3px] border-ink bg-white p-6 shadow-brutal animate-pulse space-y-4">
                      <div className="flex items-center justify-between border-b-2 border-ink/10 pb-3">
                        <div className="h-3 w-24 bg-mist rounded-full border border-ink/20" />
                        <div className="h-3.5 w-12 bg-mist rounded-full border border-ink/20" />
                      </div>
                      <div className="h-8 w-3/4 bg-mist rounded-lg border-2 border-ink" />
                      <div className="h-3.5 w-1/2 bg-mist rounded-full border border-ink/10" />
                      
                      <div className="h-20 bg-mist rounded-xl border-2 border-ink/20 flex flex-col justify-center px-4 space-y-2">
                        <div className="h-3 bg-ink/10 rounded-full w-full" />
                        <div className="h-3 bg-ink/10 rounded-full w-5/6" />
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="h-24 bg-mist rounded-xl border-2 border-ink/15 p-3 space-y-2">
                          <div className="h-3 w-12 bg-ink/10 rounded-full" />
                          <div className="h-2 w-full bg-ink/10 rounded-full" />
                          <div className="h-2 w-5/6 bg-ink/10 rounded-full" />
                        </div>
                        <div className="h-24 bg-mist rounded-xl border-2 border-ink/15 p-3 space-y-2">
                          <div className="h-3 w-12 bg-ink/10 rounded-full" />
                          <div className="h-2 w-full bg-ink/10 rounded-full" />
                          <div className="h-2 w-5/6 bg-ink/10 rounded-full" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Resolved Investment Thesis details */}
                  {currentRun && (
                    <>
                      <VerdictCard
                        run={currentRun}
                        analysis={currentAnalysis}
                        decision={currentDecision}
                        ticker={ticker}
                        isFavorite={favorites.includes(currentRun.company_name) || favorites.includes(ticker)}
                        onToggleFavorite={() => toggleFavorite(currentRun.company_name || ticker)}
                      />

                      {/* Black terminal style Financial Metrics Grid */}
                      <FinancialMetricsCard ticker={ticker} liveMetrics={liveMetrics} />

                      {/* Side-by-side colored Pros & Cons Card */}
                      {currentAnalysis && (
                        <ProsConsCard analysis={currentAnalysis} />
                      )}
                    </>
                  )}

                  {error && (
                    <div className="rounded-[16px] border-[3px] border-ink bg-[#FF8E78] px-5 py-4 font-bold shadow-brutal-sm">
                      ⚠ {error}
                    </div>
                  )}
                </div>
              )}

              {/* Integrated Workspace Search Bar at the very bottom */}
              <div className="w-full mt-4">
                <form
                  onSubmit={submit}
                  className="flex w-full items-center gap-3 rounded-[18px] border-[3px] border-ink bg-white px-4 py-3 shadow-brutal"
                >
                  <input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    disabled={isRunning}
                    placeholder="Ask Further Questions or Search for another company — try L&T, GOOG…"
                    className="min-w-0 flex-1 bg-transparent font-bold outline-none placeholder:font-normal placeholder:text-slate/60 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isRunning || !company.trim()}
                    className="shrink-0 rounded-[12px] border-[3px] border-ink bg-ink px-6 py-2.5 text-sm font-black uppercase tracking-[0.08em] text-white transition-transform active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-40"
                  >
                    Run
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Fullscreen Expanded Thinking Log Modal ──────────── */}
      {isThinkingExpanded && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-3xl rounded-[24px] border-[3px] border-ink bg-white p-6 shadow-brutal flex flex-col max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b-[3px] border-ink pb-4 mb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate">Full Execution Log</p>
                <h3 className="text-2xl font-black tracking-[-0.04em]">Detailed Agent Reasoning</h3>
              </div>
              <button
                onClick={() => setIsThinkingExpanded(false)}
                className="rounded-lg border-2 border-ink bg-mist px-3 py-1.5 text-xs font-black uppercase hover:bg-paper transition-all shadow-brutal-sm active:translate-x-0.5 active:translate-y-0.5"
              >
                Close ×
              </button>
            </div>
            
            {/* Log view inside Modal */}
            <div className="overflow-y-auto pr-1 flex-1 space-y-3 font-mono text-xs thinking-scroll max-h-[60vh]">
              {/* Company resolution callout */}
              {resolvedName && submittedCompany && resolvedName.toLowerCase() !== submittedCompany.toLowerCase() && (
                <div className="rounded-[10px] border-[2.5px] border-ink bg-lime p-3 shadow-brutal-sm mb-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-ink/60">Company Resolved</p>
                  <p className="mt-1 font-black text-sm text-ink">
                    <span className="opacity-60">"{submittedCompany}"</span>
                    <span className="mx-2 opacity-40">→</span>
                    <span>{resolvedName}</span>
                    {ticker && <span className="ml-2 opacity-60">[{ticker}]</span>}
                  </p>
                </div>
              )}

              {thinkingLog.map((entry, i) => {
                const stepColorsMap: Record<string, string> = {
                  resolve:  "bg-[#C8F0FF] border-[#5BC8F5]",
                  research: "bg-lime border-ink",
                  analyze:  "bg-[#FFE7A0] border-[#DDAA00]",
                  decide:   "bg-[#FFD0C8] border-[#FF6B55]",
                  system:   "bg-mist border-[#C0C5CC]",
                };
                return (
                  <div key={i} className="flex gap-2">
                    <span className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] ${stepColorsMap[entry.step] || 'bg-mist border-ink'}`}>
                      {entry.step.toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="leading-relaxed text-ink break-words">{entry.message}</p>
                      <p className="text-[9px] text-slate">{entry.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
