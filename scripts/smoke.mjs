// Smoke test: Chromium headless sull'app costruita. Menu di scelta, poi pagina di gioco con canvas, nessun errore in console.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = 4173;
// Rispetta BASE_PATH (es. /avventura-sopravvivenza/), come la build; in locale vale /.
const BASE_PATH = process.env.BASE_PATH ?? '/';
const BASE = `http://localhost:${PORT}${BASE_PATH}`;
const server = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'],
  { stdio: 'pipe' },
);
const errors = [];
let browser;

// Watchdog: nulla deve bloccare la CI. unref, così non tiene vivo un processo finito.
setTimeout(() => {
  console.error('smoke: watchdog timeout');
  server.kill();
  process.exit(1);
}, 120_000).unref();

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE)).ok) return;
    } catch {
      // non ancora pronto
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('vite preview non è partito');
}

async function run() {
  await waitForServer();
  browser = await chromium.launch({
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));

  // Senza ?pg= compare il menu con sei schede; il gioco 3D non parte (nessun canvas).
  await page.goto(BASE);
  await page.waitForSelector('.menu-card');
  const schede = await page.locator('.menu-card').count();
  if (schede !== 6) throw new Error(`menu: ${schede} schede, attese 6`);
  if ((await page.locator('canvas').count()) !== 0)
    throw new Error('menu: canvas di gioco avviato');
  if (await page.evaluate(() => 'ready' in document.body.dataset))
    throw new Error('menu: il gioco risulta avviato');
  // Un ?pg= sconosciuto riporta al menu, e gli altri parametri restano nei link.
  await page.goto(`${BASE}?pg=drago&fps=0`);
  await page.waitForSelector('.menu-card');
  const href = await page.locator('.menu-card[data-pg="ninja"]').getAttribute('href');
  if (!href?.includes('fps=0') || !href.includes('pg=ninja'))
    throw new Error(`menu: link del Ninja inatteso (${href})`);

  // Clic sulla scheda del Ninja: arriva a ?pg=ninja e il gioco si carica.
  await page.goto(BASE);
  await page.click('.menu-card[data-pg="ninja"]');
  await page.waitForURL(/[?&]pg=ninja/);
  await page.waitForSelector('canvas');
  await page.waitForSelector('body[data-ready]', { timeout: 30_000 });

  // In gioco il pulsante "Personaggi" vuole due tocchi: il primo chiede conferma, il secondo torna al menu.
  await page.click('.menu-back');
  if ((await page.locator('.menu-back').textContent()) !== 'Torna al menu?')
    throw new Error('pulsante: manca la conferma al primo tocco');
  if ((await page.locator('.menu-card').count()) !== 0)
    throw new Error('pulsante: il primo tocco ha già riportato al menu');
  await page.click('.menu-back');
  await page.waitForSelector('.menu-card');
  if (new URL(page.url()).searchParams.has('pg'))
    throw new Error(`pulsante: pg ancora in ${page.url()}`);

  await page.goto(`${BASE}?pg=golden`);
  await page.waitForSelector('canvas');

  // Il modello è caricato (golden) o è comparso il segnaposto; con SMOKE_EXPECT si pretende l'uno o l'altro.
  await page.waitForSelector('body[data-ready]', { timeout: 30_000 });
  const ready = await page.evaluate(() => document.body.dataset.ready);
  const expected = process.env.SMOKE_EXPECT ?? 'golden';
  if (ready !== expected) throw new Error(`data-ready=${ready}, atteso ${expected}`);

  // Le vite: 3 con Golden, mostrate anche nei cuori; il Golem ne ha 4 (controllato sotto).
  const viteGolden = await page.evaluate(() => document.body.dataset.vite);
  if (viteGolden !== '3') throw new Error(`?pg=golden: data-vite=${viteGolden}, atteso 3`);
  if ((await page.locator('.hud-heart').count()) !== 3)
    throw new Error('?pg=golden: attesi 3 cuori');

  // Il contatore fps mostra un numero maggiore di zero.
  await page.waitForFunction(
    () => {
      const n = Number.parseInt(document.getElementById('fps')?.textContent ?? '', 10);
      return n > 0;
    },
    undefined,
    { timeout: 15_000 },
  );

  // Tenendo premuto "avanti" per un secondo la posizione esposta cambia.
  const before = await page.evaluate(() => document.body.dataset.pos);
  if (!before) throw new Error('body[data-pos] mancante');
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(1000);
  await page.keyboard.up('KeyW');
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => document.body.dataset.pos);
  if (after === before) throw new Error(`il giocatore non si è mosso (data-pos=${after})`);

  // Con ?pg=titano si carica il modello del Titano (non il segnaposto).
  const titano = await browser.newPage({ viewport: { width: 640, height: 360 } });
  titano.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  titano.on('pageerror', (e) => errors.push(String(e)));
  await titano.goto(`${BASE}?pg=titano`);
  await titano.waitForSelector('body[data-ready]', { timeout: 30_000 });
  const readyTitano = await titano.evaluate(() => document.body.dataset.ready);
  if (readyTitano !== 'titano')
    throw new Error(`?pg=titano: data-ready=${readyTitano}, atteso titano`);

  // Con ?pg=ninja e ?pg=mago si carica il modello proprio (non quello di Golden né il segnaposto).
  for (const id of ['ninja', 'mago']) {
    const altro = await browser.newPage({ viewport: { width: 640, height: 360 } });
    altro.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    altro.on('pageerror', (e) => errors.push(String(e)));
    await altro.goto(`${BASE}?pg=${id}`);
    await altro.waitForSelector('body[data-ready]', { timeout: 30_000 });
    const readyAltro = await altro.evaluate(() => document.body.dataset.ready);
    if (readyAltro !== id) throw new Error(`?pg=${id}: data-ready=${readyAltro}, atteso ${id}`);
    await altro.close();
  }

  // Il Golem parte con 4 vite.
  const golem = await browser.newPage({ viewport: { width: 640, height: 360 } });
  golem.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  golem.on('pageerror', (e) => errors.push(String(e)));
  await golem.goto(`${BASE}?pg=golem`);
  await golem.waitForSelector('body[data-ready]', { timeout: 30_000 });
  const viteGolem = await golem.evaluate(() => document.body.dataset.vite);
  if (viteGolem !== '4') throw new Error(`?pg=golem: data-vite=${viteGolem}, atteso 4`);

  // Il segnaposto scrive un avviso voluto: non è un errore.
  if (errors.length) throw new Error(`errori in console:\n${errors.join('\n')}`);
  console.log(`smoke: ok (${ready})`);
}

run()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close().catch(() => undefined);
    server.kill();
    process.exit(process.exitCode ?? 0);
  });
