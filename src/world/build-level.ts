// Dal file del livello alle scatole di collisione e alle mesh. La validazione è pura.
import * as THREE from 'three';
import { createMover, placeMover, validateMoto, type Moto, type Mover } from './movers';
import { box, type Solid, type SolidKind, type Vec3 } from './solids';
import { worldBoxUVs } from './uv-mondo';
import type { Rettangolo } from './vegetazione';

/** Texture disponibili per le scatole; senza `materiale` la scatola è a tinta unita. */
export type Materiale = 'erba' | 'pietra' | 'muro';
export const MATERIALI: readonly Materiale[] = ['erba', 'pietra', 'muro'];

export interface LevelBox {
  id: number;
  nome: string;
  tipo: SolidKind;
  /** Centro della scatola. */
  posizione: Vec3;
  /** Dimensioni complete. */
  dimensioni: Vec3;
  colore: string;
  /** Facoltativo: texture della scatola (il colore la tinge leggermente). */
  materiale?: Materiale;
  /** Facoltativo, solo per i `pericolo`: la scatola va avanti e indietro (posizione = centro del moto). */
  moto?: Moto;
}

export interface LevelData {
  partenza: Vec3;
  scatole: LevelBox[];
}

const KINDS: readonly SolidKind[] = ['fisso', 'spingibile', 'pericolo'];
const EPS = 1e-6;

function vec(v: unknown, ctx: string): Vec3 {
  if (typeof v !== 'object' || v === null) throw new Error(`${ctx}: manca (x, y, z)`);
  const o = v as Record<string, unknown>;
  for (const k of ['x', 'y', 'z']) {
    if (typeof o[k] !== 'number' || !Number.isFinite(o[k]))
      throw new Error(`${ctx}: il campo "${k}" non è un numero`);
  }
  return { x: o.x as number, y: o.y as number, z: o.z as number };
}

/** Valida a mano il JSON del livello; errore chiaro in italiano se qualcosa non va. */
export function validateLevel(raw: unknown): LevelData {
  if (typeof raw !== 'object' || raw === null) throw new Error('Livello: il file non è un oggetto');
  const root = raw as Record<string, unknown>;
  const partenza = vec(root.partenza, 'Livello: "partenza"');
  if (!Array.isArray(root.scatole) || root.scatole.length === 0)
    throw new Error('Livello: "scatole" deve essere una lista non vuota');
  const ids = new Set<number>();
  const scatole = root.scatole.map((item: unknown, i): LevelBox => {
    if (typeof item !== 'object' || item === null)
      throw new Error(`Scatola #${i}: non è un oggetto`);
    const o = item as Record<string, unknown>;
    if (typeof o.id !== 'number' || !Number.isInteger(o.id))
      throw new Error(`Scatola #${i}: il campo "id" manca o non è un intero`);
    if (ids.has(o.id)) throw new Error(`Scatola ${o.id}: l'id è duplicato`);
    ids.add(o.id);
    const ctx = `Scatola ${o.id}`;
    if (typeof o.tipo !== 'string' || !KINDS.includes(o.tipo as SolidKind))
      throw new Error(`${ctx}: il tipo deve essere fisso, spingibile o pericolo`);
    const posizione = vec(o.posizione, `${ctx}: "posizione"`);
    const dimensioni = vec(o.dimensioni, `${ctx}: "dimensioni"`);
    if (dimensioni.x <= 0 || dimensioni.y <= 0 || dimensioni.z <= 0)
      throw new Error(`${ctx}: le dimensioni devono essere positive`);
    if (typeof o.colore !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(o.colore))
      throw new Error(`${ctx}: il colore deve essere nel formato #rrggbb`);
    const nome = typeof o.nome === 'string' ? o.nome : `scatola ${o.id}`;
    const out: LevelBox = {
      id: o.id,
      nome,
      tipo: o.tipo as SolidKind,
      posizione,
      dimensioni,
      colore: o.colore,
    };
    if (o.materiale !== undefined) {
      if (typeof o.materiale !== 'string' || !MATERIALI.includes(o.materiale as Materiale))
        throw new Error(`${ctx}: il materiale deve essere erba, pietra o muro`);
      out.materiale = o.materiale as Materiale;
    }
    if (o.moto !== undefined) {
      if (o.tipo !== 'pericolo') throw new Error(`${ctx}: solo un pericolo può avere un "moto"`);
      out.moto = validateMoto(o.moto, ctx);
    }
    return out;
  });
  const level = { partenza, scatole };
  if (!standsOnSlab(toSolids(level), partenza))
    throw new Error('Livello: il punto di partenza deve stare sopra una lastra (scatola fissa)');
  return level;
}

