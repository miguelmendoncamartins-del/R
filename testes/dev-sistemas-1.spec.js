// @ts-check
// Cobre as trilhas novas da matéria Desenvolvimento de Sistemas 1 (turma
// Sistemas): 3 trilhas (1 por capacidade do resumo), cada uma com 1 teoria
// (história + quiz) e 1 prática ("chamados" de múltipla escolha — mesmo
// formato usado em Redes de Computadores, já que o conteúdo aqui também é
// sobre ferramentas/decisões, não código pra executar).
const { test, expect } = require('@playwright/test');
const { stubSupabaseDisabled } = require('./helpers');

// A ordem das opções (A/B/C/D) é embaralhada a cada renderização — não dá
// pra usar STEPS[...].correctIndex como posição na tela, precisa achar a
// opção pelo texto (ver comentário equivalente em quiz-wrong-answer-feedback.spec.js).
async function completeTeoria(page) {
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
    await page.click('#btnNextAfterAnswer');
  }
}

async function completePratica(page) {
  for (let i = 0; i < 5; i++) {
    const correctIdx = await page.evaluate(() => CHALLENGES.find(c => c.id === selectedId).correctIndex);
    await page.locator('.option').nth(correctIdx).click();
    await expect(page.locator('#ticketStatus')).toHaveText('RESOLVIDO');
    if (i < 4) await page.click('#btnNext');
  }
}

test.describe('turmas/sistemas/atividades — trilhas de Desenvolvimento de Sistemas 1', () => {
  test.beforeEach(async ({ page }) => {
    await stubSupabaseDisabled(page);
  });

  test('teoria de Ferramentas, APIs e Frameworks conclui e marca progresso', async ({ page }) => {
    await page.goto('/turmas/sistemas/atividades/devsis-apis-frameworks-teoria.html?user=alexandre.natal&role=aluno&turma=sistemas');
    await completeTeoria(page);
    await expect(page.locator('.finish-screen')).toBeVisible();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('devsis_apis_frameworks_teoria_progress_alexandre.natal')));
    expect(stored.completed).toBe(true);
  });

  test('prática de Ferramentas e APIs resolve os 5 chamados', async ({ page }) => {
    await page.goto('/turmas/sistemas/atividades/devsis-apis-frameworks-pratica.html?user=alexandre.natal&role=aluno&turma=sistemas');
    await page.waitForSelector('#optionsPanel .option');
    await completePratica(page);
    await expect(page.locator('#lblProgress')).toHaveText('5/5');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('devsis_apis_frameworks_pratica_progress_alexandre.natal')));
    expect(stored.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  test('teoria de Requisitos Funcionais e Não Funcionais conclui e marca progresso', async ({ page }) => {
    await page.goto('/turmas/sistemas/atividades/devsis-requisitos-teoria.html?user=alexandre.natal&role=aluno&turma=sistemas');
    await completeTeoria(page);
    await expect(page.locator('.finish-screen')).toBeVisible();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('devsis_requisitos_teoria_progress_alexandre.natal')));
    expect(stored.completed).toBe(true);
  });

  test('prática de Requisitos resolve os 5 chamados', async ({ page }) => {
    await page.goto('/turmas/sistemas/atividades/devsis-requisitos-pratica.html?user=alexandre.natal&role=aluno&turma=sistemas');
    await page.waitForSelector('#optionsPanel .option');
    await completePratica(page);
    await expect(page.locator('#lblProgress')).toHaveText('5/5');
  });

  test('teoria de Linguagens e Plataformas conclui e marca progresso', async ({ page }) => {
    await page.goto('/turmas/sistemas/atividades/devsis-linguagem-teoria.html?user=alexandre.natal&role=aluno&turma=sistemas');
    await completeTeoria(page);
    await expect(page.locator('.finish-screen')).toBeVisible();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('devsis_linguagem_teoria_progress_alexandre.natal')));
    expect(stored.completed).toBe(true);
  });

  test('prática de Linguagem e Plataforma resolve os 5 chamados', async ({ page }) => {
    await page.goto('/turmas/sistemas/atividades/devsis-linguagem-pratica.html?user=alexandre.natal&role=aluno&turma=sistemas');
    await page.waitForSelector('#optionsPanel .option');
    await completePratica(page);
    await expect(page.locator('#lblProgress')).toHaveText('5/5');
  });

  test('a prática fica bloqueada até a teoria da mesma trilha ser concluída', async ({ page }) => {
    await page.goto('/turmas/sistemas/plataforma.html?user=alexandre.natal&ip=192.168.2.1&saldo=1183.50&role=aluno');
    await page.click('.game-card:has-text("Desenvolvimento de Sistemas 1")');
    await page.selectOption('#trilhaSelect', 'devsis-apis-frameworks');
    const praticaCard = page.locator('#moduleSelector_devsis-apis-frameworks .game-card', { hasText: 'Prática — Central de Sistemas: Ferramentas e APIs' });
    await expect(praticaCard).toHaveClass(/locked/);
    await expect(praticaCard).toContainText('Bloqueado');
  });
});
