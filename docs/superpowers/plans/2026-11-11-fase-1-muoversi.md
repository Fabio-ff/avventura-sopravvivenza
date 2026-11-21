# Fase 1 — Muoversi: piano di esecuzione

> **Per chi esegue:** metodo in §7 della specifica (subagenti Sonnet, revisione Opus sulle PR che toccano il motore
> e a fine fase). Un task = un branch = una PR. Niente codice in questo piano: lo scrive chi implementa.

**Obiettivo:** all'indirizzo pubblico si guida un esploratore in terza persona dentro la **palestra** (fossati, gradini,
muri, passaggio basso, masso, trappola mobile) con tastiera, gamepad e touch; cinque profili scelti da URL; vite e HUD.

**Approccio:** logica pura e testata (collisioni, controller, vite) separata dal rendering. Simulazione a passo fisso
di 1/60 s. Nessun motore di fisica: cilindro verticale contro scatole allineate agli assi.

**Specifica:** `docs/superpowers/specs/2026-11-10-avventura-design.md` (§2.2, §2.6, §5.3, §6 riga 1, §10).

## Decisioni di progetto (provvisorie dove indicato: Filippo le ritocca in palestra)

- **Collisioni.** Il mondo è una lista di scatole (`min`, `max`) di tre tipi: `fisso`, `spingibile`, `pericolo`. Il
  pavimento è fatto di scatole; un **fossato** è un vuoto tra due lastre. Il giocatore è un cilindro (raggio 0,35 m,
  alto 1,8 m; 1,0 m da accovacciato). Si risolve un asse alla volta (Y, poi X, poi Z). Sale da solo i gradini fino a
  0,35 m. Sotto y = −4 è "caduto". Un gancio `groundHeightAt(x, z)` (per ora sempre assente) servirà al terreno in fase 3.
- **Movimento.** Gravità 25 m/s². Corsa predefinita; camminata con leva poco inclinata o Maiusc. Coyote time 0,1 s,
  salto memorizzato 0,1 s, controllo pieno in aria. Da accovacciato non ci si rialza sotto un soffitto.
- **Profili** in `src/missions/characters.json` (provvisori):

  | id | corsa m/s | salto m | vite | abilità | colore |
  |---|---|---|---|---|---|
  | golden | 6 | 1,2 | 3 | — | originale |
  | ninja | 7 | 2,0 | 3 | — | originale (modello Tripo) |
  | golem | 5 | 1,0 | 4 | `canPush` | grigio pietra |
  | mago | 6 | 1,2 | 3 | `canReveal` | originale (modello Tripo) |
  | vichinga | 6 | 1,2 | 3 | `canSmash` | arancio |
  | titano | 5,5 | 1,4 | 4 | `canShock` | originale |

  Camminata 2,5 m/s e accovacciato 2 m/s per tutti. Golem e Vichinga sono ancora segnaposto: usano il modello di Golden tinto.
  Il Titano elettrico (`?pg=titano`) ha il modello Tripo vero (`characters/titano.glb`, senza gambe, fluttua a 0,25 m con
  oscillazione di ±0,06 m): mancano le clip idle e run, quindi idle è `walk.001` ferma su una posa e run è `walk.001`
  accelerata (x2); jump e fall usano `jump.001`, hit usa la caduta all'indietro accelerata (x3).
  Ninja e Mago hanno il modello vero (`characters/ninja.glb`, `characters/mago.glb`, scheletro Mixamo, già animati, colori
  originali, piedi a terra): il profilo mappa le clip con velocità, `sulPosto` toglie lo spostamento in avanti del bacino
  dalle clip di corsa e camminata, `jump` e `fall` condividono il tratto 0-0,27 s del salto. Il Ninja ha anche le clip
  `walk`, `crouch` (accovacciarsi dal secondo 0,8, ferma sull'ultima posa) e `crouchWalk` (altezza corretta con
  `scalaAccovacciato`): con le clip da accovacciato il modello non si schiaccia. Il Mago non le ha e si schiaccia come Golden.
  `canReveal` e `canSmash` restano solo nel profilo: i loro elementi arrivano con la missione (fasi 2 e 6).
- **Palestra** (misure scelte sui profili): fossato stretto 2 m (tutti), fossato largo 5,5 m (solo Ninja), gradino 0,3 m
  (si sale camminando), gradino 0,8 m (saltando), muro 1,6 m (solo Ninja), muro 3 m (nessuno), passaggio basso con luce
  1,2 m (accovacciati), masso 1,5 m che chiude un varco (solo chi ha `canPush`, camminandoci contro), trappola mobile
  (scatola `pericolo` che va avanti e indietro su 4 m in 2 s).
