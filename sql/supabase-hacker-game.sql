-- ============================================================
-- GitHack OS (jogo Hacker): correções e IP de sessão rotativo.
-- Execute este script no SQL Editor do Supabase.
-- Pressupõe que as tabelas network_nodes, node_permissions e
-- node_shields já existem (criadas anteriormente no painel).
-- ============================================================

-- ------------------------------------------------------------
-- 1) IP de sessão rotativo: adiciona uma coluna separada da
--    identidade (ip_address, PK), então carteira, pastas e
--    blindagem não precisam mudar de chave. A cada "ip connect"
--    o aluno recebe um endereço sorteado da faixa 192.168.1.100-
--    199 (fora da faixa de identidade .10-.26/.254), liberado de
--    volta ao pool no "ip disconnect".
-- ------------------------------------------------------------

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

-- ------------------------------------------------------------
-- 2) Criptografia temporária da carteira JDCoin: o aluno define
--    uma senha de 1 caractere (letra a-z/A-Z ou número 0-9, sem
--    símbolos) que protege /jdcoin e o "hack transfer" por 2min.
--    A senha nunca é exposta ao cliente: não existe policy de
--    select em node_wallet_locks, só as funções abaixo (security
--    definer) leem/comparam a senha.
-- ------------------------------------------------------------

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

-- ------------------------------------------------------------
-- 3) execute_hack_transfer: valida no servidor (não só no cliente)
--    que o alvo está online, sem antivírus ativo e com a carteira
--    descriptografada antes de mover saldo. Trava as duas linhas
--    sempre na mesma ordem (por ip_address) para evitar deadlock
--    quando dois hacks acontecem ao mesmo tempo em direções
--    opostas. Enquanto a senha da carteira não for quebrada (hack
--    crack), o roubo é bloqueado mesmo com o alvo online e sem
--    antivírus.
-- ------------------------------------------------------------

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

  select jdcoin_balance, is_online into v_target_balance, v_target_online
  from network_nodes where ip_address = target_ip;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Nó de destino não encontrado.');
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

  select jdcoin_balance into v_attacker_balance
  from network_nodes where ip_address = attacker_ip;

  if not found then
    return jsonb_build_object('success', false, 'message', 'Nó do atacante não encontrado.');
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
