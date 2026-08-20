// @ts-check
// Chamada e notas agora vivem dentro da aba "Gestão" do portal de cada
// turma (shared/platform-core.js), não mais num painel central — por isso
// não existe mais seletor de turma aqui: a turma já é a do portal aberto.
const { test, expect } = require('@playwright/test');
const { stubSupabaseFake } = require('./helpers');

const JOGOS_URL = '/turmas/jogos/plataforma.html?user=admin&ip=192.168.1.254&saldo=9999.00&role=professor&turma=jogos';
const SISTEMAS_URL = '/turmas/sistemas/plataforma.html?user=admin&ip=192.168.1.254&saldo=9999.00&role=professor&turma=sistemas';
const today = new Date().toISOString().slice(0, 10);

async function openGestao(page, url, seed) {
  await stubSupabaseFake(page, seed);
  await page.goto(url);
  await page.click('#mainNavTabs .tab-btn[data-tab="gestao"]');
  await page.waitForTimeout(200);
}

// As seções da aba Gestão vêm reduzidas por padrão — precisa expandir antes de mexer no conteúdo.
async function expandGestaoSection(page, titulo) {
  await page.locator('.collapsible-card .collapsible-head', { hasText: titulo }).click();
}

test.describe('Chamada — dentro do portal da turma', () => {
  test('marcar falta e finalizar salva presente=false só pro aluno marcado', async ({ page }) => {
    await openGestao(page, JOGOS_URL, { attendance: [] });
    await expandGestaoSection(page, 'Chamada e Notas');

    await page.check('#chamadaBody input[data-email="breno.silva80"]');
    await page.click('#btnFinalizarChamada');

    await expect(page.locator('#chamadaStatus')).toContainText('Chamada registrada');

    const rows = await page.evaluate(() => window.__FAKE_DB__.attendance || []);
    const breno = rows.find(r => r.student_email === 'breno.silva80');
    const outro = rows.find(r => r.student_email !== 'breno.silva80');

    expect(breno.presente).toBe(false);
    expect(breno.turma).toBe('jogos');
    expect(breno.data).toBe(today);
    expect(outro.presente).toBe(true);
  });

  test('reabrir a mesma data pré-marca quem já tinha sido registrado como falta', async ({ page }) => {
    await openGestao(page, JOGOS_URL, {
      attendance: [
        { turma: 'jogos', data: today, student_email: 'breno.silva80', student_name: 'Breno Silva', presente: false },
      ],
    });
    await expandGestaoSection(page, 'Chamada e Notas');

    await expect(page.locator('#chamadaBody input[data-email="breno.silva80"]')).toBeChecked();
  });

  test('finalizar gera um resumo copiável com turma abreviada, data, presentes e ausentes', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openGestao(page, JOGOS_URL, { attendance: [] });
    await expandGestaoSection(page, 'Chamada e Notas');

    await page.check('#chamadaBody input[data-email="breno.silva80"]');
    await page.click('#btnFinalizarChamada');

    await expect(page.locator('#chamadaResumoBox')).toBeVisible();
    const resumo = await page.locator('#chamadaResumoTexto').inputValue();
    expect(resumo).toContain('Turma: JD');
    expect(resumo).toContain(`Data: ${today.split('-').reverse().join('/')}`);
    expect(resumo).toMatch(/Alunos presentes: \d+/);
    expect(resumo).toContain('Ausentes: Breno Silva');

    await page.click('#btnCopiarResumoChamada');
    await expect(page.locator('#chamadaResumoStatus')).toHaveText('Copiado!');
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toBe(resumo);
  });

  test('relatório de presença calcula % corretamente a partir do histórico', async ({ page }) => {
    await openGestao(page, JOGOS_URL, {
      attendance: [
        { turma: 'jogos', data: '2026-03-01', student_email: 'breno.silva80', presente: true },
        { turma: 'jogos', data: '2026-03-02', student_email: 'breno.silva80', presente: false },
        { turma: 'jogos', data: '2026-03-03', student_email: 'breno.silva80', presente: true },
        { turma: 'jogos', data: '2026-03-04', student_email: 'breno.silva80', presente: true },
      ],
    });
    await expandGestaoSection(page, 'Relatórios');

    const row = page.locator('#presencaBody tr', { hasText: 'Breno Silva' });
    await expect(row).toContainText('4'); // dias com chamada
    await expect(row).toContainText('1'); // faltas
    await expect(row).toContainText('75%'); // 3 presenças de 4 dias
  });
});

