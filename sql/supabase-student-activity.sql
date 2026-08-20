-- ============================================================
-- Tabela de atividade/presença dos alunos (painel do professor)
-- Execute este script no SQL Editor do Supabase.
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

-- ============================================================
-- Row Level Security
-- Este app não usa Supabase Auth (login é feito na própria aplicação),
-- então liberamos leitura/escrita públicas via a chave publishable,
-- no mesmo padrão já usado pelas tabelas network_nodes / node_permissions.
-- ============================================================

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

-- ============================================================
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
-- ============================================================

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

-- ============================================================
-- Realtime: permite o painel do professor assinar mudanças ao vivo
-- (mesmo padrão usado hoje para network_nodes / node_permissions / node_shields)
-- ============================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'student_activity'
  ) then
    alter publication supabase_realtime add table public.student_activity;
  end if;
end $$;
