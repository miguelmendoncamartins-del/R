// @ts-check
const { test, expect } = require('@playwright/test');
const { stubSupabaseDisabled, stubSupabaseFake } = require('./helpers');

const URL = '/turmas/jogos/plataforma.html?user=breno.silva80&ip=192.168.1.10&saldo=1234.80&role=aluno';

// As trilhas de verdade (JS/C#) ficam dentro de Fundamentos de Programação,
// junto com as trilhas fund-*.
async function openMateria1(page) {
  await page.click('.game-card:has-text("Fundamentos de Programação")');
}

test.describe('turmas/jogos/plataforma.html', () => {
  test.beforeEach(async ({ page }) => {
    await stubSupabaseDisabled(page);
  });

  test('mostra os cards das 6 matérias de Jogos Digitais', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('#materiaCardGrid .game-card')).toHaveCount(6);
    await expect(page.locator('#materiaCardGrid')).toContainText('Fundamentos de Programação');
    await expect(page.locator('#materiaCardGrid')).toContainText('Testes de Jogos Digitais');
  });

  test('carrega tema, usuário e trilhas JS/C# dentro de Fundamentos de Programação', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('#txtUserNom')).toHaveText('Breno Silva');
    await expect(page.locator('#txtUserTurma')).toHaveText('Jogos Digitais');

    await openMateria1(page);

    // 6 trilhas nessa matéria (fundamentos genéricos + JS/C#) — vira um
    // <select> só, começando na primeira trilha cadastrada.
    await expect(page.locator('#trilhaSelect')).toHaveValue('fund-ambiente');
    await expect(page.locator('#trilhaSelect option[value="js"]')).toHaveCount(1);
    await expect(page.locator('#trilhaSelect option[value="csharp"]')).toHaveCount(1);

    // tema "hacker": --green deve ser o verde original, não o azul de Sistemas
    const green = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--green').trim());
    expect(green).toBe('#7cff3f');
  });

  test('aba Jogos começa bloqueada quando os módulos não foram concluídos', async ({ page }) => {
    await page.goto(URL);
    const tabJogos = page.locator('#tabBtnJogos');
    await expect(tabJogos).toHaveClass(/disabled/);
    await expect(tabJogos).toContainText('🔒');
    await expect(tabJogos).toHaveAttribute('title', /Bloqueado/);

    // clicar numa aba bloqueada não deve abrir os jogos
    page.once('dialog', d => d.accept());
    await tabJogos.click();
    await expect(page.locator('#tabContentJogos')).toBeHidden();
  });

  test('abrir e fechar um módulo de trilha troca a área visível', async ({ page }) => {
    await page.goto(URL);
    await openMateria1(page);
    await page.selectOption('#trilhaSelect', 'csharp');
    await expect(page.locator('#subTabContent_csharp')).toBeVisible();

    await page.click('#moduleSelector_csharp .game-card');
    await expect(page.locator('#moduleFrameArea_csharp')).toBeVisible();
    await expect(page.locator('#moduleSelector_csharp')).toBeHidden();
    await expect(page.locator('#moduleFrame_csharp')).toHaveAttribute(
      'src', /atividades\/csharp-basico\.html\?user=breno\.silva80/
    );

    await page.click('#moduleFrameArea_csharp .btn-secondary');
    await expect(page.locator('#moduleFrameArea_csharp')).toBeHidden();
    await expect(page.locator('#moduleSelector_csharp')).toBeVisible();
  });

  test('aba Jogos desbloqueia quando todos os módulos já foram concluídos', async ({ page }) => {
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

    await page.goto(URL);
    const tabJogos = page.locator('#tabBtnJogos');
    await expect(tabJogos).not.toHaveClass(/disabled/);
    await expect(tabJogos).toContainText('🎮');

    await tabJogos.click();
    await expect(page.locator('#tabContentJogos')).toBeVisible();
    await expect(page.locator('#gameCardGrid .game-card')).toHaveCount(4);
  });
});

test.describe('turmas/jogos/plataforma.html — sincronização de progresso pro Supabase', () => {
  test('fechar um módulo manda o progresso pra student_module_progress', async ({ page }) => {
    await stubSupabaseFake(page, { student_module_progress: [] });
    await page.addInitScript(user => {
      localStorage.setItem(`csharp_basico_progress_${user}`, JSON.stringify({ completed: true }));
    }, 'breno.silva80');

    await page.goto(URL);
    await openMateria1(page);
    await page.selectOption('#trilhaSelect', 'csharp');
    await page.click('#moduleSelector_csharp .game-card');
    await expect(page.locator('#moduleFrameArea_csharp')).toBeVisible();

    await page.click('#moduleFrameArea_csharp .btn-secondary');
    await expect(page.locator('#moduleSelector_csharp')).toBeVisible();

    const rows = await page.evaluate(() => window.__FAKE_DB__.student_module_progress || []);
    const csharpRow = rows.find(r => r.trilha_key === 'csharp' && r.module_key === 'basico');
    expect(csharpRow).toMatchObject({
      student_email: 'breno.silva80',
      turma: 'jogos',
      progress_current: 1,
      progress_total: 1,
      completed: true
    });

    // js básico/intermediário nunca foram abertos, mas o sync do carregamento
    // inicial (init()) já deve ter mandado o estado 0/N deles também.
    const jsRow = rows.find(r => r.trilha_key === 'js' && r.module_key === 'basico');
    expect(jsRow).toMatchObject({ progress_current: 0, progress_total: 10, completed: false });
  });
});
