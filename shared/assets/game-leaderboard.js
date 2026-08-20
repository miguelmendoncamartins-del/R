// Placar competitivo dos minigames (games/digitacao.html,
// games/campo-minado.html, ...), por turma. Guarda só o MELHOR
// resultado de cada aluno em cada jogo (game_scores) e desenha um
// painel de ranking reaproveitável — visual consistente entre jogos,
// sem duplicar CSS/HTML em cada um.
//
// Diferente do PortalCore.renderRankingBadge (progresso acadêmico, que
// só mostra a posição do PRÓPRIO aluno), aqui nomes e posições dos
// colegas aparecem de propósito: é um placar de jogo, o ponto É ser
// competitivo. Funciona só com Supabase configurado — sem isso, os
// jogos continuam jogáveis normalmente, só sem o placar da turma.
window.GameLeaderboard = (function () {
  function client() {
    if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return null;
    try { return window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY); }
    catch (e) { return null; }
  }

  const sb = client();

  // Só grava se for um recorde novo do aluno pra esse jogo (nunca piora o score salvo).
  // Best-effort de propósito (nunca deve travar o jogo por causa do placar),
  // mas os erros vão pro console — sem isso, uma tabela game_scores ausente
  // ou uma policy de RLS faltando falha 100% das vezes em silêncio, e o
  // placar parece só "vazio" pra sempre, sem pista nenhuma do motivo.
  async function submitScore({ game, turma, email, name, score }) {
    if (!sb || !email || !turma || !game) return;
    try {
      const { data, error: selectError } = await sb.from('game_scores').select('score')
        .eq('student_email', email).eq('game', game).eq('turma', turma).maybeSingle();
      if (selectError) { console.error('[GameLeaderboard] falha ao ler o placar atual:', selectError); return; }
      if (data && Number(data.score) >= score) return;
      const { error: upsertError } = await sb.from('game_scores').upsert({
        student_email: email, student_name: name || email, turma, game, score,
        updated_at: new Date().toISOString()
      }, { onConflict: 'student_email,game,turma' });
      if (upsertError) console.error('[GameLeaderboard] falha ao gravar o placar:', upsertError);
    } catch (e) {
      console.error('[GameLeaderboard] erro inesperado ao gravar o placar:', e);
    }
  }

  async function fetchTop({ game, turma, limit }) {
    if (!sb || !turma || !game) return { rows: [], error: null };
    try {
      const { data, error } = await sb.from('game_scores').select('*')
        .eq('game', game).eq('turma', turma)
        .order('score', { ascending: false }).limit(limit || 10);
      if (error) { console.error('[GameLeaderboard] falha ao carregar o placar:', error); return { rows: [], error }; }
      return { rows: data || [], error: null };
    } catch (e) {
      console.error('[GameLeaderboard] erro inesperado ao carregar o placar:', e);
      return { rows: [], error: e };
    }
  }

  // Chama onChange de novo sempre que QUALQUER score da turma/jogo mudar
  // — o placar se sente "vivo" enquanto os colegas jogam ao mesmo tempo.
  function watch({ game, turma, onChange }) {
    if (!sb || !turma || !game || typeof onChange !== 'function') return () => {};
    const channel = sb.channel(`realtime_game_scores_${turma}_${game}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_scores', filter: `turma=eq.${turma}` }, onChange)
      .subscribe();
    return () => { try { sb.removeChannel(channel); } catch (e) {} };
  }

  let stylesInjected = false;
  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    const style = document.createElement('style');
    style.textContent = `
      .gl-overlay{ position:fixed; inset:0; background:rgba(0,0,0,.75); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px; }
      .gl-box{ width:100%; max-width:420px; background:var(--panel); border:1px solid var(--green-dim); box-shadow:0 10px 34px rgba(0,0,0,.6); font-family:'JetBrains Mono', monospace; color:var(--ink); }
      .gl-head{ display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid var(--line); }
      .gl-head h3{ font-family:'VT323', monospace; font-size:21px; color:var(--green); margin:0; letter-spacing:1px; }
      .gl-close{ background:transparent; border:1px solid var(--line); color:var(--ink-dim); cursor:pointer; padding:4px 10px; font-size:13px; font-family:inherit; }
      .gl-close:hover{ color:var(--ink); border-color:var(--ink-dim); }
      .gl-list{ list-style:none; margin:0; padding:8px 0; max-height:360px; overflow-y:auto; }
      .gl-row{ display:flex; align-items:center; gap:10px; padding:7px 16px; font-size:12.5px; }
      .gl-row.me{ background:rgba(124,255,63,.1); box-shadow:inset 3px 0 0 var(--green); }
      .gl-rank{ width:24px; text-align:center; color:var(--ink-dim); font-weight:800; flex-shrink:0; }
      .gl-name{ flex:1; color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .gl-row.me .gl-name{ color:var(--green); font-weight:800; }
      .gl-score{ color:var(--yellow); font-weight:800; flex-shrink:0; }
      .gl-empty{ padding:22px 16px; text-align:center; color:var(--ink-dim); font-size:12px; }
      .gl-you{ padding:10px 16px; border-top:1px solid var(--line); font-size:11.5px; color:var(--ink-dim); }
    `;
    document.head.appendChild(style);
  }

  function medal(i) { return i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : String(i + 1); }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function showPanel({ game, turma, email, title, formatScore }) {
    injectStyles();
    document.getElementById('glOverlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'glOverlay';
    overlay.className = 'gl-overlay';
    overlay.innerHTML = `
      <div class="gl-box" role="dialog" aria-modal="true">
        <div class="gl-head"><h3>🏆 ${escapeHtml(title || 'Ranking da Turma')}</h3><button class="gl-close">✕ Fechar</button></div>
        <ul class="gl-list"><li class="gl-empty">Carregando...</li></ul>
        <div class="gl-you" style="display:none;"></div>
      </div>`;
    document.body.appendChild(overlay);

    let stopWatching = () => {};
    const close = () => { overlay.remove(); stopWatching(); };
    overlay.querySelector('.gl-close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    const fmt = formatScore || (s => s);

    async function render() {
      const { rows, error } = await fetchTop({ game, turma, limit: 10 });
      const listEl = overlay.querySelector('.gl-list');
      const youEl = overlay.querySelector('.gl-you');
      // Erro de verdade (tabela/policy ausente etc.) é bem diferente de
      // "ninguém jogou ainda" — sem essa distinção, os dois casos pareciam
      // idênticos na tela e o problema real (Supabase mal configurado)
      // ficava impossível de diagnosticar sem abrir o console.
      if (error) {
        listEl.innerHTML = '<li class="gl-empty">⚠️ Não foi possível carregar o ranking agora. Avise o professor: pode ser que a tabela game_scores ainda não exista no Supabase (ver sql/supabase-setup-completo.sql).</li>';
        youEl.style.display = 'none';
        return;
      }
      if (rows.length === 0) {
        listEl.innerHTML = '<li class="gl-empty">Ninguém pontuou ainda. Seja o primeiro da turma! 🚀</li>';
        youEl.style.display = 'none';
        return;
      }
      listEl.innerHTML = rows.map((r, i) => `
        <li class="gl-row ${r.student_email === email ? 'me' : ''}">
          <span class="gl-rank">${medal(i)}</span>
          <span class="gl-name">${escapeHtml(r.student_name || r.student_email)}</span>
          <span class="gl-score">${escapeHtml(fmt(r.score))}</span>
        </li>`).join('');

      const inTop = rows.some(r => r.student_email === email);
      if (!inTop && email) {
        youEl.style.display = 'block';
        youEl.textContent = 'Você ainda não está no top 10 — jogue de novo pra entrar!';
      } else {
        youEl.style.display = 'none';
      }
    }

    render();
    stopWatching = watch({ game, turma, onChange: render });
  }

  return { submitScore, fetchTop, watch, showPanel, enabled: !!sb };
})();
