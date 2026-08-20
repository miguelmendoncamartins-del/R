-- ============================================================
-- Migra o bloqueio de Ctrl+C/Ctrl+V de uma única linha global
-- ('global', em supabase-classroom-settings.sql) para uma linha
-- por turma — o controle passou a morar dentro do portal de cada
-- turma (aba "Gestão"), então cada uma liga/desliga independente.
--
-- A linha 'global' antiga fica no banco sem uso (nenhum código lê
-- mais ela); não precisa apagar.
--
-- Execute este script no SQL Editor do Supabase, DEPOIS de já ter
-- rodado supabase-classroom-settings.sql pelo menos uma vez (ele
-- cria a tabela).
-- ============================================================

insert into public.classroom_settings (id, clipboard_blocked)
values ('jogos', false), ('sistemas', false)
on conflict (id) do nothing;
