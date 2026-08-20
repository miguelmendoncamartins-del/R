-- ============================================================
-- SETUP COMPLETO — consolida todos os scripts SQL recentes deste
-- projeto num arquivo só, na ordem certa de execução. Substitui a
-- necessidade de rodar, um por um, os arquivos:
--   1. supabase-classroom-settings.sql
--   2. supabase-classroom-settings-per-turma.sql
--   3. supabase-student-activity.sql
--   4. supabase-student-overrides.sql
--   5. supabase-hacker-game.sql
--   6. supabase-turma-isolation.sql
--   7. supabase-sistemas-network-nodes.sql
--   8. supabase-chamada-notas.sql
--   9. supabase-trilha-overrides.sql
--  10. supabase-game-scores.sql
-- (Esses arquivos continuam no repositório como histórico/referência
-- de cada mudança isolada — não precisa apagá-los.)
--
-- Cobre: bloqueio de Ctrl+C/V por turma, atividade em tempo real e
-- liberação manual de jogos (painel do professor), o jogo GitHack OS
-- (IP de sessão, criptografia de carteira, isolamento por turma no
-- hack transfer), o cadastro de rede da turma Sistemas, chamada /
-- notas / progresso de trilha (relatórios da aba Gestão), bloqueio
-- manual de trilha inteira pelo professor, e o placar competitivo dos
-- minigames (Digitação, Campo Minado) por turma.
--
-- PRÉ-REQUISITO: as tabelas network_nodes, node_permissions e
-- node_shields precisam já existir no seu projeto Supabase (foram
-- criadas direto no painel, não por script — ver o bloco 5 abaixo).
-- Sem elas, o bloco 5 (jogo GitHack OS) falha.
--
-- Este script é seguro de rodar mais de uma vez: toda tabela/coluna/
-- índice/função usa IF NOT EXISTS ou CREATE OR REPLACE, e as policies
-- e a inscrição no Realtime são recriadas via DROP/CHECK antes de
-- criar de novo, em vez de simplesmente falhar com "já existe".
--
-- Execute este script inteiro, de uma vez, no SQL Editor do Supabase.
-- ============================================================


-- ============================================================
-- BLOCO 1 — Configurações de sala de aula (bloqueio de Ctrl+C/V)
-- Uma linha por turma (id = 'jogos' | 'sistemas'); a linha 'global'
-- é mantida por compatibilidade, mas não é mais lida por nenhum
-- código (o controle passou a morar dentro do portal de cada turma).
-- ============================================================

