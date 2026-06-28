import { ChatOpenAI } from "@langchain/openai";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import {
  AnalysisSchema,
  DecisionSchema,
  ResearchBundleSchema,
  ResolvedCompanySchema,
  type AgentProgress,
  type Analysis,
  type AgentDecision,
  type ResearchBundle,
} from "@/lib/agent/types";
import { researchCompany } from "@/lib/agent/search";

// Each field is a last-value channel. This compact shared state makes every node's
// inputs and outputs inspectable without mixing ephemeral UI callbacks into state.
const AgentState = Annotation.Root({
  companyName: Annotation<string>,
  resolvedName: Annotation<string>,
  ticker: Annotation<string>,
  research: Annotation<ResearchBundle>,
  analysis: Annotation<Analysis>,
  decision: Annotation<AgentDecision>,
});

export type LitmusRun = {
  companyName: string;
  resolvedName: string;
  ticker: string;
  research: ResearchBundle;
  analysis: Analysis;
  decision: AgentDecision;
};

function getModel() {
  if (!process.env.KIMI_API_KEY) throw new Error("KIMI_API_KEY is not configured.");
  return new ChatOpenAI({
    model: process.env.KIMI_MODEL_NAME || "Kimi-K2.5",
    apiKey: process.env.KIMI_API_KEY,
    configuration: {
      baseURL: process.env.KIMI_BASE_URL || "https://oneplug-ai2-resource.services.ai.azure.com/openai/v1",
    },
    temperature: 0,
    // Zero temperature is intentional: a research decision should be reproducible
    // from the same evidence rather than optimized for creative variation.
  });
}

function buildGraph(onProgress?: (event: AgentProgress) => void) {
  // resolve: maps the raw user input to a canonical company name + exchange ticker.
  // This runs before research so downstream nodes always operate on a clean name.
  const resolve = async (state: typeof AgentState.State) => {
    onProgress?.({ step: "resolve", phase: "started", message: `Resolving "${state.companyName}"…` });
    const resolver = getModel().withStructuredOutput(ResolvedCompanySchema, { name: "resolve_company" });
    const result = await resolver.invoke([
      [
        "system",
        "You are a financial data assistant. Given any company name, abbreviation, or ticker short form, return the canonical full company name and its primary stock exchange ticker symbol using the format EXCHANGE:SYMBOL (e.g. NSE:LT, NASDAQ:GOOGL, NYSE:TSLA, BSE:RELIANCE). For Indian companies prefer NSE. If the ticker cannot be determined, return an empty string for ticker.",
      ],
      ["human", `Resolve this company: ${state.companyName}`],
    ]);
    const resolved = ResolvedCompanySchema.parse(result);
    onProgress?.({
      step: "resolve",
      phase: "done",
      message: `Mapped to: ${resolved.canonicalName}${resolved.ticker ? ` [${resolved.ticker}]` : ""}`,
      resolvedName: resolved.canonicalName,
      ticker: resolved.ticker,
    });
    return { resolvedName: resolved.canonicalName, ticker: resolved.ticker };
  };

  const research = async (state: typeof AgentState.State) => {
    const name = state.resolvedName || state.companyName;
    onProgress?.({ step: "research", phase: "started", message: `Searching latest news and financials for ${name}…` });
    const bundle = await researchCompany(name);
    onProgress?.({ step: "research", phase: "done", message: `Collected ${bundle.newsItems.length} sources across ${bundle.sources.length} URLs` });
    return { research: bundle };
  };

  const analyze = async (state: typeof AgentState.State) => {
    onProgress?.({ step: "analyze", phase: "started", message: "Analyzing investment thesis, risks, and market sentiment…" });
    // withStructuredOutput uses tool use under the hood. It validates the
    // response against Zod instead of relying on fragile JSON extraction.
    const analyst = getModel().withStructuredOutput(AnalysisSchema, { name: "investment_analysis" });
    const analysis = await analyst.invoke([
      ["system", "You are a careful investment research analyst. Analyze only the supplied evidence. Do not invent facts. Return the requested structured fields."],
      ["human", `Company: ${state.resolvedName || state.companyName}\n\nResearch bundle:\n${JSON.stringify(state.research)}`],
    ]);
    const parsed = AnalysisSchema.parse(analysis);
    onProgress?.({
      step: "analyze",
      phase: "done",
      message: `Sentiment: ${parsed.sentiment} — ${parsed.strengths.length} strengths, ${parsed.risks.length} risks identified`,
    });
    return { analysis: parsed };
  };

  const decide = async (state: typeof AgentState.State) => {
    onProgress?.({ step: "decide", phase: "started", message: "Writing evidence-backed investment verdict…" });
    const decider = getModel().withStructuredOutput(DecisionSchema, { name: "investment_verdict" });
    const decision = await decider.invoke([
      [
        "system",
        "Act as an investment analyst. Make a conservative invest or pass verdict using only the provided research and analysis. Your structured response is consumed directly by software, so provide no unsupported claims. Ensure the confidence score is returned as a whole percentage number between 0 and 100 (e.g., 75 for 75%), not as a decimal fraction like 0.75.",
      ],
      [
        "human",
        `Company: ${state.resolvedName || state.companyName}\n\nResearch:\n${JSON.stringify(state.research)}\n\nAnalysis:\n${JSON.stringify(state.analysis)}`,
      ],
    ]);
    const parsed = DecisionSchema.parse(decision);
    onProgress?.({
      step: "decide",
      phase: "done",
      message: `Verdict: ${parsed.decision.toUpperCase()}`,
    });
    return { decision: parsed };
  };

  return new StateGraph(AgentState)
    .addNode("resolve", resolve)
    .addNode("conduct_research", research)
    .addNode("analyze", analyze)
    .addNode("decide", decide)
    .addEdge(START, "resolve")
    .addEdge("resolve", "conduct_research")
    .addEdge("conduct_research", "analyze")
    .addEdge("analyze", "decide")
    .addEdge("decide", END)
    .compile();
}

export async function runLitmusAgent(companyName: string, onProgress?: (event: AgentProgress) => void): Promise<LitmusRun> {
  const finalState = await buildGraph(onProgress).invoke({ companyName });
  return {
    companyName: finalState.companyName,
    resolvedName: finalState.resolvedName,
    ticker: finalState.ticker,
    research: ResearchBundleSchema.parse(finalState.research),
    analysis: AnalysisSchema.parse(finalState.analysis),
    decision: DecisionSchema.parse(finalState.decision),
  };
}
