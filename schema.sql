-- ============================================================
-- Grove — alpha schema (GROVE-ALPHA-BUILD-GUIDE §4.1)
-- Run once in the reilly-home Supabase SQL Editor.
-- Leaves the existing per-app schemas (journal, pantry, ...) UNTOUCHED
-- so the old subdomains keep working during the port.
-- ============================================================

create schema if not exists grove;

create table if not exists grove.records (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null,        -- plaintext tenancy (alpha: one constant)
  app          text not null,        -- 'journal'|'pantry'|'ledger'|'pets'|'media'
  type         text not null,        -- 'symptom_event'|'transaction'|'recipe'|...
  occurred_at  timestamptz,          -- plaintext: ordering + range queries
  payload      jsonb not null,       -- alpha: plaintext JSON; beta: { iv, ct }
  enc          boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create index if not exists records_lookup
  on grove.records (household_id, app, type, occurred_at desc)
  where deleted_at is null;

-- grants (REQUIRED or the app sees nothing — build-spec §2)
grant usage on schema grove to anon, authenticated;
grant all on all tables in schema grove to authenticated;
grant all on all sequences in schema grove to authenticated;

-- RLS: authenticated AND a matching household tag. We are NOT using Cloudflare
-- Access — the app's own login plus this policy is the wall.
--
-- WHY NOT just `using (true)` for authenticated: Supabase projects allow public
-- sign-up by default, so "any authenticated user" would let a stranger
-- self-register with the public anon key and read everything. household_id lives
-- in app_metadata, which ONLY the admin API (service_role) can set — the seed
-- script sets it for Ren + Mav. A self-registered account has no such tag and is
-- blocked here at the database, regardless of project sign-up settings.
--
-- Beta generalizes this to the session's own household (multi-tenant). See §11.
alter table grove.records enable row level security;
drop policy if exists anon_all on grove.records;
drop policy if exists authed_all on grove.records;
create policy household_only on grove.records
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'household_id') = '00000000-0000-0000-0000-000000000001')
  with check ((auth.jwt() -> 'app_metadata' ->> 'household_id') = '00000000-0000-0000-0000-000000000001');

-- AFTER running this: Supabase -> Settings -> API -> Exposed schemas -> add `grove`
-- (forgetting this = "schema must be one of the following" errors).
