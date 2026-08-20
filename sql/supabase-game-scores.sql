-- ============================================================
-- Placar dos jogos (Digitação, Campo Minado, ...) por turma — cada
-- aluno guarda o MELHOR resultado dele em cada jogo, e o jogo mostra
-- um top 10 da própria turma (shared/game-leaderboard.js).
--
-- Diferente do ranking de progresso (student_module_progress), aqui
-- nomes e posições dos colegas aparecem de propósito — é um placar de
-- jogo, não dado acadêmico, e o objetivo é ser competitivo/divertido.
--
-- Execute este script no SQL Editor do Supabase.
-- ============================================================

create table if not exists public.game_scores (
  student_email text not null,
  student_name text not null,
  turma text not null,
  game text not null,
  score numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (student_email, game)
);

create index if not exists idx_game_scores_turma_game on public.game_scores (turma, game, score desc);

alter table public.game_scores enable row level security;

drop policy if exists "game_scores_select_all" on public.game_scores;
create policy "game_scores_select_all"
  on public.game_scores for select
  using (true);

drop policy if exists "game_scores_insert_all" on public.game_scores;
create policy "game_scores_insert_all"
  on public.game_scores for insert
  with check (true);

drop policy if exists "game_scores_update_all" on public.game_scores;
create policy "game_scores_update_all"
  on public.game_scores for update
  using (true)
  with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'game_scores'
  ) then
    alter publication supabase_realtime add table public.game_scores;
  end if;
end $$;
