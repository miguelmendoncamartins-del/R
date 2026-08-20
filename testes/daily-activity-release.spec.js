// @ts-check
// Liberação diária/semanal de atividades (aba Gestão, seção "Liberação
// Diária de Atividades" dentro de "Bloqueios e Liberações"). Quando o
// professor libera um módulo pra hoje (data específica ou dia da semana
// recorrente), os jogos ficam bloqueados até aquele módulo específico ser
// concluído — mesmo que o resto da trilha já esteja em dia — e a checagem
// é sempre contra a data/dia da semana atual, então o cadeado volta sozinho
// no dia seguinte sem nenhuma ação nova do professor.
const { test, expect } = require('@playwright/test');
const { stubSupabaseFake } = require('./helpers');

const JOGOS_PROFESSOR_URL = '/turmas/jogos/plataforma.html?user=admin&ip=192.168.1.254&saldo=9999.00&role=professor&turma=jogos';
const ALUNO_URL = '/turmas/jogos/plataforma.html?user=breno.silva80&ip=192.168.1.10&saldo=1234.80&role=aluno&turma=jogos';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function expandGestaoSection(page, titulo) {
  await page.locator('.collapsible-card .collapsible-head', { hasText: titulo }).click();
}

test.describe('Gestão — liberação diária de atividades (professor)', () => {
  test('libera uma atividade pra turma inteira numa data específica e ela aparece na tabela', async ({ page }) => {
    await stubSupabaseFake(page, { daily_module_releases: [] });
    await page.goto(JOGOS_PROFESSOR_URL);
    await page.click('#mainNavTabs .tab-btn[data-tab="gestao"]');
    await page.waitForTimeout(200);
    await expandGestaoSection(page, 'Bloqueios e Liberações');

    await expect(page.locator('#dailyReleaseData')).toHaveValue(todayIso());
    await page.selectOption('#dailyReleaseAtividade', 'csharp::basico');
    await page.click('#btnAddDailyRelease');

    await expect(page.locator('#dailyReleaseStatus')).toContainText('Liberado');
    const row = page.locator('#tblDailyReleasesBody tr');
    await expect(row).toContainText('Turma inteira');
    await expect(row).toContainText('C# — Básico — A Jornada do Eri');

    const rows = await page.evaluate(() => window.__FAKE_DB__.daily_module_releases || []);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      turma: 'jogos', scope: 'data', target_date: todayIso(),
      student_email: '', trilha_key: 'csharp', module_key: 'basico',
    });
  });

  test('libera uma atividade pra um aluno específico', async ({ page }) => {
    await stubSupabaseFake(page, { daily_module_releases: [] });
    await page.goto(JOGOS_PROFESSOR_URL);
    await page.click('#mainNavTabs .tab-btn[data-tab="gestao"]');
    await page.waitForTimeout(200);
    await expandGestaoSection(page, 'Bloqueios e Liberações');

    await page.selectOption('#dailyReleaseAlvo', 'breno.silva80');
    await page.selectOption('#dailyReleaseAtividade', 'csharp::basico');
    await page.click('#btnAddDailyRelease');

    await expect(page.locator('#tblDailyReleasesBody tr')).toContainText('Breno Silva');

    const rows = await page.evaluate(() => window.__FAKE_DB__.daily_module_releases || []);
    expect(rows[0]).toMatchObject({ student_email: 'breno.silva80' });
  });

  test('liberação recorrente por dia da semana grava scope "semana" sem data', async ({ page }) => {
    await stubSupabaseFake(page, { daily_module_releases: [] });
    await page.goto(JOGOS_PROFESSOR_URL);
    await page.click('#mainNavTabs .tab-btn[data-tab="gestao"]');
    await page.waitForTimeout(200);
    await expandGestaoSection(page, 'Bloqueios e Liberações');

    await page.selectOption('#dailyReleaseScope', 'semana');
    await expect(page.locator('#dailyReleaseWeekdayWrap')).toBeVisible();
    await expect(page.locator('#dailyReleaseDataWrap')).toBeHidden();

    await page.selectOption('#dailyReleaseWeekday', '3'); // quarta-feira
    await page.selectOption('#dailyReleaseAtividade', 'csharp::basico');
    await page.click('#btnAddDailyRelease');

    const rows = await page.evaluate(() => window.__FAKE_DB__.daily_module_releases || []);
    expect(rows[0]).toMatchObject({ scope: 'semana', target_weekday: 3, target_date: null });
    await expect(page.locator('#tblDailyReleasesBody tr')).toContainText('Toda Quarta-feira');
  });

  test('remover uma liberação apaga a linha', async ({ page }) => {
    await stubSupabaseFake(page, {
      daily_module_releases: [{
        id: 'r1', turma: 'jogos', scope: 'data', target_date: todayIso(), target_weekday: null,
        student_email: '', trilha_key: 'csharp', module_key: 'basico',
        trilha_label: 'C#', module_title: 'Básico — A Jornada do Eri',
      }],
    });
    await page.goto(JOGOS_PROFESSOR_URL);
    await page.click('#mainNavTabs .tab-btn[data-tab="gestao"]');
    await page.waitForTimeout(200);
    await expandGestaoSection(page, 'Bloqueios e Liberações');

    await expect(page.locator('#tblDailyReleasesBody tr')).toHaveCount(1);
    await page.click('#tblDailyReleasesBody button:has-text("Remover")');

    await expect(page.locator('#tblDailyReleasesBody')).toContainText('Nenhuma atividade liberada');
    const rows = await page.evaluate(() => window.__FAKE_DB__.daily_module_releases || []);
    expect(rows).toHaveLength(0);
  });
});

