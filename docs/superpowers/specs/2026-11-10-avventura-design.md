# Avventura-Sopravvivenza — Progetto di gioco e piano MVP

Data: 2026-11-10. Autori: Fabio e Filippo (9 anni), con Claude.
Stato: approvato da Fabio il 2026-11-10.

---

## 1. Contesto

Fabio e Filippo hanno già realizzato insieme RoarBall (basket arcade 3D nel browser, Three.js +
TypeScript + Vite, deploy su GitHub Pages, personaggi generati con Tripo Studio). Ora vogliono un
gioco diverso: un'avventura 3D a singolo giocatore ambientata su un pianeta immaginario. Le idee
sono di Filippo; il percorso di realizzazione conta quanto il risultato, perché Filippo va coinvolto
nei passaggi.

Esistono già: le illustrazioni del pianeta (globo e mappa con "The Frozen Expanse" a nord e
"The Burning South" a sud), quattro illustrazioni di esploratori (golem col fulmine, ninja rosso,
mago blu incappucciato, vichinga con mazza chiodata), il repo GitHub vuoto `Fabio-ff/avventura-sopravvivenza`,
la cartella locale vuota `/Users/fabio/Projects/Avventura-Sopravvivenza`, e il modello 3D animato
di Golden preso da RoarBall (`/Users/fabio/Projects/Roarball/public/assets/characters/ace.glb`).

Obiettivo di questo documento: fissare la visione del gioco e il perimetro del primo MVP, cioè la
missione 1 giocabile da cima a fondo nel browser.

---

## 2. Visione del gioco (deciso con Fabio e Filippo)

### 2.1 Premessa narrativa
I personaggi sono **esploratori** arrivati sul pianeta per cercare tesori e qualificarsi come
**migliori esploratori della galassia**. I tesori sono stati nascosti da chi li ha preceduti, che ha
lasciato **trappole, maledizioni e misteri** a difenderli. Le insidie hanno quindi due origini:
l'**ambiente** (clima, terreno, creature del posto) e **chi ha nascosto il tesoro** (trappole,
guardiani, enigmi). Trovare un tesoro dà la vittoria della missione e un **indizio** verso la zona
del tesoro successivo.

### 2.2 Personaggi
Cinque esploratori selezionabili, **funzionalmente diversi** ma con la regola ferrea che **ogni
missione è completabile da tutti**: le abilità cambiano il *come*, mai il *se*. Ogni ostacolo ha
una soluzione base per chiunque; le abilità aprono scorciatoie, strade alternative o segreti.

| Personaggio | Stato asset | Abilità proposta (da confermare con Filippo) |
|---|---|---|
| **Golden** (da RoarBall) | GLB pronto, 7 clip | Esploratrice "di base": nessuna abilità speciale, affronta ogni ostacolo con la soluzione standard. Serve anche a garantire che la soluzione base esista sempre. |
| **Ninja** | solo illustrazione | Agile: salta più in alto/lungo, si arrampica meglio. |
| **Golem** | solo illustrazione | Forte: spinge massi pesanti, resiste ai colpi (perde meno vite). |
| **Mago** | solo illustrazione | Magia: illumina il buio, rivela sentieri o oggetti nascosti. |
| **Vichinga** | solo illustrazione | Combattente: colpisce meglio, sfonda ostacoli fragili con la mazza. |

Nell'MVP solo Golden ha il modello vero; gli altri quattro compaiono nella selezione con la loro
illustrazione e, se scelti, usano un **segnaposto** (capsula colorata o il modello di Golden
ricolorato) con le abilità già funzionanti. Le abilità sono **sempre attive** (vedi §10); "resiste
ai colpi" per il Golem significa **una vita in più** rispetto agli altri. I modelli veri arriveranno via Tripo Studio con la
pipeline di RoarBall.

### 2.3 Il pianeta e le zone
La mappa già disegnata definisce le zone climatiche: **foresta/giungla** (continente centrale),
**deserto** (costa sud del continente e isola sud-ovest), **ghiacci** (Frozen Expanse),
**Sud rovente** (Burning South), **isole** a ovest. Ogni missione è ambientata in una zona. La mappa
del pianeta diventerà la schermata di selezione missione (fuori MVP).

### 2.4 Struttura di una missione
Un **percorso verso un obiettivo** (tesoro, oggetto, personaggio, spiegazione), con insidie lungo la
strada: trabocchetti, indovinelli, battaglie, orientamento. La **missione 1 è guidata** (mappa e
percorso suggerito); le successive lo sono sempre meno, fino a procedere "alla cieca".

