export type Decision = "INVEST" | "PASS" | "WATCH" | string;

export type ResearchRun = {
  id: string;
  company_name: string;
  decision: Decision;
  confidence: number;
  reasoning: unknown;
  sources: unknown;
  created_at: string;
};
