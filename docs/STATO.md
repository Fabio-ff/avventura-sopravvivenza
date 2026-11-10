# Stato del progetto

**Fase corrente:** 0 — Bootstrap (piano: `docs/superpowers/plans/2026-11-10-fase-0-bootstrap.md`).

## Fatto
- Specifica e piano della fase 0.
- Task 1 e Task 2 mergiati (PR #2 e #4): impalcatura, CI, deploy; Golden in idle, segnaposto, contatore fps.
- GitHub Pages attivo.
- Correzioni di revisione in PR (`fase0/correzioni`): antialias solo sotto pixel ratio 2, fps dal delta reale, ripiego sul segnaposto in caso di errore, messaggio a contesto WebGL perso, test del model-cache, smoke in CI anche con `BASE_PATH`, favicon a tema avventura.

## Prossimo passo
- Prova sul tablet, poi piano della fase 1.

## Decisioni recenti
- Stack copiato da RoarBall con `cp`, senza codice di basket.
- `BASE_PATH` di deploy: `/avventura-sopravvivenza/`.
