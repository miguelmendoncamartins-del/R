// @ts-check
// Cobre os módulos novos da trilha SQL (Banco de Dados, turma Sistemas):
// Prática de JOIN (sql-join.html) e Prática de agregação/GROUP BY (sql-agregacao.html).
const { test, expect } = require('@playwright/test');
const { stubSupabaseDisabled } = require('./helpers');

test.describe('turmas/sistemas/atividades/sql-join.html', () => {
  const URL = '/turmas/sistemas/atividades/sql-join.html?user=alexandre.natal&role=aluno&name=Alexandre%20Natal&turma=sistemas';

  test.beforeEach(async ({ page }) => {
    await stubSupabaseDisabled(page);
  });

  test('carrega o motor SQL e resolve os 5 chamados de JOIN em sequência', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('#btnRun')).toBeEnabled({ timeout: 15000 });

    const solutions = [
      'SELECT funcionarios.nome, departamentos.nome FROM funcionarios JOIN departamentos ON funcionarios.departamento_id = departamentos.id;',
      "SELECT funcionarios.nome FROM funcionarios JOIN departamentos ON funcionarios.departamento_id = departamentos.id WHERE departamentos.nome = 'Desenvolvimento';",
      'SELECT departamentos.nome, funcionarios.cargo, funcionarios.nome FROM funcionarios JOIN departamentos ON funcionarios.departamento_id = departamentos.id ORDER BY departamentos.nome ASC;',
      'SELECT f.nome, d.nome FROM funcionarios f JOIN departamentos d ON f.departamento_id = d.id;',
      'SELECT funcionarios.nome, funcionarios.salario, departamentos.nome FROM funcionarios JOIN departamentos ON funcionarios.departamento_id = departamentos.id WHERE funcionarios.salario > 3000 ORDER BY funcionarios.salario DESC;',
    ];

    for (let i = 0; i < solutions.length; i++) {
      await page.fill('#codeInput', solutions[i]);
      await page.click('#btnRun');
      await expect(page.locator('#ticketStatus')).toHaveText('RESOLVIDO');
      if (i < solutions.length - 1) await page.click('#btnNext');
    }

    await expect(page.locator('#lblProgress')).toHaveText('5/5');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('sql_join_progress_alexandre.natal')));
    expect(stored.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  test('esquecer o prefixo da tabela numa coluna ambígua não resolve o chamado 1', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('#btnRun')).toBeEnabled({ timeout: 15000 });

    await page.fill('#codeInput', 'SELECT nome, nome FROM funcionarios JOIN departamentos ON funcionarios.departamento_id = departamentos.id;');
    await page.click('#btnRun');
    await expect(page.locator('#consoleOutput')).toContainText('Erro ao executar sua consulta');
  });
});

test.describe('turmas/sistemas/atividades/sql-agregacao.html', () => {
  const URL = '/turmas/sistemas/atividades/sql-agregacao.html?user=alexandre.natal&role=aluno&name=Alexandre%20Natal&turma=sistemas';

  test.beforeEach(async ({ page }) => {
    await stubSupabaseDisabled(page);
  });

  test('carrega o motor SQL e resolve os 5 chamados de agregação/GROUP BY em sequência', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('#btnRun')).toBeEnabled({ timeout: 15000 });

    const solutions = [
      'SELECT COUNT(*) FROM funcionarios;',
      'SELECT SUM(salario) FROM funcionarios;',
      'SELECT AVG(salario) FROM funcionarios;',
      'SELECT departamento_id, COUNT(*) FROM funcionarios GROUP BY departamento_id;',
      'SELECT departamentos.nome, AVG(funcionarios.salario) FROM funcionarios JOIN departamentos ON funcionarios.departamento_id = departamentos.id GROUP BY departamentos.nome ORDER BY AVG(funcionarios.salario) DESC;',
    ];

    for (let i = 0; i < solutions.length; i++) {
      await page.fill('#codeInput', solutions[i]);
      await page.click('#btnRun');
      await expect(page.locator('#ticketStatus')).toHaveText('RESOLVIDO');
      if (i < solutions.length - 1) await page.click('#btnNext');
    }

    await expect(page.locator('#lblProgress')).toHaveText('5/5');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('sql_agregacao_progress_alexandre.natal')));
    expect(stored.sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

test.describe('turmas/sistemas/atividades/sql-comentarios-teoria.html', () => {
  const URL = '/turmas/sistemas/atividades/sql-comentarios-teoria.html?user=alexandre.natal&role=aluno&name=Alexandre%20Natal&turma=sistemas';

  test('respondendo todas as etapas corretamente conclui e marca o progresso como completo', async ({ page }) => {
    await stubSupabaseDisabled(page);
    await page.goto(URL);

    // A ordem das opções (A/B/C/D) é embaralhada a cada renderização — não dá
    // pra usar STEPS[...].correctIndex como posição na tela, precisa achar a
    // opção pelo texto (ver comentário equivalente em quiz-wrong-answer-feedback.spec.js).
    const total = await page.evaluate(() => STEPS.length);
    for (let i = 0; i < total; i++) {
      await page.click('#btnNext');
      const correctText = await page.evaluate(() => {
        const q = STEPS[stepOrder[currentStepIndex]].question;
        return q.options[q.correctIndex];
      });
      const options = page.locator('.option');
      const count = await options.count();
      let idx = 0;
      for (let j = 0; j < count; j++) {
        if ((await options.nth(j).innerText()).includes(correctText)) { idx = j; break; }
      }
      await options.nth(idx).click();
      const nextBtn = page.locator('#btnNextAfterAnswer');
      await nextBtn.click();
    }

    await expect(page.locator('.finish-screen')).toBeVisible();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('sql_comentarios_teoria_progress_alexandre.natal')));
    expect(stored.completed).toBe(true);
  });
});
