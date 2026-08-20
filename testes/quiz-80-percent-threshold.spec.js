// @ts-check
// Regra nova: qualquer atividade "teoria" (história + quiz de múltipla
// escolha) só é aceita como concluída — completed:true, o que libera o
// resto da trilha/jogos — quando o aluno acerta pelo menos 80% das
// perguntas. Abaixo disso, fica só o convite pra tentar de novo, sem
// travar o progresso como concluído.
const { test, expect } = require('@playwright/test');
const { stubSupabaseDisabled } = require('./helpers');

const URL = '/turmas/sistemas/atividades/sql-comentarios-teoria.html?user=alexandre.natal&role=aluno&turma=sistemas';
const PROGRESS_KEY = 'sql_comentarios_teoria_progress_alexandre.natal';

// A ordem das opções é embaralhada a cada pergunta — acha a opção certa (ou
// uma errada) pelo texto, não por posição (ver quiz-wrong-answer-feedback.spec.js).
async function answerStep(page, correct) {
  const correctText = await page.evaluate(() => {
    const q = STEPS[stepOrder[currentStepIndex]].question;
    return q.options[q.correctIndex];
  });
  const options = page.locator('.option');
  const count = await options.count();
  let idx = -1;
  for (let j = 0; j < count; j++) {
    const text = await options.nth(j).innerText();
    const isMatch = text.includes(correctText);
    if (correct ? isMatch : !isMatch) { idx = j; break; }
  }
  await options.nth(idx).click();
  await page.click('#btnNextAfterAnswer');
}

// wrongCount respostas erradas primeiro, o resto certas — dá no mesmo total
// de acertos/erros independente da ordem, então simplifica o teste.
async function runQuiz(page, wrongCount) {
  await page.goto(URL);
  const total = await page.evaluate(() => STEPS.length);
  for (let i = 0; i < total; i++) {
    await page.click('#btnNext');
    await answerStep(page, i >= wrongCount);
  }
  return total;
}

test.describe('Limite de 80% de acerto pra concluir uma atividade', () => {
  test.beforeEach(async ({ page }) => {
    await stubSupabaseDisabled(page);
  });

  test('abaixo de 80% de acerto: fica "Quase lá!", completed continua false', async ({ page }) => {
    const total = await runQuiz(page, 2); // 7/9 = 77.8%, abaixo de 80%

    await expect(page.locator('.finish-screen h2')).toHaveText('Quase lá!');
    await expect(page.locator('.finish-screen')).toContainText('é preciso pelo menos 80%');
    await expect(page.locator('#btnRestart')).toHaveText('🔁 Tentar novamente');

    const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), PROGRESS_KEY);
    expect(stored.completed).toBe(false);
    expect(stored.correctCount).toBe(total - 2);
  });

  test('80% de acerto ou mais: marca completed true e mostra a tela de sucesso', async ({ page }) => {
    const total = await runQuiz(page, 1); // 8/9 = 88.9%, acima de 80%

    await expect(page.locator('.finish-screen .trophy')).toHaveText('🏆');
    await expect(page.locator('.finish-screen')).toContainText('Documentação de código concluída!');

    const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), PROGRESS_KEY);
    expect(stored.completed).toBe(true);
    expect(stored.correctCount).toBe(total - 1);
  });

  test('reabrir um módulo já aprovado não regrava/derruba o completed (regressão)', async ({ page }) => {
    await runQuiz(page, 0); // 100%
    let stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), PROGRESS_KEY);
    expect(stored.completed).toBe(true);

    // Reabre a página com o mesmo progresso salvo — deve só reexibir o
    // sucesso, sem recalcular contra um correctCount que pode não bater
    // (histórico de antes dessa regra existir, por exemplo).
    await page.goto(URL);
    await expect(page.locator('.finish-screen .trophy')).toHaveText('🏆');
    stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), PROGRESS_KEY);
    expect(stored.completed).toBe(true);
  });
});
