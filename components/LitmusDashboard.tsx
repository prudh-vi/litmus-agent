"use client";

import { useEffect, useMemo, useState } from "react";
import { AgentProgressTracker, type AgentStep } from "@/components/AgentProgressTracker";
import { ReasoningLog } from "@/components/ReasoningLog";
import { StatCard } from "@/components/StatCard";
import { VerdictTable } from "@/components/VerdictTable";
import { getRecentRuns } from "@/lib/supabase/client";
import type { ResearchRun } from "@/lib/types";

export function LitmusDashboard() {
  const [company, setCompany] = useState("");
  const [submittedCompany, setSubmittedCompany] = useState("");
  const [status, setStatus] = useState<AgentStep>("idle");
  const [runs, setRuns] = useState<ResearchRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function getRuns() {
      try { setRuns(await getRecentRuns(12)); }
      catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load research history."); }
      finally { setLoading(false); }
    }
    getRuns();
  }, []);

  const latest = runs[0];
  const stats = useMemo(() => [
    { label: "Last verdict", value: latest?.decision ?? "—" },
    { label: "Confidence", value: latest ? `${latest.confidence}%` : "—" },
    { label: "Runs today", value: String(runs.filter((run) => new Date(run.created_at).toDateString() === new Date().toDateString()).length) },
  ], [latest, runs]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = company.trim();
    if (!next || (status !== "idle" && status !== "complete")) return;
    setSubmittedCompany(next);
    setStatus("researching");
    setError("");
    try {
      const response = await fetch("/api/research", { method: "POST", headers: { "Content-Type": "application/json", Accept: "text/event-stream" }, body: JSON.stringify({ companyName: next }) });
      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Unable to start research.");
      }
      const reader = response.body.getReader();
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
          const raw = event.match(/^data: (.+)$/m)?.[1];
          if (!type || !raw) continue;
          const payload = JSON.parse(raw) as { step?: string; phase?: string; error?: string; run?: ResearchRun };
          if (type === "progress" && payload.phase === "started") {
            setStatus(payload.step === "research" ? "researching" : payload.step === "analyze" ? "analyzing" : "deciding");
          }
          if (type === "complete" && payload.run) {
            setRuns((current) => [payload.run!, ...current.filter((run) => run.id !== payload.run!.id)]);
            setStatus("complete");
          }
          if (type === "error") throw new Error(payload.error ?? "Research failed.");
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Research failed.");
      setStatus("idle");
    }
  }

  return (
    <main className="mx-auto max-w-[1280px] px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
      <section className="rounded-[28px] border-[3px] border-ink bg-lime p-6 shadow-brutal sm:p-8 lg:flex lg:items-end lg:justify-between lg:gap-10">
        <div className="max-w-2xl">
          <p className="text-sm font-black uppercase tracking-[0.22em]">Litmus</p>
          <h1 className="mt-3 text-5xl font-black leading-[0.88] tracking-[-0.07em] sm:text-7xl">Investment research,<br />with teeth.</h1>
          <p className="mt-4 max-w-lg text-base font-bold text-[#25324A] sm:text-lg">Invest or pass, with proof. Litmus traces its research so every verdict is inspectable.</p>
        </div>
        <form onSubmit={submit} className="mt-7 flex w-full max-w-md flex-col gap-3 lg:mt-0">
          <label htmlFor="company" className="text-xs font-black uppercase tracking-[0.13em]">Company to research</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input id="company" value={company} onChange={(event) => setCompany(event.target.value)} placeholder="e.g. Tata Motors" className="min-w-0 flex-1 rounded-[14px] border-[3px] border-ink bg-white px-4 py-3 font-bold outline-none placeholder:text-[#7C8494] focus:bg-[#F9FFF1]" />
            <button type="submit" className="rounded-[14px] border-[3px] border-ink bg-ink px-5 py-3 font-black text-white shadow-brutal-sm transition-transform active:translate-x-1 active:translate-y-1 active:shadow-none">Run research</button>
          </div>
        </form>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-3">{stats.map((stat) => <StatCard key={stat.label} {...stat} />)}</section>
      <section className="mt-8 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]"><AgentProgressTracker status={status} company={submittedCompany} /><VerdictTable runs={runs} /></section>
      <section className="mt-8"><ReasoningLog runs={runs} /></section>
      {loading && <p className="mt-6 text-center text-xs font-black uppercase tracking-[0.14em] text-slate">Loading research history…</p>}
      {error && <p className="mt-6 rounded-[12px] border-2 border-ink bg-[#FF8E78] px-4 py-3 text-center text-sm font-bold">{error}</p>}
    </main>
  );
}
