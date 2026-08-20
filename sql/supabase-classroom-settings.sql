-- ============================================================
-- Configurações globais de sala de aula, controladas pelo painel
-- do professor. Por enquanto só tem o bloqueio de copiar/colar
-- (Ctrl+C/Ctrl+V), mas a tabela foi feita pra caber outras
-- restrições futuras sem precisar de migração nova.
--
-- Linha única (id = 'global'): o botão do professor liga/desliga
-- pra TODOS os alunos das duas turmas de uma vez.
--
-- Execute este script no SQL Editor do Supabase.
-- ============================================================

create table if not exists public.classroom_settings (
  id text primary key,
  clipboard_blocked boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.classroom_settings (id, clipboard_blocked)
values ('global', false)
on conflict (id) do nothing;

alter table public.classroom_settings enable row level security;

drop policy if exists "classroom_settings_select_all" on public.classroom_settings;
create policy "classroom_settings_select_all"
  on public.classroom_settings for select
  using (true);

drop policy if exists "classroom_settings_insert_all" on public.classroom_settings;
create policy "classroom_settings_insert_all"
  on public.classroom_settings for insert
  with check (true);

drop policy if exists "classroom_settings_update_all" on public.classroom_settings;
create policy "classroom_settings_update_all"
  on public.classroom_settings for update
  using (true)
  with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'classroom_settings'
  ) then
    alter publication supabase_realtime add table public.classroom_settings;
  end if;
end $$;
