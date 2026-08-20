// @ts-check
// Valida o novo módulo de SQL da turma Sistemas: o motor SQLite via
// WebAssembly (sql.js) carrega de verdade, roda consultas reais, e a
// progressão (localStorage) funciona igual aos duelos de JS.
const { test, expect } = require('@playwright/test');
const { stubSupabaseDisabled } = require('./helpers');

const URL = '/turmas/sistemas/atividades/sql-basico.html?user=alexandre.natal&role=aluno&name=Alexandre%20Natal&turma=sistemas';

test.describe('turmas/sistemas/atividades/sql-basico.html', () => {
  test.beforeEach(async ({ page }) => {
    await stubSupabaseDisabled(page);
  });

  test('carrega o motor SQL (WASM) e libera o botão Executar', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('#btnRun')).toBeEnabled({ timeout: 15000 });
    await expect(page.locator('#codeInput')).toBeEnabled();
  });

  test('consulta certa resolve o chamado 1 e mostra os dados numa tabela', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('#btnRun')).toBeEnabled({ timeout: 15000 });

    await page.fill('#codeInput', 'SELECT * FROM funcionarios;');
    await page.click('#btnRun');

    await expect(page.locator('#consoleOutput')).toContainText('Chamado resolvido');
    await expect(page.locator('#resultPanel table tbody tr')).toHaveCount(5); // 5 funcionários seedados
    await expect(page.locator('#ticketStatus')).toHaveText('RESOLVIDO');
  });

  test('consulta errada não avança e mostra erro amigável', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('#btnRun')).toBeEnabled({ timeout: 15000 });

    // SQL com erro de sintaxe de propósito
    await page.fill('#codeInput', 'SELCT * FROM funcionarios;');
    await page.click('#btnRun');
    await expect(page.locator('#consoleOutput')).toContainText('Erro ao executar sua consulta');

    // SQL válido mas com resultado errado pro chamado 1 (só 1 coluna, não *)
    await page.fill('#codeInput', 'SELECT nome FROM funcionarios;');
    await page.click('#btnRun');
    await expect(page.locator('#consoleOutput')).toContainText('não bateu com o esperado');
    await expect(page.locator('#ticketStatus')).toHaveText('PENDENTE');
  });

  test('resolve os 8 chamados em sequência e conclui o módulo', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('#btnRun')).toBeEnabled({ timeout: 15000 });

    const solutions = [
      'SELECT * FROM funcionarios;',
      'SELECT nome, cargo FROM funcionarios;',
      'SELECT * FROM funcionarios WHERE departamento_id = 1;',
      'SELECT nome, salario FROM funcionarios WHERE salario > 3000;',
      'SELECT nome, salario FROM funcionarios ORDER BY salario DESC;',
      "INSERT INTO funcionarios (id, nome, cargo, departamento_id, salario) VALUES (6, 'Bruno Martins', 'Suporte Júnior', 2, 2100);",
      'UPDATE funcionarios SET salario = 2600 WHERE id = 5;',
      'DELETE FROM funcionarios WHERE id = 2;',
    ];

    for (let i = 0; i < solutions.length; i++) {
      await page.fill('#codeInput', solutions[i]);
      await page.click('#btnRun');
      await expect(page.locator('#ticketStatus')).toHaveText('RESOLVIDO');
      if (i < solutions.length - 1) {
        await page.click('#btnNext');
      }
    }

    await expect(page.locator('#lblProgress')).toHaveText('8/8');
    await expect(page.locator('#consoleOutput')).toContainText('concluiu todos os chamados');

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('sql_basico_progress_alexandre.natal')));
    expect(stored.sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

test.describe('turmas/sistemas/plataforma.html — trilha SQL desbloqueia jogos', () => {
  test('completar todos os módulos das matérias com conteúdo libera a aba Jogos', async ({ page }) => {
    await stubSupabaseDisabled(page);
    await page.addInitScript(user => {
      localStorage.setItem(`sql_basico_progress_${user}`, JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8]));
      localStorage.setItem(`sql_basico_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`sql_join_progress_${user}`, JSON.stringify([1, 2, 3, 4, 5]));
      localStorage.setItem(`sql_agregacao_progress_${user}`, JSON.stringify([1, 2, 3, 4, 5]));
      localStorage.setItem(`sql_comentarios_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`devsis_apis_frameworks_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`devsis_apis_frameworks_pratica_progress_${user}`, JSON.stringify([1, 2, 3, 4, 5]));
      localStorage.setItem(`devsis_requisitos_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`devsis_requisitos_pratica_progress_${user}`, JSON.stringify([1, 2, 3, 4, 5]));
      localStorage.setItem(`devsis_linguagem_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`devsis_linguagem_pratica_progress_${user}`, JSON.stringify([1, 2, 3, 4, 5]));
      localStorage.setItem(`redes_conexao_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`redes_conexao_pratica_progress_${user}`, JSON.stringify([1, 2, 3, 4, 5]));
      localStorage.setItem(`redes_resolucao_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`redes_resolucao_pratica_progress_${user}`, JSON.stringify([1, 2, 3, 4, 5]));
      localStorage.setItem(`redes_servicos_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`redes_servicos_pratica_progress_${user}`, JSON.stringify([1, 2, 3, 4, 5]));
      localStorage.setItem(`redes_armazenamento_teoria_progress_${user}`, JSON.stringify({ completed: true }));
      localStorage.setItem(`redes_armazenamento_pratica_progress_${user}`, JSON.stringify([1, 2, 3, 4, 5]));
    }, 'alexandre.natal');

    await page.goto('/turmas/sistemas/plataforma.html?user=alexandre.natal&ip=192.168.2.1&saldo=1183.50&role=aluno');

    // A trilha SQL fica dentro de Banco de Dados; ela é a primeira das 2 trilhas da matéria (select já começa nela).
    await page.click('.game-card:has-text("Banco de Dados")');
    await expect(page.locator('#moduleSelector_sql')).toBeVisible();
    const tabJogos = page.locator('#tabBtnJogos');
    await expect(tabJogos).not.toHaveClass(/disabled/);
    await expect(tabJogos).toContainText('🎮');
  });
});
