// Motor do QuizRush do portal (games/quizrush.html), reaproveitado tanto pela
// visão do professor (host) quanto pela do aluno (jogador). Cuida de 3
// coisas que não são "tela":
//
// 1) Buscar as perguntas de múltipla escolha de um módulo já existente —
//    sem cadastrar NADA novo, ver fetchModuleQuestions() abaixo, que
//    reaproveita o gabarito (shared/gabarito-generator.js) que cada
//    atividade teórica (formato STEPS + quiz) já expõe via
//    window.generateGabaritoForGestao().
// 2) Ler o TURMA_CONFIG da turma atual (o próprio games/quizrush.html não
//    tem acesso a ele — só o plataforma.html de cada turma carrega esse
//    arquivo hoje) e listar os módulos candidatos.
// 3) Persistir/observar a sessão ao vivo no Supabase (quizrush_sessions/
//    quizrush_players/quizrush_answers — ver sql/supabase-quizrush.sql),
//    incluindo o cálculo de pontuação (acerto + velocidade).
window.QuizRushEngine = (function () {
  function client() {
    if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) return null;
    try { return window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY); }
    catch (e) { return null; }
  }

  const sb = client();

  // ---------- TURMA_CONFIG + módulos candidatos ----------

  const loadedConfigs = {};

  // games/quizrush.html não é carregado dentro do plataforma.html de uma
  // turma (é só mais um jogo, num <iframe> igual aos outros) — então
  // window.TURMA_CONFIG nunca chega até aqui sozinho. Carregamos o mesmo
  // config.js que o plataforma.html da turma usaria, na mão.
  function loadTurmaConfig(turma) {
    if (loadedConfigs[turma]) return Promise.resolve(loadedConfigs[turma]);
    const globalName = 'TURMA_CONFIG_' + String(turma || '').toUpperCase();
    if (window[globalName]) {
      loadedConfigs[turma] = window[globalName];
      return Promise.resolve(window[globalName]);
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `../turmas/${turma}/config.js`;
      script.onload = () => {
        const cfg = window[globalName];
        if (cfg) { loadedConfigs[turma] = cfg; resolve(cfg); }
        else reject(new Error('config.js carregou mas não definiu ' + globalName));
      };
      script.onerror = () => reject(new Error('Não foi possível carregar ' + script.src));
      document.head.appendChild(script);
    });
  }

  // Achata materias[].trilhas[].modules[] (mesma hierarquia usada no
  // resto do portal — ver README, "Hierarquia Matéria → Trilha →
  // Módulo") numa lista só, mantendo só os módulos com gabarito (só eles
  // expõem window.generateGabaritoForGestao, ver fetchModuleQuestions).
  function listGabaritoModules(cfgTurma) {
    const out = [];
    (cfgTurma.materias || []).forEach(materia => {
      (materia.trilhas || []).forEach(trilha => {
        (trilha.modules || []).forEach(mod => {
          if (mod.hasGabarito) {
            out.push({
              trilhaKey: trilha.key,
              trilhaLabel: trilha.label,
              moduleKey: mod.key,
              moduleTitle: mod.title,
              mod
            });
          }
        });
      });
    });
    return out;
  }

  // Carrega o módulo num iframe escondido (mesmo esquema de
  // generateGabaritoFor/generateSlidesFor em shared/platform-core.js) e
  // chama a função de gabarito que ele já expõe — só que aqui a gente
  // INTERCEPTA window.PortalGabarito.generate antes de chamar, pra
  // capturar a lista `items` estruturada (prompt/options/correctIndex)
  // em vez de baixar o .txt. Zero mudança em qualquer atividade
  // existente: a interceptação troca só a referência dentro do iframe
  // isolado, nunca o arquivo real.
  // No array-fonte de cada atividade a resposta certa costuma cair sempre
  // em correctIndex 0 — as telas de teoria/prática de cada trilha já
  // embaralham a ordem na hora de exibir (ver commit "corrige resposta
  // sempre em A nas atividades práticas"), mas o QuizRush lê esse array
  // direto do gabarito, sem passar por aquele embaralhamento. Sem isso, a
  // resposta certa caía sempre no primeiro tile (vermelho) da roleta de
  // cores do Kahoot-like, entregando de graça em toda pergunta.
  function shuffleQuestionOptions(q) {
    const order = q.options.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return {
      prompt: q.prompt,
      options: order.map(i => q.options[i]),
      correctIndex: order.indexOf(q.correctIndex)
    };
  }

  function fetchModuleQuestions({ turma, mod, email }) {
    return new Promise((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:absolute; width:0; height:0; border:0; visibility:hidden;';
      iframe.src = `../turmas/${turma}/${mod.src}?user=${encodeURIComponent(email || '')}&role=professor&turma=${encodeURIComponent(turma)}`;

      let settled = false;
      const finish = (questions) => {
        if (settled) return;
        settled = true;
        iframe.remove();
        resolve(questions);
      };

      // Best-effort: um módulo mal-configurado não pode travar a tela do
      // professor pra sempre esperando um onload que nunca resolve.
      const timeout = setTimeout(() => finish([]), 8000);

      iframe.onload = () => {
        try {
          const win = iframe.contentWindow;
          let captured = null;
          if (win && win.PortalGabarito) {
            win.PortalGabarito.generate = (config) => { captured = config; return { items: config.items || [] }; };
          }
          if (win && typeof win.generateGabaritoForGestao === 'function') {
            win.generateGabaritoForGestao();
          }
          clearTimeout(timeout);
          const items = (captured && captured.items) || [];
          // Só perguntas de múltipla escolha de verdade servem pro QuizRush
          // (atividades práticas de código têm gabarito por caso de
          // teste, sem `options`/`correctIndex` — ver formato em
          // shared/gabarito-generator.js).
          const questions = items
            .filter(it => Array.isArray(it.options) && it.options.length >= 2 && typeof it.correctIndex === 'number')
            .map(it => shuffleQuestionOptions({ prompt: it.prompt, options: it.options, correctIndex: it.correctIndex }));
          finish(questions);
        } catch (e) {
          clearTimeout(timeout);
          finish([]);
        }
      };
      iframe.onerror = () => { clearTimeout(timeout); finish([]); };
      document.body.appendChild(iframe);
    });
  }

  // ---------- Sessão (Supabase) ----------

  async function getLatestSession(turma) {
    if (!sb || !turma) return null;
    const { data, error } = await sb.from('quizrush_sessions').select('*')
      .eq('turma', turma).order('created_at', { ascending: false }).limit(1);
    if (error) { console.error('[QuizRushEngine] falha ao buscar sessão:', error); return null; }
    return (data && data[0]) || null;
  }

  async function createSession({ turma, email, trilhaLabel, moduleTitle, questions, durationMs }) {
    const id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const row = {
      id, turma, created_by: email, trilha_label: trilhaLabel, module_title: moduleTitle,
      questions, status: 'lobby', current_index: 0, question_started_at: null,
      question_duration_ms: durationMs || 25000, created_at: new Date().toISOString()
    };
    const { error } = await sb.from('quizrush_sessions').upsert(row, { onConflict: 'id' });
    if (error) { console.error('[QuizRushEngine] falha ao criar sessão:', error); return null; }
    return row;
  }

  function updateSession(id, patch) {
    return sb.from('quizrush_sessions').update(patch).eq('id', id);
  }

  // question_started_at vem do relógio do BANCO (RPC com now()), não do
  // dispositivo de quem clica — um relógio local adiantado/errado fazia o
  // cronômetro já nascer "expirado" pros alunos ("tempo esgotado" na hora).
  async function startSession(id) {
    const { data, error } = await sb.rpc('quizrush_start_session', { p_session_id: id });
    if (error) { console.error('[QuizRushEngine] falha ao iniciar sessão:', error); return null; }
    return data;
  }
  async function nextQuestion(id, index) {
    const { data, error } = await sb.rpc('quizrush_next_question', { p_session_id: id, p_index: index });
    if (error) { console.error('[QuizRushEngine] falha ao avançar pergunta:', error); return null; }
    return data;
  }

  // question_started_at vem do relógio do banco, mas o cronômetro na tela
  // ainda precisa comparar isso com Date.now() do próprio dispositivo pra
  // saber quanto tempo falta — um relógio local errado voltava a causar
  // "tempo esgotado" cedo/tarde demais mesmo com a hora de início certa.
  // Mede a diferença uma vez (localMid - metade do round-trip ~= quando o
  // banco respondeu "agora") pra somar em todo Date.now() usado no timer.
  async function getServerTimeMs() {
    if (!sb) return 0;
    const before = Date.now();
    const { data, error } = await sb.rpc('quizrush_server_now');
    const after = Date.now();
    if (error || !data) { console.error('[QuizRushEngine] falha ao medir relógio do servidor:', error); return 0; }
    const roundTrip = after - before;
    const localMid = before + roundTrip / 2;
    return new Date(data).getTime() - localMid;
  }
  const reveal = (id) => updateSession(id, { status: 'reveal' });
  const showPodium = (id) => updateSession(id, { status: 'podium' });
  const endSession = (id) => updateSession(id, { status: 'ended' });

  async function joinSession(sessionId, email, name) {
    if (!sb || !sessionId || !email) return;
    const { error } = await sb.from('quizrush_players').upsert(
      { session_id: sessionId, student_email: email, student_name: name || email },
      { onConflict: 'session_id,student_email' }
    );
    if (error) console.error('[QuizRushEngine] falha ao entrar na partida:', error);
  }

  async function fetchPlayers(sessionId) {
    if (!sb || !sessionId) return [];
    const { data, error } = await sb.from('quizrush_players').select('*').eq('session_id', sessionId);
    if (error) { console.error('[QuizRushEngine] falha ao listar jogadores:', error); return []; }
    return data || [];
  }

  async function fetchAnswers(sessionId) {
    if (!sb || !sessionId) return [];
    const { data, error } = await sb.from('quizrush_answers').select('*').eq('session_id', sessionId);
    if (error) { console.error('[QuizRushEngine] falha ao listar respostas:', error); return []; }
    return data || [];
  }

  // Clássico do QuizRush: só pontua se acertou, e quanto mais rápido dentro
  // do tempo, mais pontos (500 a 1000) — por isso "mais rápido" E "mais
  // acertos" andam juntos numa única soma, sem precisar de critério de
  // desempate separado.
  function scoreFor(isCorrect, elapsedMs, durationMs) {
    if (!isCorrect) return 0;
    const ratio = Math.max(0, Math.min(1, elapsedMs / (durationMs || 1)));
    return Math.round(500 + 500 * (1 - ratio));
  }

  async function submitAnswer({ sessionId, email, name, questionIndex, choiceIndex, correctIndex, elapsedMs, durationMs }) {
    if (!sb || !sessionId || !email) return null;
    const isCorrect = choiceIndex === correctIndex;
    const score = scoreFor(isCorrect, elapsedMs, durationMs);
    const { error } = await sb.from('quizrush_answers').upsert({
      session_id: sessionId, student_email: email, student_name: name || email,
      question_index: questionIndex, choice_index: choiceIndex, is_correct: isCorrect, score
    }, { onConflict: 'session_id,student_email,question_index' });
    if (error) { console.error('[QuizRushEngine] falha ao enviar resposta:', error); return null; }
    return { isCorrect, score };
  }

  function leaderboardFrom(answers) {
    const byStudent = {};
    answers.forEach(a => {
      const key = a.student_email;
      if (!byStudent[key]) byStudent[key] = { email: key, name: a.student_name, score: 0, correct: 0, answered: 0 };
      byStudent[key].score += Number(a.score) || 0;
      byStudent[key].answered += 1;
      if (a.is_correct) byStudent[key].correct += 1;
    });
    return Object.values(byStudent).sort((a, b) => b.score - a.score);
  }

  function watchTable(table, filterCol, filterVal, onChange) {
    if (!sb) return () => {};
    const channel = sb.channel(`realtime_${table}_${filterVal}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, filter: `${filterCol}=eq.${filterVal}` }, onChange)
      .subscribe();
    return () => { try { sb.removeChannel(channel); } catch (e) {} };
  }

  const watchSession = (id, cb) => watchTable('quizrush_sessions', 'id', id, cb);
  const watchPlayers = (id, cb) => watchTable('quizrush_players', 'session_id', id, cb);
  const watchAnswers = (id, cb) => watchTable('quizrush_answers', 'session_id', id, cb);

  // Pra o aluno detectar uma sessão nova nascendo sem precisar recarregar
  // a página — assim que o professor clica em "Criar QuizRush", quem já
  // está com a aba de Jogos aberta é puxado direto pra tela de entrada.
  const watchNewSessions = (turma, cb) => watchTable('quizrush_sessions', 'turma', turma, cb);

  return {
    enabled: !!sb,
    loadTurmaConfig, listGabaritoModules, fetchModuleQuestions,
    getLatestSession, createSession, startSession, nextQuestion, getServerTimeMs, reveal, showPodium, endSession,
    joinSession, fetchPlayers, fetchAnswers, submitAnswer, scoreFor, leaderboardFrom,
    watchSession, watchPlayers, watchAnswers, watchNewSessions
  };
})();
