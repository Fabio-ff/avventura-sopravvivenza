import { describe, expect, it } from 'vitest';
import {
  CAMERA_DISTANCE,
  CLOSE_DISTANCE,
  CROUCH_FOCUS_HEIGHT,
  modelOpacity,
  MAX_PITCH,
  MIN_PITCH,
  REALIGN_DELAY,
  createCameraAngles,
  desiredDistance,
  desiredPose,
  occluders,
  MIN_DISTANCE,
  DEFAULT_PITCH,
  smoothDistance,
  updateCameraAngles,
} from '../src/camera/follow-camera';
import { bodyOverlaps } from '../src/world/collide';
import { cameraOffsetDir } from '../src/camera/follow-camera';
import { box } from '../src/world/solids';
import levelJson from '../src/missions/palestra/level.json';
import { toSolids, validateLevel } from '../src/world/build-level';

describe('angoli della camera', () => {
  it('trascinare a destra gira la visuale a destra (yaw cala), in alto alza lo sguardo', () => {
    const a = createCameraAngles();
    updateCameraAngles(a, 0.2, 0, 0, 0, 0, 0.016);
    expect(a.yaw).toBeCloseTo(-0.2);
    const p0 = a.pitch;
    updateCameraAngles(a, 0, -0.1, 0, 0, 0, 0.016);
    expect(a.pitch).toBeLessThan(p0);
  });

  it("limita l'inclinazione tra -10 e 60 gradi", () => {
    const a = createCameraAngles();
    updateCameraAngles(a, 0, 10, 0, 0, 0, 0.016);
    expect(a.pitch).toBe(MAX_PITCH);
    updateCameraAngles(a, 0, -10, 0, 0, 0, 0.016);
    expect(a.pitch).toBe(MIN_PITCH);
    expect((MAX_PITCH * 180) / Math.PI).toBeCloseTo(60);
    expect((MIN_PITCH * 180) / Math.PI).toBeCloseTo(-10);
  });

  it('non si riallinea prima di 1,5 s né da fermo', () => {
    const a = createCameraAngles(1);
    for (let t = 0; t < REALIGN_DELAY - 0.1; t += 0.016)
      updateCameraAngles(a, 0, 0, 0, 1, 0, 0.016);
    expect(a.yaw).toBe(1);
    const b = createCameraAngles(1);
    for (let t = 0; t < 5; t += 0.016) updateCameraAngles(b, 0, 0, 0, 0, 0, 0.016);
    expect(b.yaw).toBe(1);
  });

  it('dopo 1,5 s in movimento si riallinea dietro al personaggio', () => {
    // il personaggio va un po' di lato rispetto alla camera (meno di 90 gradi)
    const facing = Math.PI - 0.8;
    const a = createCameraAngles(0);
    for (let t = 0; t < 6; t += 0.016) updateCameraAngles(a, 0, 0, 0, 1, facing, 0.016);
    const target = facing + Math.PI;
    const diff = Math.atan2(Math.sin(a.yaw - target), Math.cos(a.yaw - target));
    expect(Math.abs(diff)).toBeLessThan(0.01);
  });

  it("un comando di camera azzera l'attesa", () => {
    const a = createCameraAngles(0);
    for (let t = 0; t < 1.4; t += 0.016) updateCameraAngles(a, 0, 0, 0, 1, 2, 0.016);
    updateCameraAngles(a, 0.01, 0, 0, 1, 2, 0.016);
    const yaw = a.yaw;
    for (let t = 0; t < 1.2; t += 0.016) updateCameraAngles(a, 0, 0, 0, 1, 2, 0.016);
    expect(a.yaw).toBe(yaw);
  });
});

