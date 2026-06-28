import { z } from "zod";

// These schemas are shared by the graph and API boundary so malformed model output
// cannot reach Supabase or the UI.
export const NewsItemSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  publishedAt: z.string().optional(),
  summary: z.string(),
});

export const ResearchBundleSchema = z.object({
  newsItems: z.array(NewsItemSchema),
  fundamentals: z.object({
    summary: z.string(),
    marketContext: z.string(),
  }),
  sources: z.array(z.string().url()),
});

export const AnalysisSchema = z.object({
  strengths: z.array(z.string()),
  risks: z.array(z.string()),
  sentiment: z.enum(["positive", "neutral", "negative"]),
});

export const DecisionSchema = z.object({
  decision: z.enum(["invest", "pass"]),
  confidence: z.number().min(0).max(100).describe("The confidence score as a percentage between 0 and 100 (e.g., 75 for 75%). Do not output a decimal fraction like 0.75."),
  reasoning: z.array(z.string()).min(3).max(6),
  sources: z.array(z.string().url()).max(12),
});

// Resolve step: maps user input to a canonical company name + stock ticker.
export const ResolvedCompanySchema = z.object({
  canonicalName: z.string().describe("The full official company name, e.g. 'Larsen & Toubro Limited'"),
  ticker: z.string().describe("Primary stock ticker with exchange prefix (e.g., NSE:LT, NASDAQ:GOOGL, NYSE:TSLA). Empty string if unknown."),
});

export type ResearchBundle = z.infer<typeof ResearchBundleSchema>;
export type Analysis = z.infer<typeof AnalysisSchema>;
export type AgentDecision = z.infer<typeof DecisionSchema>;
export type ResolvedCompany = z.infer<typeof ResolvedCompanySchema>;

// AgentProgress now carries an optional human-readable message and resolution info
// so the thinking panel in the UI can stay live throughout the run.
export type AgentProgress = {
  step: "resolve" | "research" | "analyze" | "decide";
  phase: "started" | "done";
  message?: string;
  resolvedName?: string;
  ticker?: string;
};
