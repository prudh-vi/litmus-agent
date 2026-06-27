import { createClient } from "@supabase/supabase-js";
import type { AgentDecision } from "@/lib/agent/types";
import type { ResearchRun } from "@/lib/types";

/**
 * Server inserts use the service-role key so persistence is not dependent on a
 * browser RLS policy. This module must never be imported by a client component.
 */
export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase server credentials are not configured.");
  return createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function persistResearchRun(companyName: string, result: AgentDecision): Promise<ResearchRun> {
  const { data, error } = await getSupabaseServerClient()
    .from("research_runs")
    .insert({ company_name: companyName, decision: result.decision, confidence: result.confidence, reasoning: result.reasoning, sources: result.sources })
    .select("id, company_name, decision, confidence, reasoning, sources, created_at")
    .single();
  if (error) throw new Error(`Could not save research run: ${error.message}`);
  return data as ResearchRun;
}