test.describe('Liberação diária — visão do aluno', () => {
  test('atividade liberada pra turma inteira hoje bloqueia os jogos até ser concluída, mesmo com o resto pendente', async ({ page }) => {
    await stubSupabaseFake(page, {
      daily_module_releases: [{
        id: 'r1', turma: 'jogos', scope: 'data', target_date: todayIso(), target_weekday: null,
        student_email: '', trilha_key: 'csharp', module_key: 'basico',
      }],
    });
    await page.goto(ALUNO_URL);

    const tabJogos = page.locator('#tabBtnJogos');
    await expect(tabJogos).toHaveClass(/disabled/);
    await expect(tabJogos).toHaveAttribute('title', /liberada\(s\) pelo professor para hoje/);

    // conclui só a atividade liberada (csharp básico) — o resto da trilha (JS) continua pendente
    await page.evaluate(() => {
      localStorage.setItem('csharp_basico_progress_breno.silva80', JSON.stringify({ completed: true }));
    });
    await page.click('.game-card:has-text("Fundamentos de Programação")');
    await page.selectOption('#trilhaSelect', 'csharp');
    await page.click('#moduleSelector_csharp .game-card');
    await page.click('#moduleFrameArea_csharp .btn-secondary');

    await expect(tabJogos).not.toHaveClass(/disabled/);
    await expect(tabJogos).toContainText('🎮');
  });

  test('liberação endereçada a outro aluno não bloqueia quem não foi alvo', async ({ page }) => {
    await stubSupabaseFake(page, {
      daily_module_releases: [{
        id: 'r1', turma: 'jogos', scope: 'data', target_date: todayIso(), target_weekday: null,
        student_email: 'outro.aluno', trilha_key: 'csharp', module_key: 'basico',
      }],
    });
    await page.addInitScript(user => {
      // Trilhas teoria+prática (10 perguntas cada) de todas as matérias com
      // conteúdo, exceto Projeto de Vida (5 perguntas — ver [[project_jogos_5_perguntas_pratica]]).
      const dez = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const cinco = [1, 2, 3, 4, 5];
      const teoriaFlag = [
        'vida_autoconhecimento_teoria', 'vida_cidadania_teoria', 'vida_emocional_teoria', 'vida_equipe_teoria',
        'mundo_revolucao_teoria', 'mundo_inovacao_teoria', 'mundo_equipe_teoria',
        'projetos_metodos_teoria', 'projetos_fases_teoria',
        'cod_ide_teoria', 'cod_linguagens_teoria', 'cod_seguranca_debug_teoria', 'cod_poo_teoria', 'cod_agil_clean_teoria', 'cod_seguranca_ia_teoria',
        'fund_ambiente_teoria', 'fund_logica_teoria', 'fund_prog2d_teoria', 'fund_multimidia_teoria',
        'teste_fundamentos_teoria', 'teste_planejamento_teoria', 'teste_execucao_teoria'
      ];
      teoriaFlag.forEach(k => localStorage.setItem(`${k}_progress_${user}`, JSON.stringify({ completed: true })));
      localStorage.setItem(`csharp_basico_progress_${user}`, JSON.stringify({ completed: true }));

      const praticaDez = [
        'mundo_revolucao_pratica', 'mundo_inovacao_pratica', 'mundo_equipe_pratica',
        'projetos_metodos_pratica', 'projetos_fases_pratica',
        'cod_ide_pratica', 'cod_linguagens_pratica', 'cod_seguranca_debug_pratica', 'cod_poo_pratica', 'cod_agil_clean_pratica', 'cod_seguranca_ia_pratica',
        'fund_ambiente_pratica', 'fund_logica_pratica', 'fund_prog2d_pratica', 'fund_multimidia_pratica',
        'teste_fundamentos_pratica', 'teste_planejamento_pratica', 'teste_execucao_pratica'
      ];
      praticaDez.forEach(k => localStorage.setItem(`${k}_progress_${user}`, JSON.stringify(dez)));
      localStorage.setItem(`js_basico_progress_${user}`, JSON.stringify(dez));
      localStorage.setItem(`js_intermediario_progress_${user}`, JSON.stringify(dez));

      const praticaCinco = ['vida_autoconhecimento_pratica', 'vida_cidadania_pratica', 'vida_emocional_pratica', 'vida_equipe_pratica'];
      praticaCinco.forEach(k => localStorage.setItem(`${k}_progress_${user}`, JSON.stringify(cinco)));
    }, 'breno.silva80');

    await page.goto(ALUNO_URL);
    // como a liberação não é dele, cai na regra padrão (tudo completo) — e está tudo completo
    await expect(page.locator('#tabBtnJogos')).not.toHaveClass(/disabled/);
  });

  test('liberação recorrente por dia da semana vale hoje mesmo sem data específica', async ({ page }) => {
    const weekday = new Date().getDay();
    await stubSupabaseFake(page, {
      daily_module_releases: [{
        id: 'r1', turma: 'jogos', scope: 'semana', target_date: null, target_weekday: weekday,
        student_email: '', trilha_key: 'csharp', module_key: 'basico',
      }],
    });
    await page.goto(ALUNO_URL);
    await expect(page.locator('#tabBtnJogos')).toHaveClass(/disabled/);
  });

  // Regressão: a liberação diária só mexia no cadeado dos JOGOS — se o
  // professor tivesse bloqueado a TRILHA inteira, a atividade liberada
  // continuava impossível de abrir (o aluno via o card, mas ele ficava
  // cinza/travado igual aos outros). A liberação de hoje precisa destravar
  // o módulo em si, não só contar pra desbloquear os jogos depois.
  test('atividade liberada hoje fica acessível mesmo com a trilha ainda não tendo começado', async ({ page }) => {
    await stubSupabaseFake(page, {
      trilha_release_dates: [
        { turma: 'jogos', trilha_key: 'js', inicio: '2999-01-01' },
        { turma: 'jogos', trilha_key: 'csharp', inicio: '2999-01-01' },
      ],
      daily_module_releases: [{
        id: 'r1', turma: 'jogos', scope: 'data', target_date: todayIso(), target_weekday: null,
        student_email: '', trilha_key: 'csharp', module_key: 'basico',
      }],
    });
    await page.goto(ALUNO_URL);
    await page.click('.game-card:has-text("Fundamentos de Programação")');

    // csharp aparece por causa da liberação diária, mesmo com início no futuro;
    // js continua escondida (a exceção é só do módulo liberado, não da matéria toda).
    await expect(page.locator('#trilhaSelect option[value="csharp"]')).toHaveCount(1);
    await expect(page.locator('#trilhaSelect option[value="js"]')).toHaveCount(0);

    await page.selectOption('#trilhaSelect', 'csharp');
    const liberado = page.locator('#moduleSelector_csharp .game-card', { hasText: 'Básico — A Jornada do Eri' });
    await expect(liberado).not.toHaveClass(/locked/);
    await expect(liberado).toContainText('Liberado hoje');
    await liberado.click();
    await expect(page.locator('#moduleFrameArea_csharp')).toBeVisible();
    await page.click('#moduleFrameArea_csharp .btn-secondary');
  });
});

