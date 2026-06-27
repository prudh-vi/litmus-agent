import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ResearchRun } from "@/lib/types";

/** Browser-safe client: only NEXT_PUBLIC values are used in frontend bundles. */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? createClient(url, key) : null;
}

/** Keeps history loading in one typed, reusable query rather than duplicating it in UI components. */
export async function getRecentRuns(limit = 10): Promise<ResearchRun[]> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("research_runs")
    .select("id, company_name, decision, confidence, reasoning, sources, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Could not load research history: ${error.message}`);
  return (data as ResearchRun[] | null) ?? [];
}
