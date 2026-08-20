// @ts-check
// Ranking: o aluno vê a própria posição na turma (calculada a partir do %
// geral de conclusão em student_module_progress), mas nunca o nome ou a
// posição de outro colega — só o número da própria colocação e o total de
// alunos. O professor não vê o badge (não faz sentido pra ele).
const { test, expect } = require('@playwright/test');
const { stubSupabaseFake } = require('./helpers');

// Turma Jogos tem 47 módulos ao todo (teoria+prática de todas as trilhas de
// todas as matérias com conteúdo) — usados como base do % geral. O % de cada
// aluno é a MÉDIA da fração current/total de cada um dos 47 módulos, não uma
// simples contagem de módulos concluídos.
//
// O progresso do PRÓPRIO aluno logado é lido do localStorage do navegador
// (syncAllModulesProgress roda no load e reescreve student_module_progress
// com isso) — por isso o progresso dele é semeado via localStorage abaixo,
// não na tabela. Só o progresso de OUTROS alunos (que nunca abrem essa
// sessão de navegador) fica estável vindo direto do seed do Supabase.
const SEED = {
  student_module_progress: [
    // edward.guzman: completa 3 módulos pré-existentes (js/basico, js/intermediario,
    // csharp/basico) → soma 3 frações de 1.0 / 47 módulos = 6,4% → arredonda 6%.
    { student_email: 'edward.guzman', turma: 'jogos', trilha_key: 'js', module_key: 'basico', progress_current: 5, progress_total: 5, completed: true },
    { student_email: 'edward.guzman', turma: 'jogos', trilha_key: 'js', module_key: 'intermediario', progress_current: 7, progress_total: 7, completed: true },
    { student_email: 'edward.guzman', turma: 'jogos', trilha_key: 'csharp', module_key: 'basico', progress_current: 1, progress_total: 1, completed: true },
  ],
};

