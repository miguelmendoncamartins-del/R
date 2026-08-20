// @ts-check
// Valida o pedido "nos jogos, os alunos só podem ver colegas da própria
// turma": usa um Supabase falso (fixtures/fake-supabase-client.js) seedado
// com nós das duas turmas, e prova que o netscan/git clone da turma Jogos
// nunca enxerga nós de Sistemas, e vice-versa.
const { test, expect } = require('@playwright/test');
const { stubSupabaseFake } = require('./helpers');

const SEED = {
  network_nodes: [
    { ip_address: '192.168.1.10', email: 'breno.silva80', jdcoin_balance: 1234.80, is_online: true, current_ip: '192.168.1.10', turma: 'jogos', folders: {} },
    { ip_address: '192.168.1.11', email: 'edward.guzman', jdcoin_balance: 1580.11, is_online: true, current_ip: '192.168.1.11', turma: 'jogos', folders: {} },
    { ip_address: '192.168.2.1', email: 'alexandre.natal', jdcoin_balance: 1183.50, is_online: true, current_ip: '192.168.2.1', turma: 'sistemas', folders: {} },
    { ip_address: '192.168.2.2', email: 'amanda.silva32', jdcoin_balance: 1367.00, is_online: true, current_ip: '192.168.2.2', turma: 'sistemas', folders: {} },
  ],
  node_permissions: [],
  node_shields: [],
};

function gameUrl({ user, ip, saldo, role, name, turma }) {
  const qs = new URLSearchParams({ user, ip, saldo, role, name, turma });
  return `/games/jogo.html?${qs.toString()}`;
}

async function openGamePage(page, params) {
  await stubSupabaseFake(page, SEED);
  await page.addInitScript(() => sessionStorage.setItem('githack_authenticated', 'true'));
  await page.goto(gameUrl(params));
}

async function runCmd(page, cmd) {
  await page.fill('#termInput', cmd);
  await page.press('#termInput', 'Enter');
}

test.describe('games/jogo.html — isolamento por turma', () => {
  test('aluno de Jogos só vê e só clona colegas de Jogos no netscan', async ({ page }) => {
    await openGamePage(page, { user: 'breno.silva80', ip: '192.168.1.10', saldo: '1234.80', role: 'aluno', name: 'Breno Silva', turma: 'jogos' });

    await runCmd(page, 'ip connect');
    await expect(page.locator('#termOutput')).toContainText('ONLINE', { timeout: 5000 });

    await runCmd(page, 'netscan');
    const out = page.locator('#termOutput');
    await expect(out).toContainText('192.168.1.11'); // colega da mesma turma aparece
    await expect(out).not.toContainText('192.168.2.1'); // colega de Sistemas não aparece
    await expect(out).not.toContainText('192.168.2.2');

    // clonar colega da própria turma funciona
    await runCmd(page, 'git clone 192.168.1.11');
    await expect(out).toContainText('clonado com sucesso');

    // tentar clonar um IP de Sistemas falha: nem está na lista de nós conhecidos
    await runCmd(page, 'git clone 192.168.2.1');
    await expect(out).toContainText('não encontrado na rede');
  });

  test('aluno de Sistemas só vê e só clona colegas de Sistemas no netscan', async ({ page }) => {
    await openGamePage(page, { user: 'alexandre.natal', ip: '192.168.2.1', saldo: '1183.50', role: 'aluno', name: 'Alexandre Natal', turma: 'sistemas' });

    await runCmd(page, 'ip connect');
    await expect(page.locator('#termOutput')).toContainText('ONLINE', { timeout: 5000 });

    await runCmd(page, 'netscan');
    const out = page.locator('#termOutput');
    await expect(out).toContainText('192.168.2.2'); // colega da mesma turma aparece
    await expect(out).not.toContainText('192.168.1.10'); // colegas de Jogos não aparecem
    await expect(out).not.toContainText('192.168.1.11');

    await runCmd(page, 'git clone 192.168.2.2');
    await expect(out).toContainText('clonado com sucesso');

    await runCmd(page, 'git clone 192.168.1.10');
    await expect(out).toContainText('não encontrado na rede');
  });
});
