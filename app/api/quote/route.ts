import { NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuoteSchema = z.object({
  price: z.string().describe("Current stock price, e.g. '$126.15'"),
  prevClose: z.string().describe("Previous close price, e.g. '$125.40'"),
  open: z.string().describe("Opening price, e.g. '$125.80'"),
  mcap: z.string().describe("Market capitalization, e.g. '$3.24T' or '$346bn'"),
  pe: z.string().describe("P/E ratio, e.g. '31.00' or '—'"),
  dayRange: z.string().describe("Day range, e.g. '$124.50 - $127.20'"),
  divYield: z.string().describe("Dividend yield, e.g. '0.80%' or '—'"),
  range52: z.string().describe("52 week range, e.g. '$85.30 - $130.00'"),
  eps: z.string().describe("Earnings per share (EPS), e.g. '$4.20'"),
  vol: z.string().describe("Volume, e.g. '16.00m' or '12.5M'")
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker");

  if (!ticker) {
    return NextResponse.json({ error: "Missing ticker parameter" }, { status: 400 });
  }

  const tavilyKey = process.env.TAVILY_API_KEY;
  const kimiKey = process.env.KIMI_API_KEY;

  if (!tavilyKey || !kimiKey) {
    return NextResponse.json({ error: "API keys not configured" }, { status: 503 });
  }

  try {
    // 1. Search Tavily for the latest stock statistics
    const searchRes = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: tavilyKey,
        query: `${ticker} stock price quote open prev close market cap PE ratio volume EPS dividend yield 52w range latest`,
        search_depth: "basic",
        max_results: 3,
        include_answer: true,
      })
    });

    if (!searchRes.ok) {
      throw new Error(`Tavily search failed (${searchRes.status})`);
    }

    const payload = await searchRes.json();
    const context = JSON.stringify(payload);

    // 2. Use LLM to extract precise metrics
    const model = new ChatOpenAI({
      model: process.env.KIMI_MODEL_NAME || "Kimi-K2.5",
      apiKey: kimiKey,
      configuration: {
        baseURL: process.env.KIMI_BASE_URL || "https://oneplug-ai2-resource.services.ai.azure.com/openai/v1",
      },
      temperature: 0,
    });

    const extractor = model.withStructuredOutput(QuoteSchema, { name: "extract_quote" });
    const extractionResult = await extractor.invoke([
      [
        "system",
        `You are a financial data extractor. Extract the stock metrics for "${ticker}" from the provided search context. If a value is missing or unclear, output "—". Convert all currencies to USD ($) format. Ensure Market Cap is in USD (e.g. '$3.24T' or '$346bn').`,
      ],
      ["human", `Search results:\n${context}`],
    ]);

    const quote = QuoteSchema.parse(extractionResult);
    return NextResponse.json(quote);
  } catch (err) {
    console.error("[quote-extract-error]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to load stock data" }, { status: 500 });
  }
}
