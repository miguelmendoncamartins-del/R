// @ts-check
// Valida o bloqueio de Ctrl+C/Ctrl+V ligado pelo professor: o toggle na aba
// "Gestão" do portal de cada turma grava em classroom_settings (id = turma),
// e shared/clipboard-guard.js (incluído nas páginas do aluno) passa a
// cancelar o atalho quando o valor daquela turma é true. O toggle em si é
// coberto por tests/professor-gestao-turma.spec.js — aqui só o guard.
const { test, expect } = require('@playwright/test');
const { stubSupabaseFake } = require('./helpers');

async function ctrlVPrevented(page) {
  return page.evaluate(() => {
    const ev = new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, bubbles: true, cancelable: true });
    document.dispatchEvent(ev);
    return ev.defaultPrevented;
  });
}

test.describe('shared/clipboard-guard.js', () => {
  test('bloqueia Ctrl+V na plataforma do aluno quando clipboard_blocked=true pra turma dele', async ({ page }) => {
    await stubSupabaseFake(page, {
      classroom_settings: [{ id: 'jogos', clipboard_blocked: true }],
    });
    await page.goto('/turmas/jogos/plataforma.html?user=breno.silva80&ip=192.168.1.10&saldo=1234.80&role=aluno&turma=jogos');

    await expect.poll(() => ctrlVPrevented(page)).toBe(true);
    await expect(page.locator('#__clipboardGuardToast')).toBeVisible();
  });

  test('não bloqueia quando clipboard_blocked=false', async ({ page }) => {
    await stubSupabaseFake(page, {
      classroom_settings: [{ id: 'jogos', clipboard_blocked: false }],
    });
    await page.goto('/turmas/jogos/plataforma.html?user=breno.silva80&ip=192.168.1.10&saldo=1234.80&role=aluno&turma=jogos');
    await page.waitForTimeout(100); // dá tempo do fetchState (que já resolve false) rodar

    expect(await ctrlVPrevented(page)).toBe(false);
  });

  test('bloqueio de uma turma não afeta a outra', async ({ page }) => {
    await stubSupabaseFake(page, {
      classroom_settings: [{ id: 'jogos', clipboard_blocked: true }, { id: 'sistemas', clipboard_blocked: false }],
    });
    await page.goto('/turmas/sistemas/plataforma.html?user=alexandre.natal&ip=192.168.2.1&saldo=1183.50&role=aluno&turma=sistemas');
    await page.waitForTimeout(100);

    expect(await ctrlVPrevented(page)).toBe(false);
  });

  test('nunca bloqueia o professor, mesmo com clipboard_blocked=true', async ({ page }) => {
    await stubSupabaseFake(page, {
      classroom_settings: [{ id: 'jogos', clipboard_blocked: true }],
    });
    await page.goto('/turmas/jogos/plataforma.html?user=admin&ip=192.168.1.254&saldo=9999.00&role=professor&turma=jogos');
    await page.waitForTimeout(100);

    expect(await ctrlVPrevented(page)).toBe(false);
  });

  test('funciona também dentro de um jogo (documento separado em iframe)', async ({ page }) => {
    await stubSupabaseFake(page, {
      classroom_settings: [{ id: 'jogos', clipboard_blocked: true }],
    });
    await page.addInitScript(() => sessionStorage.setItem('githack_authenticated', 'true'));
    await page.goto('/games/digitacao.html?user=breno.silva80&ip=192.168.1.10&saldo=1234.80&role=aluno&name=Breno&turma=jogos');

    await expect.poll(() => ctrlVPrevented(page)).toBe(true);
  });
});
