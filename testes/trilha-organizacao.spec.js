// @ts-check
// Organização das trilhas por status (shared/platform-core.js: trilhaStatus/
// visibleTrilhas/visibleTrilhasOrdered) — sem isso, o currículo de vários
// bimestres somados lotaria a tela do aluno com tudo junto, misturado.
//
// As datas inicio/prazo são injetadas por cima do config.js real (via
// page.route) em vez de mexer no arquivo de verdade — os testes não
// dependem de nenhuma trilha "de mentira".
const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { stubSupabaseDisabled } = require('./helpers');

const CONFIG_PATH = path.join(__dirname, '..', 'turmas', 'jogos', 'config.js');

async function withPatchedConfig(page, replacements) {
  let src = fs.readFileSync(CONFIG_PATH, 'utf8');
  for (const [from, to] of replacements) {
    if (!src.includes(from)) throw new Error(`Âncora não encontrada em config.js: ${from}`);
    src = src.replace(from, to);
  }
  await page.route('**/turmas/jogos/config.js', route => route.fulfill({ contentType: 'application/javascript', body: src }));
}

test.describe('Organização das trilhas (em aberto / em atraso / concluídas)', () => {
  test.beforeEach(async ({ page }) => {
    await stubSupabaseDisabled(page);
  });

  test('trilha com prazo vencido aparece "em atraso" e vem primeiro no <select>', async ({ page }) => {
    await withPatchedConfig(page, [
      ["key: 'vida-autoconhecimento',", "key: 'vida-autoconhecimento', prazo: '2000-01-01',"],
    ]);
    await page.goto('/turmas/jogos/plataforma.html?user=breno.silva80&ip=192.168.1.10&saldo=1234.80&role=aluno&turma=jogos');
    await page.click('.game-card:has-text("Projeto de Vida")');

    const select = page.locator('#trilhaSelect');
    // Atraso é o grupo padrão de abertura — a trilha atrasada já vem selecionada.
    await expect(select).toHaveValue('vida-autoconhecimento');
    await expect(select.locator('optgroup[label="⚠️ Em atraso"] option')).toHaveText(['Autoconhecimento e Valores Pessoais']);

    await expect(page.locator('#moduleSelector_vida-autoconhecimento h2')).toContainText('Em atraso');
  });

  test('trilha futura (inicio ainda não chegou) não aparece pro aluno', async ({ page }) => {
    await withPatchedConfig(page, [
      ["key: 'vida-cidadania',", "key: 'vida-cidadania', inicio: '2999-01-01',"],
    ]);
    await page.goto('/turmas/jogos/plataforma.html?user=breno.silva80&ip=192.168.1.10&saldo=1234.80&role=aluno&turma=jogos');
    await page.click('.game-card:has-text("Projeto de Vida")');

    const select = page.locator('#trilhaSelect');
    await expect(select.locator('option')).toHaveCount(3); // 4 trilhas - 1 futura
    await expect(select).not.toContainText('Cidadania e Convivência Social');
  });

  test('professor continua vendo a trilha futura (revisão de conteúdo)', async ({ page }) => {
    await withPatchedConfig(page, [
      ["key: 'vida-cidadania',", "key: 'vida-cidadania', inicio: '2999-01-01',"],
    ]);
    await page.goto('/turmas/jogos/plataforma.html?user=admin&ip=192.168.1.254&saldo=9999.00&role=professor&turma=jogos');
    await page.click('.game-card:has-text("Projeto de Vida")');

    await expect(page.locator('#trilhaSelect option')).toHaveCount(4);
    await expect(page.locator('#trilhaSelect')).toContainText('Cidadania e Convivência Social');
  });

  test('trilha 100% concluída entra no grupo recolhido "Concluídas", sem sumir da lista', async ({ page }) => {
    await page.addInitScript(user => {
      localStorage.setItem(`vida_equipe_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`vida_equipe_pratica_progress_${user}`, JSON.stringify([0, 1, 2, 3, 4]));
    }, 'breno.silva80');
    await page.goto('/turmas/jogos/plataforma.html?user=breno.silva80&ip=192.168.1.10&saldo=1234.80&role=aluno&turma=jogos');
    await page.click('.game-card:has-text("Projeto de Vida")');

    const select = page.locator('#trilhaSelect');
    await expect(select.locator('optgroup[label="✅ Concluídas"] option')).toHaveText(['Colaboração e Compromisso em Equipe']);
    // grupo "aberta" continua com as outras 3 trilhas não concluídas.
    await expect(select.locator('optgroup[label="🟢 Em aberto"] option')).toHaveCount(3);

    await select.selectOption('vida-equipe');
    await expect(page.locator('#moduleSelector_vida-equipe h2')).toContainText('Concluída');
  });

  test('matéria com todas as trilhas futuras ganha o selo "Em breve", mesmo já tendo trilhas cadastradas', async ({ page }) => {
    await withPatchedConfig(page, [
      ["key: 'projetos-metodos',", "key: 'projetos-metodos', inicio: '2999-01-01',"],
      ["key: 'projetos-fases',", "key: 'projetos-fases', inicio: '2999-01-01',"],
    ]);
    await page.goto('/turmas/jogos/plataforma.html?user=breno.silva80&ip=192.168.1.10&saldo=1234.80&role=aluno&turma=jogos');

    const card = page.locator('.game-card:has-text("Introdução ao Desenvolvimento de Projetos")');
    await expect(card).toContainText('Em breve');

    // Continua clicável — só avisa que ainda não tem nada disponível, não trava.
    await card.click();
    await expect(page.locator('#aulasSubTabPages')).toContainText('Nenhuma trilha disponível nesta matéria no momento');
  });
});
