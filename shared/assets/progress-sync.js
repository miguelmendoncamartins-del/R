// Sincroniza o progresso de UMA atividade (localStorage) com o Supabase,
// pra o aluno continuar de onde parou mesmo trocando de computador —
// sem precisar mexer na lógica de cada atividade. Depende só de
// window.ACTIVITY_LOCATION (já definido em toda página de atividade) e
// do mesmo padrão de chave usado por elas: `${ACTIVITY_LOCATION}_progress_${user}`.
//
// Como funciona:
// 1) Espelha toda escrita nessa chave específica do localStorage pro
//    Supabase (Storage.prototype.setItem interceptado — nenhuma outra
//    chave/página é afetada).
// 2) Ao carregar, busca o estado salvo no Supabase; se ele estiver MAIS
//    avançado que o localStorage local (ex: aluno trocou de máquina),
//    grava o estado remoto localmente e recarrega a página uma única vez
//    — a própria atividade já sabe ler esse localStorage e retomar do
//    ponto certo, do mesmo jeito que já faz ao reabrir no mesmo navegador.
//
// Best-effort: qualquer falha de rede/Supabase é silenciosa — o aluno
// nunca fica travado por causa da sincronização.
(function () {
  const SUPABASE_URL = window.SUPABASE_URL;
  const SUPABASE_KEY = window.SUPABASE_ANON_KEY;
  const ACTIVITY_LOCATION = window.ACTIVITY_LOCATION;

  if (typeof window.supabase === 'undefined' || !SUPABASE_URL || !SUPABASE_KEY || !ACTIVITY_LOCATION) {
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const role = urlParams.get('role') || 'aluno';
  // Professor/admin só está espiando a atividade (ex: gerar slides/gabarito
  // num iframe oculto) — não deve gravar nem puxar progresso de aluno nenhum.
  if (role === 'professor' || role === 'admin') {
    return;
  }

  const username = (urlParams.get('user') || '').trim();
  if (!username || username === 'anon') {
    return;
  }

  const PROGRESS_KEY = `${ACTIVITY_LOCATION}_progress_${username}`;
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  // Guarda a implementação original pra continuar gravando no localStorage
  // normalmente — este script só ACRESCENTA o espelhamento pro Supabase,
  // nunca substitui o comportamento local que a atividade já espera.
  const origSetItem = Storage.prototype.setItem;

  Storage.prototype.setItem = function (key, value) {
    origSetItem.apply(this, arguments);
    if (this !== window.localStorage || key !== PROGRESS_KEY) return;
    try {
      const state = JSON.parse(value);
      sb.from('student_activity_state').upsert(
        { student_email: username, progress_key: ACTIVITY_LOCATION, state, updated_at: new Date().toISOString() },
        { onConflict: 'student_email,progress_key' }
      ).then(() => {}, () => {});
      // Avisa a plataforma (plataforma.html, dona do <iframe> desta atividade)
      // na hora que o progresso muda — sem isso, o card/cadeado/ranking só
      // atualizavam quando o aluno clicava "← Voltar" (closeModule). Se ele
      // saísse de outro jeito (fechou a aba, deslogou, trocou de tela sem
      // voltar), a conclusão nunca chegava a subir pro student_module_progress.
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ pfProgressSync: true, activityLocation: ACTIVITY_LOCATION }, window.location.origin);
      }
    } catch (e) {
      // sync é best-effort; o progresso já está salvo localmente de qualquer forma
    }
  };

  // Compara o estado remoto com o local pra decidir se vale a pena puxar
  // o remoto. Cobre as duas formas de estado usadas pelas atividades:
  // objeto {lastStepIndex, correctCount, completed} (teoria) e array de
  // ids concluídos (prática).
  function isRemoteFurtherAlong(remote, localRaw) {
    if (remote == null) return false;
    let local = null;
    try { local = localRaw ? JSON.parse(localRaw) : null; } catch (e) {}

    if (Array.isArray(remote)) {
      const localLen = Array.isArray(local) ? local.length : 0;
      return remote.length > localLen;
    }
    if (typeof remote === 'object') {
      if (local == null) return true;
      if (!!remote.completed !== !!local.completed) return !!remote.completed;
      return (remote.lastStepIndex || 0) > (local.lastStepIndex || 0);
    }
    return false;
  }

  // Evita loop de reload: só recarrega uma vez por sessão de aba pra essa chave.
  const RELOAD_GUARD_KEY = `__progress_sync_reloaded_${PROGRESS_KEY}`;

  sb.from('student_activity_state')
    .select('state')
    .eq('student_email', username)
    .eq('progress_key', ACTIVITY_LOCATION)
    .maybeSingle()
    .then(({ data }) => {
      if (!data || data.state == null) return;
      if (sessionStorage.getItem(RELOAD_GUARD_KEY)) return;

      const localRaw = localStorage.getItem(PROGRESS_KEY);
      if (isRemoteFurtherAlong(data.state, localRaw)) {
        sessionStorage.setItem(RELOAD_GUARD_KEY, '1');
        origSetItem.call(window.localStorage, PROGRESS_KEY, JSON.stringify(data.state));
        window.location.reload();
      }
    })
    .catch(() => {});
})();
