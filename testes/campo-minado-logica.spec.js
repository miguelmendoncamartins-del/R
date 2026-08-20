// @ts-check
// Campo Minado (games/campo-minado.html): o robô não anda mais uma lista
// fixa de comandos decidida de antemão — mover()/perigo()/posicao()/
// distanciaAteBandeira() respondem na hora, contra um tabuleiro-sombra
// (simulate()), pra que if/while do aluno reajam de verdade ao que o robô
// sente. A tela só REPRODUZ depois (replayLog()) o que a simulação decidiu.
const { test, expect } = require('@playwright/test');

const URL = '/games/campo-minado.html?user=test&role=aluno&name=Test&turma=jogos';

// Deixa o tabuleiro sem nenhuma mina, exceto as que o teste colocar à mão —
// assim os testes de sensor não dependem do layout aleatório do dia.
async function clearMines(page) {
  await page.evaluate(() => {
    for (const row of board) for (const cell of row) cell.mine = false;
  });
}

async function runSim(page, code) {
  return page.evaluate((src) => {
    const fn = new Function('mover', 'perigo', 'posicao', 'distanciaAteBandeira', src);
    return simulate(fn);
  }, code);
}

test.describe('Campo Minado — sensores (perigo/posicao/distanciaAteBandeira)', () => {
  test('perigo() detecta mina, fora do tabuleiro, e casa livre', async ({ page }) => {
    await page.goto(URL);
    await clearMines(page);
    await page.evaluate(() => { board[0][1].mine = true; }); // vizinha à direita do início (0,0)

    const sim = await runSim(page, `
      window.__r = perigo('direita');   // mina de verdade
      window.__c = perigo('cima');      // fora do tabuleiro (linha -1)
      window.__b = perigo('baixo');     // casa livre
    `);
    const flags = await page.evaluate(() => ({ r: window.__r, c: window.__c, b: window.__b }));
    expect(flags).toEqual({ r: true, c: true, b: false });
    expect(sim.outcome).toBeNull();
  });

  test('posicao() e distanciaAteBandeira() refletem a posição simulada, não a visual', async ({ page }) => {
    await page.goto(URL);
    await clearMines(page);
    const sim = await runSim(page, `
      mover('direita'); mover('direita'); mover('baixo');
      window.__pos = posicao();
      window.__dist = distanciaAteBandeira();
    `);
    const info = await page.evaluate(() => ({ pos: window.__pos, dist: window.__dist }));
    expect(info.pos).toEqual({ linha: 2, coluna: 3 });
    expect(info.dist).toBe(11); // bandeira em (8,8) 1-based: |8-2| + |8-3| = 6 + 5
    expect(sim.outcome).toBeNull();
  });
});

test.describe('Campo Minado — mover() reage de verdade (para o script na hora)', () => {
  test('pisar numa mina marca outcome "mine" e ignora chamadas seguintes', async ({ page }) => {
    await page.goto(URL);
    await clearMines(page);
    await page.evaluate(() => { board[0][1].mine = true; });

    const sim = await runSim(page, `
      mover('direita'); // pisa na mina e interrompe a execução aqui
      mover('baixo');   // nunca deveria rodar de verdade
    `);
    expect(sim.outcome).toBe('mine');
    const moves = sim.log.filter(e => e.type === 'move');
    expect(moves).toEqual([{ type: 'move', dir: 'direita', result: 'mina' }]);
  });

  test('chegar na bandeira marca outcome "goal"', async ({ page }) => {
    await page.goto(URL);
    await clearMines(page);
    const code = Array.from({ length: 7 }, () => "mover('direita');").join('\n')
      + Array.from({ length: 7 }, () => "mover('baixo');").join('\n');
    const sim = await runSim(page, code);
    expect(sim.outcome).toBe('goal');
    expect(sim.log.at(-1)).toEqual({ type: 'move', dir: 'baixo', result: 'chegou' });
  });

  test('mesmo sem usar perigo(), mover() pra fora do tabuleiro só bate na parede (não conta como derrota)', async ({ page }) => {
    await page.goto(URL);
    await clearMines(page);
    const sim = await runSim(page, `mover('cima');`); // linha -1, fora do tabuleiro
    expect(sim.outcome).toBeNull();
    expect(sim.log).toEqual([{ type: 'move', dir: 'cima', result: 'parede' }]);
  });
});

test.describe('Campo Minado — redes de segurança contra loop', () => {
  test('while(true) que só sente o ambiente sem nunca mover não trava o jogo', async ({ page }) => {
    await page.goto(URL);
    await clearMines(page);
    const sim = await runSim(page, `while (true) { perigo('cima'); }`);
    expect(sim.outcome).toBe('loop');
  });

  test('ficar batendo na parede sem avançar esgota o limite de movimentos', async ({ page }) => {
    await page.goto(URL);
    await clearMines(page);
    const sim = await runSim(page, `while (true) { mover('cima'); }`); // sempre fora do tabuleiro
    expect(sim.outcome).toBe('exhausted');
  });
});

test.describe('Campo Minado — de ponta a ponta (motor + replay na tela)', () => {
  test('o código padrão sempre termina (nunca trava o botão Executar)', async ({ page }) => {
    await page.goto(URL);
    await page.click('#btnRun');

    let idle = false;
    for (let i = 0; i < 20 && !idle; i++) {
      idle = !(await page.evaluate(() => document.getElementById('btnRun').disabled));
      if (!idle) await page.waitForTimeout(1000);
    }
    expect(idle).toBe(true);

    // chegou a algum desfecho de verdade, não travou no meio da execução
    const consoleText = await page.locator('#consoleOutput').textContent();
    const reachedOutcome = /concluído em|pisou numa mina|ainda não foi alcançada|movimentos atingido|entrou num loop/.test(consoleText);
    expect(reachedOutcome).toBe(true);
  });

  test('pisar numa mina de verdade mostra a mensagem e destrava o botão', async ({ page }) => {
    await page.goto(URL);
    await clearMines(page);
    await page.evaluate(() => { board[0][1].mine = true; });
    await page.fill('#codeInput', "mover('direita');");
    await page.click('#btnRun');

    await expect(page.locator('#consoleOutput')).toContainText('pisou numa mina', { timeout: 10000 });
    await expect(page.locator('#btnRun')).toBeEnabled();
  });
});
