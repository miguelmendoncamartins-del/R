-- ============================================================
-- Sincronização de progresso entre dispositivos (shared/progress-sync.js)
-- — permite o aluno continuar de onde parou numa atividade mesmo
-- trocando de computador, em vez de depender só do localStorage do
-- navegador. Uma linha por (aluno, atividade), com o estado exato que
-- também vai pro localStorage (não é resumo/progresso agregado — isso
-- já existe em student_module_progress; aqui é o estado bruto, pra
-- retomar a atividade do ponto exato onde parou).
--
-- Execute este script no SQL Editor do Supabase.
-- ============================================================

create table if not exists public.student_activity_state (
  student_email text not null,
  progress_key text not null,
  state jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (student_email, progress_key)
);

create index if not exists idx_student_activity_state_student on public.student_activity_state (student_email);

alter table public.student_activity_state enable row level security;

drop policy if exists "student_activity_state_select_all" on public.student_activity_state;
create policy "student_activity_state_select_all"
  on public.student_activity_state for select
  using (true);

drop policy if exists "student_activity_state_insert_all" on public.student_activity_state;
create policy "student_activity_state_insert_all"
  on public.student_activity_state for insert
  with check (true);

drop policy if exists "student_activity_state_update_all" on public.student_activity_state;
create policy "student_activity_state_update_all"
  on public.student_activity_state for update
  using (true)
  with check (true);