- **Vite.** Un colpo toglie una vita, spinge indietro e dà 1,5 s di invulnerabilità (clip `hit`, modello che lampeggia).
  Cadere in un fossato toglie una vita e riporta all'ultimo punto sicuro a terra. A zero vite: scritta "Riprova!",
  ritorno alla partenza con vite piene e masso al suo posto.
- **Comandi.** Tastiera: WASD/frecce, Spazio salta, C accovacciati, Maiusc cammina, mouse trascinato ruota la camera,
  Q/E ruotano la visuale, R/F la alzano e abbassano.
  Gamepad: leva sinistra, leva destra camera, A salta, B accovacciati. Touch: joystick flottante a sinistra, trascinare
  sulla metà destra ruota la camera, pulsanti Salta e Giù in basso a destra. "Interagisci" arriva in fase 2.
- **Camera.** Segue da dietro a 4,5 m con inclinazione 25°, si riallinea da sola dopo 1,5 s senza comandi di camera mentre ci
  si muove, si accorcia se una scatola sta tra lei e il personaggio (cinque raggi), ostacoli che coprono diventano
  trasparenti, inclinazione limitata tra −10° e 60°.
- **URL.** `?pg=golden|ninja|golem|mago|vichinga|titano`, `?level=palestra` (unico livello, predefinito). Senza `pg`, o con `pg` sconosciuto, si apre il menu di scelta del personaggio (schede a tutto schermo, tocco/mouse/tastiera); in gioco il pulsante "Personaggi" riporta al menu.

## Vincoli globali

- Budget tablet: niente ombre dinamiche, nebbia attiva, `devicePixelRatio` max 2; obiettivo 60 fps in palestra.
- Testi a schermo, commenti e commit in italiano. `npm run check` verde prima di ogni PR; suite sotto i 30 secondi.
- Test solo su logica pura (niente rendering né DOM). Copiare da RoarBall con `cp` e adattare, mai codice di basket.
- Solo le clip idle, run, jump, hit, fall; camminata = `run` con `timeScale` ridotto; accovacciato senza clip dedicata.

## Punti da sorvegliare in revisione

1. Attraversamento: un frame lungo o una caduta veloce non devono far passare il cilindro attraverso lastre sottili.
2. Incastri: negli angoli, tra masso e muro, sul bordo dei fossati; il masso non entra nei muri né schiaccia il giocatore.
3. Touch: joystick, trascinamento camera e Salta insieme con tre dita; un `pointercancel` non lascia il joystick premuto.
4. `?pg=` sconosciuto o assente: si apre il menu di scelta; `?level=` sconosciuto: palestra. Nessun errore.
5. Scheda in background o finestra che perde il fuoco: nessun tasto resta premuto, nessuna vita persa al ritorno.

Ogni punto ha il suo test nel task che possiede il codice (1–2 nel Task 1, 3 e 5 nel Task 2, 4 nel Task 3).

---

## Task 1 — Collisioni, controller e profili (Sonnet, revisione Opus)

**Branch:** `fase1/controller`. Solo logica pura, nessun import di `three`.

**File:** `src/world/solids.ts` (tipi `Solid`, `SolidKind`, `Vec3` semplice), `src/world/collide.ts`,
`src/player/profiles.ts`, `src/missions/characters.json`, `src/player/controller.ts`, test in `tests/`.

**Produce (nomi usati dai task successivi):**
- `moveBody(body, delta, solids, opts) → { position, grounded, hitCeiling, hazardId, pushed }`: sposta il cilindro,
  sale i gradini, sposta le scatole `spingibile` se `opts.canPush` (solo in orizzontale, mai dentro altre scatole).
- `segmentHitsSolids(from, to, solids) → number | null`: frazione del primo impatto, per la camera.
- `loadProfiles()`, `profileFor(id: string) → AbilityProfile` (id sconosciuto → golden), `jumpReach(profile)`.
- `PlayerInput { moveX, moveY, walk, jump, crouch }`, `PlayerState` (posizione, velocità, direzione, `mode`:
  `fermo | cammina | corre | salta | cade | accovacciato | colpito`, a terra, ultimo punto sicuro),
  `createPlayer(spawn)`, `stepPlayer(state, input, cameraYaw, profile, solids, dt) → eventi` (`colpito`, `caduto`).

**Accettazione (test Vitest):** atterra su una lastra e non la attraversa con caduta da 30 m; sale 0,3 m camminando e
non 0,8 m; salta 0,8 m; con i profili della tabella golden supera 2 m e non 5,5 m di fossato, ninja supera 5,5 m e il
muro da 1,6 m, nessuno il muro da 3 m; scivola lungo un muro in diagonale; non si rialza sotto un soffitto a 1,2 m;
golem sposta il masso e golden no; il masso si ferma contro un muro; contatto con `pericolo` segnalato; sotto y = −4
evento `caduto`; coyote time e salto memorizzato; `profileFor('boh')` restituisce golden.

