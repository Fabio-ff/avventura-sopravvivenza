# Stato del progetto

**Fase corrente:** 1 — Muoversi, in corso
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

## Prossimo passo
- Fase 1, Task 3 (palestra giocabile e camera, `fase1/palestra`), poi Task 4 (vite, trappola mobile, HUD).
- I merge li lancia Fabio o li chiede in modo esplicito: il classificatore blocca `gh pr merge` in autonomia.

## Prova sul tablet
- Fase 0 (2026-11-11): 60 fps con Golden in idle (limite dello schermo; modello del tablet non annotato).

## Da ricordare per le fasi successive
- `golden.glb` contiene ancora le clip `dribble` e `shoot`: toglierle con la pipeline asset (fase 4).
- Verificare all'inizio della fase 1 che `golden.glb` contenga le clip run, jump, hit e fall.
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
