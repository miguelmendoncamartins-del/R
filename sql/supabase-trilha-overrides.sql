-- ============================================================
-- Bloqueio manual de trilha inteira pelo professor (aba Gestão do
-- portal de cada turma). Não muda a regra interna da trilha — um
-- módulo que já dependia de outro (campo `requires`) continua
-- dependendo dele assim que a trilha for liberada de novo. O bloqueio
-- do professor só é uma trava A MAIS, por cima dessa regra.
--
-- Este script é seguro de rodar mais de uma vez (ex.: se já rodou o
-- sql/supabase-setup-completo.sql antes) — as policies são recriadas
-- via DROP/CHECK antes de criar de novo, em vez de falhar com "já existe".
--
-- Execute este script no SQL Editor do Supabase.
-- ============================================================

create table if not exists public.trilha_overrides (
  turma text not null,
  trilha_key text not null,
  locked boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (turma, trilha_key)
);

alter table public.trilha_overrides enable row level security;

drop policy if exists "trilha_overrides_select_all" on public.trilha_overrides;
create policy "trilha_overrides_select_all"
  on public.trilha_overrides for select
  using (true);

drop policy if exists "trilha_overrides_insert_all" on public.trilha_overrides;
create policy "trilha_overrides_insert_all"
  on public.trilha_overrides for insert
  with check (true);

drop policy if exists "trilha_overrides_update_all" on public.trilha_overrides;
create policy "trilha_overrides_update_all"
  on public.trilha_overrides for update
  using (true)
  with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trilha_overrides'
  ) then
    alter publication supabase_realtime add table public.trilha_overrides;
  end if;
end $$;
