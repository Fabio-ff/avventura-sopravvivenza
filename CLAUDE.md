# Avventura Sopravvivenza

Gioco 3D nel browser per Filippo (9 anni): Three.js ^0.186, TypeScript strict, Vite 8, Vitest 5, Node >= 22.12.
Specifica: `docs/superpowers/specs/`. Piani: `docs/superpowers/plans/`. Stato: `docs/STATO.md`.

## Comandi

- `npm run dev` — server di sviluppo
- `npm run check` — lint, format, build, test (obbligatorio prima di ogni PR)
- `npm run smoke` — Chromium headless sull'app costruita (serve `npm run build`)
- `npm test` — Vitest; `npm run format` — Prettier

## Struttura prevista (spec §5.3)

- `src/main.ts` — avvio, scena
- `src/app/` — ciclo di gioco, tempo, utilità
- `src/render/` — modelli, personaggi, camera
- `src/ui/` — CSS e interfaccia
- `tests/` — test Vitest
- `public/assets/` — modelli e immagini (percorsi via `import.meta.env.BASE_URL`)
- `sources/` — materiale di partenza, non spedito

## Convenzioni

- Testi a schermo, commenti e messaggi di commit in italiano.
- `npm run check` verde prima di ogni PR; un task = un branch = una PR.
- Budget tablet: niente ombre dinamiche, nebbia attiva, `devicePixelRatio` max 2.
- `BASE_PATH` di deploy: `/avventura-sopravvivenza/`.
- Riuso da RoarBall (`/Users/fabio/Projects/Roarball/`, sola lettura): `cp` e adattare, mai codice di basket.
- Rapporto finale di ogni task: massimo dieci righe.
