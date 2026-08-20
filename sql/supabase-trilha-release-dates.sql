-- ============================================================
-- Início/prazo por trilha, definidos pelo professor na aba Gestão do
-- portal de cada turma. Organiza o currículo por bimestre pro aluno:
-- antes do início a trilha nem aparece pra ele, depois do prazo sem
-- concluir ela entra em "Em atraso" — não muda a regra interna da
-- trilha (um módulo que já dependia de outro via `requires` continua
-- dependendo dele).
--
-- Substitui sql/supabase-trilha-overrides.sql (bloqueio manual liga/
-- desliga de trilha inteira): o mesmo resultado — trilha inacessível
-- pro aluno — agora vem de deixar `inicio` no futuro, só que sem
-- precisar lembrar de liberar depois. Rodar este script DROPA a
-- tabela trilha_overrides antiga.
--
-- Execute este script no SQL Editor do Supabase.
-- ============================================================

drop table if exists public.trilha_overrides cascade;

create table if not exists public.trilha_release_dates (
  turma text not null,
  trilha_key text not null,
  inicio date,
  prazo date,
  updated_at timestamptz not null default now(),
  primary key (turma, trilha_key)
);

alter table public.trilha_release_dates enable row level security;

drop policy if exists "trilha_release_dates_select_all" on public.trilha_release_dates;
create policy "trilha_release_dates_select_all"
  on public.trilha_release_dates for select
  using (true);

drop policy if exists "trilha_release_dates_insert_all" on public.trilha_release_dates;
create policy "trilha_release_dates_insert_all"
  on public.trilha_release_dates for insert
  with check (true);

drop policy if exists "trilha_release_dates_update_all" on public.trilha_release_dates;
create policy "trilha_release_dates_update_all"
  on public.trilha_release_dates for update
  using (true)
  with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trilha_release_dates'
  ) then
    alter publication supabase_realtime add table public.trilha_release_dates;
  end if;
end $$;
