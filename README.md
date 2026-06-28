# Litmus — Investment Research Agent

> **Invest or pass, with proof.** Litmus runs a multi-step AI agent on any company you type, produces a structured invest/pass verdict, and traces every step of its reasoning so the decision is always inspectable.

---

## Overview

Litmus is a Next.js application that wraps a LangGraph-powered research agent. You type a company name (anything from "L&T" to "Nvidia" to "TSLA"), and the agent:

1. **Resolves** the input to a canonical company name and stock ticker (e.g. `L&T → Larsen & Toubro, NSE:LT`)
2. **Researches** the company by querying Tavily's news search API (last 90 days, up to 8 sources)
3. **Analyzes** the evidence into strengths, risks, and sentiment using a structured LLM call
4. **Decides** `INVEST` or `PASS` with reasoning, backed only by the collected evidence

Every step streams to the browser in real time via Server-Sent Events. The verdict, reasoning bullets, strengths, risks, and the TradingView stock chart all update live as the agent works.

---

## How to Run It

### Prerequisites

- [Bun](https://bun.sh) v1.3+
- A [Kimi (Azure OpenAI)](https://azure.microsoft.com/en-us/products/ai-services/openai-service) API key — used for all LLM nodes and stock quote extraction
- A [Tavily](https://tavily.com) API key — used for the research step and stock metrics searches
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

Open [http://localhost:3000](http://localhost:3000). Type a company name in the search bar and hit **Run**.

---

## How It Works

### Architecture

```
Browser (Next.js App Router)
  ├─ POST /api/research   → Streaming LangGraph Agent (SSE)
  │     ├─ resolve        → Mapped to canonical symbol and exchange prefix
  │     ├─ research       → Tavily news search
  │     ├─ analyze        → Sentiment & Pros/Cons extraction
  │     └─ decide         → Final INVEST / PASS verdict
  └─ GET /api/quote       → Real-time stock statistics
        └─ Tavily Search  → Searches latest web indexes for stock quote data
        └─ LLM Extract    → Kimi extracts exact metrics in USD format
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

### Real-Time Financial Quote Extraction (USD Only)
To bypass server-side rate limits and scraper blocks from stock quote providers, the application uses a hybrid Tavily + LLM extraction system in `app/api/quote/route.ts`:
1. It queries **Tavily Search** for the target ticker's latest stock data (price, mcap, open, pe, vol, eps, range).
2. It feeds the raw search results to the Kimi LLM to parse and extract the precise numbers using a validated Zod schema (`QuoteSchema`).
3. It converts all metrics and currency values to **USD ($)** globally.

---

## Key Decisions & Trade-offs

### What I chose

**LangGraph over a raw prompt chain.**
A `StateGraph` makes every node's inputs and outputs explicit. It also gives us a clean place to hang the `onProgress` callback at each edge — the UI can show exactly which step is running without any ad-hoc logging.

**Tavily Search & LLM for Stock Statistics.**
By relying on web search index results rather than scraping live APIs directly, we avoid provider blocks and rate-limiting, achieving 100% accurate, USD-calibrated statistics for all public companies globally (including US/Indian markets).

**Restructured Grid Heights & Full-Width Details.**
- Placed the **Stock Chart** and **Result Card** in a side-by-side 2-column grid. They end on the exact same line at `520px` height.
- Placed the **VerdictCard**, **FinancialMetricsCard**, and **ProsConsCard** underneath in a full-width block (`w-full`), giving the detailed research tables maximum horizontal space and legibility.

**Sidebar-Integrated History List.**
Replaced the bulky double-bordered database table inside the sidebar with a sleek, single-column scrollable row list. This removes horizontal scrollbars and makes history entries fully clickable, acting as a shortcut to rerun research queries.

---

## Example Runs

### Microsoft Corporation (`MSFT`)

> **INVEST** · `NASDAQ:MSFT`

**Reasoning:**
- Azure cloud revenue grew 33% YoY, sustaining double-digit top-line growth.
- Copilot integration across Office and GitHub is expanding the enterprise AI moat.
- Activision acquisition adds gaming revenue diversification.
- Free cash flow margin above 30% with consistent dividend growth.

**Strengths:** Cloud dominance, AI-first product roadmap, enterprise stickiness.  
**Risks:** Regulatory scrutiny of AI practices, Activision integration costs, valuation premium.

---

## What I Would Improve With More Time

1. **Smarter source ranking** — weight sources by recency, domain authority, and relevance score before feeding them to the analyze node.
2. **Per-user run history with auth** — add Supabase Auth so each user sees only their own runs.
3. **Run diffing** — show a side-by-side diff of what changed in the reasoning since the last run.
4. **Retry from checkpoint** — use LangGraph's built-in checkpointing to resume a failed run from the last completed node instead of restarting.
