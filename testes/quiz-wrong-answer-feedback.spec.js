// @ts-check
// Regressão: no quiz de teoria (história + pergunta), a explicação de cada
// pergunta é escrita assumindo que o aluno acertou (começa com "Isso!",
// "Correto!", "Exato!" etc.). Quando o aluno erra, o código prefixava essa
// mesma explicação com "❌ Não foi dessa vez.", resultando numa mensagem
// contraditória tipo "Não foi dessa vez. Isso! ..." — confuso pro aluno.
// A correção remove essa afirmação redundante da mensagem de erro e deixa
// explícito qual era a resposta certa.
//
// A ordem de exibição das opções (A/B/C/D) é embaralhada a cada renderização
// da pergunta (ver renderQuestion() em sql-basico-teoria.html), então os
// testes não podem assumir que um índice fixo é sempre certo/errado. Em vez
// disso, recarregam a página e clicam sempre na opção 0 até bater no
// resultado desejado — como cada recarga sorteia uma ordem nova e
// independente, isso converge rápido sem depender de nenhum detalhe interno
// do algoritmo de embaralhamento.
const { test, expect } = require('@playwright/test');
const { stubSupabaseDisabled } = require('./helpers');

const URL = '/turmas/sistemas/atividades/sql-basico-teoria.html?user=alexandre.natal&role=aluno';
const MAX_ATTEMPTS = 40;

async function answerFirstQuestion(page) {
  await page.goto(URL);
  await page.click('#btnNext');
  await page.locator('.option').first().click();

  const incorrect = page.locator('.feedback.incorrect');
  if (await incorrect.count()) return { kind: 'incorrect', locator: incorrect };

  const correct = page.locator('.feedback.correct');
  await expect(correct).toBeVisible();
  return { kind: 'correct', locator: correct };
}

async function answerUntil(page, wantedKind) {
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const result = await answerFirstQuestion(page);
    if (result.kind === wantedKind) return result.locator;
  }
  return null;
}

test.describe('Feedback de resposta errada no quiz de teoria', () => {
  test.beforeEach(async ({ page }) => {
    await stubSupabaseDisabled(page);
  });

  test('mensagem de erro não repete a afirmação de acerto embutida na explicação', async ({ page }) => {
    const feedback = await answerUntil(page, 'incorrect');
    expect(feedback, `nenhuma resposta errada em ${MAX_ATTEMPTS} tentativas — algo mudou na estrutura da pergunta`).not.toBeNull();

    await expect(feedback).toBeVisible();
    await expect(feedback).toContainText('Não foi dessa vez');
    await expect(feedback).toContainText('A resposta certa é');

    // A afirmação de acerto ("Isso!", "Correto!" etc.) não deve aparecer
    // colada logo após "Não foi dessa vez." — sinal do bug de mistura.
    const text = await feedback.textContent();
    expect(text).not.toMatch(/Não foi dessa vez\.\s*(Isso mesmo!|Isso!|Correto!|Exato!|Perfeito!|Correta!)/);
  });

  test('mensagem de acerto continua normal (não afetada pela correção)', async ({ page }) => {
    const feedback = await answerUntil(page, 'correct');
    expect(feedback, `nenhuma resposta certa em ${MAX_ATTEMPTS} tentativas — algo mudou na estrutura da pergunta`).not.toBeNull();

    await expect(feedback).toContainText('✅ Correto!');
  });
});
