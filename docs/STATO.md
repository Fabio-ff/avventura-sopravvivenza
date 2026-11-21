# Stato del progetto

**Fase corrente:** 1 — Muoversi, codice completo; mancano la prova sul tablet e il momento per Filippo
(piano: `docs/superpowers/plans/2026-11-11-fase-1-muoversi.md`, epic: issue #6).

**Indirizzo pubblico:** https://fabio-ff.github.io/avventura-sopravvivenza/

## Fatto
- Specifica e piano della fase 0.
- Task 1 e Task 2 mergiati (PR #2 e #4): impalcatura, CI, deploy; Golden in idle, segnaposto, contatore fps.
- GitHub Pages attivo (sorgente GitHub Actions), deploy automatico a ogni merge su `main`.
- Revisione Opus di fine fase: nessun bloccante. Correzioni mergiate (PR #5): antialias solo sotto pixel ratio 2,
  fps dal delta reale, ripiego sul segnaposto in caso di errore, messaggio a contesto WebGL perso, test del
  model-cache, smoke in CI anche con `BASE_PATH`, favicon a tema avventura.

- Fase 1, Task 1 e 2 mergiati (PR #8 e #7): collisioni cilindro contro scatole, controller, profili dei cinque
  personaggi; comandi tastiera, gamepad e touch. PR #8 rivista da Opus e corretta (masso alzato a 1,5 m).
- Fase 1, Task 3 mergiato (PR #9): palestra giocabile, camera che segue, vista del giocatore. Rivista da Opus e
  corretta. Dopo la prova di Fabio (tastiera e trackpad): tasti di camera Q/E/R/F, ostacoli che coprono il
  personaggio diventano trasparenti, camera a 4,5 m e 25°. Misure cambiate: recinzione 6 m, muro alto 4 m,
  muro del varco 3,6 m.

- Fase 1, Task 3b e 3c mergiati (PR #10 e #11): Titano elettrico giocabile con il modello Tripo; menu iniziale
  di scelta del personaggio (senza `?pg=` o con `pg` sconosciuto), pulsante "Personaggi" in gioco.

- Fase 1, Task 4 mergiato (PR #12): vite, cuori, trappola mobile, "Riprova!".
- Revisione Opus di fine fase 1: due bloccanti (camera dentro il personaggio sotto l'architrave e spalle al muro;
  vite perse a raffica rientrando dal fossato) e alcuni minori, corretti in PR #13. Spalle al muro la camera resta
  a 4,5 m oltre il muro, che diventa trasparente. 201 test.

- Ninja e Mago con i modelli Tripo veri (PR #14, scheletro Mixamo, clip complete; il Ninja ha anche camminata e
  accovacciato). Bastone del Mago attaccato alla mano e ritratto nuovo nel menu (PR #15). Il bastone originale
  (55 MB) è stato ridotto con `npx @gltf-transform/cli` (weld, simplify, resize 512): 4.898 triangoli, 554 KB.

## Prossimo passo
- Prova sul tablet della palestra (touch, fps da annotare qui sotto) e momento per Filippo: prova i sei
  personaggi dal menu e decide salti e velocità (`src/missions/characters.json`).
- Poi piano della fase 2.
- Restano Golden tinto: Golem e Vichinga (servono i modelli Tripo, in posa a T e con le gambe visibili).
- Da decidere con Fabio: Golem e Titano hanno lo stesso ritratto nel menu; il masso della palestra si aggira
  (varchi da 3 m, masso da 1 m): farne un vero cancello?
- Mai provati a mano: touch e multitouch su tablet vero, passaggio sotto l'architrave a schermo, animazione
  "colpito" del Titano, idle del Titano (posa di camminata ferma: servirebbero clip idle e run da Tripo).

## Prova sul tablet
- Fase 0 (2026-11-11): 60 fps con Golden in idle (limite dello schermo; modello del tablet non annotato).

## Da ricordare per le fasi successive
- `golden.glb` contiene ancora le clip `dribble` e `shoot`: toglierle con la pipeline asset (fase 4).
- Titano elettrico (sesto personaggio): modello Tripo senza clip idle e run; texture da alleggerire (fase 4).
  Originali in `sources/pbx/` e `sources/art/titan-electro.jpeg`, non ancora tracciati.
- Correzioni alle PR #8 e #9 non riviste una seconda volta: le copre la revisione Opus di fine fase.
- `dispose.ts` e i metodi `dispose`/`stop` sono copiati ma non ancora usati: servono dalla fase 1.

## Decisioni recenti
- Stack copiato da RoarBall con `cp`, senza codice di basket.
- `BASE_PATH` di deploy: `/avventura-sopravvivenza/`.
- Pipeline asset Tripo rimandata alla fase 4; input, audio, schermate e salvataggio copiati quando servono.
- Generazione di immagini con Gemini (Nano Banana) disponibile: da usare nelle fasi 3 e 4 per sfondi, cielo,
  texture e riferimenti per Tripo. Niente video.

## Budget Gemini
Tetto: 15 euro per l'intero gioco; avviso a Fabio prima di superare 10 euro stimati.

| Data | Uso | Modello | Immagini | Spesa stimata |
|---|---|---|---|---|
| 2026-11-10 | Prova: ingresso del tempio con scimmie | flash, 1K | 1 | pochi centesimi |
| 2026-11-21 | Mago: riferimento in posa a T per il rig di Tripo, bastone da solo | flash, 1K | 2 | pochi centesimi |
| 2026-11-21 | Mago: ritratto nuovo per il menu | flash, 1K | 1 | pochi centesimi |
