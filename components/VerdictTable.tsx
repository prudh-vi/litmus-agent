import type { ResearchRun } from "@/lib/types";

function decisionClass(decision: string) {
  if (decision === "INVEST") return "bg-lime";
  if (decision === "PASS") return "bg-[#FF8E78]";
  return "bg-mist";
}

export function VerdictTable({ runs }: { runs: ResearchRun[] }) {
  return (
    <section className="rounded-[20px] border-[3px] border-ink bg-white p-6 shadow-brutal sm:p-7">
      <h2 className="text-3xl font-black tracking-[-0.06em]">Verdict History</h2>
      <div className="mt-7 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <thead className="border-b-[3px] border-ink text-xs font-black uppercase tracking-[0.08em]">
            <tr><th className="pb-3">Company</th><th className="pb-3">Decision</th><th className="pb-3">Confidence</th><th className="pb-3">Date</th></tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id} className="border-b border-[#DCE1E8] last:border-0">
                <td className="py-4 font-black">{run.company_name}</td>
                <td className="py-4"><span className={`inline-block rounded-full border-2 border-ink px-2 py-1 text-[10px] font-black tracking-[0.1em] ${decisionClass(run.decision)}`}>{run.decision}</span></td>
                <td className="py-4 font-bold">{run.confidence}%</td>
                <td className="py-4 text-sm font-medium text-slate">{new Date(run.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {runs.length === 0 && <p className="py-10 text-center text-sm font-medium text-slate">No runs yet.</p>}
      </div>
    </section>
  );
}
