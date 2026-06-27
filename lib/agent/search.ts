import { ResearchBundleSchema, type ResearchBundle } from "@/lib/agent/types";

type TavilyResult = { title?: string; url?: string; content?: string; published_date?: string };

/**
 * Tavily is called with plain fetch rather than wrapped as a LangChain tool because
 * this graph has a fixed, auditable three-node path. A direct request makes the
 * query, date window, result count, and source URLs transparent to the interviewer.
 */
export async function researchCompany(companyName: string): Promise<ResearchBundle> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("TAVILY_API_KEY is not configured.");

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query: `${companyName} latest news financial results revenue earnings business overview`,
      search_depth: "advanced",
      topic: "news",
      days: 90,
      max_results: 8,
      include_answer: true,
    }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`Tavily search failed (${response.status}).`);
  const payload = (await response.json()) as { answer?: string; results?: TavilyResult[] };
  const results = (payload.results ?? []).filter((item): item is TavilyResult & { title: string; url: string } => Boolean(item.title && item.url));
  if (results.length === 0) throw new Error("Search returned no usable sources for this company.");

  return ResearchBundleSchema.parse({
    newsItems: results.map((item) => ({ title: item.title, url: item.url, publishedAt: item.published_date, summary: item.content ?? "No summary returned." })),
    fundamentals: {
      // Search is deliberately the evidence collection stage; the model is asked to
      // synthesize only in later nodes so raw facts remain available in graph state.
      summary: payload.answer ?? results.slice(0, 3).map((item) => item.content).filter(Boolean).join(" "),
      marketContext: `Recent reporting and public context for ${companyName}.`,
    },
    sources: [...new Set(results.map((item) => item.url))],
  });
}