describe('riallineamento senza giostra', () => {
  const T = 0.016;
  const run = (moveX: number, moveY: number, facing: (yaw: number) => number, secs = 4) => {
    const a = createCameraAngles(0.3);
    const yaws: number[] = [];
    for (let t = 0; t < secs; t += T) {
      updateCameraAngles(a, 0, 0, moveX, moveY, facing(a.yaw), T);
      yaws.push(a.yaw);
    }
    return { a, yaws };
  };

  it('leva tutta a destra: la camera non gira mai (anche se la direzione segue la camera)', () => {
    // andando a destra rispetto alla camera, facing = yaw + π - π/2... cioè sempre di lato
    const { a } = run(1, 0, (yaw) => yaw + Math.PI + Math.PI / 2);
    expect(a.yaw).toBe(0.3);
  });

  it('leva indietro: yaw invariato, nessuna oscillazione tra frame', () => {
    const { a, yaws } = run(0, -1, (yaw) => yaw);
    expect(a.yaw).toBe(0.3);
    expect(new Set(yaws).size).toBe(1);
  });

  it('leva avanti-destra: converge e si ferma', () => {
    const facing = 0.3 + Math.PI - 0.6;
    const { a, yaws } = run(0.45, 0.89, () => facing, 8);
    const target = facing + Math.PI;
    expect(Math.abs(Math.atan2(Math.sin(a.yaw - target), Math.cos(a.yaw - target)))).toBeLessThan(
      0.01,
    );
    expect(Math.abs(yaws[yaws.length - 1]! - yaws[yaws.length - 2]!)).toBeLessThan(1e-4);
  });

  it('non supera 0,8 rad/s', () => {
    const facing = 0.3 + Math.PI - 1.4;
    const a = createCameraAngles(0.3);
    for (let i = 0; i < 200; i++) updateCameraAngles(a, 0, 0, 0, 1, facing, T);
    const before = a.yaw;
    updateCameraAngles(a, 0, 0, 0, 1, facing, T);
    expect(Math.abs(a.yaw - before) / T).toBeLessThanOrEqual(0.8 + 1e-9);
  });

  it('oltre 90 gradi di differenza non riallinea', () => {
    const facing = 0.3 + Math.PI - 2;
    const { a } = run(0, 1, () => facing);
    expect(a.yaw).toBe(0.3);
  });
});

