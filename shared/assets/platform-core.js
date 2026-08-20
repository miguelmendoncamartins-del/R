// Motor genérico da plataforma de ensino — compartilhado por TODAS as turmas.
//
// Cada turmas/<turma>/plataforma.html só precisa:
//   1) definir o tema (cores) num <style>,
//   2) definir window.TURMA_CONFIG com o rótulo da turma e suas trilhas/módulos,
//   3) incluir, nessa ordem: shared/users-db.js, supabase-js, shared/supabase-config.js,
//      shared/platform-core.css, o TURMA_CONFIG e por fim este arquivo.
//
// Para criar uma tela/trilha nova numa turma, edite APENAS o TURMA_CONFIG
// daquela turma — este arquivo e as outras turmas não são tocados.
(function () {
  const cfg = window.TURMA_CONFIG;
  if (!cfg) {
    console.error('TURMA_CONFIG não definido — defina-o antes de carregar platform-core.js');
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const paramUser = urlParams.get('user') || '';
  const paramIp = urlParams.get('ip') || '';
  const paramSaldo = urlParams.get('saldo') || '';

  const DB = { users: {} };
  (window.USERS_DB || []).forEach(u => {
    DB.users[u.email] = { ...u, progress: 0 };
  });

  // ?user= vem direto da URL sem nenhuma sessão/token por trás — sem essa
  // checagem, qualquer valor (link forjado, bot varrendo URLs) virava um
  // "aluno" válido, aparecendo no painel de atividade do professor e
  // gravando dados no Supabase com uma identidade que não existe de verdade.
  if (!DB.users[paramUser]) {
    alert('Sessão inválida ou expirada. Faça login novamente.');
    window.location.href = '../../index.html';
    return;
  }

  const currentUser = DB.users[paramUser];

  const SUPABASE_URL = window.SUPABASE_URL;
  const SUPABASE_KEY = window.SUPABASE_ANON_KEY;
  const sbClient = (window.supabase && SUPABASE_URL && SUPABASE_KEY)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

  let teacherUnlockOverride = false;
  let trilhaDatesCache = {}; // trilhaKey -> {inicio, prazo} definidos pelo professor na Gestão (trilha_release_dates), ver trilhaStatus()
  let openMateriaKey = null; // matéria atualmente aberta na aba Aulas, pra saber o que re-renderizar quando trilhaDatesCache muda ao vivo
  let dailyReleasesCache = []; // linhas de daily_module_releases da turma inteira (todas as datas/dias), ver releasesForToday()
  let dailyReleasesLoadedOnce = false; // evita notificar sobre liberações que já existiam antes do carregamento inicial
  let a11y = { fontMode: 'pixel', fontScale: 1, libras: false };
  let currentGameKey = null;
  const openModuleFrame = {}; // trilhaKey -> bool (módulo aberto)

  // ---------- Alerta estilizado (substitui window.alert nativo, que sai feio
  // e fora do tema) ----------
  function showAlert(message) {
    document.getElementById('pfAlertOverlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'pfAlertOverlay';
    overlay.className = 'pf-alert-overlay';
    overlay.innerHTML = `
      <div class="pf-alert-box" role="alertdialog" aria-modal="true">
        <p class="pf-alert-msg"></p>
        <button class="btn pf-alert-ok">OK</button>
      </div>
    `;
    overlay.querySelector('.pf-alert-msg').textContent = message;
    document.body.appendChild(overlay);

    function close() {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) {
      if (e.key === 'Escape') close();
    }
    overlay.querySelector('.pf-alert-ok').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);
    overlay.querySelector('.pf-alert-ok').focus();
  }

  // ---------- Notificação leve (toast, não bloqueia a tela) — usada pra
  // avisar o aluno que o professor liberou uma atividade nova, sem
  // interromper o que ele estava fazendo (diferente do showAlert). ----------
  function showToast(title, message) {
    let stack = document.getElementById('pfToastStack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'pfToastStack';
      stack.className = 'pf-toast-stack';
      document.body.appendChild(stack);
    }
    const toast = document.createElement('div');
    toast.className = 'pf-toast';
    toast.setAttribute('role', 'status');
    toast.innerHTML = `
      <button class="pf-toast-close" aria-label="Fechar aviso">✕</button>
      <b class="pf-toast-title"></b>
      <span class="pf-toast-msg"></span>
    `;
    toast.querySelector('.pf-toast-title').textContent = title;
    toast.querySelector('.pf-toast-msg').textContent = message;
    stack.appendChild(toast);

    const remove = () => toast.remove();
    toast.querySelector('.pf-toast-close').addEventListener('click', remove);
    setTimeout(remove, 9000);
  }

  // ---------- Shell HTML ----------
  function renderShell() {
    const mount = document.getElementById('app');
    mount.innerHTML = `
      <div class="a11y-bar">
        <div>
          <button id="btnFontStyle" title="Alternar estilo da fonte" aria-label="Alternar estilo da fonte">🔤</button>
          <button id="btnFontSmaller" title="Diminuir fonte" aria-label="Diminuir fonte">A−</button>
          <button id="btnFontBigger" title="Aumentar fonte" aria-label="Aumentar fonte">A+</button>
          <button id="btnLibras" title="Ativar Libras (VLibras)" aria-label="Ativar Libras">🤟</button>
        </div>
        <div id="sessionControl">
          <button id="btnLogout" class="btn-danger" style="padding:4px 8px; font-size:10px;">Sair</button>
        </div>
      </div>

      <div class="app-container">
        <div class="statusbar">
          <div class="user-info">Usuário: <b id="txtUserNom">--</b> | Turma: <b id="txtUserTurma">--</b></div>
          <div class="ranking-badge" id="rankingBadge" style="display:none;"></div>
        </div>

        <div class="tabs" id="mainNavTabs">
          <button class="tab-btn active" data-tab="aulas">Aulas & Atividades</button>
          <button class="tab-btn disabled" id="tabBtnJogos" data-tab="jogos">Jogos 🔒</button>
          ${currentUser.role === 'aluno' ? '<button class="tab-btn" data-tab="perfil">Perfil 👤</button>' : ''}
          ${currentUser.role === 'professor' ? '<button class="tab-btn" data-tab="gestao">Gestão 🛠️</button>' : ''}
        </div>

        <div class="viewport-content">
          <div id="tabContentAulas" class="tab-page">
            <div id="materiaSelectorArea">
              <div class="card">
                <h2 style="margin:0 0 4px;">Matérias</h2>
                <p style="font-size:11px; color:var(--ink-dim); margin:0 0 16px;">Escolha uma matéria para ver as trilhas dela.</p>
                <div class="card-grid" id="materiaCardGrid"></div>
              </div>
            </div>

            <div id="materiaDetailArea" style="display:none;">
              <div class="card module-frame-header">
                <div>
                  <h2 id="materiaDetailTitle" style="margin:0; font-size:18px;">--</h2>
                </div>
                <button class="btn btn-secondary" onclick="PortalCore.closeMateria()">← Voltar</button>
              </div>
              <div class="subtabs" id="aulasSubTabs"><span class="subtab-label">Trilha:</span></div>
              <div id="aulasSubTabPages"></div>
            </div>
          </div>

          <div id="tabContentJogos" class="tab-page" style="display:none;">
            <div id="gameSelector" class="card" style="padding:16px;">
              <h2 style="margin:0 0 4px;">Escolha um Jogo</h2>
              <p style="font-size:11px; color:var(--ink-dim); margin:0 0 16px;">Selecione uma atividade para praticar.</p>
              <div class="card-grid" id="gameCardGrid"></div>
            </div>
            <div id="gameFrameArea" style="display:none; height:100%; flex-direction:column;">
              <div class="card module-frame-header" style="flex-shrink:0;">
                <div>
                  <h2 id="gameFrameTitle" style="margin:0; font-size:18px;">--</h2>
                  <p id="gameFrameDesc" style="font-size:11px; color:var(--ink-dim); margin:4px 0 0 0;"></p>
                </div>
                <button class="btn btn-secondary" onclick="PortalCore.closeGame()">← Voltar</button>
              </div>
              <div class="game-frame-wrapper" style="flex:1; min-height:0; border:1px solid var(--green-dim);">
                <iframe id="gameFrame" src="about:blank"></iframe>
              </div>
            </div>
          </div>

          <div id="tabContentPerfil" class="tab-page" style="display:none;">
            <div class="card">
              <h2 style="margin:0 0 4px;">Meu Progresso</h2>
              <p style="font-size:11px; color:var(--ink-dim); margin:0 0 16px;">Acompanhe sua jornada em ${cfg.label}.</p>
              <div class="perfil-stats-row" id="perfilResumo"></div>
            </div>

            <div class="card">
              <h2 style="margin:0 0 4px;">Progresso por Matéria</h2>
              <p style="font-size:11px; color:var(--ink-dim); margin:0 0 16px;">O quanto você já concluiu em cada matéria e trilha.</p>
              <div id="perfilMaterias"></div>
            </div>

            <div class="card">
              <h2 style="margin:0 0 4px;">Insígnias</h2>
              <p style="font-size:11px; color:var(--ink-dim); margin:0 0 16px;">
                Cada insígnia é desbloqueada automaticamente conforme seu progresso geral avança — continue concluindo atividades para liberar as próximas.
              </p>
              <div class="badge-grid" id="perfilBadgesGrid"></div>
            </div>
          </div>

          <div id="tabContentGestao" class="tab-page" style="display:none;">
            <div class="card collapsible-card">
              <div class="collapsible-head" onclick="PortalCore.toggleGestaoSection(this)">
                <h2>Bloqueios e Liberações</h2>
                <span class="collapsible-arrow">▶</span>
              </div>
              <div class="collapsible-body">
                <h3 class="gestao-subhead">Restrições</h3>
                <p style="font-size:11px; color:var(--ink-dim); margin:-4px 0 12px;">
                  É um desincentivo dentro do portal, não uma trava de verdade — um aluno pode contornar pelo DevTools do navegador.
                </p>
                <button class="btn" id="btnToggleClipboard">Bloquear Copiar/Colar</button>

                <h3 class="gestao-subhead">Liberação de Jogos</h3>
                <div style="display:flex; gap:10px; margin-bottom:12px;">
                  <button class="btn" id="btnUnlockGamesTurma">Liberar Todos</button>
                  <button class="btn btn-danger" id="btnLockGamesTurma">Bloquear Todos</button>
                </div>
                <table class="audit-table">
                  <thead><tr><th>Aluno</th><th>Acesso Jogos</th><th>Ações</th></tr></thead>
                  <tbody id="tblGestaoStudentsBody"></tbody>
                </table>

                <h3 class="gestao-subhead">Liberação Diária de Atividades</h3>
                <p style="font-size:11px; color:var(--ink-dim); margin:-4px 0 12px;">
                  Escolha uma atividade que o aluno precisa concluir num dia certo (ou toda vez que cair num dia da semana), pra turma inteira ou só um aluno. Enquanto ela não for concluída, os jogos ficam bloqueados mesmo com o resto em dia — e a trava volta sozinha no dia seguinte.
                </p>
                <div class="field-row" style="flex-wrap:wrap;">
                  <div>
                    <label class="field-label" for="dailyReleaseScope">Quando</label>
                    <select id="dailyReleaseScope">
                      <option value="data">Nesta data</option>
                      <option value="semana">Toda semana, neste dia</option>
                    </select>
                  </div>
                  <div id="dailyReleaseDataWrap">
                    <label class="field-label" for="dailyReleaseData">Data</label>
                    <input type="date" id="dailyReleaseData">
                  </div>
                  <div id="dailyReleaseWeekdayWrap" style="display:none;">
                    <label class="field-label" for="dailyReleaseWeekday">Dia da semana</label>
                    <select id="dailyReleaseWeekday">
                      <option value="1">Segunda-feira</option>
                      <option value="2">Terça-feira</option>
                      <option value="3">Quarta-feira</option>
                      <option value="4">Quinta-feira</option>
                      <option value="5">Sexta-feira</option>
                      <option value="6">Sábado</option>
                      <option value="0">Domingo</option>
                    </select>
                  </div>
                  <div>
                    <label class="field-label" for="dailyReleaseAlvo">Alvo</label>
                    <select id="dailyReleaseAlvo"><option value="">Turma inteira</option></select>
                  </div>
                  <div style="min-width:240px; flex:1;">
                    <label class="field-label" for="dailyReleaseAtividade">Atividade</label>
                    <select id="dailyReleaseAtividade"></select>
                  </div>
                </div>
                <div style="display:flex; align-items:center; gap:12px; margin:10px 0 16px;">
                  <button class="btn" id="btnAddDailyRelease">Liberar Atividade</button>
                  <span class="status-msg" id="dailyReleaseStatus"></span>
                </div>
                <table class="audit-table">
                  <thead><tr><th>Quando</th><th>Alvo</th><th>Atividade</th><th>Ações</th></tr></thead>
                  <tbody id="tblDailyReleasesBody"></tbody>
                </table>

                <h3 class="gestao-subhead">Trilhas — Início e Prazo</h3>
                <p style="font-size:11px; color:var(--ink-dim); margin:-4px 0 12px;">
                  Organiza o currículo por bimestre pro aluno: antes do início, a trilha nem aparece pra ele — depois do prazo sem concluir, ela entra em "Em atraso". Deixe em branco pra "sempre visível"/"sem prazo" (não muda a regra interna da trilha, como a prática exigir a teoria concluída).
                </p>
                <table class="audit-table">
                  <thead><tr><th>Matéria</th><th>Trilha</th><th>Início</th><th>Prazo</th><th>Status</th></tr></thead>
                  <tbody id="tblGestaoTrilhasBody"></tbody>
                </table>
                <div style="display:flex; align-items:center; gap:12px; margin:10px 0 4px;">
                  <button class="btn" id="btnSalvarTrilhaDatas">Salvar Datas</button>
                  <span class="status-msg" id="trilhaDatasStatus"></span>
                </div>
              </div>
            </div>

            <div class="card collapsible-card">
              <div class="collapsible-head" onclick="PortalCore.toggleGestaoSection(this)">
                <h2>Apresentações (Slides)</h2>
                <span class="collapsible-arrow">▶</span>
              </div>
              <div class="collapsible-body">
                <p style="font-size:11px; color:var(--ink-dim); margin:-4px 0 12px;">
                  Gera um .pptx pronto pra apresentar em aula, a partir de cada aula teórica — sem precisar abrir o módulo pra achar o botão.
                </p>
                <div id="gestaoSlidesList"></div>
              </div>
            </div>

            <div class="card collapsible-card">
              <div class="collapsible-head" onclick="PortalCore.toggleGestaoSection(this)">
                <h2>Gabarito</h2>
                <span class="collapsible-arrow">▶</span>
              </div>
              <div class="collapsible-body">
                <p style="font-size:11px; color:var(--ink-dim); margin:-4px 0 12px;">
                  Gera um .txt com o enunciado de cada pergunta/chamado e a resposta esperada — principalmente das atividades práticas, sem precisar abrir o módulo ou decorar as respostas.
                </p>
                <div id="gestaoGabaritoList"></div>
              </div>
            </div>

            <div class="card collapsible-card">
              <div class="collapsible-head" onclick="PortalCore.toggleGestaoSection(this)">
                <h2>Chamada e Notas</h2>
                <span class="collapsible-arrow">▶</span>
              </div>
              <div class="collapsible-body">
                <h3 class="gestao-subhead">Chamada</h3>
                <div class="field-row">
                  <div>
                    <label class="field-label" for="chamadaData">Data</label>
                    <input type="date" id="chamadaData">
                  </div>
                </div>
                <table class="audit-table">
                  <thead><tr><th>Aluno</th><th style="width:110px; text-align:center;">Faltou</th></tr></thead>
                  <tbody id="chamadaBody"></tbody>
                </table>
                <div style="display:flex; align-items:center; gap:12px; margin-top:14px;">
                  <button class="btn" id="btnFinalizarChamada">Finalizar</button>
                  <span class="status-msg" id="chamadaStatus"></span>
                </div>
                <div id="chamadaResumoBox" style="display:none; margin-top:14px;">
                  <label class="field-label" for="chamadaResumoTexto">Resumo (copiar e colar)</label>
                  <textarea id="chamadaResumoTexto" readonly rows="2" style="width:100%; resize:vertical; font-family:inherit; font-size:11px; background:var(--panel2); color:var(--ink); border:1px solid var(--line); padding:8px;"></textarea>
                  <div style="display:flex; align-items:center; gap:12px; margin-top:8px;">
                    <button class="btn btn-secondary" id="btnCopiarResumoChamada">Copiar</button>
                    <span class="status-msg" id="chamadaResumoStatus"></span>
                  </div>
                </div>

                <h3 class="gestao-subhead">Lançar Notas</h3>
                <p style="font-size:11px; color:var(--ink-dim); margin:-4px 0 12px;">4 notas por bimestre — a média é calculada sozinha.</p>
                <div class="field-row">
                  <div>
                    <label class="field-label" for="notasBimestre">Bimestre</label>
                    <select id="notasBimestre">
                      <option value="1">1º Bimestre</option>
                      <option value="2">2º Bimestre</option>
                      <option value="3">3º Bimestre</option>
                      <option value="4">4º Bimestre</option>
                    </select>
                  </div>
                </div>
                <div style="overflow-x:auto;">
                  <table class="audit-table">
                    <thead><tr><th>Aluno</th><th>Nota 1</th><th>Nota 2</th><th>Nota 3</th><th>Nota 4</th><th>Média</th></tr></thead>
                    <tbody id="notasBody"></tbody>
                  </table>
                </div>
                <div style="display:flex; align-items:center; gap:12px; margin-top:14px;">
                  <button class="btn" id="btnSalvarNotas">Salvar</button>
                  <span class="status-msg" id="notasStatus"></span>
                </div>
              </div>
            </div>

            <div class="card collapsible-card">
              <div class="collapsible-head" onclick="PortalCore.toggleGestaoSection(this)">
                <h2>Relatórios</h2>
                <span class="collapsible-arrow">▶</span>
              </div>
              <div class="collapsible-body">
                <h3 class="gestao-subhead">Relatório de Presença</h3>
                <table class="audit-table">
                  <thead><tr><th>Aluno</th><th>Dias com chamada</th><th>Faltas</th><th>% Presença</th></tr></thead>
                  <tbody id="presencaBody"></tbody>
                </table>

                <h3 class="gestao-subhead">Relatório de Notas</h3>
                <p style="font-size:11px; color:var(--ink-dim); margin:-4px 0 12px;">Só as médias — os 4 campos de nota ficam em "Chamada e Notas".</p>
                <div style="overflow-x:auto;">
                  <table class="audit-table">
                    <thead><tr id="relatorioNotasHead"></tr></thead>
                    <tbody id="relatorioNotasBody"></tbody>
                  </table>
                </div>

                <h3 class="gestao-subhead">Relatório de Inatividade</h3>
                <p style="font-size:11px; color:var(--ink-dim); margin:-4px 0 4px;" id="inatividadeResumo">Quem nunca acessou o portal ou acessou mas não avançou em nenhuma atividade — listados primeiro.</p>
                <table class="audit-table">
                  <thead><tr><th>Aluno</th><th>Status</th><th>Última vez visto no portal</th></tr></thead>
                  <tbody id="inatividadeBody"></tbody>
                </table>

                <h3 class="gestao-subhead">Relatório de Atividade do Dia</h3>
                <p style="font-size:11px; color:var(--ink-dim); margin:-4px 0 8px;">Alunos presentes hoje que ainda não concluíram nenhuma atividade hoje. Não considera quem já foi marcado como falta na chamada de hoje.</p>
                <button class="btn btn-secondary" id="btnGerarAtividadeDia" style="margin-bottom:10px;">📋 Gerar Relatório do Dia</button>
                <div id="atividadeDiaResultado"></div>
              </div>
            </div>

            <div class="card collapsible-card">
              <div class="collapsible-head" onclick="PortalCore.toggleGestaoSection(this)">
                <h2>Atividade em Tempo Real</h2>
                <span class="collapsible-arrow">▶</span>
              </div>
              <div class="collapsible-body">
                <p style="font-size:11px; color:var(--ink-dim); margin:-4px 0 4px;">Onde cada aluno desta turma está agora — atualiza sozinho.</p>
                <table class="audit-table">
                  <thead><tr><th>Aluno</th><th>Onde está</th><th>Status</th><th>Última atualização</th></tr></thead>
                  <tbody id="tblGestaoActivityBody"></tbody>
                </table>
              </div>
            </div>

            <div class="card collapsible-card">
              <div class="collapsible-head" onclick="PortalCore.toggleGestaoSection(this)">
                <h2>Auditoria</h2>
                <span class="collapsible-arrow">▶</span>
              </div>
              <div class="collapsible-body">
                <p style="font-size:11px; color:var(--ink-dim); margin:-4px 0 4px;">Registros gerados neste navegador (login, troca de aba, módulos abertos).</p>
                <div class="log-box" id="gestaoAuditLogBox"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div vw class="enabled" style="display:none;">
        <div vw-access-button class="active"></div>
        <div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div>
      </div>
    `;
  }

  // Lista achatada de todas as trilhas da turma, não importa em qual matéria
  // estejam — usada por tudo que não é a navegação em si (progresso, gate
  // de jogos, abrir/fechar módulo, relatório de notas, geração de slides).
  // Trilha keys são únicas na turma inteira, então isso equivale ao antigo
  // cfg.trilhas de antes de existir o nível de matéria.
  function allTrilhas() {
    return (cfg.materias || []).flatMap(m => m.trilhas || []);
  }

  function renderMaterias() {
    const grid = document.getElementById('materiaCardGrid');
    const materias = cfg.materias || [];
    if (materias.length === 0) {
      grid.innerHTML = `<div class="empty-state">Nenhuma matéria cadastrada ainda para esta turma.</div>`;
      return;
    }
    grid.innerHTML = materias.map(m => {
      // "Em breve" também cobre matéria cujas trilhas existem mas ainda não
      // chegaram na data de início — mesmo selo, mesma ideia (nada pra
      // fazer aqui ainda), sem precisar de um rótulo novo.
      const vazia = visibleTrilhas(m.trilhas || []).length === 0;
      return `
        <div class="game-card" onclick="PortalCore.openMateria('${m.key}')">
          <div class="icon">📚</div>
          <h3>${m.label}</h3>
          ${vazia ? '<div class="card-status">Em breve</div>' : ''}
        </div>`;
    }).join('');
  }

  function openMateria(key) {
    const materia = (cfg.materias || []).find(m => m.key === key);
    if (!materia) return;
    document.getElementById('materiaSelectorArea').style.display = 'none';
    document.getElementById('materiaDetailArea').style.display = 'block';
    document.getElementById('materiaDetailTitle').textContent = materia.label;
    openMateriaKey = key;
    const trilhas = renderTrilhasFor(materia);
    if (trilhas.length > 0) switchAulasSubTab(trilhas[0].key);
    logAction(`Abriu a matéria: ${materia.label}`);
  }

  function closeMateria() {
    document.getElementById('materiaDetailArea').style.display = 'none';
    document.getElementById('materiaSelectorArea').style.display = 'block';
    openMateriaKey = null;
    if (typeof window.resumeActivityHeartbeat === 'function') {
      window.resumeActivityHeartbeat('aulas_materias', 'Aulas & Atividades — Escolhendo matéria');
    }
  }

  function renderTrilhasFor(materia) {
    const tabsEl = document.getElementById('aulasSubTabs');
    const pagesEl = document.getElementById('aulasSubTabPages');
    const todasTrilhas = materia.trilhas || [];
    pagesEl.innerHTML = '';
    tabsEl.querySelectorAll('select').forEach(s => s.remove());

    // Trilha futura (inicio ainda não chegou) nem entra aqui pro aluno — é
    // isso que evita a tela lotar conforme o currículo de vários bimestres
    // vai sendo cadastrado adiantado (ver trilhaStatus/visibleTrilhas).
    const trilhas = visibleTrilhasOrdered(materia);

    if (trilhas.length === 0) {
      tabsEl.style.display = 'none';
      const msg = todasTrilhas.length === 0
        ? 'Nenhuma trilha cadastrada ainda nesta matéria.'
        : 'Nenhuma trilha disponível nesta matéria no momento — volte mais perto da data de início.';
      pagesEl.innerHTML = `<div class="empty-state">${msg}</div>`;
      return trilhas;
    }

    // Só faz sentido pedir pra escolher quando há mais de uma trilha. Com 2+,
    // um <select> é mais conciso que uma fileira de botões (1 linha, tátil
    // no celular) — sem precisar de sidebar/hambúrguer pra 2-4 itens. Pro
    // aluno, os <optgroup> (Em atraso / Em aberto / Concluídas) organizam a
    // lista sem precisar de nenhuma tela nova.
    if (trilhas.length > 1) {
      tabsEl.style.display = '';
      const select = document.createElement('select');
      select.id = 'trilhaSelect';
      select.innerHTML = buildTrilhaOptionsHtml(trilhas);
      select.addEventListener('change', () => switchAulasSubTab(select.value));
      tabsEl.appendChild(select);
    } else {
      tabsEl.style.display = 'none';
    }

    trilhas.forEach((trilha, idx) => {
      const page = document.createElement('div');
      page.className = 'subtab-page';
      page.id = `subTabContent_${trilha.key}`;
      page.style.display = idx === 0 ? 'block' : 'none';

      // Selo só quando diz algo além do óbvio: "aberta" é o estado neutro
      // de sempre, não precisa gritar; atraso/concluída sim, valem destaque
      // mesmo com o <select> já agrupando por status.
      const status = currentUser.role === 'aluno' ? trilhaStatus(trilha) : 'aberta';
      const statusBadge = status === 'atraso' ? '<span style="color:var(--blood-bright); font-weight:800;"> · ⚠️ Em atraso</span>'
        : status === 'concluida' ? '<span style="color:var(--green);"> · ✅ Concluída</span>'
        : '';

      page.innerHTML = `
        <div id="moduleSelector_${trilha.key}" class="card" style="padding:16px;">
          <h2 style="margin:0 0 4px;">Trilha ${trilha.label}${statusBadge}</h2>
          ${trilha.capacidade ? `<p style="font-size:11px; color:var(--yellow); margin:0 0 4px;"><b>Capacidade:</b> ${trilha.capacidade}</p>` : ''}
          <p style="font-size:11px; color:var(--ink-dim); margin:0 0 16px;">${trilha.desc || 'Escolha um módulo para começar.'}</p>
          <div class="card-grid">${buildModuleCardsHtml(trilha)}</div>
        </div>
        <div id="moduleFrameArea_${trilha.key}" style="display:none;">
          <div id="moduleFrameHeader_${trilha.key}" class="card module-frame-header">
            <div id="moduleFrameInfo_${trilha.key}">
              <h2 id="moduleFrameTitle_${trilha.key}" style="margin:0; font-size:18px;">--</h2>
              <p id="moduleFrameDesc_${trilha.key}" style="font-size:11px; color:var(--ink-dim); margin:4px 0 0 0;"></p>
            </div>
            <button class="btn btn-secondary" onclick="PortalCore.closeModule('${trilha.key}')">← Voltar</button>
          </div>
          <div id="moduleFrameWrapper_${trilha.key}" class="game-frame-wrapper" style="height:min(560px, 70vh); border:1px solid var(--green-dim);">
            <iframe id="moduleFrame_${trilha.key}" src="about:blank"></iframe>
          </div>
        </div>
      `;
      pagesEl.appendChild(page);
    });

    return trilhas;
  }

  function switchAulasSubTab(key) {
    const select = document.getElementById('trilhaSelect');
    if (select && select.value !== key) select.value = key;
    document.querySelectorAll('#aulasSubTabPages .subtab-page').forEach(p => {
      p.style.display = (p.id === `subTabContent_${key}`) ? 'block' : 'none';
    });

    const trilha = allTrilhas().find(t => t.key === key);
    if (trilha && !openModuleFrame[key] && typeof window.reportActivity === 'function') {
      window.reportActivity(`aulas_${key}`, `${trilha.label} — Escolhendo módulo`);
    }
  }

  // ---------- Progresso / desbloqueio de jogos ----------
  function findModule(trilhaKey, modKey) {
    const trilha = allTrilhas().find(t => t.key === trilhaKey);
    return trilha ? (trilha.modules || []).find(m => m.key === modKey) : null;
  }

  // { current, total, completed } — mesma leitura de localStorage usada tanto
  // pro cadeado/card de conclusão quanto pra sincronizar com o Supabase.
  function getModuleProgress(mod) {
    try {
      if (mod.progressMode === 'flag') {
        const data = JSON.parse(localStorage.getItem(`${mod.progressKey}${paramUser}`) || 'null');
        const completed = !!(data && data.completed);
        return { current: completed ? 1 : 0, total: 1, completed };
      }
      const data = JSON.parse(localStorage.getItem(`${mod.progressKey}${paramUser}`) || '[]');
      const current = Array.isArray(data) ? data.length : 0;
      const total = mod.progressTotal || 1;
      return { current, total, completed: current >= total };
    } catch (e) {
      return { current: 0, total: mod.progressTotal || 1, completed: false };
    }
  }

  function isModuleComplete(mod) {
    return getModuleProgress(mod).completed;
  }

  // Datas de início/prazo de uma trilha: o que o professor definiu na
  // Gestão (trilha_release_dates, trilhaDatesCache) manda, com o que estiver
  // hardcoded na própria trilha (turmas/<turma>/config.js) como fallback —
  // dá pra já nascer com uma data padrão no código e ainda assim deixar o
  // professor mudar depois sem precisar de deploy novo.
  function trilhaDates(trilha) {
    const override = trilhaDatesCache[trilha.key] || {};
    return {
      inicio: override.inicio || trilha.inicio || null,
      prazo: override.prazo || trilha.prazo || null,
    };
  }

  // Classifica uma trilha pra organizar a tela do aluno conforme o currículo
  // cresce (bimestre a bimestre) sem precisar de um "bimestre ativo"
  // configurado à parte — só usa inicio/prazo (ver trilhaDates) contra o
  // dia de hoje:
  //  'futura'    -> inicio ainda não chegou (nem aparece pro aluno)
  //  'concluida' -> todos os módulos já foram concluídos (some pro grupo recolhido)
  //  'atraso'    -> passou do prazo e ainda não concluiu
  //  'aberta'    -> o normal (sem inicio/prazo definidos, ou prazo ainda não passou)
  // Trilha sem inicio/prazo sempre cai em 'aberta' (ou 'concluida' se já
  // terminada) — mesmo comportamento de antes dessas datas existirem.
  function trilhaStatus(trilha) {
    const hoje = todayStr();
    const { inicio, prazo } = trilhaDates(trilha);
    if (inicio && inicio > hoje) return 'futura';
    const modules = trilha.modules || [];
    if (modules.length > 0 && modules.every(isModuleComplete)) return 'concluida';
    if (prazo && prazo < hoje) return 'atraso';
    return 'aberta';
  }

  // Esconde trilha 'futura' só pro aluno — o professor sempre vê tudo, pra
  // poder revisar/gerenciar conteúdo já cadastrado antes da data de início
  // (mesma lógica de bypass que já vale pra cadeado de pré-requisito). Uma
  // liberação diária (ver releasesForToday) pra QUALQUER módulo dessa
  // trilha faz ela aparecer mesmo antes do início — "faça isso hoje" do
  // professor sempre vence, igual já valia pro antigo bloqueio de trilha.
  function visibleTrilhas(trilhas) {
    if (currentUser.role !== 'aluno') return trilhas;
    const liberadasHoje = new Set(releasesForToday(paramUser).map(r => r.trilha_key));
    return trilhas.filter(t => trilhaStatus(t) !== 'futura' || liberadasHoje.has(t.key));
  }

  // Igual trilhaStatus, mas só com os 3 status que fazem sentido pra
  // agrupar/ordenar a lista (atraso/aberta/concluida) — uma trilha 'futura'
  // só chega até aqui quando visibleTrilhas já abriu exceção pra ela
  // (liberação diária de algum módulo), e nesse caso ela entra junto de
  // "aberta": está acessível hoje, então é isso que ela é pro aluno agora.
  function trilhaGroupStatus(trilha) {
    const status = trilhaStatus(trilha);
    return status === 'futura' ? 'aberta' : status;
  }

  // Ordena as trilhas visíveis por urgência (atraso primeiro, depois aberta,
  // concluída por último) só pro aluno — o professor continua vendo na
  // ordem original do config.js, já que "atraso"/"concluída" aqui reflete o
  // progresso de QUEM ESTÁ LOGADO, e não faria sentido pro professor.
  function visibleTrilhasOrdered(materia) {
    const trilhas = visibleTrilhas(materia.trilhas || []);
    if (currentUser.role !== 'aluno') return trilhas;
    const ordem = { atraso: 0, aberta: 1, concluida: 2 };
    return trilhas.slice().sort((a, b) => ordem[trilhaGroupStatus(a)] - ordem[trilhaGroupStatus(b)]);
  }

  const TRILHA_GROUP_LABEL = { atraso: '⚠️ Em atraso', aberta: '🟢 Em aberto', concluida: '✅ Concluídas' };

  // <select> agrupado por status (<optgroup>) só pro aluno — nativo, então
  // continua leve/tátil no celular mesmo com o currículo de vários
  // bimestres somado. Professor vê a lista simples de sempre.
  function buildTrilhaOptionsHtml(trilhas) {
    if (currentUser.role !== 'aluno') {
      return trilhas.map(t => `<option value="${t.key}">${t.label}</option>`).join('');
    }
    const grupos = { atraso: [], aberta: [], concluida: [] };
    trilhas.forEach(t => grupos[trilhaGroupStatus(t)].push(t));
    return ['atraso', 'aberta', 'concluida']
      .filter(status => grupos[status].length > 0)
      .map(status => `<optgroup label="${TRILHA_GROUP_LABEL[status]}">${
        grupos[status].map(t => `<option value="${t.key}">${t.label}</option>`).join('')
      }</optgroup>`)
      .join('');
  }

  // Manda o progresso local (localStorage) pro Supabase, pra o painel do
  // professor conseguir calcular % de desempenho por trilha nos relatórios
  // — sem isso, esse dado nunca sai do navegador do aluno.
  async function syncModuleProgress(trilha, mod) {
    if (!sbClient || currentUser.role !== 'aluno' || !paramUser) return;
    const { current, total, completed } = getModuleProgress(mod);
    try {
      await sbClient.from('student_module_progress').upsert({
        student_email: paramUser,
        student_name: currentUser.nome,
        turma: cfg.id,
        trilha_key: trilha.key,
        module_key: mod.key,
        progress_current: current,
        progress_total: total,
        completed,
        updated_at: new Date().toISOString()
      }, { onConflict: 'student_email,trilha_key,module_key' });
    } catch (e) {
      // progresso sincronizado é best-effort: nunca deve travar a experiência do aluno
    }
  }

  function syncAllModulesProgress() {
    allTrilhas().forEach(trilha => {
      (trilha.modules || []).forEach(mod => syncModuleProgress(trilha, mod));
    });
  }

  // Mesma comparação de shared/progress-sync.js (isRemoteFurtherAlong lá) —
  // cobre os dois formatos de estado usados pelas atividades: objeto
  // {lastStepIndex, correctCount, completed} (teoria) e array de ids
  // concluídos (prática).
  function isRemoteProgressFurtherAlong(remote, localRaw) {
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

  // Antes de mandar o progresso local pro Supabase (syncAllModulesProgress),
  // busca o estado bruto de cada atividade (student_activity_state, já
  // mantido ao vivo por shared/progress-sync.js dentro de cada módulo) e
  // adota o remoto sempre que ele estiver MAIS avançado que o local. Sem
  // isso, abrir o portal num navegador/dispositivo sem esse progresso local
  // (aluno trocou de máquina, cache limpo, sessão nova) sobrescrevia a
  // conclusão já salva no servidor com "não concluído" — só corrigia depois
  // que o aluno abria aquele módulo específico e clicava "Voltar" de novo.
  async function hydrateLocalProgressFromRemote() {
    if (!sbClient || currentUser.role !== 'aluno' || !paramUser) return;
    const modules = allTrilhas().flatMap(t => t.modules || []);
    if (!modules.length) return;
    try {
      const { data } = await sbClient.from('student_activity_state').select('progress_key, state').eq('student_email', paramUser);
      if (!data || !data.length) return;
      const remoteByKey = {};
      data.forEach(r => { remoteByKey[r.progress_key] = r.state; });
      modules.forEach(mod => {
        const activityLocation = (mod.progressKey || '').replace(/_progress_$/, '');
        if (!(activityLocation in remoteByKey)) return;
        const localKey = `${mod.progressKey}${paramUser}`;
        if (isRemoteProgressFurtherAlong(remoteByKey[activityLocation], localStorage.getItem(localKey))) {
          localStorage.setItem(localKey, JSON.stringify(remoteByKey[activityLocation]));
        }
      });
    } catch (e) {
      // hidratação é best-effort: se falhar, segue com o que já tinha localmente
    }
  }

  async function syncAllModulesProgressSafely() {
    await hydrateLocalProgressFromRemote();
    refreshAllModuleCards();
    checkGamesUnlock();
    syncAllModulesProgress();
  }

  function isModuleLocked(trilha, mod) {
    if (currentUser.role === 'professor') return false;
    // Liberação diária pra ESTE módulo hoje destrava ele por cima de
    // qualquer outro bloqueio (trilha inteira travada ou pré-requisito) —
    // é o professor dizendo explicitamente "faça isso hoje". Sem essa
    // checagem aqui, uma atividade liberada continuava inacessível se a
    // trilha dela estivesse bloqueada — a liberação só afetava o cadeado
    // dos jogos, nunca se dava pra abrir o módulo em si.
    if (releasesForToday(paramUser).some(r => r.trilha_key === trilha.key && r.module_key === mod.key)) return false;
    if (!mod.requires) return false;
    const requiredMod = (trilha.modules || []).find(m => m.key === mod.requires);
    return !!requiredMod && !isModuleComplete(requiredMod);
  }

  function buildModuleCardsHtml(trilha) {
    const modules = trilha.modules || [];
    if (!modules.length) return `<div class="empty-state">Nenhum módulo cadastrado ainda em "${trilha.label}".</div>`;

    const releasedTodayKeys = new Set(
      releasesForToday(paramUser).filter(r => r.trilha_key === trilha.key).map(r => r.module_key)
    );

    return modules.map(m => {
      const locked = isModuleLocked(trilha, m);
      const done = isModuleComplete(m);
      // "Liberado hoje" só faz sentido de mostrar quando é a ÚNICA razão do
      // módulo estar acessível: a trilha inteira ainda nem "começou"
      // (trilhaStatus 'futura') mas essa liberação a fez aparecer mesmo
      // assim (ver visibleTrilhas) — senão o rótulo apareceria em módulos
      // que já estariam acessíveis de qualquer jeito.
      const releasedByDaily = !locked && !done && trilhaStatus(trilha) === 'futura' && releasedTodayKeys.has(m.key);
      const statusLabel = locked ? '🔒 Bloqueado' : done ? '✅ Concluído' : releasedByDaily ? '📌 Liberado hoje' : '';
      const classes = 'game-card' + (locked ? ' locked' : '') + (done ? ' completed' : '');
      const click = locked ? '' : `onclick="PortalCore.openModule('${trilha.key}','${m.key}')"`;
      return `
        <div class="${classes}" ${click}>
          <div class="icon">${m.icon || '📘'}</div>
          <h3>${m.title}</h3>
          <p>${m.desc || ''}</p>
          ${statusLabel ? `<div class="card-status">${statusLabel}</div>` : ''}
        </div>`;
    }).join('');
  }

  // Só exige o que já está disponível — trilha 'futura' (bimestre seguinte,
  // ainda não começou) não pode travar o desbloqueio dos jogos por algo que
  // o aluno nem tem como ter feito ainda.
  function allModulesComplete() {
    const modules = allTrilhas().filter(t => trilhaStatus(t) !== 'futura').flatMap(t => t.modules || []);
    if (modules.length === 0) return false;
    return modules.every(isModuleComplete);
  }

  // Liberações (data específica ou dia da semana recorrente) que valem HOJE
  // pra este aluno — turma inteira (student_email vazio) ou só ele. Quando
  // existe pelo menos uma pra hoje, ela substitui a regra padrão de "tudo
  // completo" só por hoje: o aluno só precisa concluir o que foi liberado.
  // No dia seguinte a checagem roda de novo contra a data/dia da semana
  // atual, então o cadeado volta sozinho sem nenhuma ação do professor.
  function releasesForToday(studentEmail) {
    const todayD = todayStr();
    const weekday = new Date().getDay();
    return dailyReleasesCache.filter(r => {
      const scopeMatch = r.scope === 'data' ? r.target_date === todayD : Number(r.target_weekday) === weekday;
      const studentMatch = !r.student_email || r.student_email === studentEmail;
      return scopeMatch && studentMatch;
    });
  }

  function checkGamesUnlock() {
    const todaysReleases = releasesForToday(paramUser);
    const progressUnlocked = todaysReleases.length > 0
      ? todaysReleases.every(r => {
          const mod = findModule(r.trilha_key, r.module_key);
          return mod ? isModuleComplete(mod) : true;
        })
      : allModulesComplete();
    const isUnlocked = progressUnlocked || teacherUnlockOverride || currentUser.role === 'professor';
    const btnJogos = document.getElementById('tabBtnJogos');

    if (isUnlocked) {
      btnJogos.classList.remove('disabled');
      btnJogos.textContent = 'Jogos 🎮';
      btnJogos.removeAttribute('title');
    } else {
      btnJogos.classList.add('disabled');
      btnJogos.textContent = 'Jogos 🔒';
      // não depende só do cadeado/opacidade pra passar a mensagem — leitor de tela também explica o porquê.
      btnJogos.title = todaysReleases.length > 0
        ? 'Bloqueado: conclua a(s) atividade(s) liberada(s) pelo professor para hoje.'
        : 'Bloqueado: conclua as atividades ou aguarde a liberação do professor.';
    }
  }

  async function fetchTeacherOverride() {
    if (!sbClient) return;
    const { data } = await sbClient
      .from('student_overrides')
      .select('games_unlocked')
      .eq('student_email', paramUser)
      .maybeSingle();
    teacherUnlockOverride = !!(data && data.games_unlocked);
    checkGamesUnlock();
  }

  function setupOverrideRealtime() {
    if (!sbClient) return;
    sbClient.channel('realtime_student_override_' + paramUser)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_overrides', filter: `student_email=eq.${paramUser}` }, () => fetchTeacherOverride())
      .subscribe();
  }

  // Refaz os cards de módulo de qualquer trilha que já esteja renderizada
  // na tela — usado depois que o cadeado de uma trilha muda ou uma
  // liberação diária chega, pra refletir sem precisar recarregar a página.
  function refreshAllModuleCards() {
    allTrilhas().forEach(trilha => {
      const grid = document.querySelector(`#moduleSelector_${trilha.key} .card-grid`);
      if (grid) grid.innerHTML = buildModuleCardsHtml(trilha);
    });
  }

  async function fetchTrilhaDates() {
    if (!sbClient) return;
    const { data } = await sbClient.from('trilha_release_dates').select('*').eq('turma', cfg.id);
    trilhaDatesCache = {};
    (data || []).forEach(r => { trilhaDatesCache[r.trilha_key] = { inicio: r.inicio, prazo: r.prazo }; });
    refreshAllModuleCards();
    renderMaterias();
    // Refaz o <select> de trilha da matéria que o aluno tem aberta agora,
    // preservando a trilha selecionada quando ela continua visível — sem
    // isso, o card de módulos ficaria com o status desatualizado até a
    // próxima vez que a matéria fosse reaberta.
    if (openMateriaKey) {
      const materia = (cfg.materias || []).find(m => m.key === openMateriaKey);
      if (materia) {
        const selecionadaAntes = document.getElementById('trilhaSelect')?.value;
        const trilhas = renderTrilhasFor(materia);
        if (selecionadaAntes && trilhas.some(t => t.key === selecionadaAntes)) switchAulasSubTab(selecionadaAntes);
      }
    }
  }

  function setupTrilhaDatesRealtime() {
    if (!sbClient) return;
    sbClient.channel('realtime_trilha_release_dates_' + cfg.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trilha_release_dates', filter: `turma=eq.${cfg.id}` }, () => fetchTrilhaDates())
      .subscribe();
  }

  async function fetchDailyReleases() {
    if (!sbClient) return;
    const previousIds = new Set(dailyReleasesCache.map(r => r.id));
    const wasLoadedBefore = dailyReleasesLoadedOnce;

    const { data } = await sbClient.from('daily_module_releases').select('*').eq('turma', cfg.id);
    dailyReleasesCache = data || [];
    dailyReleasesLoadedOnce = true;

    checkGamesUnlock();
    refreshAllModuleCards();

    // Só notifica a partir da SEGUNDA carga (a primeira é o próprio load da
    // página — liberações que já existiam antes do aluno abrir o portal não
    // são "novidade"). Isso roda de novo via realtime sempre que o
    // professor mexe em daily_module_releases, então pega liberações
    // criadas com a sessão do aluno já aberta.
    if (wasLoadedBefore && currentUser.role === 'aluno') {
      releasesForToday(paramUser)
        .filter(r => !previousIds.has(r.id))
        .forEach(r => {
          const atividade = `${r.trilha_label || r.trilha_key} — ${r.module_title || r.module_key}`;
          showToast('🆕 Nova atividade liberada!', atividade);
        });
    }
  }

  function setupDailyReleasesRealtime() {
    if (!sbClient) return;
    sbClient.channel('realtime_daily_releases_' + cfg.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_module_releases', filter: `turma=eq.${cfg.id}` }, async () => {
        await fetchDailyReleases();
        if (currentUser.role === 'professor') renderGestaoDailyReleasesTable();
      })
      .subscribe();
  }

  // ---------- Log de auditoria (best-effort, local ao navegador) ----------
  function logAction(action, targetUser = null) {
    const logs = JSON.parse(localStorage.getItem('pf_audit_logs') || '[]');
    const u = targetUser || (currentUser ? currentUser.nome : 'Sistema');
    logs.unshift({ time: new Date().toLocaleTimeString(), user: u, action });
    if (logs.length > 50) logs.pop();
    localStorage.setItem('pf_audit_logs', JSON.stringify(logs));
  }

  // ---------- Gestão da turma (só professor) ----------
  // Mesma coisa que professor/painel.html fazia antes num painel central
  // misturando as duas turmas — agora cada turma cuida só dos seus alunos.
  let gestaoOverridesCache = {};
  let gestaoClipboardBlocked = false;
  let gestaoActivityRealtimeStarted = false;
  let gestaoActivityPollStarted = false;
  let gestaoInatividadePollStarted = false;

  function turmaStudents() {
    return Object.values(DB.users)
      .filter(u => u.role === 'aluno' && u.turma === cfg.id)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  async function fetchGestaoOverrides() {
    if (!sbClient) return;
    const { data } = await sbClient.from('student_overrides').select('*');
    gestaoOverridesCache = {};
    (data || []).forEach(r => { gestaoOverridesCache[r.student_email] = r.games_unlocked; });
  }

  async function renderGestaoStudents() {
    await fetchGestaoOverrides();
    const tbody = document.getElementById('tblGestaoStudentsBody');
    if (!tbody) return;
    const students = turmaStudents();
    if (students.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="color:var(--ink-dim); text-align:center; padding:14px;">Nenhum aluno cadastrado nessa turma.</td></tr>`;
      return;
    }
    tbody.innerHTML = students.map(u => {
      const isUnl = !!gestaoOverridesCache[u.email];
      return `
        <tr>
          <td>${u.nome}</td>
          <td><span style="color:${isUnl ? 'var(--green)' : 'var(--blood-bright)'}">${isUnl ? 'LIBERADO' : 'BLOQUEADO'}</span></td>
          <td><button class="btn btn-secondary" style="padding:4px 8px; font-size:10px;" onclick="PortalCore.toggleStudentGamesTurma('${u.email}')">${isUnl ? 'Revogar' : 'Liberar'}</button></td>
        </tr>
      `;
    }).join('');
  }

  async function toggleStudentGamesTurma(userKey) {
    if (!sbClient) return;
    const newValue = !gestaoOverridesCache[userKey];
    await sbClient.from('student_overrides').upsert({
      student_email: userKey, games_unlocked: newValue, updated_at: new Date().toISOString()
    }, { onConflict: 'student_email' });
    renderGestaoStudents();
  }

  // Lista achatada de trilhas com o rótulo da matéria dona, só pra exibição
  // na tabela de bloqueio — allTrilhas() perde essa referência de propósito.
  function allTrilhasComMateria() {
    return (cfg.materias || []).flatMap(m => (m.trilhas || []).map(t => ({ materiaLabel: m.label, trilha: t })));
  }

  // Rótulo pro professor na Gestão: só olha as datas, nunca o progresso de
  // um aluno específico (não faria sentido "concluída" aqui — conclusão é
  // por aluno; quem vê isso é o trilhaStatus() que cada aluno usa pra si).
  function trilhaDateStatusLabel(inicio, prazo) {
    const hoje = todayStr();
    if (inicio && inicio > hoje) return { text: 'Ainda não iniciada', color: 'var(--ink-dim)' };
    if (prazo && prazo < hoje) return { text: 'Prazo vencido', color: 'var(--blood-bright)' };
    return { text: 'Em andamento', color: 'var(--green)' };
  }

  async function renderGestaoTrilhas() {
    await fetchTrilhaDates();
    const tbody = document.getElementById('tblGestaoTrilhasBody');
    if (!tbody) return;
    const pares = allTrilhasComMateria();
    if (pares.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="color:var(--ink-dim); text-align:center; padding:14px;">Nenhuma trilha cadastrada ainda nesta turma.</td></tr>`;
      return;
    }
    tbody.innerHTML = pares.map(({ materiaLabel, trilha }) => {
      const saved = trilhaDatesCache[trilha.key] || {};
      const inicio = saved.inicio || trilha.inicio || '';
      const prazo = saved.prazo || trilha.prazo || '';
      const status = trilhaDateStatusLabel(inicio, prazo);
      return `
        <tr data-trilha="${trilha.key}">
          <td>${materiaLabel}</td>
          <td>${trilha.label}</td>
          <td><input type="date" class="trilha-data-input" data-campo="inicio" value="${inicio}"></td>
          <td><input type="date" class="trilha-data-input" data-campo="prazo" value="${prazo}"></td>
          <td><span style="color:${status.color}">${status.text}</span></td>
        </tr>
      `;
    }).join('');
  }

  // Salva TODAS as linhas da tabela de uma vez (igual salvarNotas) — mais
  // simples que um botão por linha, e a turma toda cabe numa única chamada.
  async function salvarTrilhaDatas() {
    if (!sbClient) return;
    const now = new Date().toISOString();
    const rows = Array.from(document.querySelectorAll('#tblGestaoTrilhasBody tr[data-trilha]')).map(tr => {
      const get = campo => {
        const inp = tr.querySelector(`.trilha-data-input[data-campo="${campo}"]`);
        return inp && inp.value ? inp.value : null;
      };
      return { turma: cfg.id, trilha_key: tr.getAttribute('data-trilha'), inicio: get('inicio'), prazo: get('prazo'), updated_at: now };
    });
    if (rows.length === 0) return;
    await sbClient.from('trilha_release_dates').upsert(rows, { onConflict: 'turma,trilha_key' });
    const status = document.getElementById('trilhaDatasStatus');
    if (status) status.textContent = `Datas salvas às ${new Date().toLocaleTimeString('pt-BR')}.`;
    renderGestaoTrilhas();
  }

  const WEEKDAY_LABELS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

  // Preenche os dois <select> do formulário (aluno-alvo e atividade) toda
  // vez que a tabela é re-renderizada, pra sempre refletir a turma/config atual.
  function populateDailyReleaseFormOptions() {
    const alvoSel = document.getElementById('dailyReleaseAlvo');
    if (alvoSel) {
      const selected = alvoSel.value;
      alvoSel.innerHTML = '<option value="">Turma inteira</option>' +
        turmaStudents().map(u => `<option value="${u.email}">${u.nome}</option>`).join('');
      if ([...alvoSel.options].some(o => o.value === selected)) alvoSel.value = selected;
    }

    const atividadeSel = document.getElementById('dailyReleaseAtividade');
    if (atividadeSel) {
      const selected = atividadeSel.value;
      atividadeSel.innerHTML = allTrilhasComMateria().flatMap(({ materiaLabel, trilha }) =>
        (trilha.modules || []).map(m => `<option value="${trilha.key}::${m.key}">${materiaLabel} — ${trilha.label} — ${m.title}</option>`)
      ).join('');
      if ([...atividadeSel.options].some(o => o.value === selected)) atividadeSel.value = selected;
    }
  }

  // Só desenha a tabela/formulário a partir de dailyReleasesCache já
  // carregado — não busca no Supabase de novo (quem faz isso é
  // renderGestaoDailyReleases, chamada quando a aba Gestão abre).
  function renderGestaoDailyReleasesTable() {
    const tbody = document.getElementById('tblDailyReleasesBody');
    if (!tbody) return;
    populateDailyReleaseFormOptions();

    const dataInput = document.getElementById('dailyReleaseData');
    if (dataInput && !dataInput.value) dataInput.value = todayStr();

    if (dailyReleasesCache.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="color:var(--ink-dim); text-align:center; padding:14px;">Nenhuma atividade liberada ainda.</td></tr>`;
      return;
    }

    tbody.innerHTML = dailyReleasesCache.map(r => {
      const quando = r.scope === 'data' ? formatDataBr(r.target_date) : `Toda ${WEEKDAY_LABELS[Number(r.target_weekday)]}`;
      const alvo = r.student_email ? ((DB.users[r.student_email] || {}).nome || r.student_email) : 'Turma inteira';
      const atividade = `${r.trilha_label || r.trilha_key} — ${r.module_title || r.module_key}`;
      return `
        <tr>
          <td>${quando}</td>
          <td>${alvo}</td>
          <td>${atividade}</td>
          <td><button class="btn btn-danger" style="padding:4px 8px; font-size:10px;" onclick="PortalCore.removeDailyRelease('${r.id}')">Remover</button></td>
        </tr>
      `;
    }).join('');
  }

  async function renderGestaoDailyReleases() {
    await fetchDailyReleases();
    renderGestaoDailyReleasesTable();
  }

  async function removeDailyRelease(id) {
    if (!sbClient) return;
    await sbClient.from('daily_module_releases').delete().eq('id', id);
    await fetchDailyReleases();
    renderGestaoDailyReleasesTable();
  }

  function renderClipboardButtonGestao() {
    const btn = document.getElementById('btnToggleClipboard');
    if (!btn) return;
    if (gestaoClipboardBlocked) {
      btn.textContent = 'Copiar/Colar BLOQUEADO — Clique para liberar';
      btn.classList.add('btn-danger');
    } else {
      btn.textContent = 'Bloquear Copiar/Colar';
      btn.classList.remove('btn-danger');
    }
  }

  async function fetchClipboardStateGestao() {
    if (!sbClient) return;
    const { data } = await sbClient.from('classroom_settings').select('clipboard_blocked').eq('id', cfg.id).maybeSingle();
    gestaoClipboardBlocked = !!(data && data.clipboard_blocked);
    renderClipboardButtonGestao();
  }

  function computeGestaoDisplayStatus(row) {
    const updatedAt = row.updated_at ? new Date(row.updated_at).getTime() : 0;
    if (!updatedAt || (Date.now() - updatedAt) > 45000) return 'offline';
    return row.status || 'offline';
  }

  async function renderGestaoActivity() {
    const tbody = document.getElementById('tblGestaoActivityBody');
    if (!tbody || !sbClient) return;

    const { data, error } = await sbClient.from('student_activity').select('*').eq('turma', cfg.id).order('student_name', { ascending: true });
    const rows = error ? [] : (data || []);

    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="color:var(--ink-dim); text-align:center; padding:14px;">Nenhum registro de atividade ainda.</td></tr>`;
      return;
    }

    const statusMeta = {
      active: { color: 'var(--green)', label: '🟢 Ativo' },
      idle: { color: 'var(--yellow)', label: '🟡 Inativo' },
      offline: { color: 'var(--ink-dim)', label: '⚫ Offline' }
    };

    tbody.innerHTML = rows.map(r => {
      const meta = statusMeta[computeGestaoDisplayStatus(r)] || statusMeta.offline;
      const lastUpdate = r.updated_at ? new Date(r.updated_at).toLocaleTimeString() : '--';
      return `<tr><td><b>${r.student_name || r.student_email}</b></td><td>${r.location_label || r.location || '--'}</td><td><span style="color:${meta.color}">${meta.label}</span></td><td>${lastUpdate}</td></tr>`;
    }).join('');
  }

  function renderGestaoLogs() {
    const box = document.getElementById('gestaoAuditLogBox');
    if (!box) return;
    const logs = JSON.parse(localStorage.getItem('pf_audit_logs') || '[]');
    box.innerHTML = logs.map(l => `<div class="log-entry"><span class="time">[${l.time}]</span> <b>${l.user}</b>: ${l.action}</div>`).join('');
  }

  // ---------- Chamada / Notas (dentro da aba Gestão, já sabe a turma) ----------
  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function noSupabaseRow(colspan) {
    return `<tr><td colspan="${colspan}" style="color:var(--ink-dim); text-align:center; padding:14px;">Configure o Supabase (shared/supabase-config.js) para usar esta tela.</td></tr>`;
  }

  function noStudentsRow(colspan) {
    return `<tr><td colspan="${colspan}" style="color:var(--ink-dim); text-align:center; padding:14px;">Nenhum aluno cadastrado nessa turma.</td></tr>`;
  }

  async function loadChamada() {
    const tbody = document.getElementById('chamadaBody');
    const dataInput = document.getElementById('chamadaData');
    if (!dataInput.value) dataInput.value = todayStr();
    if (!sbClient) { tbody.innerHTML = noSupabaseRow(2); return; }

    const students = turmaStudents();
    if (students.length === 0) { tbody.innerHTML = noStudentsRow(2); return; }

    const { data: rows } = await sbClient.from('attendance').select('*').eq('turma', cfg.id).eq('data', dataInput.value);
    const existing = {};
    (rows || []).forEach(r => { existing[r.student_email] = r; });

    tbody.innerHTML = students.map(u => {
      const row = existing[u.email];
      const faltou = row ? !row.presente : false;
      return `
        <tr>
          <td>${u.nome}</td>
          <td style="text-align:center;"><input type="checkbox" data-email="${u.email}" ${faltou ? 'checked' : ''}></td>
        </tr>
      `;
    }).join('');
    document.getElementById('chamadaStatus').textContent = '';
  }

  async function finalizarChamada() {
    if (!sbClient) return;
    const data = document.getElementById('chamadaData').value || todayStr();
    const students = turmaStudents();
    const now = new Date().toISOString();

    const rows = students.map(u => {
      const checkbox = document.querySelector(`#chamadaBody input[data-email="${u.email}"]`);
      const faltou = !!(checkbox && checkbox.checked);
      return {
        turma: cfg.id, data,
        student_email: u.email,
        student_name: u.nome,
        presente: !faltou,
        finalizada_em: now,
        updated_at: now
      };
    });

    if (rows.length === 0) return;
    await sbClient.from('attendance').upsert(rows, { onConflict: 'turma,data,student_email' });
    document.getElementById('chamadaStatus').textContent = `Chamada registrada às ${new Date().toLocaleTimeString('pt-BR')}.`;
    renderRelatorioPresenca();
    exibirResumoChamada(data, rows);
  }

  // Abreviação usada no texto de resumo da chamada, pra copiar/colar num
  // grupo/relatório fora do portal sem precisar digitar o nome da turma toda.
  function turmaAbrev() {
    return cfg.id === 'sistemas' ? 'DS' : 'JD';
  }

  function formatDataBr(isoDate) {
    const [ano, mes, dia] = isoDate.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  function exibirResumoChamada(data, rows) {
    const ausentes = rows.filter(r => !r.presente).map(r => r.student_name);
    const presentesCount = rows.length - ausentes.length;
    const texto = `Turma: ${turmaAbrev()} | Data: ${formatDataBr(data)} | Alunos presentes: ${presentesCount} | Ausentes: ${ausentes.length ? ausentes.join(', ') : 'Nenhum'}`;

    document.getElementById('chamadaResumoTexto').value = texto;
    document.getElementById('chamadaResumoBox').style.display = 'block';
    document.getElementById('chamadaResumoStatus').textContent = '';
  }

  async function renderRelatorioPresenca() {
    const tbody = document.getElementById('presencaBody');
    if (!sbClient) { tbody.innerHTML = noSupabaseRow(4); return; }

    const students = turmaStudents();
    if (students.length === 0) { tbody.innerHTML = noStudentsRow(4); return; }

    const { data: rows } = await sbClient.from('attendance').select('*').eq('turma', cfg.id);
    const byStudent = {};
    (rows || []).forEach(r => {
      byStudent[r.student_email] = byStudent[r.student_email] || { dias: 0, faltas: 0 };
      byStudent[r.student_email].dias += 1;
      if (!r.presente) byStudent[r.student_email].faltas += 1;
    });

    tbody.innerHTML = students.map(u => {
      const s = byStudent[u.email] || { dias: 0, faltas: 0 };
      const pct = s.dias > 0 ? Math.round(((s.dias - s.faltas) / s.dias) * 100) : null;
      return `<tr><td>${u.nome}</td><td>${s.dias}</td><td>${s.faltas}</td><td>${pct === null ? '—' : pct + '%'}</td></tr>`;
    }).join('');
  }

  function calcMedia(n1, n2, n3, n4) {
    const vals = [n1, n2, n3, n4].map(v => (v === '' || v === null || v === undefined || isNaN(v)) ? 0 : parseFloat(v));
    return Math.round(((vals[0] + vals[1] + vals[2] + vals[3]) / 4) * 100) / 100;
  }

  async function loadNotas() {
    const tbody = document.getElementById('notasBody');
    if (!sbClient) { tbody.innerHTML = noSupabaseRow(6); return; }

    const bimestre = parseInt(document.getElementById('notasBimestre').value, 10);
    const students = turmaStudents();
    if (students.length === 0) { tbody.innerHTML = noStudentsRow(6); return; }

    const { data: rows } = await sbClient.from('grades').select('*').eq('turma', cfg.id).eq('bimestre', bimestre);
    const byStudent = {};
    (rows || []).forEach(r => { byStudent[r.student_email] = r; });

    tbody.innerHTML = students.map(u => {
      const g = byStudent[u.email] || {};
      const n1 = g.nota1 ?? '', n2 = g.nota2 ?? '', n3 = g.nota3 ?? '', n4 = g.nota4 ?? '';
      return `
        <tr data-email="${u.email}">
          <td>${u.nome}</td>
          <td><input type="number" step="0.1" min="0" max="10" class="nota-input" data-campo="nota1" value="${n1}"></td>
          <td><input type="number" step="0.1" min="0" max="10" class="nota-input" data-campo="nota2" value="${n2}"></td>
          <td><input type="number" step="0.1" min="0" max="10" class="nota-input" data-campo="nota3" value="${n3}"></td>
          <td><input type="number" step="0.1" min="0" max="10" class="nota-input" data-campo="nota4" value="${n4}"></td>
          <td class="media-cell">${calcMedia(n1, n2, n3, n4).toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('tr[data-email]').forEach(tr => {
      const inputs = tr.querySelectorAll('.nota-input');
      const mediaCell = tr.querySelector('.media-cell');
      inputs.forEach(inp => {
        inp.addEventListener('input', () => {
          const vals = Array.from(inputs).map(i => i.value);
          mediaCell.textContent = calcMedia(vals[0], vals[1], vals[2], vals[3]).toFixed(2);
        });
      });
    });

    document.getElementById('notasStatus').textContent = '';
  }

  async function salvarNotas() {
    if (!sbClient) return;
    const bimestre = parseInt(document.getElementById('notasBimestre').value, 10);
    const now = new Date().toISOString();

    const rows = Array.from(document.querySelectorAll('#notasBody tr[data-email]')).map(tr => {
      const email = tr.getAttribute('data-email');
      const u = DB.users[email];
      const get = campo => {
        const inp = tr.querySelector(`.nota-input[data-campo="${campo}"]`);
        const v = inp ? inp.value : '';
        return v === '' ? null : parseFloat(v);
      };
      return {
        student_email: email,
        student_name: u ? u.nome : email,
        turma: cfg.id, bimestre,
        nota1: get('nota1'), nota2: get('nota2'), nota3: get('nota3'), nota4: get('nota4'),
        updated_at: now
      };
    });

    if (rows.length === 0) return;
    await sbClient.from('grades').upsert(rows, { onConflict: 'student_email,bimestre' });
    document.getElementById('notasStatus').textContent = `Notas salvas às ${new Date().toLocaleTimeString('pt-BR')}.`;
    renderRelatorioNotas();
  }

  // % de desempenho de uma MATÉRIA pro aluno: média das frações de conclusão
  // de TODOS os módulos de TODAS as trilhas dela (crédito parcial, não só
  // 0%/100%). Lê direto de cfg.materias, então recalcula sozinho sempre que
  // o professor adiciona uma trilha/módulo novo — nenhuma tabela guarda o %,
  // só o progresso bruto por módulo (student_module_progress).
  function materiaPercentForStudent(materia, progressRows) {
    const modules = (materia.trilhas || []).flatMap(t => (t.modules || []).map(m => ({ trilhaKey: t.key, mod: m })));
    if (modules.length === 0) return null;
    let sum = 0;
    modules.forEach(({ trilhaKey, mod }) => {
      const row = progressRows.find(r => r.trilha_key === trilhaKey && r.module_key === mod.key);
      if (!row) return;
      const total = row.progress_total || 1;
      sum += Math.min((row.progress_current || 0) / total, 1);
    });
    return Math.round((sum / modules.length) * 100);
  }

  // Mesma conta do materiaPercentForStudent acima, só que achatada pra TODAS
  // as trilhas da turma (não uma matéria por vez) — dá um % geral de
  // conclusão por aluno, usado só pra calcular o ranking (ver renderRankingBadge).
  function overallProgressForStudent(progressRows) {
    const modules = allTrilhas().flatMap(t => (t.modules || []).map(m => ({ trilhaKey: t.key, mod: m })));
    if (modules.length === 0) return null;
    let sum = 0;
    modules.forEach(({ trilhaKey, mod }) => {
      const row = progressRows.find(r => r.trilha_key === trilhaKey && r.module_key === mod.key);
      if (!row) return;
      const total = row.progress_total || 1;
      sum += Math.min((row.progress_current || 0) / total, 1);
    });
    return (sum / modules.length) * 100;
  }

  // Ranking do aluno dentro da própria turma, pelo % geral de conclusão
  // (student_module_progress). Calcula a posição de TODOS pra saber onde o
  // aluno logado cai, mas só devolve a dele — nome/posição de colegas nunca
  // chegam a aparecer na tela (só entram como chave de desempate no sort).
  // Usada tanto pelo badge da statusbar (renderRankingBadge) quanto pela
  // aba Perfil (renderPerfilTab).
  async function computeRanking() {
    if (currentUser.role !== 'aluno' || !sbClient) return null;

    const students = turmaStudents();
    if (students.length === 0) return null;

    const { data } = await sbClient.from('student_module_progress').select('*').eq('turma', cfg.id);
    const rows = data || [];
    const byStudent = {};
    rows.forEach(r => { (byStudent[r.student_email] = byStudent[r.student_email] || []).push(r); });

    const scored = students
      .map(u => {
        const pct = overallProgressForStudent(byStudent[u.email] || []);
        return pct === null ? null : { email: u.email, pct, pctRounded: Math.round(pct) };
      })
      .filter(Boolean)
      // pct BRUTO (não arredondado) decide a ordem — dois alunos só empatam de
      // verdade quando a fração exata é idêntica (ex: os dois em 100%). E-mail
      // é o desempate final, só pra garantir uma ordem determinística nesse
      // caso raríssimo — nunca decide a posição sozinho.
      .sort((a, b) => b.pct - a.pct || a.email.localeCompare(b.email));

    // Cada aluno numa posição ÚNICA (1º, 2º, 3º, ...) — precisa dar pra
    // diferenciar quem está de verdade na frente de quem, mesmo quando vários
    // alunos arredondam pro mesmo % na tela (ex: 3+ alunos em "100%"). Um
    // ranking de competição (1, 2, 2, 4, ...) já foi usado aqui, mas juntava
    // alunos com desempenho diferente na mesma posição.
    scored.forEach((s, i) => { s.rank = i + 1; });

    const myIndex = scored.findIndex(s => s.email === paramUser);
    if (myIndex === -1) return null;

    return { posicao: scored[myIndex].rank, total: scored.length, pct: scored[myIndex].pctRounded };
  }

  async function renderRankingBadge() {
    const badge = document.getElementById('rankingBadge');
    if (!badge) return;
    const ranking = await computeRanking();
    if (!ranking) return;
    badge.textContent = `🏆 ${ranking.posicao}º`;
    badge.title = `Sua posição na turma: ${ranking.posicao}º de ${ranking.total} (${ranking.pct}% concluído)`;
    badge.style.display = '';
  }

  // ---------- Perfil do aluno (progresso + insígnias, aba só do aluno) ----------
  // Insígnias são progressivas por % geral de conclusão — cada turma define
  // as suas em cfg.insignias (ver turmas/<turma>/config.js), com ícone,
  // nome, descrição e o minPct necessário pra desbloquear. Não existe tabela
  // no Supabase pra isso: é só uma leitura derivada do progresso que já é
  // sincronizado em student_module_progress, então nunca "dessincroniza".
  function isBadgeUnlocked(insignia, overallPct, completedModules) {
    // minPct:0 (a primeira insígnia, "Iniciante") exige progresso real, não
    // só "0% arredondado" — senão todo aluno já entraria com ela liberada.
    if (insignia.minPct === 0) return completedModules > 0;
    return overallPct >= insignia.minPct;
  }

  function renderPerfilBadges(overallPct, completedModules) {
    const grid = document.getElementById('perfilBadgesGrid');
    if (!grid) return;
    const insignias = cfg.insignias || [];
    if (insignias.length === 0) {
      grid.innerHTML = `<div class="empty-state">Nenhuma insígnia cadastrada ainda para esta turma.</div>`;
      return;
    }
    grid.innerHTML = insignias.map(b => {
      const unlocked = isBadgeUnlocked(b, overallPct, completedModules);
      return `
        <div class="badge-slot${unlocked ? ' unlocked' : ''}">
          <div class="icon">${unlocked ? b.icon : '🔒'}</div>
          <div class="label">${b.label}</div>
          <div class="badge-desc">${unlocked ? b.desc : (b.minPct === 0 ? 'Comece uma atividade para desbloquear' : `Alcance ${b.minPct}% de progresso`)}</div>
        </div>
      `;
    }).join('');
  }

  async function renderPerfilTab() {
    const summaryEl = document.getElementById('perfilResumo');
    const materiasEl = document.getElementById('perfilMaterias');
    if (!summaryEl || !materiasEl) return;

    if (!sbClient) {
      summaryEl.innerHTML = `<div class="empty-state">Configure o Supabase (shared/supabase-config.js) para ver seu progresso aqui.</div>`;
      materiasEl.innerHTML = '';
      renderPerfilBadges(0, 0);
      return;
    }

    const [{ data: myRows }, ranking] = await Promise.all([
      sbClient.from('student_module_progress').select('*').eq('turma', cfg.id).eq('student_email', paramUser),
      computeRanking()
    ]);
    const rows = myRows || [];

    const overallPct = Math.round(overallProgressForStudent(rows) || 0);
    const totalModules = allTrilhas().flatMap(t => t.modules || []).length;
    const completedModules = rows.filter(r => r.completed).length;

    renderPerfilBadges(overallPct, completedModules);

    summaryEl.innerHTML = `
      <div class="perfil-stat">
        <div class="perfil-stat-value">${overallPct}%</div>
        <div class="perfil-stat-label">Progresso Geral</div>
      </div>
      <div class="perfil-stat">
        <div class="perfil-stat-value">${completedModules}/${totalModules}</div>
        <div class="perfil-stat-label">Atividades Concluídas</div>
      </div>
      <div class="perfil-stat">
        <div class="perfil-stat-value">${ranking ? `${ranking.posicao}º` : '—'}</div>
        <div class="perfil-stat-label">${ranking ? `Posição de ${ranking.total}` : 'Posição na Turma'}</div>
      </div>
    `;

    const materias = (cfg.materias || []).filter(m => (m.trilhas || []).length > 0);
    if (materias.length === 0) {
      materiasEl.innerHTML = `<div class="empty-state">Nenhuma matéria cadastrada ainda.</div>`;
      return;
    }

    materiasEl.innerHTML = materias.map(m => {
      const pct = materiaPercentForStudent(m, rows);
      const pctDisplay = pct === null ? 0 : pct;
      const trilhasHtml = (m.trilhas || []).map(t => {
        const mods = t.modules || [];
        const doneCount = mods.filter(mod => {
          const r = rows.find(rr => rr.trilha_key === t.key && rr.module_key === mod.key);
          return !!(r && r.completed);
        }).length;
        return `<div class="perfil-trilha-row"><span>${t.label}</span><span>${doneCount}/${mods.length}</span></div>`;
      }).join('');
      return `
        <div class="perfil-materia-card">
          <div class="perfil-materia-head">
            <h3>${m.label}</h3>
            <span>${pctDisplay}%</span>
          </div>
          <div class="perfil-progress-bar"><div class="perfil-progress-fill" style="width:${pctDisplay}%;"></div></div>
          <div class="perfil-trilhas-list">${trilhasHtml}</div>
        </div>
      `;
    }).join('');
  }

  async function renderRelatorioNotas() {
    const materias = cfg.materias || [];
    const students = turmaStudents();
    const theadRow = document.getElementById('relatorioNotasHead');
    const tbody = document.getElementById('relatorioNotasBody');
    const totalCols = 6 + materias.length;

    theadRow.innerHTML = `<th>Aluno</th><th>Média B1</th><th>Média B2</th><th>Média B3</th><th>Média B4</th><th>Média Geral</th>${materias.map(m => `<th>${m.label}</th>`).join('')}`;

    if (!sbClient) { tbody.innerHTML = noSupabaseRow(totalCols); return; }
    if (students.length === 0) { tbody.innerHTML = noStudentsRow(totalCols); return; }

    const [gradesRes, progressRes] = await Promise.all([
      sbClient.from('grades').select('*').eq('turma', cfg.id),
      sbClient.from('student_module_progress').select('*').eq('turma', cfg.id)
    ]);

    const gradesByStudent = {};
    (gradesRes.data || []).forEach(r => {
      gradesByStudent[r.student_email] = gradesByStudent[r.student_email] || {};
      gradesByStudent[r.student_email][r.bimestre] = r.media;
    });
    const progressByStudent = {};
    (progressRes.data || []).forEach(r => {
      progressByStudent[r.student_email] = progressByStudent[r.student_email] || [];
      progressByStudent[r.student_email].push(r);
    });

    tbody.innerHTML = students.map(u => {
      const bims = gradesByStudent[u.email] || {};
      const bimCells = [1, 2, 3, 4].map(b => `<td>${bims[b] !== undefined && bims[b] !== null ? Number(bims[b]).toFixed(2) : '—'}</td>`).join('');
      const lancadas = [1, 2, 3, 4].map(b => bims[b]).filter(v => v !== undefined && v !== null);
      const mediaGeral = lancadas.length ? (lancadas.reduce((a, b) => a + Number(b), 0) / lancadas.length).toFixed(2) : '—';

      const pRows = progressByStudent[u.email] || [];
      const materiaCells = materias.map(m => {
        const pct = materiaPercentForStudent(m, pRows);
        return `<td>${pct === null ? '—' : pct + '%'}</td>`;
      }).join('');

      return `<tr><td>${u.nome}</td>${bimCells}<td><b>${mediaGeral}</b></td>${materiaCells}</tr>`;
    }).join('');
  }

  // "Acessou o portal" é aproximado pela existência de uma linha em
  // student_activity: o heartbeat (shared/activity-tracker.js) grava/atualiza
  // essa linha assim que a plataforma carrega pro aluno, então sua ausência
  // significa que o aluno nunca abriu o portal. "Fez alguma atividade" olha
  // student_module_progress, mas não basta ter linha lá — o sync roda pra
  // TODO módulo a cada carregamento (mesmo com progresso zero), então só
  // conta como atividade de fato quando algum módulo tem progress_current > 0
  // ou completed = true.
  function hasRealProgress(rows) {
    return (rows || []).some(r => (r.progress_current || 0) > 0 || r.completed);
  }

  async function renderRelatorioInatividade() {
    const tbody = document.getElementById('inatividadeBody');
    const resumo = document.getElementById('inatividadeResumo');
    if (!sbClient) { tbody.innerHTML = noSupabaseRow(3); return; }

    const students = turmaStudents();
    if (students.length === 0) { tbody.innerHTML = noStudentsRow(3); return; }

    const [activityRes, progressRes] = await Promise.all([
      sbClient.from('student_activity').select('*').eq('turma', cfg.id),
      sbClient.from('student_module_progress').select('*').eq('turma', cfg.id)
    ]);

    const activityByStudent = {};
    (activityRes.data || []).forEach(r => { activityByStudent[r.student_email] = r; });

    const progressByStudent = {};
    (progressRes.data || []).forEach(r => {
      progressByStudent[r.student_email] = progressByStudent[r.student_email] || [];
      progressByStudent[r.student_email].push(r);
    });

    const STATUS = {
      nunca: { rank: 0, label: 'NUNCA ACESSOU', color: 'var(--blood-bright)' },
      semAtividade: { rank: 1, label: 'ACESSOU, SEM ATIVIDADE', color: 'var(--yellow)' },
      ativo: { rank: 2, label: 'ATIVO', color: 'var(--green)' }
    };

    const linhas = students.map(u => {
      const activity = activityByStudent[u.email];
      const status = !activity
        ? STATUS.nunca
        : hasRealProgress(progressByStudent[u.email])
          ? STATUS.ativo
          : STATUS.semAtividade;
      const ultimaVez = activity && (activity.updated_at || activity.last_interaction_at)
        ? new Date(activity.updated_at || activity.last_interaction_at).toLocaleString('pt-BR')
        : '—';
      return { nome: u.nome, status, ultimaVez };
    });

    // Quem precisa de atenção (nunca acessou / acessou sem fazer nada) sobe
    // pro topo — o professor não deveria ter que rolar a turma toda pra achar.
    linhas.sort((a, b) => a.status.rank - b.status.rank || a.nome.localeCompare(b.nome, 'pt-BR'));

    const nuncaCount = linhas.filter(l => l.status === STATUS.nunca).length;
    const semAtividadeCount = linhas.filter(l => l.status === STATUS.semAtividade).length;
    if (resumo) {
      resumo.textContent = `${nuncaCount} de ${students.length} aluno(s) nunca acessaram o portal; ${semAtividadeCount} acessaram mas não fizeram nenhuma atividade ainda.`;
    }

    tbody.innerHTML = linhas.map(l => `
      <tr>
        <td>${l.nome}</td>
        <td><span style="color:${l.status.color}; font-weight:800;">${l.status.label}</span></td>
        <td>${l.ultimaVez}</td>
      </tr>
    `).join('');
  }

  // "Concluiu alguma atividade hoje" olha completed_at (quando o módulo
  // virou completed=true de verdade), NÃO updated_at — updated_at muda
  // toda vez que o portal carrega, mesmo sem progresso nenhum (ver
  // syncAllModulesProgress), então usá-lo aqui marcaria como "ativo hoje"
  // qualquer aluno que só abriu o portal. Gerado sob demanda (botão), não
  // em tempo real, porque é um retrato do dia, não um placar ao vivo.
  async function gerarRelatorioAtividadeDia() {
    const container = document.getElementById('atividadeDiaResultado');
    const btn = document.getElementById('btnGerarAtividadeDia');
    if (!sbClient) { container.innerHTML = `<p style="color:var(--ink-dim); font-size:12px;">Configure o Supabase (shared/supabase-config.js) para usar este relatório.</p>`; return; }

    const students = turmaStudents();
    if (students.length === 0) { container.innerHTML = `<p style="color:var(--ink-dim); font-size:12px;">Nenhum aluno cadastrado nesta turma.</p>`; return; }

    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = '⏳ Gerando...';

    const today = todayStr();
    const [progressRes, attendanceRes, activityRes] = await Promise.all([
      sbClient.from('student_module_progress').select('student_email, completed_at').eq('turma', cfg.id).eq('completed', true),
      sbClient.from('attendance').select('student_email, presente').eq('turma', cfg.id).eq('data', today),
      sbClient.from('student_activity').select('student_email, active_seconds_today, activity_date').eq('turma', cfg.id)
    ]);

    btn.disabled = false;
    btn.textContent = original;

    const concluiuHoje = new Set(
      (progressRes.data || [])
        .filter(r => r.completed_at && new Date(r.completed_at).toISOString().slice(0, 10) === today)
        .map(r => r.student_email)
    );
    const ausentesHoje = new Set(
      (attendanceRes.data || []).filter(r => r.presente === false).map(r => r.student_email)
    );

    // activity_date vem como 'YYYY-MM-DD' (coluna date do Postgres) — compara
    // string direto com todayStr(), sem passar por new Date() (evita timezone).
    const segundosHojeByStudent = {};
    (activityRes.data || []).forEach(r => {
      segundosHojeByStudent[r.student_email] = (r.activity_date === today) ? (r.active_seconds_today || 0) : 0;
    });

    const semAtividade = students
      .filter(u => !concluiuHoje.has(u.email) && !ausentesHoje.has(u.email))
      .map(u => ({ nome: u.nome, segundos: segundosHojeByStudent[u.email] || 0 }));

    if (semAtividade.length === 0) {
      container.innerHTML = `<p style="color:var(--green); font-size:12px;">🎉 Todos os alunos presentes hoje já concluíram alguma atividade.</p>`;
      return;
    }

    // Quem ficou menos tempo logado aparece primeiro — é quem mais precisa de atenção.
    semAtividade.sort((a, b) => a.segundos - b.segundos || a.nome.localeCompare(b.nome, 'pt-BR'));

    container.innerHTML = `
      <p style="font-size:11px; color:var(--ink-dim); margin:0 0 8px;">${semAtividade.length} de ${students.length} aluno(s) sem nenhuma atividade concluída hoje:</p>
      <table class="audit-table">
        <thead><tr><th>Aluno</th><th>Tempo logado hoje</th></tr></thead>
        <tbody>
          ${semAtividade.map(s => `<tr><td>${s.nome}</td><td>${formatTempoLogado(s.segundos)}</td></tr>`).join('')}
        </tbody>
      </table>
    `;
  }

  // Aproximação de "tempo com o portal aberto hoje" — soma de intervalos entre
  // heartbeats de shared/activity-tracker.js (ver trigger track_daily_active_seconds
  // em sql/supabase-student-activity.sql). Não é um cronômetro de sessão exato.
  function formatTempoLogado(segundos) {
    if (!segundos) return '—';
    const h = Math.floor(segundos / 3600);
    const m = Math.round((segundos % 3600) / 60);
    if (h > 0) return `${h}h ${m}min`;
    if (m > 0) return `${m}min`;
    return '< 1min';
  }

  // Carrega o módulo (aula teórica) num iframe escondido só pra rodar a
  // geração de slides dele — o professor não precisa abrir o módulo na
  // aba "Aulas & Atividades" nem achar o botão lá dentro pra gerar o .pptx.
  function generateSlidesFor(mod) {
    return new Promise((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:absolute; width:0; height:0; border:0; visibility:hidden;';
      iframe.src = `${mod.src}?user=${encodeURIComponent(paramUser)}&role=${encodeURIComponent(currentUser.role)}&name=${encodeURIComponent(currentUser.nome)}&turma=${encodeURIComponent(cfg.id)}`;

      const cleanup = () => { iframe.remove(); resolve(); };
      iframe.onload = async () => {
        try {
          const win = iframe.contentWindow;
          if (win && typeof win.generateSlidesForGestao === 'function') {
            await win.generateSlidesForGestao();
          }
        } catch (e) {
          // best-effort: se der erro, só limpa o iframe e segue
        }
        setTimeout(cleanup, 400);
      };
      iframe.onerror = cleanup;
      document.body.appendChild(iframe);
    });
  }

  function renderGestaoSlidesList() {
    const container = document.getElementById('gestaoSlidesList');
    if (!container) return;

    const slideModules = [];
    allTrilhas().forEach(trilha => {
      (trilha.modules || []).forEach(mod => {
        if (mod.hasSlides) slideModules.push(mod);
      });
    });

    if (slideModules.length === 0) {
      container.innerHTML = `<div class="empty-state">Nenhuma aula teórica com geração de slides nesta turma ainda.</div>`;
      return;
    }

    container.innerHTML = slideModules.map((mod, i) => `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 0; border-bottom:1px solid var(--line);">
        <span>${mod.title}</span>
        <button class="btn btn-secondary" style="padding:6px 12px; font-size:10px;" data-slide-mod="${i}">🖨️ Gerar Slides</button>
      </div>
    `).join('');

    container.querySelectorAll('[data-slide-mod]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const mod = slideModules[parseInt(btn.getAttribute('data-slide-mod'), 10)];
        const original = btn.textContent;
        btn.disabled = true;
        btn.textContent = '⏳ Gerando...';
        await generateSlidesFor(mod);
        btn.disabled = false;
        btn.textContent = original;
      });
    });
  }

  // Mesmo esquema do generateSlidesFor acima: carrega o módulo num iframe
  // escondido só pra rodar a geração do gabarito (.txt) dele.
  function generateGabaritoFor(mod) {
    return new Promise((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:absolute; width:0; height:0; border:0; visibility:hidden;';
      iframe.src = `${mod.src}?user=${encodeURIComponent(paramUser)}&role=${encodeURIComponent(currentUser.role)}&name=${encodeURIComponent(currentUser.nome)}&turma=${encodeURIComponent(cfg.id)}`;

      const cleanup = () => { iframe.remove(); resolve(); };
      iframe.onload = async () => {
        try {
          const win = iframe.contentWindow;
          if (win && typeof win.generateGabaritoForGestao === 'function') {
            await win.generateGabaritoForGestao();
          }
        } catch (e) {
          // best-effort: se der erro, só limpa o iframe e segue
        }
        setTimeout(cleanup, 400);
      };
      iframe.onerror = cleanup;
      document.body.appendChild(iframe);
    });
  }

  function renderGestaoGabaritoList() {
    const container = document.getElementById('gestaoGabaritoList');
    if (!container) return;

    const gabaritoModules = [];
    allTrilhas().forEach(trilha => {
      (trilha.modules || []).forEach(mod => {
        if (mod.hasGabarito) gabaritoModules.push(mod);
      });
    });

    if (gabaritoModules.length === 0) {
      container.innerHTML = `<div class="empty-state">Nenhuma atividade com gabarito disponível nesta turma ainda.</div>`;
      return;
    }

    container.innerHTML = gabaritoModules.map((mod, i) => `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 0; border-bottom:1px solid var(--line);">
        <span>${mod.title}</span>
        <button class="btn btn-secondary" style="padding:6px 12px; font-size:10px;" data-gabarito-mod="${i}">📄 Gerar Gabarito</button>
      </div>
    `).join('');

    container.querySelectorAll('[data-gabarito-mod]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const mod = gabaritoModules[parseInt(btn.getAttribute('data-gabarito-mod'), 10)];
        const original = btn.textContent;
        btn.disabled = true;
        btn.textContent = '⏳ Gerando...';
        await generateGabaritoFor(mod);
        btn.disabled = false;
        btn.textContent = original;
      });
    });
  }

  function toggleGestaoSection(headEl) {
    headEl.closest('.collapsible-card').classList.toggle('expanded');
  }

  function renderGestaoTab() {
    renderGestaoStudents();
    renderGestaoTrilhas();
    renderGestaoDailyReleases();
    renderGestaoLogs();
    fetchClipboardStateGestao();
    renderGestaoSlidesList();
    renderGestaoGabaritoList();
    loadChamada();
    renderRelatorioPresenca();
    loadNotas();
    renderRelatorioNotas();
    renderRelatorioInatividade();

    if (!sbClient) return;
    renderGestaoActivity();
    if (!gestaoActivityRealtimeStarted) {
      gestaoActivityRealtimeStarted = true;
      sbClient.channel('realtime_gestao_activity_' + cfg.id)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'student_activity', filter: `turma=eq.${cfg.id}` }, () => renderGestaoActivity())
        .subscribe();
    }
    if (!gestaoActivityPollStarted) {
      gestaoActivityPollStarted = true;
      setInterval(renderGestaoActivity, 15000);
    }
    // Não precisa ser em tempo real feito a atividade acima (o professor não
    // fica de olho o tempo todo), mas o relatório não pode ficar parado do
    // jeito que a turma estava quando a aba Gestão foi aberta.
    if (!gestaoInatividadePollStarted) {
      gestaoInatividadePollStarted = true;
      setInterval(renderRelatorioInatividade, 60000);
    }
  }

  function setupGestaoButtons() {
    document.getElementById('btnUnlockGamesTurma').addEventListener('click', async () => {
      if (!sbClient) return;
      const rows = turmaStudents().map(u => ({ student_email: u.email, games_unlocked: true, updated_at: new Date().toISOString() }));
      if (rows.length) await sbClient.from('student_overrides').upsert(rows, { onConflict: 'student_email' });
      renderGestaoStudents();
    });

    document.getElementById('btnLockGamesTurma').addEventListener('click', async () => {
      if (!sbClient) return;
      const rows = turmaStudents().map(u => ({ student_email: u.email, games_unlocked: false, updated_at: new Date().toISOString() }));
      if (rows.length) await sbClient.from('student_overrides').upsert(rows, { onConflict: 'student_email' });
      renderGestaoStudents();
    });

    document.getElementById('btnToggleClipboard').addEventListener('click', async () => {
      if (!sbClient) return;
      const newValue = !gestaoClipboardBlocked;
      const { error } = await sbClient.from('classroom_settings').upsert({
        id: cfg.id, clipboard_blocked: newValue, updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
      if (error) {
        showAlert('Não foi possível salvar o bloqueio de copiar/colar: ' + error.message);
        return;
      }
      gestaoClipboardBlocked = newValue;
      renderClipboardButtonGestao();
    });

    document.getElementById('dailyReleaseScope').addEventListener('change', () => {
      const isData = document.getElementById('dailyReleaseScope').value === 'data';
      document.getElementById('dailyReleaseDataWrap').style.display = isData ? '' : 'none';
      document.getElementById('dailyReleaseWeekdayWrap').style.display = isData ? 'none' : '';
    });

    document.getElementById('btnAddDailyRelease').addEventListener('click', async () => {
      if (!sbClient) return;
      const statusEl = document.getElementById('dailyReleaseStatus');
      const scope = document.getElementById('dailyReleaseScope').value;
      const activityVal = document.getElementById('dailyReleaseAtividade').value;
      if (!activityVal) { statusEl.textContent = 'Escolha uma atividade.'; return; }

      const [trilhaKey, modKey] = activityVal.split('::');
      const par = allTrilhasComMateria().find(p => p.trilha.key === trilhaKey);
      const mod = par ? (par.trilha.modules || []).find(m => m.key === modKey) : null;
      if (!par || !mod) { statusEl.textContent = 'Atividade inválida.'; return; }

      let targetDate = null;
      let targetWeekday = null;
      if (scope === 'data') {
        targetDate = document.getElementById('dailyReleaseData').value;
        if (!targetDate) { statusEl.textContent = 'Escolha uma data.'; return; }
      } else {
        targetWeekday = parseInt(document.getElementById('dailyReleaseWeekday').value, 10);
      }

      const newId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      await sbClient.from('daily_module_releases').upsert({
        id: newId,
        turma: cfg.id,
        scope,
        target_date: targetDate,
        target_weekday: targetWeekday,
        student_email: document.getElementById('dailyReleaseAlvo').value || '',
        trilha_key: trilhaKey,
        module_key: modKey,
        trilha_label: par.trilha.label,
        module_title: mod.title,
        created_at: new Date().toISOString()
      }, { onConflict: 'id' });

      statusEl.textContent = 'Liberado!';
      await fetchDailyReleases();
      renderGestaoDailyReleasesTable();
    });

    document.getElementById('chamadaData').addEventListener('change', () => {
      document.getElementById('chamadaResumoBox').style.display = 'none';
      loadChamada();
    });
    document.getElementById('btnFinalizarChamada').addEventListener('click', finalizarChamada);
    document.getElementById('btnCopiarResumoChamada').addEventListener('click', async () => {
      const texto = document.getElementById('chamadaResumoTexto').value;
      const statusEl = document.getElementById('chamadaResumoStatus');
      try {
        await navigator.clipboard.writeText(texto);
        statusEl.textContent = 'Copiado!';
      } catch (e) {
        statusEl.textContent = 'Não foi possível copiar automaticamente — selecione e copie manualmente.';
      }
    });
    document.getElementById('notasBimestre').addEventListener('change', loadNotas);
    document.getElementById('btnSalvarNotas').addEventListener('click', salvarNotas);
    document.getElementById('btnSalvarTrilhaDatas').addEventListener('click', salvarTrilhaDatas);
    document.getElementById('btnGerarAtividadeDia').addEventListener('click', gerarRelatorioAtividadeDia);
  }

  // ---------- Tabs principais ----------
  function switchTab(tabName) {
    checkGamesUnlock();

    document.querySelectorAll('#mainNavTabs .tab-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tab') === tabName);
    });
    document.getElementById('tabContentAulas').style.display = (tabName === 'aulas') ? 'block' : 'none';
    document.getElementById('tabContentJogos').style.display = (tabName === 'jogos') ? 'block' : 'none';
    const tabContentPerfil = document.getElementById('tabContentPerfil');
    if (tabContentPerfil) tabContentPerfil.style.display = (tabName === 'perfil') ? 'block' : 'none';
    document.getElementById('tabContentGestao').style.display = (tabName === 'gestao') ? 'block' : 'none';

    logAction(`Acessou a aba: ${tabName.toUpperCase()}`);

    if (tabName === 'gestao') renderGestaoTab();

    if (tabName === 'perfil') {
      renderPerfilTab();
      if (typeof window.resumeActivityHeartbeat === 'function') {
        window.resumeActivityHeartbeat('perfil', 'Perfil — Vendo progresso');
      }
    }

    if (tabName === 'jogos') {
      document.getElementById('gameSelector').style.display = currentGameKey ? 'none' : 'block';
      document.getElementById('gameFrameArea').style.display = currentGameKey ? 'flex' : 'none';
      if (!currentGameKey && typeof window.resumeActivityHeartbeat === 'function') {
        window.resumeActivityHeartbeat('jogos_selecao', 'Jogos — Escolhendo um jogo');
      }
    }

    if (tabName === 'aulas') {
      const materiaAberta = document.getElementById('materiaDetailArea').style.display !== 'none';
      if (!materiaAberta) {
        if (typeof window.resumeActivityHeartbeat === 'function') {
          window.resumeActivityHeartbeat('aulas_materias', 'Aulas & Atividades — Escolhendo matéria');
        }
      } else {
        const select = document.getElementById('trilhaSelect');
        const activeSub = select ? select.value : document.querySelector('#aulasSubTabPages .subtab-page')?.id.replace('subTabContent_', '');
        const trilha = allTrilhas().find(t => t.key === activeSub);
        if (trilha && !openModuleFrame[activeSub] && typeof window.resumeActivityHeartbeat === 'function') {
          window.resumeActivityHeartbeat(`aulas_${activeSub}`, `${trilha.label} — Escolhendo módulo`);
        }
      }
    }
  }

  // ---------- Jogos (compartilhados por todas as turmas) ----------
  const GAMES = {
    hacker: {
      title: 'GitHack OS — Terminal de Cibersegurança',
      desc: 'Ambiente de simulação sandbox. Conecte-se à subnet para realizar ataques e defesas.',
      icon: '🕹️',
      src: '../../games/jogo.html'
    },
    digitacao: {
      title: 'Digitação — Treino de Velocidade',
      desc: 'Pratique velocidade e precisão de digitação.',
      icon: '⌨️',
      src: '../../games/digitacao.html'
    },
    campominado: {
      title: 'Campo Minado — Lógica com JavaScript',
      desc: 'Programe o robô em JavaScript para desviar das minas e chegar à bandeira.',
      icon: '💣',
      src: '../../games/campo-minado.html'
    },
    quizrush: {
      title: 'QuizRush da Turma',
      desc: currentUser.role === 'professor'
        ? 'Escolha uma aula teórica e hospedeie um quiz ao vivo pra turma — as perguntas vêm do gabarito, sem cadastrar nada novo.'
        : 'Entre na partida ao vivo criada pelo professor. Quem acerta mais rápido, marca mais pontos!',
      icon: '🎉',
      src: '../../games/quizrush.html'
    }
  };

  function renderGameCards() {
    const grid = document.getElementById('gameCardGrid');
    grid.innerHTML = Object.keys(GAMES).map(key => {
      const g = GAMES[key];
      return `
        <div class="game-card" onclick="PortalCore.openGame('${key}')">
          <div class="icon">${g.icon}</div>
          <h3>${g.title.split(' — ')[0]}</h3>
          <p>${g.desc}</p>
        </div>`;
    }).join('');
  }

  function openGame(key) {
    const game = GAMES[key];
    if (!game) return;

    currentGameKey = key;
    document.getElementById('gameSelector').style.display = 'none';
    document.getElementById('gameFrameArea').style.display = 'flex';
    document.getElementById('gameFrameTitle').textContent = game.title;
    document.getElementById('gameFrameDesc').textContent = game.desc;

    const frame = document.getElementById('gameFrame');
    frame.onload = () => applyA11yToIframe(frame);
    frame.src = `${game.src}?user=${encodeURIComponent(paramUser)}&ip=${encodeURIComponent(paramIp)}&saldo=${encodeURIComponent(paramSaldo)}&role=${encodeURIComponent(currentUser.role)}&name=${encodeURIComponent(currentUser.nome)}&turma=${encodeURIComponent(cfg.id)}`;

    if (typeof window.pauseActivityHeartbeat === 'function') window.pauseActivityHeartbeat();
    logAction(`Abriu o jogo: ${game.title}`);
  }

  function closeGame() {
    currentGameKey = null;
    document.getElementById('gameFrameArea').style.display = 'none';
    document.getElementById('gameSelector').style.display = 'block';
    document.getElementById('gameFrame').src = 'about:blank';
    if (typeof window.resumeActivityHeartbeat === 'function') {
      window.resumeActivityHeartbeat('jogos_selecao', 'Jogos — Escolhendo um jogo');
    }
  }

  // ---------- Módulos de trilha (Aulas & Atividades) ----------
  function openModule(trilhaKey, modKey) {
    const trilha = allTrilhas().find(t => t.key === trilhaKey);
    const mod = findModule(trilhaKey, modKey);
    if (!mod || (trilha && isModuleLocked(trilha, mod))) return;

    document.getElementById(`moduleSelector_${trilhaKey}`).style.display = 'none';
    document.getElementById(`moduleFrameArea_${trilhaKey}`).style.display = 'block';
    document.getElementById(`moduleFrameTitle_${trilhaKey}`).textContent = mod.title;
    document.getElementById(`moduleFrameDesc_${trilhaKey}`).textContent = mod.desc || '';

    // Atividades de código (editor de verdade dentro do iframe) precisam do
    // máximo de altura possível — minimiza o cabeçalho pra sobrar só o
    // botão de voltar, e devolve o espaço do título/descrição pro iframe.
    const info = document.getElementById(`moduleFrameInfo_${trilhaKey}`);
    const wrapper = document.getElementById(`moduleFrameWrapper_${trilhaKey}`);
    info.style.display = mod.codeEditor ? 'none' : '';
    wrapper.style.height = mod.codeEditor ? 'min(760px, 85vh)' : 'min(560px, 70vh)';

    const frame = document.getElementById(`moduleFrame_${trilhaKey}`);
    frame.onload = () => applyA11yToIframe(frame);
    frame.src = `${mod.src}?user=${encodeURIComponent(paramUser)}&role=${encodeURIComponent(currentUser.role)}&name=${encodeURIComponent(currentUser.nome)}&turma=${encodeURIComponent(cfg.id)}`;

    openModuleFrame[trilhaKey] = modKey;
    if (typeof window.pauseActivityHeartbeat === 'function') window.pauseActivityHeartbeat();
    logAction(`Abriu o módulo: ${mod.title}`);
  }

  function closeModule(trilhaKey) {
    const closedModKey = openModuleFrame[trilhaKey];
    document.getElementById(`moduleFrameArea_${trilhaKey}`).style.display = 'none';
    document.getElementById(`moduleSelector_${trilhaKey}`).style.display = 'block';
    document.getElementById(`moduleFrame_${trilhaKey}`).src = 'about:blank';
    openModuleFrame[trilhaKey] = false;
    checkGamesUnlock();

    const trilha = allTrilhas().find(t => t.key === trilhaKey);
    if (trilha) {
      const grid = document.querySelector(`#moduleSelector_${trilhaKey} .card-grid`);
      if (grid) grid.innerHTML = buildModuleCardsHtml(trilha);

      const closedMod = closedModKey && findModule(trilhaKey, closedModKey);
      if (closedMod) syncModuleProgress(trilha, closedMod).then(renderRankingBadge);
    }
    if (trilha && typeof window.resumeActivityHeartbeat === 'function') {
      window.resumeActivityHeartbeat(`aulas_${trilhaKey}`, `${trilha.label} — Escolhendo módulo`);
    }
  }

  // Escuta o aviso que shared/progress-sync.js manda do <iframe> do módulo
  // toda vez que o progresso local muda — inclusive no exato momento em que
  // um desafio/pergunta é concluído. Sem isso, card/cadeado/ranking só
  // refletiam a conclusão quando o aluno clicava "← Voltar" (closeModule);
  // qualquer outra forma de sair (fechar a aba, deslogar, trocar de tela)
  // deixava o progresso "preso" só no localStorage, sem nunca subir pro
  // student_module_progress — dando a sensação de que nada foi salvo.
  function setupProgressSyncListener() {
    window.addEventListener('message', (event) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || !data.pfProgressSync || !data.activityLocation) return;
      allTrilhas().forEach(trilha => {
        (trilha.modules || []).forEach(mod => {
          if ((mod.progressKey || '').replace(/_progress_$/, '') !== data.activityLocation) return;
          const grid = document.querySelector(`#moduleSelector_${trilha.key} .card-grid`);
          if (grid) grid.innerHTML = buildModuleCardsHtml(trilha);
          checkGamesUnlock();
          syncModuleProgress(trilha, mod).then(renderRankingBadge);
        });
      });
    });
  }

  // ---------- Acessibilidade ----------
  // Módulos/jogos abrem em <iframe> com documento próprio — as variáveis de
  // fonte do documento pai não "vazam" pra dentro sozinhas. Aplica as mesmas
  // variáveis no <html> do iframe (mesma origem, então contentDocument é
  // acessível) sempre que ele carrega e sempre que o professor/aluno troca
  // a fonte com um módulo já aberto.
  function applyA11yToIframe(frame) {
    if (!frame || !frame.src || frame.src === 'about:blank') return;
    try {
      const root = frame.contentDocument && frame.contentDocument.documentElement;
      if (!root) return;
      if (a11y.fontMode === 'traditional') {
        root.style.setProperty('--user-font', 'system-ui, -apple-system, sans-serif');
        root.style.setProperty('--user-font-display', 'system-ui, -apple-system, sans-serif');
      } else {
        root.style.setProperty('--user-font', "'JetBrains Mono', monospace");
        root.style.setProperty('--user-font-display', "'VT323', monospace");
      }
      root.style.setProperty('--user-font-scale', a11y.fontScale);
    } catch (e) {
      // iframe ainda não carregou o document, ou é de outra origem — ignora
    }
  }

  function applyA11yToOpenIframes() {
    applyA11yToIframe(document.getElementById('gameFrame'));
    document.querySelectorAll('iframe[id^="moduleFrame_"]').forEach(applyA11yToIframe);
  }

  function applyA11y() {
    const root = document.documentElement;
    const btnFontStyle = document.getElementById('btnFontStyle');
    if (a11y.fontMode === 'traditional') {
      root.style.setProperty('--user-font', 'system-ui, -apple-system, sans-serif');
      root.style.setProperty('--user-font-display', 'system-ui, -apple-system, sans-serif');
      btnFontStyle.classList.add('on');
      btnFontStyle.title = 'Fonte tradicional ativa — clique para usar a fonte pixelada';
    } else {
      root.style.setProperty('--user-font', "'JetBrains Mono', monospace");
      root.style.setProperty('--user-font-display', "'VT323', monospace");
      btnFontStyle.classList.remove('on');
      btnFontStyle.title = 'Fonte pixelada ativa — clique para usar a fonte tradicional';
    }
    root.style.setProperty('--user-font-scale', a11y.fontScale);
    applyA11yToOpenIframes();

    const vw = document.querySelector('div[vw]');
    if (vw) vw.style.display = a11y.libras ? '' : 'none';
    document.getElementById('btnLibras').classList.toggle('on', a11y.libras);
  }

  function setupVLibras() {
    const script = document.createElement('script');
    script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
    script.onload = () => { if (window.VLibras) new window.VLibras.Widget('https://vlibras.gov.br/app'); };
    document.body.appendChild(script);
  }

  // ---------- Bootstrap ----------
  function setupRBAC() {
    document.getElementById('txtUserNom').textContent = currentUser.nome;
    document.getElementById('txtUserTurma').textContent = currentUser.role === 'professor' ? 'Corpo Docente' : cfg.label;

    if (currentUser.role === 'aluno') {
      fetchTeacherOverride();
      setupOverrideRealtime();
      fetchTrilhaDates();
      setupTrilhaDatesRealtime();
      fetchDailyReleases();
      setupDailyReleasesRealtime();
      renderRankingBadge();
    }

    checkGamesUnlock();
    switchTab('aulas');
    // Tela padrão da aba Aulas agora é o grid de matérias (renderMaterias,
    // chamado em init()) — nenhuma trilha é aberta sozinha no carregamento.
  }

  function init() {
    renderShell();
    renderMaterias();
    renderGameCards();
    setupVLibras();
    setupProgressSyncListener();
    // setupRBAC() já chama renderRankingBadge() de cara (abaixo), com o que
    // o Supabase tinha ANTES desta hidratação/sync — pra não atrasar a
    // primeira pintura da tela nisso. Essa segunda chamada, só depois que a
    // hidratação+sync termina de verdade, corrige o badge caso a primeira
    // tenha renderizado com a % desatualizada (a linha do PRÓPRIO aluno
    // ainda não tinha chegado no student_module_progress).
    syncAllModulesProgressSafely().then(() => {
      if (currentUser.role === 'aluno') renderRankingBadge();
    });
    if (currentUser.role === 'professor') setupGestaoButtons();

    document.querySelectorAll('#mainNavTabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabTarget = e.target.getAttribute('data-tab');
        if (tabTarget === 'jogos' && e.target.classList.contains('disabled')) {
          showAlert('A aba de jogos está bloqueada! Conclua 100% das suas tarefas do dia ou aguarde a liberação do professor.');
          return;
        }
        switchTab(tabTarget);
      });
    });

    document.getElementById('btnLogout').addEventListener('click', () => {
      logAction('Efetuou logout', currentUser.nome);
      sessionStorage.clear();
      window.location.href = '../../index.html';
    });

    document.getElementById('btnFontStyle').addEventListener('click', () => {
      a11y.fontMode = a11y.fontMode === 'pixel' ? 'traditional' : 'pixel';
      applyA11y();
    });
    document.getElementById('btnFontBigger').addEventListener('click', () => {
      a11y.fontScale = Math.min(1.6, Math.round((a11y.fontScale + 0.1) * 10) / 10);
      applyA11y();
    });
    document.getElementById('btnFontSmaller').addEventListener('click', () => {
      a11y.fontScale = Math.max(0.85, Math.round((a11y.fontScale - 0.1) * 10) / 10);
      applyA11y();
    });
    document.getElementById('btnLibras').addEventListener('click', () => {
      a11y.libras = !a11y.libras;
      applyA11y();
    });

    setupRBAC();
    applyA11y();

    window.ACTIVITY_STUDENT_NAME = currentUser.nome;
    window.ACTIVITY_STUDENT_EMAIL = currentUser.email;
    window.ACTIVITY_STUDENT_TURMA = currentUser.turma;
    window.ACTIVITY_STUDENT_ROLE = currentUser.role;
    window.ACTIVITY_LOCATION = 'aulas_materias';
    window.ACTIVITY_LABEL = 'Aulas & Atividades — Escolhendo matéria';

    const tracker = document.createElement('script');
    tracker.src = '../../shared/activity-tracker.js';
    document.body.appendChild(tracker);
  }

  // API usada pelos onclick="" gerados dinamicamente
  window.PortalCore = { openGame, closeGame, openModule, closeModule, openMateria, closeMateria, toggleStudentGamesTurma, toggleGestaoSection, removeDailyRelease };

  document.addEventListener('DOMContentLoaded', init);
})();
