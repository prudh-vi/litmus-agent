# Litmus — Investment Research Agent

> **Invest or pass, with proof.** Litmus runs a multi-step AI agent on any company you type, produces a structured invest/pass verdict, and traces every step of its reasoning so the decision is always inspectable.

---

## Overview

Litmus is a full-stack Next.js application that wraps a LangGraph-powered research agent. You type a company name (anything from "L&T" to "Reliance" to "GOOG"), and the agent:

1. **Resolves** the input to a canonical company name and stock ticker (e.g. `L&T → Larsen & Toubro, NSE:LT`)
2. **Researches** the company by querying Tavily's news search API (last 90 days, up to 8 sources)
3. **Analyzes** the evidence into strengths, risks, and sentiment using a structured LLM call
4. **Decides** `INVEST` or `PASS` with reasoning, backed only by the collected evidence

Every step streams to the browser in real time via Server-Sent Events. The verdict, reasoning bullets, strengths, risks, and the TradingView stock chart all update live as the agent works.

---

## How to Run It

### Prerequisites

- [Bun](https://bun.sh) v1.3+
- A [Kimi (Azure OpenAI)](https://azure.microsoft.com/en-us/products/ai-services/openai-service) API key — used for all three LLM nodes (resolve, analyze, decide)
- A [Tavily](https://tavily.com) API key — used for the research/news search step
- A [Supabase](https://supabase.com) project — used to persist verdict history

### 1. Clone and install

```bash
git clone https://github.com/prudh-vi/litmus-agent.git
cd litmus-agent
bun install
```

### 2. Set environment variables

Copy the example file and fill in your keys:

```bash
cp .env.local.example .env.local
```

```env
# .env.local

# Kimi / Azure OpenAI — used for the LLM nodes
KIMI_API_KEY=your_kimi_api_key
KIMI_BASE_URL=https://oneplug-ai2-resource.services.ai.azure.com/openai/v1
KIMI_MODEL_NAME=Kimi-K2.5

# Tavily — web search / news retrieval
TAVILY_API_KEY=your_tavily_api_key

# Supabase — verdict history persistence
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. Set up the Supabase table

Run this in your Supabase SQL editor:

```sql
create table research_runs (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  decision text not null,
  confidence numeric,
  reasoning jsonb,
  sources jsonb,
  created_at timestamptz default now()
);
```

### 4. Start the dev server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000). Type a company name in the search bar at the bottom and hit **Run Research**.

---

## How It Works

### Architecture

```
Browser (Next.js App Router)
  └─ POST /api/research
        └─ ReadableStream (SSE)
              └─ LangGraph agent
                    ├─ resolve   → Kimi structured output → canonical name + ticker
                    ├─ research  → Tavily search API → news bundle (8 sources, 90 days)
                    ├─ analyze   → Kimi structured output → strengths / risks / sentiment
                    └─ decide    → Kimi structured output → INVEST | PASS + reasoning
              └─ Supabase insert (service-role key, bypasses RLS)
        └─ complete event → { run, analysis, decision }
```

### Graph (LangGraph)

The agent is a four-node `StateGraph`. Each node reads from and writes to a shared `AgentState`:

| Node | Input | Output |
|---|---|---|
| `resolve` | `companyName` | `resolvedName`, `ticker` |
| `conduct_research` | `resolvedName` | `research` (news bundle) |
| `analyze` | `research` | `analysis` (strengths, risks, sentiment) |
| `decide` | `research`, `analysis` | `decision` (verdict, reasoning, sources) |

Every transition emits a `progress` SSE event so the Thinking Log in the UI updates in real time.

### Streaming (SSE)

`POST /api/research` returns a `ReadableStream` with `Content-Type: text/event-stream`. Each event is either:
- `event: progress` — step lifecycle messages (started/done) with optional `resolvedName` and `ticker`
- `event: complete` — full agent result + the persisted Supabase row
- `event: error` — unrecoverable failure message

The browser reads the stream with `ReadableStreamDefaultReader` rather than `EventSource` because `EventSource` is GET-only.

### UI

- **Neo-brutalist design** — cream background, lime hero, thick `3px` black borders, `shadow-brutal` offset shadows
- **AgentProgressTracker** — step pill bar (Resolve → Research → Analyze → Decide) with pulse indicator and lime fills for done steps
- **ThinkingPanel** — monospaced live log with color-coded step badges; empty state uses a subtle dot-grid pattern
- **StockChart** — TradingView symbol overview widget, only mounts when a ticker is resolved
- **VerdictCard** — INVEST/PASS as the dominant hero element (4xl black block); company name, ticker badge, sentiment pills, strengths/risks sub-cards below
- **Verdict History** — collapsible table (toggled by a button in the right column), persisted to Supabase, resilient to DB failures (synthesizes a local run object so the count always updates)
- **Collapsible search bar** — floating pill at the bottom; ↓ collapses to a `Search ↑` pill to keep the screen clear

---

## Key Decisions & Trade-offs

### What I chose

**LangGraph over a raw prompt chain.**
A `StateGraph` makes every node's inputs and outputs explicit. It also gives us a clean place to hang the `onProgress` callback at each edge — the UI can show exactly which step is running without any ad-hoc logging.

**Kimi for all three LLM nodes.**
All three structured-output calls (resolve, analyze, decide) use the same model. This avoids managing multiple model clients and keeps latency predictable. Using `withStructuredOutput` with a Zod schema means the model's response is validated before it ever touches state or the database.

**Tavily with plain `fetch` instead of a LangChain tool.**
The research step has a fixed, deliberate query. Wrapping it as a LangChain tool would add abstraction without benefit and would hide the exact query, date window, and source count. A direct fetch keeps all of that transparent.

**SSE over WebSockets.**
The communication pattern is strictly one-directional: server pushes updates to the client during a run. SSE is simpler, works over standard HTTP/2, and requires no upgrade handshake. The trade-off is that a client can't send messages mid-run (which this agent doesn't need).

**Supabase with the service-role key on the server.**
Browser RLS policies are not involved in inserts. This means persistence doesn't depend on the user being logged in and can't be blocked by a misconfigured anon policy. The service-role key never leaves the server.

**`confidence` stored but not shown in the UI.**
The model's raw confidence number is unreliable across runs (temperature 0 helps, but it's still just a token probability proxy). Surfacing it prominently creates false precision. The verdict is INVEST or PASS — that binary is what the user came for.

### What I left out

- **Authentication** — the app is open; any visitor can run research and their runs are saved globally. Adding Supabase Auth + RLS per-user would be the first production step.
- **Caching** — the same company searched twice runs the full agent both times. A simple Supabase lookup by canonical name + 24h TTL would avoid redundant Tavily/LLM calls.
- **Streaming the analysis and decision tokens** — currently each LLM node returns when the structured call completes. True token streaming inside structured output is possible with LangChain's `streamEvents` but adds significant complexity.
- **Source validation** — Tavily URLs are taken at face value. A production system should de-duplicate, rank by recency, and score source credibility.
- **Error recovery** — if the agent fails mid-graph (e.g. the analyze node times out), the full run is lost. LangGraph supports checkpointing which could allow retrying from the last completed node.

---

## Example Runs

### Microsoft Corporation (`MSFT`)

> **INVEST** · `NASDAQ:MSFT`

**Reasoning:**
- Azure cloud revenue grew 33% YoY, sustaining double-digit top-line growth
- Copilot integration across Office and GitHub is expanding the enterprise AI moat
- Activision acquisition adds gaming revenue diversification
- Free cash flow margin above 30% with consistent dividend growth

**Strengths:** Cloud dominance, AI-first product roadmap, enterprise stickiness  
**Risks:** Regulatory scrutiny of AI practices, Activision integration costs, valuation premium

---

### Larsen & Toubro (`L&T`)

> **INVEST** · `NSE:LT`

**Reasoning:**
- Order book at record highs driven by government infrastructure spend
- Middle East project pipeline accelerating; international revenue now >25% of mix
- Technology segment (LTIMindtree) provides margin diversity beyond core EPC
- Strong balance sheet with net cash position despite capex cycle

**Strengths:** Order backlog visibility, domestic infra tailwinds, diversified segments  
**Risks:** Commodity price pass-through risk, execution risk on large projects, FX exposure

---

### Byju's

> **PASS** · `(unlisted)`

**Reasoning:**
- Multiple creditor disputes and delayed financial disclosures signal governance breakdown
- Core K-12 subscription revenue sharply declining post-pandemic normalization
- No clear path to profitability; NCLT insolvency proceedings underway
- Regulatory investigations into fund diversion from US rights issue

**Strengths:** Brand recognition in edtech remains high in Tier-2/3 cities  
**Risks:** Insolvency risk, leadership vacuum, loss of key talent, legal liabilities

---

## What I Would Improve With More Time

1. **Smarter source ranking** — weight sources by recency, domain authority, and relevance score before feeding them to the analyze node. Right now all 8 Tavily results are treated equally.

2. **Per-user run history with auth** — add Supabase Auth so each user sees only their own runs, with the ability to revisit and compare verdicts over time.

3. **Run diffing** — when the same company is researched twice, show a side-by-side diff of what changed in the reasoning (e.g. "Risks: +2 since last run").

4. **Retry from checkpoint** — use LangGraph's built-in checkpointing (`MemorySaver` or Supabase-backed) to resume a failed run from the last completed node instead of restarting from scratch.

5. **Streamed token output** — pipe `streamEvents` from each LLM node directly into the Thinking Log so users can read the model's reasoning as it types, not after the structured call resolves.

6. **Quantitative data layer** — augment Tavily news with a financial data API (e.g. Financial Modeling Prep, Alpha Vantage) to feed actual P/E, revenue growth, and debt ratios into the analysis node. Right now the model only has news text to reason from.

7. **Confidence calibration** — replace the raw model confidence score with a calibrated signal (e.g. source agreement rate, sentiment polarity variance) that actually means something across runs.

8. **Rate limiting and abuse prevention** — the API endpoint is completely open. Adding token-bucket rate limiting per IP and a CAPTCHA for the first run would be minimum viable for public deployment.