create table if not exists public.classroom_settings (
  id text primary key,
  clipboard_blocked boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.classroom_settings (id, clipboard_blocked)
values ('global', false), ('jogos', false), ('sistemas', false)
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


-- ============================================================
-- BLOCO 2 — Atividade em tempo real dos alunos (painel do professor)
-- ============================================================

create table if not exists public.student_activity (
  id uuid primary key default gen_random_uuid(),

  -- identificação do aluno (mesma chave usada no login: USERS_JSON[].email)
  student_email text not null unique,
  student_name text,
  turma text,

  -- status calculado no cliente: 'active' | 'idle' | 'offline'
  status text not null default 'offline' check (status in ('active', 'idle', 'offline')),

  -- chave curta de localização (ex: 'js_basico', 'js_intermediario', 'csharp',
  -- 'jogos_hacker', 'jogos_digitacao', 'jogos_campo_minado', 'aulas', 'jogos', 'professor')
  location text not null default 'offline',

  -- texto amigável para exibir no painel (ex: "Duelo 3: Escudo Par/Ímpar")
  location_label text,

  -- dados extras estruturados (ex: {"challenge_id":3,"total":7,"progress":2})
  detail jsonb,

  -- último momento em que o aluno de fato interagiu (mouse/teclado/clique)
  last_interaction_at timestamptz not null default now(),

  -- último "heartbeat" enviado pelo cliente (usado para detectar quem ficou offline)
  updated_at timestamptz not null default now(),

  created_at timestamptz not null default now()
);

-- Acelera a checagem de "quem está com heartbeat desatualizado (offline)"
create index if not exists idx_student_activity_updated_at
  on public.student_activity (updated_at);

alter table public.student_activity enable row level security;

drop policy if exists "student_activity_select_all" on public.student_activity;
create policy "student_activity_select_all"
  on public.student_activity for select
  using (true);

drop policy if exists "student_activity_insert_all" on public.student_activity;
create policy "student_activity_insert_all"
  on public.student_activity for insert
  with check (true);

drop policy if exists "student_activity_update_all" on public.student_activity;
create policy "student_activity_update_all"
  on public.student_activity for update
  using (true)
  with check (true);

-- Tempo logado hoje: acumula segundos ativos no dia, pra mostrar no
-- Relatório de Atividade do Dia (aba Gestão) quanto tempo cada aluno
-- ficou com o portal aberto hoje. Não existe log de sessão (login/
-- logout) — só o heartbeat de 15 em 15s de shared/activity-tracker.js
-- — então o gatilho abaixo estima o tempo somando o intervalo entre um
-- heartbeat e o anterior, contando só intervalos de até 60s (~4x o
-- heartbeat): um intervalo maior que isso significa aba fechada/
-- computador dormindo nesse meio tempo, não tempo logado de verdade.
-- Zera sozinho quando o dia muda (activity_date). Usa now() do banco
-- pro cálculo do intervalo, não o relógio do cliente, pelo mesmo motivo
-- da correção do QuizRush (relógio de dispositivo não é confiável).
alter table public.student_activity add column if not exists active_seconds_today int not null default 0;
alter table public.student_activity add column if not exists activity_date date not null default current_date;

create or replace function public.track_daily_active_seconds()
returns trigger
language plpgsql
as $$
declare
  v_gap_seconds numeric;
begin
  if tg_op = 'INSERT' then
    new.activity_date := current_date;
    new.active_seconds_today := 0;
    return new;
  end if;

  if old.activity_date is distinct from current_date then
    new.activity_date := current_date;
    new.active_seconds_today := 0;
  else
    v_gap_seconds := extract(epoch from (now() - old.updated_at));
    if v_gap_seconds > 0 and v_gap_seconds <= 60 then
      new.active_seconds_today := coalesce(old.active_seconds_today, 0) + round(v_gap_seconds)::int;
    else
      new.active_seconds_today := coalesce(old.active_seconds_today, 0);
    end if;
    new.activity_date := current_date;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_student_activity_daily_seconds on public.student_activity;
create trigger trg_student_activity_daily_seconds
before insert or update on public.student_activity
for each row execute function public.track_daily_active_seconds();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'student_activity'
  ) then
    alter publication supabase_realtime add table public.student_activity;
  end if;
end $$;


-- ============================================================
-- BLOCO 3 — Liberação manual de jogos pelo professor
-- ============================================================

create table if not exists public.student_overrides (
  student_email text primary key,
  games_unlocked boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.student_overrides enable row level security;

drop policy if exists "student_overrides_select_all" on public.student_overrides;
create policy "student_overrides_select_all"
  on public.student_overrides for select
  using (true);

drop policy if exists "student_overrides_insert_all" on public.student_overrides;
create policy "student_overrides_insert_all"
  on public.student_overrides for insert
  with check (true);

drop policy if exists "student_overrides_update_all" on public.student_overrides;
create policy "student_overrides_update_all"
  on public.student_overrides for update
  using (true)
  with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'student_overrides'
  ) then
    alter publication supabase_realtime add table public.student_overrides;
  end if;
end $$;


-- ============================================================
-- BLOCO 4 — Jogo GitHack OS: IP de sessão rotativo e criptografia
-- temporária da carteira JDCoin.
--
-- Pressupõe que as tabelas network_nodes, node_permissions e
-- node_shields já existem (criadas direto no painel do Supabase).
-- ============================================================

-- IP de sessão rotativo: coluna separada da identidade (ip_address,
-- PK), então carteira, pastas e blindagem não precisam mudar de
-- chave. A cada "ip connect" o aluno recebe um endereço sorteado da
-- faixa 192.168.1.100-199 (fora da faixa de identidade .10-.26/.254),
-- liberado de volta ao pool no "ip disconnect".
alter table public.network_nodes add column if not exists current_ip text;

-- Garante que dois alunos online nunca fiquem com o mesmo endereço ao mesmo tempo.
create unique index if not exists network_nodes_current_ip_unique
  on public.network_nodes (current_ip)
  where current_ip is not null;

