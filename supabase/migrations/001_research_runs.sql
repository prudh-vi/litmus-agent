-- Stores only the decision payload needed by the UI. Raw research remains in the
-- API response, keeping the initial table small and easy to query by date.
create table if not exists public.research_runs (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  decision text not null check (decision in ('invest', 'pass')),
  confidence numeric not null check (confidence >= 0 and confidence <= 100),
  reasoning jsonb not null,
  sources jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists research_runs_created_at_idx on public.research_runs (created_at desc);

alter table public.research_runs enable row level security;

-- The dashboard needs read-only history through the anonymous browser key; writes
-- happen only in the server route with SUPABASE_SERVICE_ROLE_KEY.
create policy "Public can read research runs"
  on public.research_runs for select using (true);
