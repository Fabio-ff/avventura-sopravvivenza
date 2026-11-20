import { describe, expect, it } from 'vitest';
import { readUrlOptions } from '../src/app/url-options';
import { loadProfiles } from '../src/player/profiles';
import { cardsFromProfiles, screenFor, urlWithPg } from '../src/ui/menu-logic';

describe('schede del menu', () => {
  const cards = cardsFromProfiles(loadProfiles());
  const by = (id: string) => cards.find((c) => c.id === id)!;

  it("sono sei, nell'ordine dei profili, con nome e abilità", () => {
    expect(cards.map((c) => c.id)).toEqual([
      'golden',
      'ninja',
      'golem',
      'mago',
      'vichinga',
      'titano',
    ]);
    expect(cards.map((c) => c.nome)).toEqual([
      'Golden',
      'Ninja',
      'Golem',
      'Mago',
      'Vichinga',
      'Titano elettrico',
    ]);
    expect(by('golden').descrizione).toBe('Esploratrice equilibrata');
    expect(by('ninja').descrizione).toBe('Corre veloce e salta altissimo');
    expect(by('golem').descrizione).toBe('Spinge i massi');
    expect(by('mago').descrizione).toBe('Rivela le cose nascoste');
    expect(by('vichinga').descrizione).toBe('Spacca gli ostacoli');
    expect(by('titano').descrizione).toBe('Accende i meccanismi');
  });

  it('i valori vengono dai profili', () => {
    expect(by('ninja')).toMatchObject({ corsa: 7, salto: 2, vite: 3 });
    expect(by('golem')).toMatchObject({ corsa: 5, salto: 1, vite: 4 });
    expect(by('titano')).toMatchObject({ corsa: 5.5, salto: 1.4, vite: 4 });
  });

  it('le barrette vanno da 1 a 5 e seguono i valori', () => {
    expect(by('ninja').barreVelocita).toBe(5);
    expect(by('golem').barreVelocita).toBe(1);
    expect(by('ninja').barreSalto).toBe(5);
    expect(by('golem').barreSalto).toBe(1);
    for (const c of cards) {
      expect(c.barreVelocita).toBeGreaterThanOrEqual(1);
      expect(c.barreVelocita).toBeLessThanOrEqual(5);
      expect(c.barreSalto).toBeGreaterThanOrEqual(1);
      expect(c.barreSalto).toBeLessThanOrEqual(5);
    }
  });

  it('ogni scheda ha un ritratto', () => {
    for (const c of cards) expect(c.ritratto).toBe(`art/ritratti/${c.id}.jpg`);
  });
});

describe('urlWithPg', () => {
  it('aggiunge pg senza altri parametri', () => {
    expect(urlWithPg('http://x/avventura-sopravvivenza/', 'ninja')).toBe(
      '/avventura-sopravvivenza/?pg=ninja',
    );
  });
  it('conserva gli altri parametri e sostituisce pg', () => {
    expect(urlWithPg('http://x/?fps=0&pg=golem&level=palestra', 'mago')).toBe(
      '/?fps=0&pg=mago&level=palestra',
    );
  });
  it('con null toglie pg e tiene il resto', () => {
    expect(urlWithPg('http://x/base/?pg=ninja&fps=0', null)).toBe('/base/?fps=0');
    expect(urlWithPg('http://x/base/?pg=ninja', null)).toBe('/base/');
  });
});

describe('screenFor', () => {
  it('senza pg o con pg sconosciuto: menu', () => {
    expect(screenFor(readUrlOptions(''))).toBe('menu');
    expect(screenFor(readUrlOptions('?pg=drago'))).toBe('menu');
    expect(screenFor(readUrlOptions('?fps=0'))).toBe('menu');
  });
  it('con pg valido: gioco', () => {
    expect(screenFor(readUrlOptions('?pg=golden'))).toBe('game');
    expect(screenFor(readUrlOptions('?pg=titano&fps=0'))).toBe('game');
  });
});
