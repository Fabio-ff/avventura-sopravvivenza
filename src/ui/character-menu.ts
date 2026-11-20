// Menu a tutto schermo per scegliere il personaggio (DOM + CSS, senza three).
import { loadProfiles } from '../player/profiles';
import { BARS_MAX, cardsFromProfiles, urlWithPg, type CharacterCard } from './menu-logic';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

function statRow(label: string, spoken: string, content: HTMLElement): HTMLElement {
  const row = el('span', 'menu-stat');
  row.setAttribute('role', 'img');
  row.setAttribute('aria-label', spoken);
  row.append(el('span', 'menu-stat-label', label), content);
  return row;
}

function barsEl(filled: number): HTMLElement {
  const wrap = el('span', 'menu-bars');
  for (let i = 0; i < BARS_MAX; i++) wrap.append(el('i', i < filled ? 'on' : ''));
  return wrap;
}

function cardEl(card: CharacterCard, href: string, assetBase: string): HTMLAnchorElement {
  const a = el('a', 'menu-card');
  a.href = href;
  a.draggable = false;
  a.dataset.pg = card.id;

  const frame = el('span', 'menu-portrait');
  const img = document.createElement('img');
  img.alt = '';
  img.draggable = false;
  img.src = `${assetBase}${card.ritratto}`;
  img.style.objectPosition = card.inquadratura;
  // Se il ritratto non si carica la scheda resta usabile (colore di fondo + nome).
  img.addEventListener('error', () => img.remove());
  frame.append(img);

  const hearts = el('span', 'menu-hearts', '♥'.repeat(card.vite));
  const stats = el('span', 'menu-stats');
  stats.append(
    statRow('Velocità', `Velocità ${card.corsa}`, barsEl(card.barreVelocita)),
    statRow('Salto', `Salto ${card.salto} metri`, barsEl(card.barreSalto)),
    statRow('Vite', `${card.vite} vite`, hearts),
  );

  a.append(
    frame,
    el('span', 'menu-name', card.nome),
    stats,
    el('span', 'menu-skill', card.descrizione),
  );
  return a;
}

/** Mostra il menu; scegliere una scheda ricarica la pagina con `?pg=<id>`. */
export function showCharacterMenu(): void {
  const assetBase = `${import.meta.env.BASE_URL}assets/`;
  const root = el('main', 'menu');
  const inner = el('div', 'menu-inner');
  inner.append(
    el('h1', 'menu-title', 'Avventura Sopravvivenza'),
    el('p', 'menu-subtitle', 'Scegli il tuo esploratore'),
  );
  const grid = el('div', 'menu-grid');
  for (const card of cardsFromProfiles(loadProfiles())) {
    grid.append(cardEl(card, urlWithPg(window.location.href, card.id), assetBase));
  }
  inner.append(grid);
  root.append(inner);
  document.body.append(root);
  document.body.dataset.menu = String(grid.childElementCount);
}

/** Piccolo pulsante in gioco che riporta al menu (indirizzo senza `pg`). */
export function showMenuButton(): void {
  const a = el('a', 'menu-back', 'Personaggi');
  a.href = urlWithPg(window.location.href, null);
  a.draggable = false;
  document.body.append(a);
}