### 2.5 Due modalità di gioco
- **Terza persona (azione 3D)**: muoversi, camminare/correre, saltare, accovacciarsi, arrampicarsi,
  spingere/tirare, impugnare oggetti o armi, combattere, interagire con oggetti della scena.
- **Prima persona (punta e clicca)**: in punti precisi della scena la camera passa al punto di vista
  del personaggio e il gioco diventa un'avventura alla Monkey Island: si osservano, raccolgono,
  usano e combinano oggetti, si parla, si risolvono enigmi. *(Mia ipotesi, approvata: il passaggio
  scatta quando il personaggio entra in un'area o si avvicina a un oggetto chiave.)*

### 2.6 Regole di vita e fallimento
Il personaggio ha una riserva di **vite/punti**. Ogni colpo subito o trappola scattata ne toglie
una. A zero vite si **riparte dall'inizio della missione**. *(Mia nota: missioni corte, oppure un
punto di controllo a metà nelle missioni lunghe; per la missione 1 propongo un punto di controllo
all'ingresso del tempio, da confermare.)*

### 2.7 Avversari (dalla missione 2 in poi)
Creature del posto, guardiani lasciati a difesa del tesoro, ed **esploratori rivali** controllati dal
gioco. Il combattimento è fuori dall'MVP ma l'architettura deve prevederlo (vite, colpi, animazione
"hit" già presente).

### 2.8 Stile e pubblico
Cartone animato 3D morbido e saturo, come le illustrazioni. Testi in **italiano**, brevi, leggibili
da un bambino di 9 anni. Gioco nel **browser**, desktop e tablet (tastiera, gamepad, touch), come
RoarBall.

### 2.9 Coinvolgimento di Filippo (criterio di progetto)
- Le missioni vivono in **file di dati** separati dal codice (posizioni, testi, quantità, enigmi),
  così Filippo può cambiarle con Fabio senza toccare il motore.
- Ogni fase del piano ha un **"momento per Filippo"**: qualcosa da vedere, provare o decidere.
- Una **modalità debug** (opzione URL) per saltare a qualsiasi tappa della missione e provarla subito.

---

## 3. Missione 1 — "Il tempio nella foresta" (come raccontata da Filippo)

Niente combattimenti. Tappe:

1. **Sperduti nella foresta.** Si parte in una radura, senza mappa. Esplorazione libera: serve a
   prendere confidenza con i controlli (tutorial implicito con suggerimenti a schermo).
2. **Orientarsi.** Due strade equivalenti: **salire sul crinale** (si vede il tempio, si **sblocca la
   mappa**) oppure **seguire il corso d'acqua** che porta al tempio. Lungo il percorso si raccolgono
   **banane**.
3. **Le scimmie all'ingresso.** Un gruppo di scimmie blocca il passaggio. **Prima scena in prima
   persona punta e clicca**: si distraggono con le banane raccolte (se mancano, si torna a cercarle).
4. **Il corridoio delle trappole.** Dentro il tempio: **fossati da saltare** e **trappole nascoste**
   (martello o roccia che sbuca all'improvviso). Ogni colpo toglie una vita.
5. **Il labirinto.** Un labirinto porta alla camera del tesoro.
6. **Il tesoro e l'indizio.** Trovarlo dà la vittoria e un indizio che indica la zona della missione 2
   (che includerà combattimenti e rivali).

Durata di una partita riuscita: da stimare in test, obiettivo indicativo 10–15 minuti.

**Dove entrano le abilità (proposta):** fossato largo (base: liana/asse da spostare; Ninja: salta
direttamente), masso che chiude una scorciatoia nella foresta (base: strada lunga; Golem: lo spinge),
sentiero nascosto nel labirinto (base: tentativi; Mago: lo rivela), grata fragile nel corridoio
(base: aggirarla; Vichinga: la sfonda). Golden fa sempre la strada base.

---

## 4. Perimetro dell'MVP

### Dentro
- Schermata titolo e **selezione personaggio** (5 card con illustrazioni; Golden con modello vero,
  gli altri segnaposto con abilità attive).
- **Controllo in terza persona**: camminare/correre, saltare, accovacciarsi, interagire (raccogliere,
  spingere, usare). Camera che segue il personaggio. Tastiera + gamepad + touch.
- **Foresta** con radura, crinale, corso d'acqua, tempio; banane raccoglibili; **mappa** che si sblocca
  sul crinale; suggerimenti di tutorial.
- **Scena punta e clicca** delle scimmie (prima persona, hotspot cliccabili, inventario, testi).
- **Tempio**: corridoio con fossati e trappole (martello/roccia a tempo o a pressione), **vite** con
  HUD, ripartenza da capo a zero vite (con eventuale punto di controllo all'ingresso del tempio).
- **Labirinto** e **camera del tesoro**; schermata di vittoria con **indizio** verso la missione 2.
- **Abilità** dei 5 personaggi applicate ai 4 punti elencati sopra.
- **Salvataggio locale** (personaggio scelto, missione completata, punteggio esploratore).
- Suoni essenziali sintetizzati (riuso motore audio RoarBall), senza file audio.
- **Deploy** automatico su GitHub Pages, CI con lint/build/test, smoke test Playwright.

### Fuori (previsto, non ora)
Combattimento e nemici; missione 2 e le altre zone climatiche; mappa del pianeta come schermata di
selezione; modelli Tripo dei quattro esploratori; arrampicata e spinta/tiro con animazioni dedicate
(nell'MVP l'arrampicata è assente e la spinta è una semplice interazione); dialoghi lunghi e
doppiaggio; musica elaborata; multiplayer.

---

## 5. Scelte tecniche (decise da Claude, Fabio può rifiutarle)

### 5.1 Stack
Identico a RoarBall: **Three.js** (~0.186), **TypeScript strict**, **Vite**, **Vitest**, ESLint +
Prettier, Playwright per lo smoke test, GitHub Actions per CI e deploy su Pages (`BASE_PATH`
`/avventura-sopravvivenza/`). Node >= 22.12. Nessun motore di fisica esterno nell'MVP: controller
cinematico a capsula con raycast verso il terreno e collisioni contro volumi semplici; il costruttore
può adottare Rapier solo se le collisioni del tempio lo richiedono davvero.

### 5.2 Riuso da RoarBall (copiare e adattare, percorsi sotto `/Users/fabio/Projects/Roarball/`)
- Pipeline asset: `scripts/asset-pipeline/*` + manifest `sources/characters/ace.json`.
- Modello Golden: `public/assets/characters/ace.glb` (clip: idle, run, jump, hit, fall; dribble e
  shoot si scartano). Lo scheletro è Mixamo-compatibile: walk/crouch/climb/push si aggiungono da
  Mixamo e si fondono nel GLB con gltf-transform, senza ripassare da Tripo.
- Caricamento modelli: `src/render/model-cache.ts` (timeout + fallback segnaposto).
- Personaggio animato: `src/render/character-view.ts`, `src/render/clip-for.ts`,
  `src/render/character-preview.ts` (anteprima nel menu).
- Input: `src/input/*` (tastiera, gamepad con rumble, touch con joystick flottante, menu).
- App: `src/app/game-loop.ts` (timestep fisso), `screens.ts`, `storage.ts`, `dispose.ts`,
  `url-options.ts`.
- UI: `src/ui/menu-nav.ts`, `hud.ts`, `debug-overlay.ts`.
- Audio sintetizzato: `src/audio/*`.
- Infrastruttura: `.github/workflows/deploy.yml`, `ci.yml`, `vite.config.ts`, `scripts/smoke.mjs`,
  configurazioni eslint/prettier/tsconfig.

### 5.3 Architettura nuova (cartelle in `src/`)
- `world/` — caricamento livello da dati, terreno (heightmap da rumore + punti fissi: radura,
  crinale, fiume, tempio), **kit di pezzi** istanziati (alberi, rocce, muri, pavimenti, porte),
  trigger volumetrici, oggetti raccoglibili, trappole.
- `player/` — controller terza persona (stato: fermo/cammina/corre/salta/accovacciato/interagisce),
  **profilo abilità** per personaggio (altezza/lunghezza salto, `canPush`, `canReveal`, `canSmash`,
  resistenza colpi), vite.
- `camera/` — follow in terza persona con collisione contro i muri; modalità prima persona fissa.
- `pnc/` — modalità punta e clicca: camera fissa, hotspot (oggetti 3D raycast al click/tap),
  verbi ridotti (guarda, prendi, usa, parla), inventario, combinazione oggetto→hotspot, testi.
- `missions/` — **dati** della missione: `missions/foresta/mission.json` (tappe, obiettivi, testi
  tutorial, posizioni banane, soglia banane, trappole con tempi, pianta del labirinto, indizio
  finale) + `characters.json` (profili abilità, testi). Caricati da un loader validato (schema).
- `hud/` — vite, inventario, obiettivo corrente, mappa (sbloccabile), suggerimenti.
- `save/` — progresso in localStorage.

Principio: il motore non conosce la missione 1; conosce tipi di elementi (raccoglibile, trigger,
trappola a tempo, fossato, porta con condizione, hotspot, labirinto) e la missione li compone.

### 5.4 Asset di ambiente
Per l'MVP kit low-poly CC0 (Kenney Nature Kit, Quaternius) per alberi, rocce, muri del tempio;
oggetti "eroe" (porta del tempio, scrigno, scimmie, banane, martello-trappola) generati con Tripo
come modelli statici (export gratuito sufficiente perché non serve rig) oppure modellati come
primitive. Le illustrazioni esistenti vanno in `public/assets/art/` per card e schermate.

### 5.5 Test
Vitest sulla logica pura (profili abilità, macchina a stati del player, risoluzione enigma scimmie,
trappole a tempo, labirinto, loader missione con schema). Smoke Playwright: carica, sceglie Golden,
entra in gioco, salta via URL alla camera del tesoro, verifica schermata vittoria.

---

## 6. Piano per fasi

Ogni fase chiude con qualcosa di giocabile nel browser e un momento per Filippo.

| # | Fase | Contenuto | Momento per Filippo |
|---|---|---|---|
| 0 | **Bootstrap** | Repo, stack copiato da RoarBall, CI + Pages, Golden caricato in una scena vuota con idle. | Vede Golden "viva" nel browser all'indirizzo pubblico. |
| 1 | **Muoversi** | Controller terza persona, camera, terreno di prova, salto, accovacciarsi, input tastiera/gamepad/touch, HUD vite. | Prova i controlli e decide quanto deve saltare Golden. |
| 2 | **La foresta** | Terreno con radura, crinale, fiume, tempio in lontananza; kit alberi/rocce; banane; mappa sbloccabile dal crinale; suggerimenti tutorial; dati in `mission.json`. | Sceglie dove nascondere le banane e scrive i cartelli del tutorial. |
| 3 | **Le scimmie** | Modalità punta e clicca: passaggio di camera, hotspot, inventario, enigma banane, testi. | Scrive cosa dicono le scimmie e quante banane servono. |
| 4 | **Il tempio** | Interni, fossati, trappole martello/roccia, perdita vite, ripartenza, punto di controllo. | Decide dove stanno le trappole e con quale ritmo scattano. |
| 5 | **Labirinto e tesoro** | Labirinto da pianta nei dati, camera del tesoro, vittoria, indizio, salvataggio. | Disegna il labirinto su carta, lo trascriviamo nei dati. |
| 6 | **I cinque esploratori** | Selezione personaggio con card, segnaposto, profili abilità, i 4 punti del livello con soluzione base + scorciatoia. | Prova la stessa tappa con due personaggi diversi. |
| 7 | **Rifinitura** | Suoni, prestazioni su tablet, test di gioco completo, correzioni, README. | Partita completa cronometrata; raccolta idee per la missione 2. |

Dopo l'MVP: missione 2 (deserto o zona indicata dall'indizio) con combattimento, rivali e guardiani;
modelli Tripo dei quattro esploratori; mappa del pianeta.

---

## 7. Metodo di lavoro (confermato da Fabio il 2026-11-10)

- Ogni task del piano: issue GitHub, branch, implementazione da subagente **Sonnet** (Haiku per
  chores banali), PR, merge solo con `gh pr checks` verdi.
- **Revisioni ricorrenti con Opus**: revisione di ogni PR prima del merge, più un riesame di fine
  fase sull'intero risultato rispetto a questo documento.
- La sessione principale (Fable) fa **solo progettazione**: decisioni, brainstorming, stesura di
  spec e piani, riesame finale. Niente lavoro meccanico in sessione principale.
- Igiene del contesto: dire "safe to /compact" dopo ogni task mergiato e "safe to /clear" prima di
  una nuova fase, dopo aver scritto l'handoff (spec, piano, file di memoria, epic GitHub). Mai
  suggerire clear con un subagente in corso.
- Documenti durevoli nel repo: `docs/superpowers/specs/` (questo design),
  `docs/superpowers/plans/` (piani per fase).

---

## 8. Verifica dell'MVP

1. `npm run check` verde (lint, format, build, test) in locale e in CI.
2. Smoke Playwright: titolo → selezione Golden → gioco → salto via URL alla camera del tesoro →
   schermata vittoria con indizio.
3. Partita manuale completa su desktop (tastiera) e su tablet (touch) dall'indirizzo Pages:
   orientamento con entrambe le strade, scimmie risolte, almeno una morte per trappola con ripartenza,
   labirinto, tesoro.
4. La stessa partita con un segnaposto (es. Ninja) verificando la scorciatoia del fossato.
5. Filippo modifica un valore in `mission.json` (posizione di una banana o testo) e lo vede nel gioco
   senza che nessuno tocchi il codice.

---

## 9. Lasciato al costruttore

Dettagli del controller (velocità, gravità, coyote time), forma del terreno e densità degli alberi,
schema esatto dei file missione, come rappresentare il labirinto (griglia ASCII nei dati è la mia
preferenza), scelta tra Kenney/Quaternius/Tripo per ogni oggetto, struttura precisa delle schermate,
tonalità dei suoni, come fondere clip Mixamo nel GLB.

## 10. Decisioni prese dopo il controllo del revisore (2026-11-10)

### Decise da Fabio e Filippo
- **Abilità confermate** come in §2.2: Ninja agile, Golem forte con una vita in più, Mago rivela,
  Vichinga sfonda, Golden di base. I 4 punti del livello in §3 restano la proposta di partenza.
- **Punto di controllo all'ingresso del tempio**, dopo le scimmie. Ripartendo da lì le vite tornano
  piene e si conservano banane, mappa e scimmie risolte. Prima del checkpoint si riparte dalla
  radura con tutto azzerato.
- **Punteggio esploratore = stelle per missione**, fino a 3: missione completata; completata senza
  mai esaurire le vite; completata entro un tempo soglia (nei dati della missione). Il punteggio
  totale è la somma delle stelle; la schermata di vittoria mostra le stelle ottenute. Il motore
  registra quindi: tempo di missione, numero di ripartenze, missione completata.
- **Tablet Android, modello non noto.** Budget di rendering conservativo fin dalla fase 2: niente
  ombre dinamiche (al massimo ombre finte a macchia sotto i personaggi), alberi e rocce con
  instancing, nebbia per limitare la distanza di disegno, texture leggere, obiettivo 30 fps stabili
  su un Android di fascia media. Ottimizzazioni ulteriori in fase 7 sul tablet reale.

### Decise da Claude (Fabio può cambiarle)
- **Animazioni nell'MVP**: si usano solo le clip già in `ace.glb`. Camminata = clip `run` rallentata
  via `timeScale`; accovacciarsi senza animazione dedicata (capsula e camera si abbassano, il
  modello resta in idle); nessuna arrampicata. L'aggiunta di clip Mixamo (walk, crouch, climb, push)
  è un passaggio **manuale di Fabio dopo l'MVP**, preceduto da uno spike che verifichi la
  compatibilità dello scheletro Tripo con le clip Mixamo.
- **Abilità sempre attive**, non confinate ai 4 punti. Il livello va disegnato tenendo conto del
  salto del Ninja (muri del labirinto e bordi più alti della sua portata). Le scorciatoie non
  previste che emergono in test sono benvenute, non bug.
- **Valori provvisori prima, Filippo dopo**: i subagenti usano valori iniziali (posizioni banane,
  testi, pianta del labirinto, tempi trappole) e il "momento per Filippo" diventa modificare i
  file di dati con Fabio e vedere il risultato. Nessuna fase resta bloccata in attesa.
- **Illustrazioni**: i sei JPEG inviati in sessione (globo, mappa, golem, ninja, mago, vichinga)
  vanno copiati in fase 0 in `public/assets/art/` e in `sources/art/`; se Fabio ha originali a
  risoluzione maggiore li sostituirà. La card di Golden usa `sources/raw/golden-medieval-princess.jpeg`
  da RoarBall.
- **Mappa**: copre solo l'esterno (radura, crinale, fiume, tempio, posizione del giocatore). Si
  sblocca sul crinale **oppure** arrivando all'ingresso del tempio, così chi segue il fiume non la
  perde. Dentro il tempio la mappa non funziona: lì guidano le trappole e, per il Mago, la sua
  abilità.
