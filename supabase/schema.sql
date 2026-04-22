-- =============================================================================
--  mis-balances — Supabase / PostgreSQL schema  (v2 — universal categories)
--
--  HOW TO APPLY (fresh install)
--  ─────────────────────────────
--  1. Open Supabase Dashboard → SQL Editor → New query
--  2. Paste and run this entire file
--
--  HOW TO MIGRATE from v1
--  ──────────────────────
--  Run the DROP lines first (CAREFUL: this deletes all transaction data):
--      DROP TABLE IF EXISTS public.transactions CASCADE;
--      DROP TABLE IF EXISTS public.categories   CASCADE;
--  Then run this file from the top.
-- =============================================================================


-- ─── 1. Categories ───────────────────────────────────────────────────────────
-- Categories are now type-agnostic: all 7 apply to both Ingresos and Egresos.
-- The direction (income / expense) is determined by the transaction, not
-- the category.  This maps to the user's real workflow where, for example,
-- BUFFET can be both a revenue line (sales at the counter) and a cost line
-- (stock replenishment).

create table if not exists public.categories (
  id    uuid  primary key default gen_random_uuid(),
  name  text  not null unique,
  color text  not null default '#6b7280'
);

-- Seed
insert into public.categories (name, color) values
  ('TURNOS',          '#6366f1'),
  ('CLASES',          '#8b5cf6'),
  ('ALQUILERES',      '#0ea5e9'),
  ('BUFFET',          '#f59e0b'),
  ('INSUMOS',         '#f97316'),
  ('INFRAESTRUCTURA', '#ef4444'),
  ('OTROS',           '#94a3b8')
on conflict (name) do update set color = excluded.color;

-- RLS: anyone authenticated (or anon for local demo) can read categories
alter table public.categories enable row level security;

create policy "categories_read"
  on public.categories
  for select
  to authenticated, anon
  using (true);


-- ─── 2. Transactions ─────────────────────────────────────────────────────────

create table if not exists public.transactions (
  id             uuid          primary key default gen_random_uuid(),
  date           date          not null,
  concept        text          not null,
  type           text          not null check (type in ('Ingreso', 'Egreso')),

  category_id    uuid          not null references public.categories(id),

  amount         numeric(12,2) not null check (amount > 0),
  payment_method text          not null default 'Efectivo',

  -- Denormalised display name ("NICO" | "CLAU") — avoids joining auth.users
  registered_by  text          not null check (registered_by in ('NICO', 'CLAU')),

  -- FK to Supabase Auth user (nullable — app works without auth in local mode)
  user_id        uuid          references auth.users(id) on delete set null,

  notes          text          not null default '',
  created_at     timestamptz   not null default now()
);

-- Indexes for common query patterns
create index if not exists transactions_date_idx
  on public.transactions (date desc);

create index if not exists transactions_user_id_idx
  on public.transactions (user_id);

-- RLS: authenticated users have full access to all transactions
alter table public.transactions enable row level security;

create policy "transactions_authenticated_all"
  on public.transactions
  for all
  to authenticated
  using (true)
  with check (true);


-- ─── 3. Auth user setup ───────────────────────────────────────────────────────
--
--  Dashboard → Authentication → Users → Add user
--
--  NICO:  email: nico@your-domain.com
--         user_metadata → { "username": "NICO" }
--
--  CLAU:  email: clau@your-domain.com
--         user_metadata → { "username": "CLAU" }
