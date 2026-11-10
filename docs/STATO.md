# Stato del progetto

**Fase corrente:** 0 — Bootstrap (piano: `docs/superpowers/plans/2026-11-10-fase-0-bootstrap.md`).

## Fatto
- Specifica e piano della fase 0.
- Task 1 (in PR `fase0/impalcatura`): impalcatura, CI, deploy su Pages, scena vuota.
- Task 2 (in revisione, PR `fase0/golden-idle`, impilata sulla PR del Task 1): Golden in idle, segnaposto se il GLB manca, contatore fps (`?fps=0` lo nasconde), smoke con `data-ready`.

## Prossimo passo
- Revisione del Task 2, poi Task 3 (chiusura di fase).
- Attivare GitHub Pages (sorgente "GitHub Actions") dopo il merge del Task 1.

## Decisioni recenti
- Stack copiato da RoarBall con `cp`, senza codice di basket.
- `BASE_PATH` di deploy: `/avventura-sopravvivenza/`.
