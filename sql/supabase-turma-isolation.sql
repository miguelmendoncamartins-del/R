-- ============================================================
-- Isola o jogo Hacker (GitHack OS) por turma: um aluno só pode
-- ver e atacar nós da PRÓPRIA turma (Jogos ou Sistemas).
--
-- games/jogo.html já filtra por turma no netscan/git clone (client-
-- side). Este script reforça a mesma regra no banco, para que a
-- transferência de JDCoin não possa ser feita entre turmas mesmo
-- que alguém chame a função diretamente pelo console do navegador.
--
-- Execute este script no SQL Editor do Supabase, DEPOIS de já ter
-- rodado supabase-hacker-game.sql pelo menos uma vez (ele depende
-- das mesmas tabelas) e ANTES de supabase-sistemas-network-nodes.sql
-- (que já insere a coluna turma preenchida).
-- ============================================================

-- 1) Nova coluna. Todas as linhas que já existem em network_nodes
--    hoje são de alunos de Jogos (a turma Sistemas não existia até
--    agora), então o backfill abaixo é seguro.
alter table public.network_nodes add column if not exists turma text;
update public.network_nodes set turma = 'jogos' where turma is null;
alter table public.network_nodes alter column turma set default 'jogos';

-- 2) execute_hack_transfer passa a exigir que atacante e alvo sejam
--    da mesma turma, além das checagens que já existiam (online,
--    sem antivírus, carteira descriptografada).
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
