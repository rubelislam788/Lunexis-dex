create table if not exists public.lunexis_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.lunexis_config enable row level security;

drop policy if exists "lunexis_config_service_role_all" on public.lunexis_config;
create policy "lunexis_config_service_role_all"
on public.lunexis_config
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
