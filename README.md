# Litmus

Neo-brutalist frontend for an AI investment research agent, built with Next.js App Router, TypeScript, Tailwind CSS, and the Supabase JavaScript client.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Copy `.env.local.example` to `.env.local` and set all five keys. The browser uses the public Supabase key for history reads; the API route uses `SUPABASE_SERVICE_ROLE_KEY` exclusively for inserts. Run `supabase/migrations/001_research_runs.sql` in the Supabase SQL editor before starting the app.

`POST /api/research` accepts `{ "companyName": "..." }` and responds as a Server-Sent Event stream (`progress`, `complete`, or `error`). The dashboard consumes that stream to update the three-node tracker in real time.
