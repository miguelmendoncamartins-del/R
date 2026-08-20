-- ============================================================
-- RESET DE INÍCIO DE TURMA — zera o progresso acadêmico e o estado
-- dos jogos de TODOS os alunos (das duas turmas), pra começar do zero
-- numa aula nova. Não mexe em login (shared/users-db.js não é banco),
-- chamada, notas nem nas configurações do professor (bloqueios de
-- trilha, liberação diária, Ctrl+C/V).
--
-- O QUE É ZERADO:
--   • student_module_progress — progresso de trilha/módulo (Aulas & Atividades)
--   • student_overrides       — liberação manual de jogos por aluno (volta a "bloqueado")
--   • game_scores             — placar de Digitação e Campo Minado
--   • network_nodes           — jogo GitHack OS: saldo de JDCoin, pastas,
--                                status online/IP de sessão (não apaga a
--                                linha — mantém e-mail/IP/turma de cada aluno)
--   • node_permissions        — pastas bloqueadas/gitignore (hack transfer)
--   • node_shields            — escudo (antivírus) ativo
--   • node_wallet_locks       — criptografia temporária de carteira
--
-- O QUE **NÃO** É TOCADO (de propósito):
--   • attendance (chamada) e grades (notas) — são registro oficial do
--     bimestre, não "progresso de jogo"
--   • classroom_settings, trilha_overrides, daily_module_releases —
--     são configuração do PROFESSOR, não dado do aluno
--   • student_activity — presença em tempo real, já expira sozinha
--     (fica "offline" depois de ~45s sem heartbeat)
--
-- ⚠️ ATENÇÃO — LEIA ANTES DE RODAR:
--   1) Isso é IRREVERSÍVEL. Não existe "desfazer" depois de rodar.
--   2) O progresso de trilha do aluno mora em DOIS lugares: aqui no
--      Supabase (só uma cópia sincronizada, usada pros relatórios) E no
--      localStorage do NAVEGADOR de cada aluno (é essa cópia local que
--      decide o que aparece "concluído" na tela dele). Rodar só este
--      SQL zera o Supabase, mas se o aluno abrir o portal no MESMO
--      navegador/computador de antes, o app vai reler o localStorage
--      antigo e "reenviar" o progresso velho pro Supabase de novo,
--      desfazendo o reset sem querer. Pra valer 100%, cada aluno
--      também precisa limpar os dados do site no navegador (ou usar um
--      Chrome/perfil limpo) na próxima aula — se os computadores forem
--      compartilhados/do laboratório, isso já costuma acontecer sozinho.
--   3) Execute no SQL Editor do Supabase, de uma vez só.
-- ============================================================

begin;

delete from public.student_module_progress;
delete from public.student_overrides;
delete from public.game_scores;
delete from public.node_permissions;
delete from public.node_shields;
delete from public.node_wallet_locks;

-- network_nodes: mantém a identidade de cada nó (ip_address, email, turma),
-- só reseta o estado de jogo. Saldo volta pra um valor fixo igual pra todo
-- mundo (os valores originais do seed eram só demonstração, não precisam
-- ser preservados) — nós do professor ("admin"/"admin.sistemas") voltam
-- pro saldo alto de sempre, pra continuar demonstrando o jogo em aula.
update public.network_nodes
set
  jdcoin_balance = case when email like 'admin%' then 9999.00 else 1000.00 end,
  is_online = false,
  current_ip = null,
  folders = '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb;

commit;

-- ============================================================
-- Fim. Confira no painel do Supabase (Table Editor) se
-- student_module_progress, student_overrides, game_scores,
-- node_permissions, node_shields e node_wallet_locks estão vazias, e
-- se network_nodes mostra saldo 1000.00 (9999.00 pro professor), sem
-- ninguém online e sem pastas nas contas.
-- ============================================================
