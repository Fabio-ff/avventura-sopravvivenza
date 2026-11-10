# Fase 0 — Bootstrap: piano di esecuzione

> **Per chi esegue:** metodo in §7 della specifica (subagenti Sonnet/Haiku, revisione Opus a fine fase).
> Un task = un branch = una PR. Niente codice in questo piano: lo scrive chi implementa.

**Obiettivo:** Golden "viva" (idle) in una scena vuota all'indirizzo pubblico
`https://fabio-ff.github.io/avventura-sopravvivenza/`, con contatore fps, CI verde e deploy automatico.

**Approccio:** si copia lo stack di RoarBall con `cp` da `/Users/fabio/Projects/Roarball/` e si toglie
tutto ciò che riguarda il basket. Nessuna logica di gioco in questa fase.

**Stack:** Three.js ^0.186, TypeScript strict, Vite 8, Vitest 5, ESLint + Prettier, Playwright, Node >= 22.12.

**Specifica:** `docs/superpowers/specs/2026-11-10-avventura-design.md` (§5.1, §5.2, §6 riga 0, §10).

## Vincoli globali

- `BASE_PATH` di deploy: `/avventura-sopravvivenza/`; ogni percorso di asset passa da `import.meta.env.BASE_URL`.
- Budget tablet: niente ombre dinamiche, nebbia attiva, `devicePixelRatio` limitato a 2.
- Testi a schermo in italiano. Messaggi di commit in italiano, come i due esistenti.
- `npm run check` (lint, format, build, test) verde prima di ogni PR; suite di test sotto i 30 secondi.
- Copiare e adattare, non rigenerare. Non portare codice di RoarBall che non serve a questa fase.

## Punti da sorvegliare in revisione

1. Il GLB non si carica (rete lenta, percorso errato sotto `BASE_PATH`): deve comparire il segnaposto, non uno schermo nero.
2. Rotazione o ridimensionamento del tablet: canvas e camera si adattano, Golden resta inquadrata.
3. Scheda in background e ritorno: nessun salto dell'animazione (delta del frame limitato).
4. Volto di Golden scuro: serve la luce di riempimento (lezione di RoarBall).
5. WebGL non disponibile: messaggio in italiano al posto della pagina vuota.

---

## Task 1 — Impalcatura, CI e Pages (Sonnet)

**Branch:** `fase0/impalcatura`

**Da copiare da RoarBall e adattare:** `package.json` (nome `avventura-sopravvivenza`, descrizione nuova; via gli
script `balance` e `assets` e le dipendenze `@gltf-transform/*` e `sharp`, che torneranno con la pipeline asset),
`tsconfig.json` (senza il riferimento a `tsconfig.sim.json`), `eslint.config.js`, `.prettierrc`, `.prettierignore`,
`.gitignore`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `src/ui/base.css`, `.github/workflows/ci.yml` e
`deploy.yml` (`BASE_PATH` nuovo), `scripts/smoke.mjs` (ridotto: la pagina si carica, esiste un `canvas`, nessun
errore in console).

**Da creare:**
- `src/main.ts`: canvas a tutto schermo con una scena Three.js vuota (colore di cielo, nebbia, piano di terra),
  gestione del ridimensionamento, messaggio se WebGL manca.
- Un test Vitest minimo su una funzione pura (ad esempio il limite del delta di frame) perché `npm test` non sia vuoto.
- `public/assets/art/`: copia dei sette file di `sources/art/`.
- `CLAUDE.md` (massimo 40 righe): comandi, struttura delle cartelle prevista in §5.3, convenzioni (italiano,
  `npm run check` prima della PR, rapporto in dieci righe, riuso da RoarBall con `cp`).
- `docs/STATO.md`: fase corrente, task fatti, prossimo passo, decisioni recenti.
- `README.md` di poche righe con l'indirizzo pubblico.

**Fuori dal repo:** attivare GitHub Pages con sorgente "GitHub Actions"
(`gh api -X POST repos/Fabio-ff/avventura-sopravvivenza/pages -f build_type=workflow`).

**Accettazione:** `npm run check` e `npm run smoke` verdi in locale; `gh pr checks` verdi; dopo il merge il workflow
di deploy termina e l'indirizzo pubblico risponde 200 mostrando la scena vuota.

## Task 2 — Golden in idle e contatore fps (Sonnet, dopo il Task 1)

**Branch:** `fase0/golden-idle`

**Da copiare da RoarBall e adattare:** `public/assets/characters/ace.glb` → `public/assets/characters/golden.glb`;
`src/render/model-cache.ts`, `character-view.ts`, `clip-for.ts`; `src/app/game-loop.ts`, `frame-time.ts`,
`dispose.ts`, `url-options.ts`; `src/ui/debug-overlay.ts`. Togliere ogni riferimento a palla, partita e simulazione;
`clip-for` conosce solo idle, run, jump, hit, fall.

**Da creare o modificare:**
- `src/main.ts`: carica Golden attraverso la cache dei modelli, la mette al centro in idle, camera fissa a tre quarti
  che la inquadra per intero in verticale e in orizzontale, luce ambientale + direzionale + luce di riempimento sul volto,
  ombra finta a macchia sotto i piedi.
- Contatore fps sempre visibile in un angolo (media su mezzo secondo), leggibile sul tablet; l'opzione URL `?fps=0` lo nasconde.
- Test Vitest: scelta della clip per stato; media del contatore fps; limite del delta di frame.
- `scripts/smoke.mjs`: attende che il modello sia caricato (attributo `data-ready="golden"` su `body`, oppure
  `data-ready="segnaposto"` se il caricamento fallisce) e che il contatore fps mostri un numero maggiore di zero.

**Accettazione:** come il Task 1, più: all'indirizzo pubblico Golden si muove in idle con il volto illuminato;
con il GLB rinominato in locale compare il segnaposto e lo smoke lo segnala; nessun file di `src/` importa moduli inesistenti
o codice di basket. Questa PR tocca solo impalcatura di rendering, quindi passa con CI verde e smoke.

## Task 3 — Chiusura di fase (Opus + sessione principale)

- Revisione Opus del diff dell'intera fase (`git diff 5bbec75..main -- . ':!docs/superpowers'`) contro questo piano
  e i "punti da sorvegliare"; correzioni bloccanti in una PR `fase0/correzioni`.
- `docs/STATO.md` e memoria di ripresa aggiornati: fase 0 chiusa, prossimo passo = piano della fase 1.
- **Prova sul tablet (Fabio e Filippo):** aprire l'indirizzo pubblico, leggere il contatore fps, annotarlo in `docs/STATO.md`.
- **Momento per Filippo:** vede Golden viva sul tablet.

## Rimandato di proposito

Pipeline asset Tripo (`scripts/asset-pipeline/`) → fase 4, quando arriva il primo modello. Input, audio, schermate,
salvataggio → fasi 1, 2 e 7, copiati quando servono.
