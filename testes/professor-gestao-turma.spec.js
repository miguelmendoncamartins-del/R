// @ts-check
const { test, expect } = require('@playwright/test');
const { stubSupabaseDisabled, stubSupabaseFake } = require('./helpers');

const JOGOS_URL = '/turmas/jogos/plataforma.html?user=admin&ip=192.168.1.254&saldo=9999.00&role=professor&turma=jogos';
const ALUNO_URL = '/turmas/jogos/plataforma.html?user=breno.silva80&ip=192.168.1.10&saldo=1234.80&role=aluno&turma=jogos';

// As seções da aba Gestão vêm reduzidas por padrão — precisa expandir antes de mexer no conteúdo.
async function expandGestaoSection(page, titulo) {
  await page.locator('.collapsible-card .collapsible-head', { hasText: titulo }).click();
}

test.describe('Aba Gestão (só professor) dentro do portal da turma', () => {
  test('aluno não vê a aba Gestão', async ({ page }) => {
    await stubSupabaseDisabled(page);
    await page.goto(ALUNO_URL);
    await expect(page.locator('#mainNavTabs .tab-btn[data-tab="gestao"]')).toHaveCount(0);
  });

  test('a aba Gestão rola de verdade quando o conteúdo passa de uma tela (regressão do scroll travado)', async ({ page }) => {
    // A aba Gestão é a mais alta do portal (vários cards empilhados) — se o
    // wrapper #app perder o display:flex, .viewport-content nunca fica
    // limitado à altura da tela e o scroll interno trava por completo
    // (nada rola, nem o mouse wheel resolve, mesmo a página não crescendo).
    await stubSupabaseFake(page, {});
    await page.setViewportSize({ width: 1300, height: 700 });
    await page.goto(JOGOS_URL);
    await page.click('#mainNavTabs .tab-btn[data-tab="gestao"]');
    await page.waitForTimeout(300);

    // expande todas as seções pra recriar o cenário de conteúdo empilhado que causava o travamento
    const heads = page.locator('#tabContentGestao .collapsible-head');
    const count = await heads.count();
    for (let i = 0; i < count; i++) await heads.nth(i).click();
    await page.waitForTimeout(200);

    const before = await page.evaluate(() => {
      const vc = document.querySelector('.viewport-content');
      return { scrollTop: vc.scrollTop, scrollHeight: vc.scrollHeight, clientHeight: vc.clientHeight };
    });
    expect(before.scrollHeight).toBeGreaterThan(before.clientHeight); // conteúdo realmente maior que a tela

    await page.mouse.move(650, 400);
    await page.mouse.wheel(0, 2000);
    await page.waitForTimeout(200);

    const scrollTopAfter = await page.evaluate(() => document.querySelector('.viewport-content').scrollTop);
    expect(scrollTopAfter).toBeGreaterThan(0);
  });

  test('professor vê só os alunos desta turma, não os de Sistemas', async ({ page }) => {
    await stubSupabaseFake(page, { student_overrides: [] });
    await page.goto(JOGOS_URL);
    await page.click('#mainNavTabs .tab-btn[data-tab="gestao"]');
    await page.waitForTimeout(200);
    await expandGestaoSection(page, 'Bloqueios e Liberações');

    await expect(page.locator('#tblGestaoStudentsBody')).toContainText('Breno Silva');
    await expect(page.locator('#tblGestaoStudentsBody')).not.toContainText('Alexandre Natal');
  });

  test('liberar jogos de um aluno específico grava o override certo', async ({ page }) => {
    await stubSupabaseFake(page, { student_overrides: [] });
    await page.goto(JOGOS_URL);
    await page.click('#mainNavTabs .tab-btn[data-tab="gestao"]');
    await page.waitForTimeout(200);
    await expandGestaoSection(page, 'Bloqueios e Liberações');

    const row = page.locator('#tblGestaoStudentsBody tr', { hasText: 'Breno Silva' });
    await expect(row).toContainText('BLOQUEADO');
    await row.locator('button').click();
    await expect(row).toContainText('LIBERADO');

    const rows = await page.evaluate(() => window.__FAKE_DB__.student_overrides || []);
    expect(rows.find(r => r.student_email === 'breno.silva80')).toMatchObject({ games_unlocked: true });
  });

  test('liberar jogos (todos) só afeta alunos desta turma', async ({ page }) => {
    await stubSupabaseFake(page, { student_overrides: [] });
    await page.goto(JOGOS_URL);
    await page.click('#mainNavTabs .tab-btn[data-tab="gestao"]');
    await page.waitForTimeout(200);
    await expandGestaoSection(page, 'Bloqueios e Liberações');

    await page.click('#btnUnlockGamesTurma');
    await page.waitForTimeout(200);

    const rows = await page.evaluate(() => window.__FAKE_DB__.student_overrides || []);
    expect(rows.some(r => r.student_email === 'breno.silva80' && r.games_unlocked === true)).toBe(true);
    expect(rows.some(r => r.student_email === 'alexandre.natal')).toBe(false);
  });

  test('bloquear Ctrl+C/V grava configuração com id da turma, não "global"', async ({ page }) => {
    await stubSupabaseFake(page, { classroom_settings: [] });
    await page.goto(JOGOS_URL);
    await page.click('#mainNavTabs .tab-btn[data-tab="gestao"]');
    await page.waitForTimeout(200);
    await expandGestaoSection(page, 'Bloqueios e Liberações');

    await expect(page.locator('#btnToggleClipboard')).toContainText('Bloquear Copiar/Colar');
    await page.click('#btnToggleClipboard');
    await expect(page.locator('#btnToggleClipboard')).toContainText('BLOQUEADO');

    const rows = await page.evaluate(() => window.__FAKE_DB__.classroom_settings || []);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'jogos', clipboard_blocked: true });
  });

  test('Apresentações (Slides) lista a aula teórica e gera o .pptx com um clique, sem abrir o módulo', async ({ page }) => {
    await stubSupabaseFake(page, {});
    await page.goto(JOGOS_URL);
    await page.click('#mainNavTabs .tab-btn[data-tab="gestao"]');
    await page.waitForTimeout(200);
    await expandGestaoSection(page, 'Apresentações (Slides)');

    await expect(page.locator('#gestaoSlidesList')).toContainText('Básico — A Jornada do Eri');

    // a aba de Aulas & Atividades continua fechada — a geração não precisa abrir o módulo visível
    await expect(page.locator('#tabContentAulas')).toBeHidden();

    const row = page.locator('#gestaoSlidesList > div', { hasText: 'Básico — A Jornada do Eri' });
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      row.locator('[data-slide-mod]').click(),
    ]);
    expect(download.suggestedFilename()).toBe('csharp-basico-slides.pptx');

    await expect(page.locator('#tabContentAulas')).toBeHidden();
  });

  test('Gabarito lista a atividade e gera o .txt com pergunta + resposta esperada, sem abrir o módulo', async ({ page }) => {
    await stubSupabaseFake(page, {});
    await page.goto(JOGOS_URL);
    await page.click('#mainNavTabs .tab-btn[data-tab="gestao"]');
    await page.waitForTimeout(200);
    await expandGestaoSection(page, 'Gabarito');

    await expect(page.locator('#gestaoGabaritoList')).toContainText('Básico — A Jornada do Eri');

    // a aba de Aulas & Atividades continua fechada — a geração não precisa abrir o módulo visível
    await expect(page.locator('#tabContentAulas')).toBeHidden();

    const csharpRow = page.locator('#gestaoGabaritoList > div', { hasText: 'Básico — A Jornada do Eri' });
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      csharpRow.locator('[data-gabarito-mod]').click(),
    ]);
    expect(download.suggestedFilename()).toBe('csharp-basico-gabarito.txt');

    const filePath = await download.path();
    const fs = require('node:fs');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('GABARITO');
    expect(content).toContain('Quem criou a linguagem C#?');
    expect(content).toContain('RESPOSTA ESPERADA: A Microsoft');

    await expect(page.locator('#tabContentAulas')).toBeHidden();
  });

  test('atividade em tempo real mostra só alunos desta turma', async ({ page }) => {
    await stubSupabaseFake(page, {
      student_activity: [
        { student_email: 'breno.silva80', student_name: 'Breno Silva', turma: 'jogos', status: 'active', location_label: 'JavaScript', updated_at: new Date().toISOString() },
        { student_email: 'alexandre.natal', student_name: 'Alexandre Natal', turma: 'sistemas', status: 'idle', location_label: 'Aulas', updated_at: new Date().toISOString() },
      ],
    });
    await page.goto(JOGOS_URL);
    await page.click('#mainNavTabs .tab-btn[data-tab="gestao"]');
    await page.waitForTimeout(200);
    await expandGestaoSection(page, 'Atividade em Tempo Real');

    const rows = page.locator('#tblGestaoActivityBody tr');
    await expect(rows).toHaveCount(1);
    await expect(page.locator('#tblGestaoActivityBody')).toContainText('Breno Silva');
    await expect(page.locator('#tblGestaoActivityBody')).not.toContainText('Alexandre Natal');
  });
});
