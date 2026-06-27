import { ChatOpenAI } from "@langchain/openai";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { AnalysisSchema, DecisionSchema, ResearchBundleSchema, type AgentProgress, type Analysis, type AgentDecision, type ResearchBundle } from "@/lib/agent/types";
import { researchCompany } from "@/lib/agent/search";

// Each field is a last-value channel. This compact shared state makes every node's
// inputs and outputs inspectable without mixing ephemeral UI callbacks into state.
const AgentState = Annotation.Root({
  companyName: Annotation<string>,
  research: Annotation<ResearchBundle>,
  analysis: Annotation<Analysis>,
  decision: Annotation<AgentDecision>,
});

export type LitmusRun = { companyName: string; research: ResearchBundle; analysis: Analysis; decision: AgentDecision };

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
  const research = async (state: typeof AgentState.State) => {
    onProgress?.({ step: "research", phase: "started" });
    const bundle = await researchCompany(state.companyName);
    onProgress?.({ step: "research", phase: "done" });
    return { research: bundle };
  };

  const analyze = async (state: typeof AgentState.State) => {
    onProgress?.({ step: "analyze", phase: "started" });
    // withStructuredOutput uses Anthropic tool use under the hood. It validates the
    // response against Zod instead of relying on fragile JSON extraction or regex.
    const analyst = getModel().withStructuredOutput(AnalysisSchema, { name: "investment_analysis" });
    const analysis = await analyst.invoke([
      ["system", "You are a careful investment research analyst. Analyze only the supplied evidence. Do not invent facts. Return the requested structured fields."],
      ["human", `Company: ${state.companyName}\n\nResearch bundle:\n${JSON.stringify(state.research)}`],
    ]);
    onProgress?.({ step: "analyze", phase: "done" });
    return { analysis: AnalysisSchema.parse(analysis) };
  };

  const decide = async (state: typeof AgentState.State) => {
    onProgress?.({ step: "decide", phase: "started" });
    const decider = getModel().withStructuredOutput(DecisionSchema, { name: "investment_verdict" });
    const decision = await decider.invoke([
      ["system", "Act as an investment analyst. Make a conservative invest or pass verdict using only the provided research and analysis. Your structured response is consumed directly by software, so provide no unsupported claims. Ensure the confidence score is returned as a whole percentage number between 0 and 100 (e.g., 75 for 75%), not as a decimal fraction like 0.75."],
      ["human", `Company: ${state.companyName}\n\nResearch:\n${JSON.stringify(state.research)}\n\nAnalysis:\n${JSON.stringify(state.analysis)}`],
    ]);
    onProgress?.({ step: "decide", phase: "done" });
    return { decision: DecisionSchema.parse(decision) };
  };

  return new StateGraph(AgentState)
    .addNode("conduct_research", research)
    .addNode("analyze", analyze)
    .addNode("decide", decide)
    .addEdge(START, "conduct_research")
    .addEdge("conduct_research", "analyze")
    .addEdge("analyze", "decide")
    .addEdge("decide", END)
    .compile();
}

export async function runLitmusAgent(companyName: string, onProgress?: (event: AgentProgress) => void): Promise<LitmusRun> {
  const finalState = await buildGraph(onProgress).invoke({ companyName });
  return {
    companyName: finalState.companyName,
    research: ResearchBundleSchema.parse(finalState.research),
    analysis: AnalysisSchema.parse(finalState.analysis),
    decision: DecisionSchema.parse(finalState.decision),
  };
}