describe('distanza della camera', () => {
  const focus = { x: 0, y: 1.4, z: 0 };

  it('6 m a campo libero', () => {
    expect(desiredDistance(focus, 0, 0, [])).toBe(CAMERA_DISTANCE);
    const lontano = box(1, 'fisso', { x: -5, y: 0, z: 20 }, { x: 5, y: 3, z: 21 });
    expect(desiredDistance(focus, 0, 0, [lontano])).toBe(CAMERA_DISTANCE);
  });

  it('si accorcia con un muro fisso in mezzo, con un margine', () => {
    // con yaw 0 la camera sta a +z; il muro è a z = 3
    const muro = box(1, 'fisso', { x: -5, y: 0, z: 3 }, { x: 5, y: 3, z: 4 });
    const d = desiredDistance(focus, 0, 0, [muro]);
    expect(d).toBeLessThan(3);
    expect(d).toBeGreaterThan(2);
  });

  it('sotto 1,2 m prova ad alzare la camera invece di avvicinarla', () => {
    // muro a 0,8 m dal punto inquadrato, ma basso: alzandosi la camera lo scavalca
    const muro = box(1, 'fisso', { x: -5, y: 0, z: 0.8 }, { x: 5, y: 2, z: 1.2 });
    const pose = desiredPose(focus, 0, 0.3, [muro]);
    expect(pose.pitch).toBeGreaterThan(0.3);
    expect(pose.distance).toBeGreaterThanOrEqual(MIN_DISTANCE);
    expect(desiredPose(focus, 0, 0.3, []).pitch).toBe(0.3);
  });

  it('inclinazione predefinita 25 gradi', () => {
    expect((DEFAULT_PITCH * 180) / Math.PI).toBeCloseTo(25);
  });

  it('un masso spingibile tra camera e personaggio accorcia la distanza', () => {
    const masso = box(1, 'spingibile', { x: -5, y: 0, z: 3 }, { x: 5, y: 3, z: 4 });
    expect(desiredDistance(focus, 0, 0, [masso])).toBeLessThan(3);
  });

  it('uno spigolo mancato dal raggio centrale ma colpito da uno laterale accorcia', () => {
    // colonna a destra (x da 0,2 a 1), a z = 3: il raggio centrale (x = 0) la manca di 0,2 m
    const colonna = box(1, 'fisso', { x: 0.2, y: 0, z: 3 }, { x: 1, y: 4, z: 4 });
    expect(desiredDistance(focus, 0, 0, [colonna])).toBeLessThan(3);
    // a 0,5 m dal raggio centrale nessun raggio la prende
    const lontana = box(2, 'fisso', { x: 0.5, y: 0, z: 3 }, { x: 1.5, y: 4, z: 4 });
    expect(desiredDistance(focus, 0, 0, [lontana])).toBe(CAMERA_DISTANCE);
  });

  it('con un muro alto 4 m a 0,5 m alle spalle la camera non finisce in nessuna scatola', () => {
    const muro = box(1, 'fisso', { x: -10, y: 0, z: 0.5 }, { x: 10, y: 4, z: 1.5 });
    const pavimento = box(2, 'fisso', { x: -10, y: -1, z: -10 }, { x: 10, y: 0, z: 10 });
    const solids = [muro, pavimento];
    for (const yaw of [0, 0.4, -0.7]) {
      for (const pitch0 of [MIN_PITCH, 0, DEFAULT_PITCH, MAX_PITCH]) {
        const pose = desiredPose(focus, yaw, pitch0, solids);
        const dir = cameraOffsetDir(yaw, pose.pitch);
        const pos = {
          x: focus.x + dir.x * pose.distance,
          y: focus.y + dir.y * pose.distance,
          z: focus.z + dir.z * pose.distance,
        };
        const probe = {
          position: { x: pos.x, y: pos.y - 0.05, z: pos.z },
          radius: 0.05,
          height: 0.1,
        };
        expect(bodyOverlaps(probe, solids)).toBe(false);
        // se la camera è vicinissima il modello deve sparire (mai la camera nella testa con il modello visibile)
        if (pose.distance < CLOSE_DISTANCE) expect(modelOpacity(pose.distance)).toBeLessThan(1);
        else expect(modelOpacity(pose.distance)).toBe(1);
      }
    }
  });

  it('con il muro a 0,5 m alle spalle la distanza è la migliore trovata e il modello sfuma', () => {
    const muro = box(1, 'fisso', { x: -10, y: 0, z: 0.5 }, { x: 10, y: 4, z: 1.5 });
    const pose = desiredPose(focus, 0, DEFAULT_PITCH, [muro]);
    // nessuna inclinazione fa meglio: la distanza è comunque la massima tra quelle provate
    for (let p = MIN_PITCH; p <= MAX_PITCH + 1e-9; p += (5 * Math.PI) / 180)
      expect(desiredDistance(focus, 0, p, [muro])).toBeLessThanOrEqual(pose.distance + 1e-9);
    expect(modelOpacity(pose.distance)).toBeLessThan(1);
  });

  it('inclinazioni più basse quando quelle più alte non bastano', () => {
    // tettoia a 1,0 m sopra il punto inquadrato, estesa dietro: salire non serve, scendere sì
    const tettoia = box(1, 'fisso', { x: -5, y: 1.4, z: 0 }, { x: 5, y: 3, z: 6 });
    const alta = desiredDistance(focus, 0, DEFAULT_PITCH, [tettoia]);
    expect(alta).toBeLessThan(MIN_DISTANCE);
    const pose = desiredPose(focus, 0, DEFAULT_PITCH, [tettoia]);
    expect(pose.pitch).toBeLessThan(DEFAULT_PITCH);
    expect(pose.distance).toBeGreaterThanOrEqual(MIN_DISTANCE);
  });

  it("sceglie l'inclinazione più vicina a quella voluta, non la prima trovata", () => {
    const tettoia = box(1, 'fisso', { x: -5, y: 1.4, z: 0 }, { x: 5, y: 3, z: 6 });
    const pose = desiredPose(focus, 0, DEFAULT_PITCH, [tettoia]);
    const step = (5 * Math.PI) / 180;
    const piuVicina = desiredPose(focus, 0, pose.pitch + step, [tettoia]);
    // un passo più su dell'inclinazione scelta non è valido, uno più giù non è più vicino
    expect(desiredDistance(focus, 0, pose.pitch + step, [tettoia])).toBeLessThan(MIN_DISTANCE);
    expect(piuVicina.pitch).toBeLessThanOrEqual(pose.pitch + 1e-9);
  });

  it("Golden accovacciato sotto l'architrave vero: la camera non scende mai sotto la distanza minima", () => {
    const solids = toSolids(validateLevel(levelJson));
    const f = { x: 0, y: CROUCH_FOCUS_HEIGHT, z: 0 };
    for (let z = -49; z >= -55; z -= 0.1) {
      f.z = z;
      for (const yaw of [0, 0.3, -0.3]) {
        const pose = desiredPose(f, yaw, DEFAULT_PITCH, solids);
        expect(pose.distance).toBeGreaterThanOrEqual(MIN_DISTANCE);
      }
    }
  });

  it('opacità del modello: piena da 0,7 m, zero molto vicino, continua in mezzo', () => {
    expect(modelOpacity(CAMERA_DISTANCE)).toBe(1);
    expect(modelOpacity(CLOSE_DISTANCE)).toBe(1);
    expect(modelOpacity(0.15)).toBe(0);
    expect(modelOpacity(0)).toBe(0);
    const m = modelOpacity(0.5);
    expect(m).toBeGreaterThan(0);
    expect(m).toBeLessThan(1);
    expect(modelOpacity(0.6)).toBeGreaterThan(m);
  });

  it('si accorcia subito e si allunga piano', () => {
    expect(smoothDistance(6, 2, 0.016)).toBe(2);
    const next = smoothDistance(2, 6, 0.016);
    expect(next).toBeGreaterThan(2);
    expect(next).toBeLessThan(2.5);
  });
});

