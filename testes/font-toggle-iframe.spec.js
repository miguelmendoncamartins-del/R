// @ts-check
// Regressão: o botão de fonte tradicional/pixelada (a11y-bar) só mudava a
// variável --user-font no documento do plataforma.html — o conteúdo dentro
// do <iframe> de um módulo/jogo (documento separado) continuava com a fonte
// pixelada, porque nada propagava a escolha pra dentro dele.
const { test, expect } = require('@playwright/test');
const { stubSupabaseDisabled } = require('./helpers');

const URL = '/turmas/sistemas/plataforma.html?user=alexandre.natal&ip=192.168.2.1&saldo=1183.50&role=aluno';

test.describe('Alternância de fonte propaga pro iframe do módulo', () => {
  test.beforeEach(async ({ page }) => {
    await stubSupabaseDisabled(page);
  });

  test('trocar a fonte com o módulo já aberto atualiza o conteúdo do iframe ao vivo', async ({ page }) => {
    await page.goto(URL);
    await page.click('.game-card:has-text("Banco de Dados")');
    await page.click('#moduleSelector_sql .game-card:has-text("Teoria")');

    const frame = page.frameLocator('#moduleFrame_sql');
    await expect(frame.locator('#storyWrap')).toBeVisible();

    const before = await frame.locator('body').evaluate(el => getComputedStyle(el).fontFamily);
    expect(before).toContain('JetBrains Mono');

    await page.click('#btnFontStyle');

    const after = await frame.locator('body').evaluate(el => getComputedStyle(el).fontFamily);
    expect(after).toContain('system-ui');
  });

  test('abrir um módulo com a fonte tradicional já ativa carrega o iframe direto na fonte certa', async ({ page }) => {
    await page.goto(URL);
    await page.click('#btnFontStyle');

    await page.click('.game-card:has-text("Banco de Dados")');
    await page.click('#moduleSelector_sql .game-card:has-text("Teoria")');

    const frame = page.frameLocator('#moduleFrame_sql');
    await expect(frame.locator('#storyWrap')).toBeVisible();

    const bodyFont = await frame.locator('body').evaluate(el => getComputedStyle(el).fontFamily);
    expect(bodyFont).toContain('system-ui');
  });
});