test.describe('Liberação diária — notificação de atividade nova', () => {
  test('liberação criada com a sessão do aluno já aberta mostra um toast', async ({ page }) => {
    await stubSupabaseFake(page, { daily_module_releases: [] });
    await page.goto(ALUNO_URL);

    // ainda não existe nada — nenhum aviso na tela
    await expect(page.locator('.pf-toast')).toHaveCount(0);

    // professor libera uma atividade "ao vivo": grava no banco e dispara o
    // realtime que o aluno já está inscrito (setupDailyReleasesRealtime).
    await page.evaluate(() => {
      window.__FAKE_DB__.daily_module_releases.push({
        id: 'r1', turma: 'jogos', scope: 'data', target_date: new Date().toISOString().slice(0, 10), target_weekday: null,
        student_email: '', trilha_key: 'csharp', module_key: 'basico',
        trilha_label: 'C#', module_title: 'Básico — A Jornada do Eri',
      });
      window.__fireFakeRealtime('daily_module_releases');
    });

    const toast = page.locator('.pf-toast');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Nova atividade liberada');
    await expect(toast).toContainText('C# — Básico — A Jornada do Eri');

    await toast.locator('.pf-toast-close').click();
    await expect(page.locator('.pf-toast')).toHaveCount(0);
  });

  test('liberação que já existia antes de abrir o portal não gera toast', async ({ page }) => {
    await stubSupabaseFake(page, {
      daily_module_releases: [{
        id: 'r1', turma: 'jogos', scope: 'data', target_date: todayIso(), target_weekday: null,
        student_email: '', trilha_key: 'csharp', module_key: 'basico',
      }],
    });
    await page.goto(ALUNO_URL);
    await page.waitForTimeout(300);

    await expect(page.locator('.pf-toast')).toHaveCount(0);
  });

  test('professor não recebe o toast quando libera uma atividade', async ({ page }) => {
    await stubSupabaseFake(page, { daily_module_releases: [] });
    await page.goto(JOGOS_PROFESSOR_URL);
    await page.click('#mainNavTabs .tab-btn[data-tab="gestao"]');
    await page.waitForTimeout(200);
    await expandGestaoSection(page, 'Bloqueios e Liberações');

    await page.selectOption('#dailyReleaseAtividade', 'csharp::basico');
    await page.click('#btnAddDailyRelease');
    await expect(page.locator('#dailyReleaseStatus')).toContainText('Liberado');

    await expect(page.locator('.pf-toast')).toHaveCount(0);
  });
});