describe('ostacoli che coprono il personaggio', () => {
  const cam = { x: 0, y: 2, z: 5 };
  const targets = {
    head: { x: 0, y: 1.7, z: 0 },
    chest: { x: 0, y: 0.9, z: 0 },
    feet: { x: 0, y: 0.1, z: 0 },
  };

  it('un muro in mezzo viene restituito', () => {
    const muro = box(7, 'fisso', { x: -3, y: 0, z: 2 }, { x: 3, y: 4, z: 3 });
    expect(occluders(cam, targets, [muro])).toEqual([7]);
  });

  it('il pavimento sotto i piedi non conta', () => {
    const pavimento = box(1, 'fisso', { x: -9, y: -1, z: -9 }, { x: 9, y: 0, z: 9 });
    expect(occluders(cam, targets, [pavimento])).toEqual([]);
  });

  it('una scatola di lato non conta', () => {
    const lato = box(2, 'spingibile', { x: 2, y: 0, z: 1 }, { x: 4, y: 3, z: 3 });
    expect(occluders(cam, targets, [lato])).toEqual([]);
  });

  it('un masso basso che copre solo i piedi viene restituito', () => {
    const basso = box(3, 'spingibile', { x: -1, y: 0, z: 0.3 }, { x: 1, y: 0.8, z: 1.3 });
    expect(occluders(cam, targets, [basso])).toEqual([3]);
  });
});
