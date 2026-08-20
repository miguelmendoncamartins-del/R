// @ts-check
const { test, expect } = require('@playwright/test');
const { stubSupabaseDisabled } = require('./helpers');

const URL = '/turmas/sistemas/plataforma.html?user=alexandre.natal&ip=192.168.2.1&saldo=1183.50&role=aluno';

// A trilha de verdade (SQL) fica dentro de Banco de Dados — as demais 8
// matérias de Sistemas são placeholders vazios por enquanto.
async function openMateria1(page) {
  await page.click('.game-card:has-text("Banco de Dados")');
}

test.describe('turmas/sistemas/plataforma.html', () => {
  test.beforeEach(async ({ page }) => {
    await stubSupabaseDisabled(page);
  });

  test('carrega com tema próprio, diferente do tema de Jogos', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('#txtUserNom')).toHaveText('Alexandre Natal');
    await expect(page.locator('#txtUserTurma')).toHaveText('Sistemas');

    const green = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--green').trim());
    expect(green).toBe('#3aa0ff');
    expect(green).not.toBe('#7cff3f'); // não é o verde da turma Jogos
  });

  test('mostra os cards das 9 matérias de Sistemas', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('#materiaCardGrid .game-card')).toHaveCount(9);
    await expect(page.locator('.game-card:has-text("Internet das Coisas")')).toContainText('Em breve');
  });

  test('mostra a trilha SQL dentro de Banco de Dados, com teoria e prática', async ({ page }) => {
    await page.goto(URL);
    await openMateria1(page);
    // 2 trilhas nessa matéria (SQL / Documentação de Código) — vira um <select>, começando em "sql".
    await expect(page.locator('#trilhaSelect')).toHaveValue('sql');
    await expect(page.locator('#moduleSelector_sql')).toBeVisible();
    await expect(page.locator('#moduleSelector_sql')).toContainText('Teoria — Fundamentos de SQL');
    await expect(page.locator('#moduleSelector_sql')).toContainText('Prática — Central de Dados');
  });

  test('prática do SQL fica bloqueada até a teoria ser concluída', async ({ page }) => {
    await page.goto(URL);
    await openMateria1(page);
    // Ícone + título juntos, porque as práticas de JOIN/GROUP BY têm "Prática — Central de Dados" como prefixo do próprio título.
    const praticaCard = page.locator('#moduleSelector_sql .game-card', { hasText: '🗄️ Prática — Central de Dados' });
    await expect(praticaCard).toHaveClass(/locked/);
    await expect(praticaCard).toContainText('Bloqueado');
  });

  test('jogos ficam bloqueados até completar a trilha SQL', async ({ page }) => {
    await page.goto(URL);
    const tabJogos = page.locator('#tabBtnJogos');
    await expect(tabJogos).toHaveClass(/disabled/);
    await expect(tabJogos).toContainText('🔒');
  });
});
