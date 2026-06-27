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

export type ResearchBundle = z.infer<typeof ResearchBundleSchema>;
export type Analysis = z.infer<typeof AnalysisSchema>;
export type AgentDecision = z.infer<typeof DecisionSchema>;
export type AgentProgress = { step: "research" | "analyze" | "decide"; phase: "started" | "done" };