/** Rettangolo (x, z) che racchiude tutte le scatole del livello. */
export function perimetroLivello(level: LevelData): Rettangolo {
  const r = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const b of level.scatole) {
    r.minX = Math.min(r.minX, b.posizione.x - b.dimensioni.x / 2);
    r.maxX = Math.max(r.maxX, b.posizione.x + b.dimensioni.x / 2);
    r.minZ = Math.min(r.minZ, b.posizione.z - b.dimensioni.z / 2);
    r.maxZ = Math.max(r.maxZ, b.posizione.z + b.dimensioni.z / 2);
  }
  return r;
}

function standsOnSlab(solids: readonly Solid[], p: Vec3): boolean {
  return solids.some(
    (s) =>
      s.kind === 'fisso' &&
      p.x >= s.min.x &&
      p.x <= s.max.x &&
      p.z >= s.min.z &&
      p.z <= s.max.z &&
      Math.abs(s.max.y - p.y) <= EPS,
  );
}

/** Le scatole del livello come `Solid` (min/max), nello stesso ordine. */
export function toSolids(level: LevelData): Solid[] {
  return level.scatole.map((b) =>
    box(
      b.id,
      b.tipo,
      {
        x: b.posizione.x - b.dimensioni.x / 2,
        y: b.posizione.y - b.dimensioni.y / 2,
        z: b.posizione.z - b.dimensioni.z / 2,
      },
      {
        x: b.posizione.x + b.dimensioni.x / 2,
        y: b.posizione.y + b.dimensioni.y / 2,
        z: b.posizione.z + b.dimensioni.z / 2,
      },
    ),
  );
}

export interface BuiltLevel {
  solids: Solid[];
  start: Vec3;
  group: THREE.Group;
  /** Mesh di ogni scatola per id (il materiale è proprio di ogni scatola). */
  meshes: Map<number, THREE.Mesh>;
  /** Da chiamare a ogni frame: porta le mesh mobili sulla posizione dei loro `Solid`. */
  sync(): void;
  /** Porta le scatole in moto (la trappola) nella posizione che hanno al tempo `t`. */
  setMoverTime(t: number): void;
  /** Il moto della scatola `id`, se ne ha uno. */
  motoOf(id: number): Moto | undefined;
  /** Rimette masso e scatole spingibili al loro posto e la trappola al tempo zero. */
  reset(): void;
}

/** Costruisce scatole e mesh. Le mesh di `spingibile` e `pericolo` seguono il rispettivo `Solid`. */
export function buildLevel(level: LevelData): BuiltLevel {
  const solids = toSolids(level);
  const group = new THREE.Group();
  const meshes = new Map<number, THREE.Mesh>();
  const moving: { solid: Solid; mesh: THREE.Mesh }[] = [];
  const movers: Mover[] = [];
  const initial: { solid: Solid; min: Vec3; max: Vec3 }[] = [];
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  level.scatole.forEach((b, i) => {
    const solid = solids[i]!;
    // Le scatole con texture hanno UV in scala mondo, quindi una geometria propria.
    let boxGeometry = geometry;
    if (b.materiale) {
      boxGeometry = geometry.clone();
      boxGeometry.setAttribute(
        'uv',
        new THREE.BufferAttribute(worldBoxUVs(b.posizione, b.dimensioni), 2),
      );
    }
    const mesh = new THREE.Mesh(
      boxGeometry,
      new THREE.MeshStandardMaterial({ color: new THREE.Color(b.colore) }),
    );
    mesh.scale.set(b.dimensioni.x, b.dimensioni.y, b.dimensioni.z);
    mesh.position.set(b.posizione.x, b.posizione.y, b.posizione.z);
    mesh.name = b.nome;
    group.add(mesh);
    meshes.set(b.id, mesh);
    if (b.tipo !== 'fisso') moving.push({ solid, mesh });
    if (b.tipo === 'spingibile')
      initial.push({ solid, min: { ...solid.min }, max: { ...solid.max } });
    if (b.moto) movers.push(createMover(solid, b.moto));
  });
  const sync = (): void => {
    for (const { solid, mesh } of moving) {
      mesh.position.set(
        (solid.min.x + solid.max.x) / 2,
        (solid.min.y + solid.max.y) / 2,
        (solid.min.z + solid.max.z) / 2,
      );
    }
  };
  const setMoverTime = (t: number): void => {
    for (const m of movers) placeMover(m, t);
  };
  const motoOf = (id: number): Moto | undefined => movers.find((m) => m.solid.id === id)?.moto;
  const reset = (): void => {
    for (const { solid, min, max } of initial) {
      Object.assign(solid.min, min);
      Object.assign(solid.max, max);
    }
    setMoverTime(0);
  };
  setMoverTime(0);
  sync();
  return { solids, start: { ...level.partenza }, group, meshes, sync, setMoverTime, motoOf, reset };
}
