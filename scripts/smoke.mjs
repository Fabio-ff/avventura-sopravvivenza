// Smoke test: Chromium headless sull'app costruita. La pagina si carica, esiste un canvas, nessun errore in console.
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const PORT = 4173;
const BASE = `http://localhost:${PORT}/`;
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

  await page.goto(BASE);
  await page.waitForSelector('canvas');

  // Il modello è caricato (golden) o è comparso il segnaposto; con SMOKE_EXPECT si pretende l'uno o l'altro.
  await page.waitForSelector('body[data-ready]', { timeout: 30_000 });
  const ready = await page.evaluate(() => document.body.dataset.ready);
  const expected = process.env.SMOKE_EXPECT ?? 'golden';
  if (ready !== expected) throw new Error(`data-ready=${ready}, atteso ${expected}`);

  // Il contatore fps mostra un numero maggiore di zero.
  await page.waitForFunction(
    () => {
      const n = Number.parseInt(document.getElementById('fps')?.textContent ?? '', 10);
      return n > 0;
    },
    undefined,
    { timeout: 15_000 },
  );

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
