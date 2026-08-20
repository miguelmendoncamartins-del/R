const path = require('node:path');

const FAKE_CLIENT_PATH = path.join(__dirname, 'fixtures', 'fake-supabase-client.js');
const SUPABASE_JS_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
const VLIBRAS_URL = 'https://vlibras.gov.br/app/vlibras-plugin.js';

/** Bloqueia ruído externo (Libras, Google Fonts) que não afeta a lógica
 * testada e só deixaria os testes mais lentos/instáveis. */
async function blockExternalNoise(page) {
  await page.route(VLIBRAS_URL, route => route.fulfill({ contentType: 'application/javascript', body: '' }));
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
}

/** Faz supabase-config.js carregar com URL/KEY vazios: sbClient fica null
 * e a app roda 100% no modo "sem backend" (as telas precisam suportar
 * isso de qualquer forma quando o Supabase não está configurado). */
async function stubSupabaseDisabled(page) {
  await blockExternalNoise(page);
  await page.route('**/shared/supabase-config.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: "window.SUPABASE_URL = ''; window.SUPABASE_ANON_KEY = '';",
  }));
}

/** Faz supabase-config.js carregar com credenciais falsas e troca a lib
 * @supabase/supabase-js real por um cliente falso em memória (ver
 * fixtures/fake-supabase-client.js), seedado via window.__FAKE_DB__. */
async function stubSupabaseFake(page, seed) {
  await blockExternalNoise(page);
  await page.route('**/shared/supabase-config.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: "window.SUPABASE_URL = 'https://fake.test'; window.SUPABASE_ANON_KEY = 'fake-key';",
  }));
  await page.route(SUPABASE_JS_URL, route => route.fulfill({
    contentType: 'application/javascript',
    path: FAKE_CLIENT_PATH,
  }));
  if (seed) {
    await page.addInitScript(seedData => {
      window.__FAKE_DB__ = seedData;
    }, seed);
  }
}

module.exports = { blockExternalNoise, stubSupabaseDisabled, stubSupabaseFake };
