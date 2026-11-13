// Dal file del livello alle scatole di collisione e alle mesh. La validazione è pura.
import * as THREE from 'three';
import { box, type Solid, type SolidKind, type Vec3 } from './solids';

export interface LevelBox {
  id: number;
  nome: string;
  tipo: SolidKind;
  /** Centro della scatola. */
  posizione: Vec3;
  /** Dimensioni complete. */
  dimensioni: Vec3;
  colore: string;
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
    return { id: o.id, nome, tipo: o.tipo as SolidKind, posizione, dimensioni, colore: o.colore };
  });
  const level = { partenza, scatole };
  if (!standsOnSlab(toSolids(level), partenza))
    throw new Error('Livello: il punto di partenza deve stare sopra una lastra (scatola fissa)');
  return level;
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
  /** Da chiamare a ogni frame: porta le mesh mobili sulla posizione dei loro `Solid`. */
  sync(): void;
}

/** Costruisce scatole e mesh. Le mesh di `spingibile` e `pericolo` seguono il rispettivo `Solid`. */
export function buildLevel(level: LevelData): BuiltLevel {
  const solids = toSolids(level);
  const group = new THREE.Group();
  const moving: { solid: Solid; mesh: THREE.Mesh }[] = [];
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  level.scatole.forEach((b, i) => {
    const solid = solids[i]!;
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color: new THREE.Color(b.colore) }),
    );
    mesh.scale.set(b.dimensioni.x, b.dimensioni.y, b.dimensioni.z);
    mesh.position.set(b.posizione.x, b.posizione.y, b.posizione.z);
    mesh.name = b.nome;
    group.add(mesh);
    if (b.tipo !== 'fisso') moving.push({ solid, mesh });
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
  return { solids, start: { ...level.partenza }, group, sync };
}