create or replace function public.assign_session_ip(p_ip_address text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_candidate text;
  v_attempt   int := 0;
begin
  loop
    v_attempt := v_attempt + 1;
    if v_attempt > 50 then
      raise exception 'Não há endereços de rede livres no momento.';
    end if;

    v_candidate := '192.168.1.' || (100 + floor(random() * 100)::int);

    begin
      update network_nodes
      set current_ip = v_candidate, is_online = true
      where ip_address = p_ip_address;

      if not found then
        raise exception 'Nó % não encontrado.', p_ip_address;
      end if;

      return v_candidate;
    exception when unique_violation then
      continue;
    end;
  end loop;
end;
$$;

create or replace function public.release_session_ip(p_ip_address text)
returns void
language sql
security definer
set search_path = public
as $$
  update network_nodes set current_ip = null, is_online = false where ip_address = p_ip_address;
$$;

grant execute on function public.assign_session_ip(text) to anon, authenticated;
grant execute on function public.release_session_ip(text) to anon, authenticated;

-- Criptografia temporária da carteira JDCoin: o aluno define uma
-- senha de 1 caractere (letra a-z/A-Z ou número 0-9, sem símbolos)
-- que protege /jdcoin e o "hack transfer" por 2min. A senha nunca é
-- exposta ao cliente: não existe policy de select em
-- node_wallet_locks, só as funções abaixo (security definer) leem/
-- comparam a senha.
create table if not exists public.node_wallet_locks (
  ip_address    text primary key,
  password_char text not null,
  expires_at    timestamptz not null
);

alter table public.node_wallet_locks enable row level security;

create or replace function public.set_wallet_password(p_ip_address text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_password is null or p_password !~ '^[A-Za-z0-9]$' then
    return jsonb_build_object('success', false, 'message', 'Senha inválida. Use exatamente 1 caractere: letra (a-z/A-Z) ou número (0-9), sem símbolos.');
  end if;

  if exists (
    select 1 from node_wallet_locks
    where ip_address = p_ip_address and expires_at > now()
  ) then
    return jsonb_build_object('success', false, 'message', 'A carteira já está criptografada.');
  end if;

  insert into node_wallet_locks (ip_address, password_char, expires_at)
  values (p_ip_address, p_password, now() + interval '2 minutes')
  on conflict (ip_address) do update
    set password_char = excluded.password_char,
        expires_at = excluded.expires_at;

  return jsonb_build_object('success', true, 'message', 'Carteira criptografada por 2 minutos.');
end;
$$;

create or replace function public.wallet_lock_status(p_ip_address text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expires timestamptz;
begin
  select expires_at into v_expires
  from node_wallet_locks
  where ip_address = p_ip_address and expires_at > now();

  if v_expires is null then
    return jsonb_build_object('locked', false);
  end if;

  return jsonb_build_object('locked', true, 'expires_at', v_expires);
end;
$$;

create or replace function public.attempt_wallet_bruteforce(p_ip_address text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_password text;
  v_expires  timestamptz;
  v_charset  text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  v_guesses  text[];
  v_cracked  boolean := false;
begin
  select password_char, expires_at into v_password, v_expires
  from node_wallet_locks
  where ip_address = p_ip_address
  for update;

  if v_password is null or v_expires <= now() then
    return jsonb_build_object('success', true, 'locked', false, 'cracked', false, 'message', 'A carteira do alvo não está criptografada no momento.');
  end if;

  select array_agg(c) into v_guesses
  from (
    select substr(v_charset, i, 1) as c
    from generate_series(1, length(v_charset)) i
    order by random()
    limit 10
  ) shuffled;

  v_cracked := v_password = any(v_guesses);

  if v_cracked then
    delete from node_wallet_locks where ip_address = p_ip_address;
  end if;

  return jsonb_build_object(
    'success', true,
    'locked', true,
    'cracked', v_cracked,
    'attempts', v_guesses,
    'message', case when v_cracked
      then 'Senha quebrada por força bruta! A criptografia da carteira caiu.'
      else 'Força bruta falhou: nenhuma das 10 tentativas bateu com a senha.'
    end
  );
end;
$$;

grant execute on function public.set_wallet_password(text, text) to anon, authenticated;
grant execute on function public.wallet_lock_status(text) to anon, authenticated;
grant execute on function public.attempt_wallet_bruteforce(text) to anon, authenticated;


-- ============================================================
-- BLOCO 5 — Isolamento por turma no jogo GitHack OS: um aluno só
-- pode ver e atacar nós da PRÓPRIA turma (Jogos ou Sistemas).
--
-- games/jogo.html já filtra por turma no netscan/git clone (client-
-- side); este bloco reforça a mesma regra no banco, para que a
-- transferência de JDCoin não possa ser feita entre turmas mesmo que
-- alguém chame a função diretamente pelo console do navegador.
--
-- execute_hack_transfer é definida aqui já na versão final (com a
-- checagem de turma) — não precisa criar a versão antiga primeiro.
-- ============================================================

-- Nova coluna. Toda linha que já existia em network_nodes antes da
-- turma Sistemas existir é de aluno de Jogos, então o backfill abaixo é seguro.
alter table public.network_nodes add column if not exists turma text;
update public.network_nodes set turma = 'jogos' where turma is null;
alter table public.network_nodes alter column turma set default 'jogos';

create or replace function public.execute_hack_transfer(attacker_ip text, target_ip text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_balance   numeric;
  v_attacker_balance numeric;
  v_target_online    boolean;
  v_target_shielded  boolean;
  v_target_turma     text;
  v_attacker_turma    text;
  v_stolen           numeric;
  v_first_ip         text;
  v_second_ip        text;
begin
  if attacker_ip = target_ip then
    return jsonb_build_object('success', false, 'message', 'Não é possível atacar o próprio nó.');
  end if;

  if attacker_ip < target_ip then
    v_first_ip := attacker_ip; v_second_ip := target_ip;
  else
    v_first_ip := target_ip; v_second_ip := attacker_ip;
  end if;

  perform 1 from network_nodes where ip_address = v_first_ip for update;
  perform 1 from network_nodes where ip_address = v_second_ip for update;

  select jdcoin_balance, is_online, turma into v_target_balance, v_target_online, v_target_turma
  from network_nodes where ip_address = target_ip;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Nó de destino não encontrado.');
  end if;

  select jdcoin_balance, turma into v_attacker_balance, v_attacker_turma
  from network_nodes where ip_address = attacker_ip;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Nó do atacante não encontrado.');
  end if;

  if v_attacker_turma is distinct from v_target_turma then
    return jsonb_build_object('success', false, 'message', 'Falha no ataque: nó fora da sua turma.');
  end if;

  if v_target_online is distinct from true then
    return jsonb_build_object('success', false, 'message', 'Host offline. IP inalcançável na rede.');
  end if;

  select exists (
    select 1 from node_shields
    where ip_address = target_ip
      and is_shielded = true
      and (expires_at is null or expires_at > now())
  ) into v_target_shielded;

  if v_target_shielded then
    return jsonb_build_object('success', false, 'message', 'Falha no ataque: O nó de destino ativou o Antivírus.');
  end if;

  if exists (
    select 1 from node_wallet_locks
    where ip_address = target_ip and expires_at > now()
  ) then
    return jsonb_build_object('success', false, 'message', 'Falha no ataque: A carteira do alvo está criptografada. Quebre a senha primeiro (hack crack).');
  end if;

  v_stolen := round(v_target_balance * 0.5, 2);

  update network_nodes set jdcoin_balance = jdcoin_balance - v_stolen where ip_address = target_ip;
  update network_nodes set jdcoin_balance = jdcoin_balance + v_stolen where ip_address = attacker_ip;

  return jsonb_build_object(
    'success', true,
    'message', 'Transferência concluída.',
    'target_balance', v_target_balance - v_stolen,
    'attacker_balance', v_attacker_balance + v_stolen,
    'stolen', v_stolen
  );
end;
$$;

grant execute on function public.execute_hack_transfer(text, text) to anon, authenticated;


-- ============================================================
-- BLOCO 6 — Cadastra os nós de rede (jogo GitHack OS) para os 26
-- alunos da turma Sistemas. Sem isso, tentar hackear esses alunos
-- falha com "Nó de destino não encontrado", porque
-- execute_hack_transfer() só enxerga IPs que existem aqui.
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


-- ============================================================
-- BLOCO 6b — Nó de rede do professor (usuário "admin"), um por turma.
-- ip_address é a chave e cada linha pertence a uma turma só, então o
-- professor precisa de um IP diferente em cada subnet pra aparecer no
-- netscan/git clone dos alunos daquela turma (ver professor/painel.html,
-- que já usa esses dois IPs pros links de "Jogos" e "Sistemas").
--
-- email também é único em network_nodes (constraint descoberta ao rodar
-- este script — a tabela não está em nenhum script deste repositório,
-- foi criada direto no painel do Supabase), por isso as duas linhas
-- usam e-mails diferentes mesmo sendo o mesmo professor. "on conflict
-- do nothing" sem coluna cobre tanto ip_address quanto email, pra não
-- quebrar se algum dos dois já existir de uma tentativa anterior.
-- ============================================================

insert into public.network_nodes (ip_address, email, jdcoin_balance, is_online, current_ip, turma, folders)
values
  ('192.168.1.254', 'admin', 9999.00, false, null, 'jogos', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb),
  ('192.168.2.254', 'admin.sistemas', 9999.00, false, null, 'sistemas', '{"fotos":[],"whatsapp":[],"instagram":[],"tiktok":[],"jdcoin":[]}'::jsonb)
on conflict do nothing;


-- ============================================================
-- BLOCO 7 — Chamada (frequência), notas por bimestre e progresso de
-- trilha (usado no relatório de notas para mostrar % de desempenho).
-- ============================================================

-- Chamada: uma linha por (turma, data, aluno). O painel do professor
-- faz upsert de uma linha por aluno ao "Finalizar".
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  turma text not null,
  data date not null,
  student_email text not null,
  student_name text,
  presente boolean not null default true,
  finalizada_em timestamptz,
  updated_at timestamptz not null default now(),
  unique (turma, data, student_email)
);

create index if not exists idx_attendance_turma_data on public.attendance (turma, data);
create index if not exists idx_attendance_student on public.attendance (student_email);

alter table public.attendance enable row level security;

drop policy if exists "attendance_select_all" on public.attendance;
create policy "attendance_select_all"
  on public.attendance for select
  using (true);

drop policy if exists "attendance_insert_all" on public.attendance;
create policy "attendance_insert_all"
  on public.attendance for insert
  with check (true);

drop policy if exists "attendance_update_all" on public.attendance;
create policy "attendance_update_all"
  on public.attendance for update
  using (true)
  with check (true);

-- Notas: uma linha por (aluno, bimestre), com 4 campos de nota. A
-- média é uma coluna gerada (calculada pelo próprio banco).
create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  student_email text not null,
  student_name text,
  turma text not null,
  bimestre smallint not null check (bimestre between 1 and 4),
  nota1 numeric,
  nota2 numeric,
  nota3 numeric,
  nota4 numeric,
  media numeric generated always as (
    round((coalesce(nota1, 0) + coalesce(nota2, 0) + coalesce(nota3, 0) + coalesce(nota4, 0)) / 4.0, 2)
  ) stored,
  updated_at timestamptz not null default now(),
  unique (student_email, bimestre)
);

create index if not exists idx_grades_turma_bimestre on public.grades (turma, bimestre);

alter table public.grades enable row level security;

drop policy if exists "grades_select_all" on public.grades;
create policy "grades_select_all"
  on public.grades for select
  using (true);

drop policy if exists "grades_insert_all" on public.grades;
create policy "grades_insert_all"
  on public.grades for insert
  with check (true);

drop policy if exists "grades_update_all" on public.grades;
create policy "grades_update_all"
  on public.grades for update
  using (true)
  with check (true);

-- Progresso de trilha, sincronizado pelo shared/platform-core.js (roda
-- no navegador do aluno) — permite o relatório de notas mostrar o
-- desempenho por trilha em %, algo que antes só existia espalhado
-- pelo localStorage de cada aluno.
create table if not exists public.student_module_progress (
  student_email text not null,
  student_name text,
  turma text not null,
  trilha_key text not null,
  module_key text not null,
  progress_current int not null default 0,
  progress_total int not null default 1,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (student_email, trilha_key, module_key)
);

create index if not exists idx_student_module_progress_turma on public.student_module_progress (turma);

alter table public.student_module_progress enable row level security;

drop policy if exists "student_module_progress_select_all" on public.student_module_progress;
create policy "student_module_progress_select_all"
  on public.student_module_progress for select
  using (true);

drop policy if exists "student_module_progress_insert_all" on public.student_module_progress;
create policy "student_module_progress_insert_all"
  on public.student_module_progress for insert
  with check (true);

drop policy if exists "student_module_progress_update_all" on public.student_module_progress;
create policy "student_module_progress_update_all"
  on public.student_module_progress for update
  using (true)
  with check (true);

-- completed_at: quando o módulo foi concluído de VERDADE — não confundir
-- com updated_at, que muda toda vez que o portal carrega
-- (syncAllModulesProgress ressincroniza TODOS os módulos a cada login,
-- mesmo com progresso zero). Sem essa coluna, "Relatório de Atividade do
-- Dia" (aba Gestão) não teria como saber SE e QUANDO um aluno concluiu
-- algo, só a última vez que o navegador dele sincronizou. O trigger só
-- grava/atualiza completed_at no instante em que completed vira true
-- (preserva o valor em resyncs seguintes do mesmo módulo já concluído,
-- e limpa se for resetado).
alter table public.student_module_progress add column if not exists completed_at timestamptz;

create or replace function public.set_module_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.completed and (tg_op = 'INSERT' or old.completed is distinct from true) then
    new.completed_at := now();
  elsif new.completed and old.completed = true then
    new.completed_at := old.completed_at;
  elsif not new.completed then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_student_module_progress_completed_at on public.student_module_progress;
create trigger trg_student_module_progress_completed_at
before insert or update on public.student_module_progress
for each row execute function public.set_module_completed_at();

-- Backfill único: módulos que já estavam completed=true ANTES desta
-- coluna/trigger existir ficariam com completed_at nulo pra sempre (o
-- trigger só carimba na TRANSIÇÃO false→true, e um módulo já concluído
-- preserva o valor antigo em cada resync). Sem isso, quem concluiu algo
-- antes de rodar este script nunca apareceria como "ativo" no Relatório
-- de Atividade do Dia. Usa updated_at como aproximação — não é o
-- instante exato da conclusão, mas é a melhor informação disponível.
-- Idempotente: só afeta linhas com completed_at ainda nulo.
--
-- Desliga o próprio gatilho durante o UPDATE: como completed não muda
-- (continua true), o ramo "preserva o valor antigo" do gatilho
-- sobrescreveria completed_at de volta pro valor antigo (nulo) na hora,
-- anulando este backfill por completo se o gatilho ficasse ativo.
alter table public.student_module_progress disable trigger trg_student_module_progress_completed_at;

update public.student_module_progress
set completed_at = updated_at
where completed = true and completed_at is null;

alter table public.student_module_progress enable trigger trg_student_module_progress_completed_at;


-- ============================================================
-- BLOCO 8 — Início/prazo por trilha, definidos pelo professor na aba
-- Gestão. Organiza o currículo por bimestre pro aluno: antes do início
-- a trilha nem aparece pra ele, depois do prazo sem concluir ela entra
-- em "Em atraso" — não muda a regra interna da trilha (um módulo que
-- já dependia de outro via `requires` continua dependendo dele).
--
-- Substitui o antigo bloqueio manual liga/desliga de trilha inteira
-- (trilha_overrides): o mesmo resultado (trilha inacessível pro aluno)
-- agora vem de deixar `inicio` no futuro, só que sem precisar lembrar
-- de liberar depois — a trilha aparece sozinha na data.
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

-- ============================================================
-- BLOCO 9 — Placar dos minigames (Digitação, Campo Minado) por turma.
-- Cada aluno guarda o MELHOR resultado dele em cada jogo; o jogo
-- mostra um top 10 da própria turma. Diferente do ranking de
-- progresso (student_module_progress, que só mostra a posição do
-- próprio aluno), aqui nomes e posições dos colegas aparecem de
-- propósito — é um placar de jogo, não dado acadêmico.
-- ============================================================

create table if not exists public.game_scores (
  student_email text not null,
  student_name text not null,
  turma text not null,
  game text not null,
  score numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (student_email, game, turma)
);

-- Corrige quem já rodou a versão antiga deste script (chave primária só
-- (student_email, game), sem turma): o professor usa o mesmo e-mail "admin"
-- pra entrar nas duas turmas, então jogar Digitação/Campo Minado numa turma
-- sobrescrevia o placar da OUTRA turma na mesma linha, ao invés de manter
-- uma linha por turma — sem isso, o placar de uma das turmas fica sempre
-- vazio ou "roubado" pela última partida jogada na outra. Idempotente: se
-- a chave primária já inclui turma, não faz nada.
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'game_scores' and constraint_name = 'game_scores_pkey'
  ) and not exists (
    select 1 from information_schema.key_column_usage
    where table_schema = 'public' and table_name = 'game_scores' and constraint_name = 'game_scores_pkey' and column_name = 'turma'
  ) then
    alter table public.game_scores drop constraint game_scores_pkey;
    alter table public.game_scores add constraint game_scores_pkey primary key (student_email, game, turma);
  end if;
end $$;

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

-- ============================================================
-- BLOCO 10 — Liberação diária/semanal de atividades (aba Gestão,
-- seção "Liberação Diária de Atividades" dentro de "Bloqueios e
-- Liberações"). O professor escolhe um módulo (atividade) que precisa
-- ser concluído numa data específica ou toda vez que cair num certo
-- dia da semana, pra turma inteira ou só um aluno.
--
-- checkGamesUnlock (shared/platform-core.js) troca a regra padrão de
-- desbloqueio ("completou tudo") por "completou o que foi liberado
-- pra HOJE" sempre que existe pelo menos uma linha valendo hoje pro
-- aluno — student_email = '' vale pra turma inteira, um e-mail vale
-- só pra aquele aluno. Como a checagem é sempre contra a data/dia da
-- semana atual, o cadeado volta sozinho no dia seguinte, sem nenhuma
-- ação nova do professor (a menos que a mesma atividade continue
-- valendo hoje também, aí seguiria liberada por já estar concluída).
-- ============================================================

create table if not exists public.daily_module_releases (
  id uuid primary key default gen_random_uuid(),
  turma text not null,
  scope text not null check (scope in ('data', 'semana')),

  -- scope='data': target_date preenchido (um dia específico), target_weekday nulo.
  -- scope='semana': target_weekday preenchido (0=domingo..6=sábado, igual
  -- JS Date.getDay()), target_date nulo — vale toda vez que cair nesse dia.
  target_date date,
  target_weekday smallint check (target_weekday between 0 and 6),

  -- '' = turma inteira; senão, e-mail do aluno específico (USERS_JSON[].email).
  student_email text not null default '',

  trilha_key text not null,
  module_key text not null,
  -- cache do rótulo pra exibir na tabela da aba Gestão sem cruzar com o TURMA_CONFIG de cada turma.
  trilha_label text,
  module_title text,

  created_at timestamptz not null default now()
);

create index if not exists idx_daily_module_releases_turma on public.daily_module_releases (turma);

alter table public.daily_module_releases enable row level security;

drop policy if exists "daily_module_releases_select_all" on public.daily_module_releases;
create policy "daily_module_releases_select_all"
  on public.daily_module_releases for select
  using (true);

drop policy if exists "daily_module_releases_insert_all" on public.daily_module_releases;
create policy "daily_module_releases_insert_all"
  on public.daily_module_releases for insert
  with check (true);

drop policy if exists "daily_module_releases_delete_all" on public.daily_module_releases;
create policy "daily_module_releases_delete_all"
  on public.daily_module_releases for delete
  using (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'daily_module_releases'
  ) then
    alter publication supabase_realtime add table public.daily_module_releases;
  end if;
end $$;


-- ============================================================
-- BLOCO 11 — QuizRush do portal (aba Jogos). O professor escolhe uma
-- trilha/módulo teórico (STEPS + quiz) e o motor de gabarito já
-- existente (shared/gabarito-generator.js) fornece as perguntas de
-- múltipla escolha prontas — sem precisar cadastrar pergunta nenhuma
-- de novo. O professor hospeda uma partida ao vivo pra turma, pergunta
-- por pergunta, com cronômetro; shared/quizrush-engine.js calcula o
-- placar (quem acerta mais rápido ganha mais pontos). Só existe UMA
-- sessão "corrente" por turma por vez — todo mundo lê a última linha
-- não encerrada.
-- ============================================================

create table if not exists public.quizrush_sessions (
  id uuid primary key default gen_random_uuid(),
  turma text not null,
  created_by text not null,
  trilha_label text,
  module_title text,
  questions jsonb not null,
  status text not null default 'lobby' check (status in ('lobby', 'question', 'reveal', 'podium', 'ended')),
  current_index int not null default 0,
  question_started_at timestamptz,
  question_duration_ms int not null default 25000,
  created_at timestamptz not null default now()
);

create index if not exists idx_quizrush_sessions_turma on public.quizrush_sessions (turma, created_at desc);

create table if not exists public.quizrush_players (
  session_id uuid not null references public.quizrush_sessions(id) on delete cascade,
  student_email text not null,
  student_name text not null,
  joined_at timestamptz not null default now(),
  primary key (session_id, student_email)
);

create table if not exists public.quizrush_answers (
  session_id uuid not null references public.quizrush_sessions(id) on delete cascade,
  student_email text not null,
  student_name text not null,
  question_index int not null,
  choice_index int not null,
  is_correct boolean not null,
  score int not null default 0,
  answered_at timestamptz not null default now(),
  primary key (session_id, student_email, question_index)
);

create index if not exists idx_quizrush_answers_session on public.quizrush_answers (session_id, question_index);

alter table public.quizrush_sessions enable row level security;
alter table public.quizrush_players enable row level security;
alter table public.quizrush_answers enable row level security;

drop policy if exists "quizrush_sessions_select_all" on public.quizrush_sessions;
create policy "quizrush_sessions_select_all" on public.quizrush_sessions for select using (true);
drop policy if exists "quizrush_sessions_insert_all" on public.quizrush_sessions;
create policy "quizrush_sessions_insert_all" on public.quizrush_sessions for insert with check (true);
drop policy if exists "quizrush_sessions_update_all" on public.quizrush_sessions;
create policy "quizrush_sessions_update_all" on public.quizrush_sessions for update using (true) with check (true);

drop policy if exists "quizrush_players_select_all" on public.quizrush_players;
create policy "quizrush_players_select_all" on public.quizrush_players for select using (true);
drop policy if exists "quizrush_players_insert_all" on public.quizrush_players;
create policy "quizrush_players_insert_all" on public.quizrush_players for insert with check (true);
drop policy if exists "quizrush_players_update_all" on public.quizrush_players;
create policy "quizrush_players_update_all" on public.quizrush_players for update using (true) with check (true);

drop policy if exists "quizrush_answers_select_all" on public.quizrush_answers;
create policy "quizrush_answers_select_all" on public.quizrush_answers for select using (true);
drop policy if exists "quizrush_answers_insert_all" on public.quizrush_answers;
create policy "quizrush_answers_insert_all" on public.quizrush_answers for insert with check (true);
drop policy if exists "quizrush_answers_update_all" on public.quizrush_answers;
create policy "quizrush_answers_update_all" on public.quizrush_answers for update using (true) with check (true);

-- question_started_at precisa vir do relógio do BANCO (now()), não do
-- computador de quem clica em "Iniciar"/"Próxima pergunta" — um relógio
-- local adiantado ou com data errada fazia o cronômetro já nascer
-- "expirado" pros alunos, mostrando "tempo esgotado" na hora. Ver
-- shared/quizrush-engine.js (startSession/nextQuestion chamam essas funções
-- em vez de gravar new Date().toISOString() direto).
create or replace function public.quizrush_start_session(p_session_id uuid)
returns timestamptz
language sql
security definer
set search_path = public
as $$
  update quizrush_sessions
  set status = 'question', current_index = 0, question_started_at = now()
  where id = p_session_id
  returning question_started_at;
$$;

create or replace function public.quizrush_next_question(p_session_id uuid, p_index int)
returns timestamptz
language sql
security definer
set search_path = public
as $$
  update quizrush_sessions
  set status = 'question', current_index = p_index, question_started_at = now()
  where id = p_session_id
  returning question_started_at;
$$;

grant execute on function public.quizrush_start_session(uuid) to anon, authenticated;
grant execute on function public.quizrush_next_question(uuid, int) to anon, authenticated;

-- question_started_at vem do relógio do banco, mas o cronômetro (em
-- games/quizrush.html) compara esse valor com o relógio LOCAL de cada
-- aluno/professor pra saber quanto tempo falta — um dispositivo com hora
-- adiantada/atrasada ainda mostrava "tempo esgotado" cedo ou tarde demais,
-- mesmo com question_started_at correto. Esta função deixa cada cliente
-- medir a diferença entre o próprio relógio e o do banco uma vez, ao
-- carregar a página (ver getServerTimeMs em shared/quizrush-engine.js).
create or replace function public.quizrush_server_now()
returns timestamptz
language sql
security definer
set search_path = public
as $$
  select now();
$$;

grant execute on function public.quizrush_server_now() to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'quizrush_sessions'
  ) then
    alter publication supabase_realtime add table public.quizrush_sessions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'quizrush_players'
  ) then
    alter publication supabase_realtime add table public.quizrush_players;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'quizrush_answers'
  ) then
    alter publication supabase_realtime add table public.quizrush_answers;
  end if;
end $$;

-- ============================================================
-- BLOCO 12 — Sincronização de progresso entre dispositivos
-- (shared/progress-sync.js). Uma linha por (aluno, atividade), com o
-- estado exato que também vai pro localStorage do navegador — permite
-- o aluno continuar de onde parou numa atividade mesmo trocando de
-- computador, em vez de depender só do localStorage.
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

-- ============================================================
-- Fim. Confira no painel do Supabase (Table Editor) se attendance,
-- grades, student_module_progress, classroom_settings,
-- student_activity, student_overrides, trilha_release_dates, game_scores,
-- daily_module_releases, quizrush_sessions/quizrush_players/quizrush_answers
-- e student_activity_state foram criadas, e se network_nodes ganhou as
-- colunas current_ip e turma.
-- ============================================================
