// Interfaccia di gioco in DOM: cuori, nome del personaggio e scritta "Riprova!".
import './hud.css';

function el(className: string, text?: string): HTMLDivElement {
  const e = document.createElement('div');
  e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** Aggiorna il DOM solo quando lo stato cambia. */
export class Hud {
  private readonly root = el('hud');
  private readonly hearts = el('hud-hearts');
  private readonly banner = el('hud-banner', 'Riprova!');
  private readonly heartEls: HTMLElement[] = [];
  private vite = -1;
  private defeat = false;

  constructor(
    parent: HTMLElement,
    nome: string,
    private readonly max: number,
  ) {
    for (let i = 0; i < max; i++) {
      const h = document.createElement('span');
      h.className = 'hud-heart';
      h.textContent = '♥';
      this.heartEls.push(h);
      this.hearts.append(h);
    }
    this.hearts.setAttribute('role', 'img');
    this.root.append(el('hud-name', nome), this.hearts);
    this.banner.setAttribute('aria-live', 'polite');
    parent.append(this.root, this.banner);
    this.setLives(max);
  }

  setLives(vite: number): void {
    if (vite === this.vite) return;
    this.vite = vite;
    this.heartEls.forEach((h, i) => h.classList.toggle('empty', i >= vite));
    this.hearts.setAttribute('aria-label', `Vite: ${vite} su ${this.max}`);
    document.body.dataset.vite = String(vite);
  }

  setDefeat(on: boolean): void {
    if (on === this.defeat) return;
    this.defeat = on;
    this.banner.classList.toggle('on', on);
  }

  dispose(): void {
    this.root.remove();
    this.banner.remove();
  }
}
