#!/usr/bin/env node
// Checagem estática, sem browser: garante que toda referência relativa
// (src=/href=) nos HTML aponta pra um arquivo que existe de verdade, que
// nenhuma tag <script> ficou desbalanceada, e que todo bloco de JS inline
// tem sintaxe válida. Roda em segundos e pega o tipo de erro mais comum
// depois de mover arquivo de pasta: caminho relativo desatualizado.
import { readFileSync, existsSync, writeFileSync, unlinkSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const IGNORE = new Set(['node_modules', '.git', 'playwright-report', 'test-results']);

/** @param {string} dir @param {string[]} out */
function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const allFiles = walk(ROOT);
const htmlFiles = allFiles.filter(f => f.endsWith('.html'));

let errors = [];
let checkedRefs = 0;
let checkedScripts = 0;

const REF_RE = /\b(?:src|href)="([^"]+)"/g;
const SCRIPT_BLOCK_RE = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
// O \? opcional cobre <script>/<\/script> escapados de propósito dentro de
// uma string JS (ex: um caso de teste que verifica detecção de "<script>"
// malicioso) — sem isso, string literal teria que fechar o <script> real
// da página, o que quebraria a atividade no navegador.
const SCRIPT_OPEN_RE = /<\\?script\b/g;
const SCRIPT_CLOSE_RE = /<\\?\/script>/g;

for (const file of htmlFiles) {
  const rel = file.slice(ROOT.length + 1);
  const html = readFileSync(file, 'utf8');
  const dir = dirname(file);

  // 1) referências relativas resolvem?
  for (const m of html.matchAll(REF_RE)) {
    const ref = m[1];
    if (/^(https?:)?\/\//.test(ref) || ref.startsWith('data:') || ref.startsWith('#') || ref.startsWith('mailto:') || ref.startsWith('about:')) {
      continue;
    }
    checkedRefs++;
    const target = resolve(dir, ref.split('?')[0].split('#')[0]);
    if (!existsSync(target)) {
      errors.push(`${rel}: referência quebrada "${ref}" (esperado em ${target.slice(ROOT.length + 1)})`);
    }
  }

  // 2) tags <script> balanceadas
  const opens = [...html.matchAll(SCRIPT_OPEN_RE)].length;
  const closes = [...html.matchAll(SCRIPT_CLOSE_RE)].length;
  if (opens !== closes) {
    errors.push(`${rel}: <script> desbalanceado (${opens} aberturas, ${closes} fechamentos)`);
  }

  // 3) sintaxe válida em cada bloco inline
  let idx = 0;
  for (const m of html.matchAll(SCRIPT_BLOCK_RE)) {
    const code = m[1];
    if (!code.trim()) continue;
    checkedScripts++;
    const tmp = resolve(ROOT, `.tmp-check-${process.pid}-${idx++}.js`);
    writeFileSync(tmp, code);
    try {
      execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' });
    } catch (e) {
      errors.push(`${rel}: erro de sintaxe num <script> inline:\n${e.stderr?.toString() || e.message}`);
    } finally {
      unlinkSync(tmp);
    }
  }
}

console.log(`Verificados ${htmlFiles.length} arquivos HTML, ${checkedRefs} referências relativas, ${checkedScripts} blocos de script inline.`);

if (errors.length) {
  console.error(`\n${errors.length} problema(s) encontrado(s):\n`);
  for (const e of errors) console.error(' - ' + e);
  process.exit(1);
} else {
  console.log('Nenhum problema encontrado.');
}
