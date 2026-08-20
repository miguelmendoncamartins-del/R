-- Progresso completo de um aluno (todos os módulos, concluídos ou não).
-- Troque 'EMAIL_DO_ALUNO' pelo usuário de login dele (sem @, ex: 'breno.silva80').
select
  trilha_key,
  module_key,
  progress_current,
  progress_total,
  completed,
  completed_at,
  updated_at
from public.student_module_progress
where student_email = 'hebert.eduardo'
order by trilha_key, module_key;

-- Só os módulos que ele já concluiu.
select
  student_email,
  trilha_key,
  module_key,
  completed,
  completed_at,
  updated_at
from public.student_module_progress
where student_email = 'hebert.eduardo'
  and completed = true
order by updated_at desc;
