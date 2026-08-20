// @ts-check
const { test, expect } = require('@playwright/test');
const { stubSupabaseDisabled } = require('./helpers');

async function login(page, user, pass) {
  await page.goto('/index.html');
  await page.fill('#txtUser', user);
  await page.fill('#txtPass', pass);
  await page.click('.btn-submit');
}

test.describe('index.html — login', () => {
  test.beforeEach(async ({ page }) => {
    await stubSupabaseDisabled(page);
  });

  test('credenciais inválidas mostram erro e não navegam', async ({ page }) => {
    await login(page, 'nao.existe', 'senhaerrada');
    await expect(page.locator('#errMsg')).toBeVisible();
    await expect(page).toHaveURL(/index\.html$/);
  });

  test('aluno de Jogos é redirecionado pra turmas/jogos/plataforma.html', async ({ page }) => {
    await login(page, 'breno.silva80', 'silva2026');
    await page.waitForURL(/turmas\/jogos\/plataforma\.html/);
    const url = new URL(page.url());
    expect(url.searchParams.get('user')).toBe('breno.silva80');
    expect(url.searchParams.get('role')).toBe('aluno');
    expect(url.searchParams.get('ip')).toBe('192.168.1.10');
  });

  test('aluno de Sistemas é redirecionado pra turmas/sistemas/plataforma.html', async ({ page }) => {
    await login(page, 'alexandre.natal', 'natal2026');
    await page.waitForURL(/turmas\/sistemas\/plataforma\.html/);
    const url = new URL(page.url());
    expect(url.searchParams.get('user')).toBe('alexandre.natal');
    expect(url.searchParams.get('ip')).toBe('192.168.2.1');
  });

  test('professor é redirecionado pro painel único', async ({ page }) => {
    await login(page, 'admin', 'jd4532');
    await page.waitForURL(/professor\/painel\.html/);
    const url = new URL(page.url());
    expect(url.searchParams.get('role')).toBe('professor');
  });
});
