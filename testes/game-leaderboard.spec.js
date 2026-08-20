// @ts-check
// Placar competitivo dos minigames (shared/game-leaderboard.js): ao
// terminar uma rodada, o jogo grava o score em game_scores (só se for
// melhor que o anterior do próprio aluno) e o botão de ranking mostra
// o top 10 da turma, com nome e posição dos colegas — diferente do
// ranking de progresso acadêmico, aqui o placar é público de propósito.
const { test, expect } = require('@playwright/test');
const { stubSupabaseFake } = require('./helpers');

const DIGITACAO_URL = '/games/digitacao.html?user=breno.silva80&role=aluno&name=Breno%20Silva&turma=jogos';

test.describe('shared/game-leaderboard.js — Digitação', () => {
  test('terminar uma rodada grava o PPM no placar da turma', async ({ page }) => {
    await stubSupabaseFake(page, {});
    await page.goto(DIGITACAO_URL);

    // Força o fim da rodada sem esperar os 30s: digita a palavra atual (sorteada,
    // por isso lê do DOM em vez de chutar um valor fixo) certinha e encerra o jogo.
    const currentWord = await page.locator('.word.current').textContent();
    await page.fill('#typeInput', currentWord + ' ');
    await page.evaluate(() => window.endGame ? window.endGame() : null);
    await page.waitForTimeout(200);

    const seeded = await page.evaluate(() => window.__FAKE_DB__.game_scores || []);
    expect(seeded.length).toBe(1);
    expect(seeded[0].game).toBe('digitacao');
    expect(seeded[0].turma).toBe('jogos');
    expect(seeded[0].student_email).toBe('breno.silva80');
    expect(seeded[0].score).toBeGreaterThan(0);
  });

  test('só sobrescreve o placar se o novo score for MELHOR que o salvo', async ({ page }) => {
    await stubSupabaseFake(page, {
      game_scores: [{ student_email: 'breno.silva80', student_name: 'Breno Silva', turma: 'jogos', game: 'digitacao', score: 999 }],
    });
    await page.goto(DIGITACAO_URL);
    const currentWord = await page.locator('.word.current').textContent();
    await page.fill('#typeInput', currentWord + ' ');
    await page.evaluate(() => window.endGame());
    await page.waitForTimeout(200);

    const rows = await page.evaluate(() => window.__FAKE_DB__.game_scores);
    expect(rows.length).toBe(1);
    expect(rows[0].score).toBe(999); // não foi rebaixado por um PPM de teste menor
  });

  test('botão de ranking mostra o top da turma com nome dos colegas, sem vazar e-mail', async ({ page }) => {
    await stubSupabaseFake(page, {
      game_scores: [
        { student_email: 'edward.guzman', student_name: 'Edward Guzman', turma: 'jogos', game: 'digitacao', score: 80 },
        { student_email: 'breno.silva80', student_name: 'Breno Silva', turma: 'jogos', game: 'digitacao', score: 60 },
      ],
    });
    await page.goto(DIGITACAO_URL);
    await expect(page.locator('#btnRanking')).toBeVisible();
    await page.click('#btnRanking');

    const overlay = page.locator('#glOverlay');
    await expect(overlay).toBeVisible();
    await expect(overlay).toContainText('Edward Guzman');
    await expect(overlay).toContainText('80 PPM');
    await expect(overlay).toContainText('Breno Silva');
    await expect(overlay.locator('.gl-row.me')).toContainText('Breno Silva');
    await expect(overlay).not.toContainText('edward.guzman');

    await page.click('.gl-close');
    await expect(overlay).toHaveCount(0);
  });

  test('sem Supabase configurado, o botão de ranking fica escondido', async ({ page }) => {
    const { stubSupabaseDisabled } = require('./helpers');
    await stubSupabaseDisabled(page);
    await page.goto(DIGITACAO_URL);
    await expect(page.locator('#btnRanking')).toBeHidden();
  });

  // Regressão: quando a tabela game_scores (ou a policy de RLS) não existe
  // no Supabase, a consulta falha — e antes disso ficava indistinguível de
  // "ninguém pontuou ainda", escondendo o problema real de configuração.
  test('tabela game_scores ausente no Supabase mostra aviso de erro, não "ninguém pontuou"', async ({ page }) => {
    await stubSupabaseFake(page, {
      __errors: { game_scores: 'relation "public.game_scores" does not exist' },
    });
    await page.goto(DIGITACAO_URL);
    await page.click('#btnRanking');

    const overlay = page.locator('#glOverlay');
    await expect(overlay).toBeVisible();
    await expect(overlay).toContainText('Não foi possível carregar o ranking agora');
    await expect(overlay).not.toContainText('Ninguém pontuou ainda');
  });

  test('a checagem de recorde pessoal também é escopada por turma', async ({ page }) => {
    // Mesmo student_email em duas turmas (só acontece de verdade com o
    // professor, que usa "admin" nas duas) — o recorde de uma turma não
    // pode bloquear a gravação de um score novo, mais baixo, na outra.
    await stubSupabaseFake(page, {
      game_scores: [{ student_email: 'breno.silva80', student_name: 'Breno Silva', turma: 'sistemas', game: 'digitacao', score: 999 }],
    });
    await page.goto(DIGITACAO_URL); // turma=jogos
    const currentWord = await page.locator('.word.current').textContent();
    await page.fill('#typeInput', currentWord + ' ');
    await page.evaluate(() => window.endGame());
    await page.waitForTimeout(200);

    const rows = await page.evaluate(() => window.__FAKE_DB__.game_scores);
    const jogosRow = rows.find(r => r.turma === 'jogos');
    expect(jogosRow).toBeTruthy();
    expect(jogosRow.score).toBeGreaterThan(0);
    // a linha da turma sistemas continua intacta, sem ser sobrescrita
    expect(rows.find(r => r.turma === 'sistemas')).toMatchObject({ score: 999 });
  });
});

test.describe('shared/game-leaderboard.js — Campo Minado', () => {
  const URL = '/games/campo-minado.html?user=breno.silva80&role=aluno&name=Breno%20Silva&turma=jogos';

  test('concluir um nível grava o nível no placar e sobe a dificuldade', async ({ page }) => {
    await stubSupabaseFake(page, {});
    await page.goto(URL);
    await expect(page.locator('#lblLevel')).toHaveText('1');

    await page.evaluate(() => window.onLevelCleared());
    await page.waitForTimeout(100);

    const rows = await page.evaluate(() => window.__FAKE_DB__.game_scores);
    expect(rows.length).toBe(1);
    expect(rows[0].game).toBe('campo_minado');
    expect(rows[0].score).toBe(1);

    await expect(page.locator('#lblBestLevel')).toHaveText('1');
    await page.waitForTimeout(1500); // LEVEL_UP_PAUSE
    await expect(page.locator('#lblLevel')).toHaveText('2');
  });
});
