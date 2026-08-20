// @ts-check
// Início/prazo de trilha (aba Gestão, seção "Trilhas — Início e Prazo"
// dentro de "Bloqueios e Liberações"). Substitui o antigo bloqueio manual
// liga/desliga de trilha inteira (trilha_overrides, ver git history) — o
// mesmo resultado (trilha inacessível pro aluno) agora vem de uma data no
// futuro, guardada em trilha_release_dates.
const { test, expect } = require('@playwright/test');
const { stubSupabaseFake } = require('./helpers');

const SISTEMAS_PROFESSOR_URL = '/turmas/sistemas/plataforma.html?user=admin&ip=192.168.1.254&saldo=9999.00&role=professor&turma=sistemas';
const SISTEMAS_ALUNO_URL = '/turmas/sistemas/plataforma.html?user=alexandre.natal&ip=192.168.2.1&saldo=1183.50&role=aluno';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function expandGestaoSection(page, titulo) {
  await page.locator('.collapsible-card .collapsible-head', { hasText: titulo }).click();
}

test.describe('Gestão — início/prazo de trilha (professor)', () => {
  test('lista todas as trilhas com a matéria dona e salva início/prazo em lote', async ({ page }) => {
    await stubSupabaseFake(page, { trilha_release_dates: [] });
    await page.goto(SISTEMAS_PROFESSOR_URL);
    await page.click('#mainNavTabs .tab-btn[data-tab="gestao"]');
    await page.waitForTimeout(200);
    await expandGestaoSection(page, 'Bloqueios e Liberações');

    const row = page.locator('#tblGestaoTrilhasBody tr[data-trilha="sql"]');
    await expect(row).toContainText('Banco de Dados');
    await expect(row).toContainText('Em andamento');

    await row.locator('input[data-campo="inicio"]').fill('2026-02-01');
    await row.locator('input[data-campo="prazo"]').fill('2026-04-15');
    await page.click('#btnSalvarTrilhaDatas');

    await expect(page.locator('#trilhaDatasStatus')).toContainText('Datas salvas');
    const rows = await page.evaluate(() => window.__FAKE_DB__.trilha_release_dates || []);
    expect(rows.find(r => r.trilha_key === 'sql')).toMatchObject({
      turma: 'sistemas', inicio: '2026-02-01', prazo: '2026-04-15',
    });
  });
});

test.describe('Trilha com início futuro — visão do aluno', () => {
  test('a trilha nem aparece pro aluno', async ({ page }) => {
    await stubSupabaseFake(page, {
      trilha_release_dates: [{ turma: 'sistemas', trilha_key: 'sql', inicio: '2999-01-01' }],
    });
    await page.goto(SISTEMAS_ALUNO_URL);
    await page.click('.game-card:has-text("Banco de Dados")');

    await expect(page.locator('#materiaDetailArea')).not.toContainText('Trilha SQL');
    await expect(page.locator('#moduleSelector_sql')).toHaveCount(0);
  });

  test('professor sempre vê a trilha, mesmo com início futuro (revisão de conteúdo)', async ({ page }) => {
    await stubSupabaseFake(page, {
      trilha_release_dates: [{ turma: 'sistemas', trilha_key: 'sql', inicio: '2999-01-01' }],
    });
    await page.goto(SISTEMAS_PROFESSOR_URL);
    await page.click('.game-card:has-text("Banco de Dados")');

    await expect(page.locator('#materiaDetailArea')).toContainText('Trilha SQL');
  });

  test('liberação diária de um módulo faz a trilha aparecer mesmo antes do início', async ({ page }) => {
    await stubSupabaseFake(page, {
      trilha_release_dates: [{ turma: 'sistemas', trilha_key: 'sql', inicio: '2999-01-01' }],
      daily_module_releases: [{
        id: 1, turma: 'sistemas', scope: 'data', target_date: todayIso(),
        student_email: '', trilha_key: 'sql', module_key: 'teoria',
      }],
    });
    await page.goto(SISTEMAS_ALUNO_URL);
    await page.click('.game-card:has-text("Banco de Dados")');

    await expect(page.locator('#materiaDetailArea')).toContainText('Trilha SQL');
    const teoriaCard = page.locator('#moduleSelector_sql .game-card', { hasText: 'Teoria — Fundamentos de SQL' });
    await expect(teoriaCard).not.toHaveClass(/locked/);
    await expect(teoriaCard).toContainText('Liberado hoje');
  });
});

test.describe('Trilha com prazo vencido — visão do aluno', () => {
  test('entra no grupo "Em atraso", sem deixar de aparecer', async ({ page }) => {
    await stubSupabaseFake(page, {
      trilha_release_dates: [{ turma: 'sistemas', trilha_key: 'sql', prazo: '2000-01-01' }],
    });
    await page.goto(SISTEMAS_ALUNO_URL);
    await page.click('.game-card:has-text("Banco de Dados")');

    await expect(page.locator('#trilhaSelect optgroup[label="⚠️ Em atraso"] option')).toHaveText(['SQL']);
    await expect(page.locator('#moduleSelector_sql h2')).toContainText('Em atraso');
  });
});
