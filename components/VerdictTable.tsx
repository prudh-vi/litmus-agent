import type { ResearchRun } from "@/lib/types";

function decisionClass(decision: string) {
  const d = decision.toLowerCase();
  if (d === "invest") return "bg-lime";
  if (d === "pass")   return "bg-[#FF8E78]";
  return "bg-mist";
}

export function VerdictTable({ runs }: { runs: ResearchRun[] }) {
  return (
    <section className="rounded-[18px] border-[3px] border-ink bg-white shadow-brutal overflow-hidden">
      <div className="flex items-center justify-between border-b-[3px] border-ink px-5 py-4">
        <h2 className="text-xl font-black tracking-[-0.04em]">Verdict History</h2>
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate">{runs.length} runs</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-left text-sm">
          <thead className="border-b-[2px] border-ink text-[10px] font-black uppercase tracking-[0.1em]">
            <tr>
              <th className="px-5 py-3">Company</th>
              <th className="px-5 py-3">Verdict</th>
              <th className="px-5 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id} className="border-b border-[#DCE1E8] last:border-0 hover:bg-mist transition-colors">
                <td className="px-5 py-3 font-black">{run.company_name}</td>
                <td className="px-5 py-3">
                  <span className={`inline-block rounded-full border-2 border-ink px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] ${decisionClass(run.decision)}`}>
                    {run.decision.toUpperCase()}
                  </span>
                </td>
                <td className="px-5 py-3 font-medium text-slate">
                  {new Date(run.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {runs.length === 0 && (
          <p className="py-8 text-center text-sm font-medium text-slate">No runs yet.</p>
        )}
      </div>
    </section>
  );
}
