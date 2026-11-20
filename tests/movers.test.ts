import { describe, expect, it } from 'vitest';
import levelJson from '../src/missions/palestra/level.json';
import { applyKnockback, createPlayer, stepPlayer } from '../src/player/controller';
import { profileFor } from '../src/player/profiles';
import { toSolids, validateLevel } from '../src/world/build-level';
import {
  createMover,
  knockOrigin,
  motoOffset,
  placeMover,
  validateMoto,
  type Moto,
} from '../src/world/movers';
import { box } from '../src/world/solids';

const MOTO: Moto = { asse: 'x', ampiezza: 4, periodo: 2 };
const NONE = { moveX: 0, moveY: 0, walk: false, jump: false, crouch: false };

describe('moto della trappola', () => {
  it('estremo a t = 0, estremo opposto a mezzo periodo, di nuovo l estremo al periodo', () => {
    expect(motoOffset(MOTO, 0)).toBeCloseTo(-2, 9);
    expect(motoOffset(MOTO, 1)).toBeCloseTo(2, 9);
    expect(motoOffset(MOTO, 2)).toBeCloseTo(-2, 9);
    expect(motoOffset(MOTO, 0.5)).toBeCloseTo(0, 9);
  });

  it('resta entro 4 m e non fa scatti (passo massimo = velocità massima)', () => {
    let prev = motoOffset(MOTO, 0);
    let min = prev;
    let max = prev;
    for (let i = 1; i <= 600; i++) {
      const o = motoOffset(MOTO, i / 60);
      min = Math.min(min, o);
      max = Math.max(max, o);
      // velocità massima = pi * ampiezza / periodo = 2*pi m/s
      expect(Math.abs(o - prev)).toBeLessThanOrEqual((Math.PI * 4) / 2 / 60 + 1e-9);
      prev = o;
    }
    expect(max - min).toBeCloseTo(4, 3);
  });

  it('placeMover sposta la scatola sull asse e lascia gli altri', () => {
    const s = box(1, 'pericolo', { x: -2, y: 0, z: -1 }, { x: 2, y: 1, z: 0 });
    const m = createMover(s, MOTO);
    placeMover(m, 1);
    expect(s.min.x).toBeCloseTo(0, 9);
    expect(s.max.x).toBeCloseTo(4, 9);
    expect([s.min.z, s.max.z]).toEqual([-1, 0]);
    placeMover(m, 0);
    expect(s.min.x).toBeCloseTo(-4, 9);
  });

  it('la trappola che arriva addosso a un giocatore fermo lo colpisce', () => {
    const floor = box(1, 'fisso', { x: -20, y: -1, z: -20 }, { x: 20, y: 0, z: 20 });
    const trap = box(2, 'pericolo', { x: -2, y: 0, z: -0.5 }, { x: 2, y: 1, z: 0.5 });
    const mover = createMover(trap, MOTO);
    const player = createPlayer({ x: 3, y: 0, z: 0 });
    const solids = [floor, trap];
    const golden = profileFor('golden');
    let hit = false;
    for (let i = 1; i <= 120 && !hit; i++) {
      placeMover(mover, i / 60);
      const events = stepPlayer(player, NONE, 0, golden, solids, 1 / 60);
      hit = events.some((e) => e.type === 'colpito' && e.hazardId === 2);
    }
    expect(hit).toBe(true);
    // il giocatore non si è mosso da solo
    expect(player.position.x).toBeCloseTo(3, 6);
  });

  it('il contraccolpo allontana dal centro della trappola, di lato rispetto al moto', () => {
    const trap = box(2, 'pericolo', { x: 0, y: 0, z: -0.5 }, { x: 4, y: 1, z: 0.5 });
    const player = createPlayer({ x: 3.5, y: 0, z: 0.2 });
    const o = { x: 0, y: 0, z: 0 };
    knockOrigin(o, trap, MOTO, player.position);
    expect(o.x).toBe(3.5);
    applyKnockback(player, o);
    expect(player.knock.x).toBeCloseTo(0, 9);
    expect(player.knock.z).toBeGreaterThan(0);
  });
});

describe('validazione del moto in level.json', () => {
  it('la trappola della palestra ha il moto previsto: 4 m in 2 s', () => {
    const level = validateLevel(levelJson);
    const trap = level.scatole.find((b) => b.tipo === 'pericolo');
    expect(trap?.moto).toEqual({ asse: 'x', ampiezza: 4, periodo: 2 });
    // il moto sta dentro la lastra: nessuna parte esce dal pavimento
    const s = toSolids(level).find((x) => x.id === trap!.id)!;
    expect(s.min.x - 2).toBeGreaterThanOrEqual(-10);
    expect(s.max.x + 2).toBeLessThanOrEqual(10);
  });

  it('rifiuta asse, ampiezza e periodo non validi, con messaggi in italiano', () => {
    expect(() => validateMoto(null, 'S')).toThrow(/oggetto/);
    expect(() => validateMoto({ asse: 'y', ampiezza: 4, periodo: 2 }, 'S')).toThrow(/asse/);
    expect(() => validateMoto({ asse: 'x', ampiezza: 0, periodo: 2 }, 'S')).toThrow(/ampiezza/);
    expect(() => validateMoto({ asse: 'x', ampiezza: 4, periodo: -1 }, 'S')).toThrow(/periodo/);
    expect(() => validateMoto({ asse: 'x', ampiezza: 4, periodo: NaN }, 'S')).toThrow(/periodo/);
  });

  it('solo un pericolo può avere un moto', () => {
    const l = {
      partenza: { x: 0, y: 0, z: 0 },
      scatole: [
        {
          id: 1,
          tipo: 'fisso',
          posizione: { x: 0, y: -0.5, z: 0 },
          dimensioni: { x: 10, y: 1, z: 10 },
          colore: '#112233',
          moto: MOTO,
        },
      ],
    };
    expect(() => validateLevel(l)).toThrow(/pericolo/);
    l.scatole[0] = { ...l.scatole[0]!, tipo: 'pericolo' };
    expect(() => validateLevel(l)).toThrow(/partenza/);
  });
});