// breno.silva80 completa os 10 desafios de js/basico (progressTotal:10) e
// nada mais → 1 fração de 1.0 / 47 módulos da turma = 2,13% → arredonda 2%.
async function seedBrenoLocalProgress(page) {
  await page.addInitScript(() => {
    localStorage.setItem('js_basico_progress_breno.silva80', JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
  });
}

test.describe('Ranking do aluno na turma', () => {
  test('aluno vê a própria posição, sem nome/posição de colegas na tela', async ({ page }) => {
    await stubSupabaseFake(page, SEED);
    await seedBrenoLocalProgress(page);
    await page.goto('/turmas/jogos/plataforma.html?user=breno.silva80&ip=192.168.1.10&saldo=1234.80&role=aluno&turma=jogos');

    const badge = page.locator('#rankingBadge');
    await expect(badge).toBeVisible();
    // edward (6%) na frente, breno (2%) em 2º de 17 alunos da turma Jogos.
    // O texto é só o essencial (troféu + posição); o detalhe completo vira title/tooltip.
    await expect(badge).toHaveText('🏆 2º');
    await expect(badge).toHaveAttribute('title', 'Sua posição na turma: 2º de 17 (2% concluído)');

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('Edward');
    expect(bodyText).not.toContain('edward.guzman');
  });

  test('professor não vê o badge de ranking', async ({ page }) => {
    await stubSupabaseFake(page, SEED);
    await page.goto('/turmas/jogos/plataforma.html?user=admin&ip=192.168.1.254&saldo=9999.00&role=professor&turma=jogos');

    await expect(page.locator('#rankingBadge')).toBeHidden();
  });

  test('aluno no topo da turma vê a própria posição em 1º', async ({ page }) => {
    // Aqui é o edward.guzman quem está logado, então é o localStorage dele
    // (não a linha semeada no SEED, que syncAllModulesProgress reescreveria)
    // que decide o % geral: completa os 3 módulos pré-existentes (3/11 = 27%,
    // o maior % da turma) → 1º lugar, mesmo sem ser 100%.
    await stubSupabaseFake(page, SEED);
    await page.addInitScript(() => {
      localStorage.setItem('js_basico_progress_edward.guzman', JSON.stringify([0, 1, 2, 3, 4]));
      localStorage.setItem('js_intermediario_progress_edward.guzman', JSON.stringify([0, 1, 2, 3, 4, 5, 6]));
      localStorage.setItem('csharp_basico_progress_edward.guzman', JSON.stringify({ completed: true }));
    });
    await page.goto('/turmas/jogos/plataforma.html?user=edward.guzman&ip=192.168.1.11&saldo=1580.11&role=aluno&turma=jogos');

    await expect(page.locator('#rankingBadge')).toHaveText('🏆 1º');
  });

  // Cada aluno numa posição ÚNICA, mesmo quando o % ARREDONDADO (o número
  // mostrado na tela) empata entre vários — o desempate por e-mail garante
  // que a posição nunca se repete (já aconteceu de 3+ alunos aparecerem
  // como "1º" ao mesmo tempo, com o ranking "de competição" antigo).
  test('% arredondado igual entre vários alunos: cada um fica numa posição diferente', async ({ page }) => {
    // SEED só dá progresso pro edward — breno e o resto da turma (16 outros
    // alunos) ficam exatamente em 0%, um empate de verdade (não só de
    // arredondamento). O e-mail decide a ordem entre eles.
    await stubSupabaseFake(page, SEED);
    await page.goto('/turmas/jogos/plataforma.html?user=breno.silva80&ip=192.168.1.10&saldo=1234.80&role=aluno&turma=jogos');

    // "breno.silva80" é o 1º em ordem alfabética entre os 16 zerados.
    await expect(page.locator('#rankingBadge')).toHaveText('🏆 2º');
    await expect(page.locator('#rankingBadge')).toHaveAttribute('title', 'Sua posição na turma: 2º de 17 (0% concluído)');
  });

  // Empate EXATO no % (não só no arredondado): dois alunos com o mesmíssimo
  // progresso ainda assim precisam ficar em posições diferentes — só o
  // e-mail como desempate final garante isso.
  test('dois alunos com o mesmo % exato ficam em posições diferentes, nunca empatadas', async ({ page }) => {
    // edward sempre acima dos dois (mais um módulo concluído que eles).
    const baseSeed = {
      student_module_progress: [
        { student_email: 'edward.guzman', turma: 'jogos', trilha_key: 'js', module_key: 'basico', progress_current: 10, progress_total: 10, completed: true },
        { student_email: 'edward.guzman', turma: 'jogos', trilha_key: 'js', module_key: 'intermediario', progress_current: 10, progress_total: 10, completed: true },
        { student_email: 'edward.guzman', turma: 'jogos', trilha_key: 'csharp', module_key: 'basico', progress_current: 1, progress_total: 1, completed: true },
      ],
    };

    // Caso A: gabriella tem os mesmos 2 módulos concluídos (via SEED, ela
    // não está logada nesta passagem) e engel.fraga loga com o MESMO
    // progresso exato semeado no localStorage dela — mesmo % exato dos dois.
    await stubSupabaseFake(page, {
      student_module_progress: [
        ...baseSeed.student_module_progress,
        { student_email: 'gabriella.borges5', turma: 'jogos', trilha_key: 'js', module_key: 'basico', progress_current: 10, progress_total: 10, completed: true },
        { student_email: 'gabriella.borges5', turma: 'jogos', trilha_key: 'csharp', module_key: 'basico', progress_current: 1, progress_total: 1, completed: true },
      ],
    });
    await page.addInitScript(user => {
      localStorage.setItem(`js_basico_progress_${user}`, JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
      localStorage.setItem(`csharp_basico_progress_${user}`, JSON.stringify({ completed: true }));
    }, 'engel.fraga');
    await page.goto('/turmas/jogos/plataforma.html?user=engel.fraga&ip=192.168.1.12&saldo=2100.12&role=aluno&turma=jogos');
    // "engel.fraga" vem antes de "gabriella.borges5" em ordem alfabética.
    await expect(page.locator('#rankingBadge')).toHaveText('🏆 2º');
  });

  test('o outro lado do mesmo empate exato: quem perde no desempate fica numa posição atrás', async ({ page }) => {
    const baseSeed = {
      student_module_progress: [
        { student_email: 'edward.guzman', turma: 'jogos', trilha_key: 'js', module_key: 'basico', progress_current: 10, progress_total: 10, completed: true },
        { student_email: 'edward.guzman', turma: 'jogos', trilha_key: 'js', module_key: 'intermediario', progress_current: 10, progress_total: 10, completed: true },
        { student_email: 'edward.guzman', turma: 'jogos', trilha_key: 'csharp', module_key: 'basico', progress_current: 1, progress_total: 1, completed: true },
      ],
    };

    // Caso B: agora quem loga é gabriella.borges5, com o mesmo % exato de
    // engel.fraga (que fica pelo SEED, sem logar nesta passagem).
    await stubSupabaseFake(page, {
      student_module_progress: [
        ...baseSeed.student_module_progress,
        { student_email: 'engel.fraga', turma: 'jogos', trilha_key: 'js', module_key: 'basico', progress_current: 10, progress_total: 10, completed: true },
        { student_email: 'engel.fraga', turma: 'jogos', trilha_key: 'csharp', module_key: 'basico', progress_current: 1, progress_total: 1, completed: true },
      ],
    });
    await page.addInitScript(user => {
      localStorage.setItem(`js_basico_progress_${user}`, JSON.stringify([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
      localStorage.setItem(`csharp_basico_progress_${user}`, JSON.stringify({ completed: true }));
    }, 'gabriella.borges5');
    await page.goto('/turmas/jogos/plataforma.html?user=gabriella.borges5&ip=192.168.1.13&saldo=1420.13&role=aluno&turma=jogos');
    // Mesmo % exato de engel, mas "gabriella.borges5" perde o desempate
    // alfabético — fica uma posição atrás dela (3º), nunca empatada em 2º.
    await expect(page.locator('#rankingBadge')).toHaveText('🏆 3º');
  });
});