test.describe('Notas — dentro do portal da turma', () => {
  test('média recalcula ao vivo enquanto digita e salvar grava as 4 notas', async ({ page }) => {
    await openGestao(page, JOGOS_URL, { grades: [] });
    await expandGestaoSection(page, 'Chamada e Notas');

    const row = page.locator('#notasBody tr[data-email="breno.silva80"]');
    await row.locator('[data-campo="nota1"]').fill('10');
    await row.locator('[data-campo="nota2"]').fill('8');
    await row.locator('[data-campo="nota3"]').fill('6');
    await row.locator('[data-campo="nota4"]').fill('4');

    await expect(row.locator('.media-cell')).toHaveText('7.00');

    await page.click('#btnSalvarNotas');
    await expect(page.locator('#notasStatus')).toContainText('Notas salvas');

    const saved = await page.evaluate(() =>
      (window.__FAKE_DB__.grades || []).find(r => r.student_email === 'breno.silva80' && r.bimestre === 1)
    );
    expect(saved).toMatchObject({ nota1: 10, nota2: 8, nota3: 6, nota4: 4, turma: 'jogos' });
  });

  test('relatório de notas mostra só médias e o % de conclusão por matéria', async ({ page }) => {
    await openGestao(page, SISTEMAS_URL, {
      grades: [
        { student_email: 'alexandre.natal', student_name: 'Alexandre Natal', turma: 'sistemas', bimestre: 1, nota1: 10, nota2: 10, nota3: 10, nota4: 10, media: 10 },
        { student_email: 'alexandre.natal', student_name: 'Alexandre Natal', turma: 'sistemas', bimestre: 2, nota1: 8, nota2: 8, nota3: 8, nota4: 8, media: 8 },
      ],
      student_module_progress: [
        { student_email: 'alexandre.natal', turma: 'sistemas', trilha_key: 'sql', module_key: 'teoria', progress_current: 1, progress_total: 1, completed: true },
        { student_email: 'alexandre.natal', turma: 'sistemas', trilha_key: 'sql', module_key: 'basico', progress_current: 8, progress_total: 8, completed: true },
        { student_email: 'alexandre.natal', turma: 'sistemas', trilha_key: 'sql', module_key: 'join', progress_current: 5, progress_total: 5, completed: true },
        // "agregacao" (trilha sql) e "teoria" (trilha sql-comentarios) nunca
        // abertos — sem linha, contam como 0% na média da MATÉRIA Banco de
        // Dados (que soma os módulos das 2 trilhas dela).
      ],
    });
    await expandGestaoSection(page, 'Relatórios');

    // Só a média aparece no relatório — nunca os 4 campos de nota.
    await expect(page.locator('#relatorioNotasBody')).not.toContainText('nota1');
    // A coluna é por MATÉRIA, não por trilha.
    await expect(page.locator('#relatorioNotasHead')).toContainText('Banco de Dados');

    const row = page.locator('#relatorioNotasBody tr', { hasText: 'Alexandre Natal' });
    await expect(row).toContainText('10.00'); // média B1
    await expect(row).toContainText('8.00');  // média B2
    await expect(row).toContainText('9.00');  // média geral (10 e 8, sem B3/B4)
    // Banco de Dados tem 5 módulos ao todo (sql: teoria/basico/join/agregacao + sql-comentarios: teoria).
    // 3 concluídos, 2 nunca abertos => 3/5 = 60%.
    await expect(row).toContainText('60%');
  });
});
