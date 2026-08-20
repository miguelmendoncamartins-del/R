// @ts-check
// Cobre as trilhas novas da matéria Redes de Computadores (turma Sistemas):
// 4 trilhas (1 por capacidade do resumo), cada uma com 1 teoria (história + quiz)
// e 1 prática ("chamados" de múltipla escolha — não existe um motor de código
// pra rede como o sql.js existe pra SQL, então a prática usa o mesmo formato
// de ticket/sidebar da prática de SQL, trocando o editor de código por opções).
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

test.describe('turmas/sistemas/atividades — trilhas de Redes de Computadores', () => {
  test.beforeEach(async ({ page }) => {
    await stubSupabaseDisabled(page);
  });

  test('teoria de Conexão e Endereçamento IP conclui e marca progresso', async ({ page }) => {
    await page.goto('/turmas/sistemas/atividades/redes-conexao-teoria.html?user=alexandre.natal&role=aluno&turma=sistemas');
    await completeTeoria(page);
    await expect(page.locator('.finish-screen')).toBeVisible();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('redes_conexao_teoria_progress_alexandre.natal')));
    expect(stored.completed).toBe(true);
  });

  test('prática de Conexão resolve os 5 chamados, incluindo retry após resposta errada', async ({ page }) => {
    await page.goto('/turmas/sistemas/atividades/redes-conexao-pratica.html?user=alexandre.natal&role=aluno&turma=sistemas');
    await page.waitForSelector('#optionsPanel .option');

    // chamado 1: clica errado primeiro, confirma que não resolve e permite tentar de novo
    await page.locator('.option').nth(1).click();
    await expect(page.locator('#ticketStatus')).toHaveText('PENDENTE');
    await expect(page.locator('.console .line.fail')).toBeVisible();

    for (let i = 0; i < 5; i++) {
      const correctIdx = await page.evaluate(() => CHALLENGES.find(c => c.id === selectedId).correctIndex);
      await page.locator('.option').nth(correctIdx).click();
      await expect(page.locator('#ticketStatus')).toHaveText('RESOLVIDO');
      if (i < 4) await page.click('#btnNext');
    }

    await expect(page.locator('#lblProgress')).toHaveText('5/5');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('redes_conexao_pratica_progress_alexandre.natal')));
    expect(stored.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  test('teoria de Diagnóstico de Problemas de Rede conclui e marca progresso', async ({ page }) => {
    await page.goto('/turmas/sistemas/atividades/redes-resolucao-teoria.html?user=alexandre.natal&role=aluno&turma=sistemas');
    await completeTeoria(page);
    await expect(page.locator('.finish-screen')).toBeVisible();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('redes_resolucao_teoria_progress_alexandre.natal')));
    expect(stored.completed).toBe(true);
  });

  test('prática de Diagnóstico resolve os 5 chamados', async ({ page }) => {
    await page.goto('/turmas/sistemas/atividades/redes-resolucao-pratica.html?user=alexandre.natal&role=aluno&turma=sistemas');
    await page.waitForSelector('#optionsPanel .option');
    for (let i = 0; i < 5; i++) {
      const correctIdx = await page.evaluate(() => CHALLENGES.find(c => c.id === selectedId).correctIndex);
      await page.locator('.option').nth(correctIdx).click();
      await expect(page.locator('#ticketStatus')).toHaveText('RESOLVIDO');
      if (i < 4) await page.click('#btnNext');
    }
    await expect(page.locator('#lblProgress')).toHaveText('5/5');
  });

  test('teoria de Serviços de Internet e Modelos conclui e marca progresso', async ({ page }) => {
    await page.goto('/turmas/sistemas/atividades/redes-servicos-teoria.html?user=alexandre.natal&role=aluno&turma=sistemas');
    await completeTeoria(page);
    await expect(page.locator('.finish-screen')).toBeVisible();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('redes_servicos_teoria_progress_alexandre.natal')));
    expect(stored.completed).toBe(true);
  });

  test('prática de Serviços resolve os 5 chamados', async ({ page }) => {
    await page.goto('/turmas/sistemas/atividades/redes-servicos-pratica.html?user=alexandre.natal&role=aluno&turma=sistemas');
    await page.waitForSelector('#optionsPanel .option');
    for (let i = 0; i < 5; i++) {
      const correctIdx = await page.evaluate(() => CHALLENGES.find(c => c.id === selectedId).correctIndex);
      await page.locator('.option').nth(correctIdx).click();
      await expect(page.locator('#ticketStatus')).toHaveText('RESOLVIDO');
      if (i < 4) await page.click('#btnNext');
    }
    await expect(page.locator('#lblProgress')).toHaveText('5/5');
  });

  test('teoria de Armazenamento e Ativos de Rede conclui e marca progresso', async ({ page }) => {
    await page.goto('/turmas/sistemas/atividades/redes-armazenamento-teoria.html?user=alexandre.natal&role=aluno&turma=sistemas');
    await completeTeoria(page);
    await expect(page.locator('.finish-screen')).toBeVisible();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('redes_armazenamento_teoria_progress_alexandre.natal')));
    expect(stored.completed).toBe(true);
  });

  test('prática de Armazenamento resolve os 5 chamados', async ({ page }) => {
    await page.goto('/turmas/sistemas/atividades/redes-armazenamento-pratica.html?user=alexandre.natal&role=aluno&turma=sistemas');
    await page.waitForSelector('#optionsPanel .option');
    for (let i = 0; i < 5; i++) {
      const correctIdx = await page.evaluate(() => CHALLENGES.find(c => c.id === selectedId).correctIndex);
      await page.locator('.option').nth(correctIdx).click();
      await expect(page.locator('#ticketStatus')).toHaveText('RESOLVIDO');
      if (i < 4) await page.click('#btnNext');
    }
    await expect(page.locator('#lblProgress')).toHaveText('5/5');
  });

  test('a prática fica bloqueada até a teoria da mesma trilha ser concluída', async ({ page }) => {
    await page.goto('/turmas/sistemas/plataforma.html?user=alexandre.natal&ip=192.168.2.1&saldo=1183.50&role=aluno');
    await page.click('.game-card:has-text("Redes de Computadores")');
    await page.selectOption('#trilhaSelect', 'redes-conexao');
    const praticaCard = page.locator('#moduleSelector_redes-conexao .game-card', { hasText: 'Prática — Central de Redes: Conexões' });
    await expect(praticaCard).toHaveClass(/locked/);
    await expect(praticaCard).toContainText('Bloqueado');
  });
});