## Task 2 — Comandi: tastiera, gamepad, touch (Sonnet, in parallelo al Task 1)

**Branch:** `fase1/comandi`.

**Da copiare da RoarBall e adattare:** `src/input/keyboard.ts`, `gamepad.ts`, `touch.ts`, `touch.css`,
`input-manager.ts`, `types.ts` (non `menu-input.ts`). Via tiro, passaggio e ogni azione di basket.

**Produce:** `InputManager` con `read() → { moveX, moveY, walk, jump, crouch, lookX, lookY }` (movimento in −1..1, `jump`
vero finché premuto, `look` in radianti accumulati dall'ultima lettura), `attach(element)`, `dispose()`. La parte pura
(zona morta, soglia camminata/corsa, fusione delle tre sorgenti, assegnazione dei tocchi a joystick/camera/pulsanti)
sta in funzioni separate e testate.

**Accettazione:** test su zona morta, fusione sorgenti, tocco a sinistra = joystick e a destra = camera, tre tocchi
insieme, `pointercancel` e `blur` che azzerano lo stato; pulsanti touch di almeno 64 px, visibili solo su dispositivi
touch; nessun riferimento al basket nei file copiati.

## Task 3 — Palestra giocabile e camera (Sonnet, revisione Opus; dopo i Task 1 e 2)

**Branch:** `fase1/palestra`.

**File:** `src/missions/palestra/level.json` (lista di scatole con tipo, posizione, dimensioni, colore, più la partenza),
`src/world/build-level.ts` (dati → `Solid[]` + mesh), `src/camera/follow-camera.ts` (parte pura testata + applicazione
alla camera), `src/render/player-view.ts` (stato → clip, `timeScale`, tinta, ombra a macchia), `src/app/scene-setup.ts`
(renderer, luci, nebbia tolti da `main.ts`), `src/app/url-options.ts` (`pg`, `level`), `src/main.ts`.

**Accettazione:** in `npm run dev` si attraversa tutta la palestra con Golden e ogni elemento si comporta come in
"Decisioni di progetto"; `?pg=ninja` cambia colore e salto; la camera non entra nei muri; il segnaposto a capsula
resta se il GLB manca; test su opzioni URL (valori sconosciuti inclusi), validazione di `level.json`, camera
(riallineamento, accorciamento, limiti); `scripts/smoke.mjs` preme "avanti" per un secondo e verifica che la posizione
esposta in `body[data-pos]` sia cambiata.

## Task 4 — Vite, trappola mobile e HUD (Sonnet; dopo il Task 3)

**Branch:** `fase1/vite-hud`.

**File:** `src/player/lives.ts` (pura: vite, invulnerabilità, ripartenza), `src/world/movers.ts` (pura: posizione della
trappola nel tempo), `src/hud/hud.ts` + `src/hud/hud.css` (cuori in alto a sinistra, nome del personaggio, "Riprova!"),
collegamento in `src/main.ts`, pulizia con `dispose.ts` alla ripartenza.

**Accettazione:** test su vite (colpo, invulnerabilità 1,5 s, caduta → punto sicuro, zero → ripartenza con vite piene,
golem con 4) e sul moto della trappola; in gioco la trappola toglie un cuore, il fossato un altro, a zero compare
"Riprova!" e si riparte; il contatore fps resta visibile; smoke: `body[data-vite]` vale 3 con golden e 4 con `?pg=golem`.

## Task 5 — Chiusura di fase (Opus + sessione principale)

- Revisione Opus del diff dell'intera fase contro questo piano e i punti da sorvegliare; correzioni in `fase1/correzioni`.
- `docs/STATO.md`, `CLAUDE.md` (cartelle nuove) e memoria di ripresa aggiornati; prossimo passo = piano della fase 2.
- **Prova sul tablet:** palestra con il touch, fps annotati in `docs/STATO.md`.
- **Momento per Filippo:** prova i cinque profili (`?pg=`) e decide quanto salta e corre ciascuno; Fabio aggiorna
  `characters.json` e, se serve, le misure di `level.json`.

## Rimandato di proposito

Interagisci, raccoglibili, trigger, loader con schema → fase 2. Elementi per `canReveal` e `canSmash` → fasi 2 e 6.
Selezione personaggio a schermo: la versione semplice (menu di schede) è anticipata alla fase 1; resta alla fase 6 solo un'eventuale versione rifinita. Suoni → fase 7. Terreno a heightmap → fase 3.
