-- ============================================================
-- Cadastra os nós de rede (jogo GitHack OS / Hacker) para os 26
-- alunos novos da turma Sistemas. Sem isso, tentar hackear esses
-- alunos falha com "Nó de destino não encontrado", porque
-- execute_hack_transfer() só enxerga IPs que existem aqui.
--
-- Execute DEPOIS de supabase-turma-isolation.sql (que cria a
-- coluna turma usada aqui embaixo).
--
-- ATENÇÃO: a tabela network_nodes não está em nenhum script deste
-- repositório — foi criada direto no painel do Supabase (ver nota
-- em supabase-hacker-game.sql). Os nomes de coluna abaixo foram
-- inferidos a partir do que games/jogo.html lê e grava
-- (ip_address, email, jdcoin_balance, is_online, current_ip,
-- turma, folders). Confira no painel se batem antes de rodar.
--
-- Execute este script no SQL Editor do Supabase.
-- ============================================================

insert into public.network_nodes (ip_address, email, jdcoin_balance, is_online, current_ip, turma, folders)
values
  ('192.168.2.1', 'alexandre.natal', 1183.50, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.2', 'amanda.silva32', 1367.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.3', 'ana.quevedo1', 1550.50, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.4', 'anne.karoline', 1734.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.6', 'bianca.bernardi', 2101.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.7', 'bruno.gomes1', 2211.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.8', 'douglas.silva16', 2394.50, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.9', 'emilly.oliveira75', 2578.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.10', 'enzo.lopes4', 2761.50, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.11', 'erasmo.prado', 2945.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.12', 'franciele.alencar', 3128.50, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.13', 'guilherme.almeida8', 3312.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.14', 'guilherme.lima119', 3422.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.15', 'gustavo.robson', 3605.50, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.16', 'hebert.eduardo', 3789.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.17', 'isabella.prado', 3972.50, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.18', 'joao.sousa73', 4156.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.19', 'jordanna.rocha', 1139.50, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.20', 'kaila.jesus', 1323.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.21', 'kauan.sousa60', 1433.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.23', 'lauan.souza', 1800.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.24', 'luana.victoria', 1983.50, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.25', 'moises.barros', 2167.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.26', 'nicole.santos21', 2350.50, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.27', 'vicente.ferreira', 2534.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.28', 'victor.teodoro', 2644.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb)
on conflict (ip_address) do nothing;
