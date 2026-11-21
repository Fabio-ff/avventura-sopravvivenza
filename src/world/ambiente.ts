// Ambientazione da giungla: orizzonte, terreno, acqua nei fossati e vegetazione. Solo aspetto:
// niente collisioni. Budget tablet: nessuna ombra, nessuna allocazione per frame.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { disposeObject3D } from '../app/dispose';
import { loadEnvTexture } from './materiali';
import { disponiVegetazione, type Piantina, type Rettangolo } from './vegetazione';

/** Azzurro in cima all'immagine dell'orizzonte: sfondo della scena. */
export const COLORE_CIELO = 0x76c9fc;
/** Foschia azzurro-verde all'orizzonte: colore della nebbia. */
export const COLORE_FOSCHIA = 0xa6d9e4;

const RAGGIO = 100;
/** Altezza del cilindro: mezzo giro (due ripetizioni) con le proporzioni dell'immagine (2752x1536). */
const ALTEZZA = (Math.PI * RAGGIO) / (2752 / 1536);
/** Posizione della linea dell'orizzonte nell'immagine, dall'alto (0..1). */
const ORIZZONTE_V = 0.55;
/**
 * Quota della linea dell'orizzonte: più alta degli occhi, così colline e alberi dell'immagine
 * spuntano sopra la recinzione di 6 m invece di restare nascosti dietro.
 */
const QUOTA_OCCHI = 45;
const QUOTA_TERRENO = -1;
const QUOTA_ACQUA = -2.5;
const QUOTA_FONDALE = -3.6;
const ISTANZE = 200;

export interface Ambiente {
  group: THREE.Group;
  /** Da chiamare a ogni frame: il cielo segue la camera, l'acqua cambia colore piano piano. */
  update(time: number, camera: THREE.Vector3): void;
  dispose(): void;
}

function parte(
  geo: THREE.BufferGeometry,
  color: number,
  m: THREE.Matrix4 = new THREE.Matrix4(),
): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.applyMatrix4(m);
  const c = new THREE.Color(color);
  const n = g.attributes.position!.count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) colors.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.deleteAttribute('uv');
  return g;
}

const mat = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1): THREE.Matrix4 =>
  new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion(),
    new THREE.Vector3(sx, sy, sz),
  );

/** Forme di base alte 1 m (le rocce larghe 1 m): tronco e chioma con vertex color. */
function forme(): Record<string, THREE.BufferGeometry> {
  const tronco = 0x7a4e2d;
  const unisci = (parti: THREE.BufferGeometry[]): THREE.BufferGeometry =>
    mergeGeometries(parti, false);
  const chioma = (r: number, x: number, y: number, z: number, sy: number, c: number) =>
    parte(new THREE.IcosahedronGeometry(r, 1), c, mat(x, y, z, 1, sy, 1));
  const out: Record<string, THREE.BufferGeometry> = {};
  out['albero0'] = unisci([
    parte(new THREE.CylinderGeometry(0.03, 0.05, 0.65, 6), tronco, mat(0, 0.325, 0)),
    chioma(0.3, 0, 0.78, 0, 0.85, 0x2f9e44),
    chioma(0.2, 0.15, 0.62, 0.05, 0.8, 0x3fae3a),
  ]);
  out['albero1'] = unisci([
    parte(new THREE.CylinderGeometry(0.03, 0.05, 0.5, 6), tronco, mat(0, 0.25, 0)),
    parte(new THREE.ConeGeometry(0.28, 0.5, 7), 0x1f7a3a, mat(0, 0.55, 0)),
    parte(new THREE.ConeGeometry(0.2, 0.4, 7), 0x2a8a3a, mat(0, 0.8, 0)),
  ]);
  out['albero2'] = unisci([
    parte(new THREE.CylinderGeometry(0.035, 0.06, 0.6, 6), tronco, mat(0, 0.3, 0)),
    chioma(0.36, 0, 0.78, 0, 0.55, 0x3fae3a),
    chioma(0.22, -0.2, 0.7, 0.1, 0.6, 0x58b83a),
    chioma(0.22, 0.2, 0.72, -0.1, 0.6, 0x2f9e44),
  ]);
  for (const v of [0, 1]) {
    const parti: THREE.BufferGeometry[] = [
      parte(new THREE.CylinderGeometry(0.02, 0.035, 0.8, 6), v ? 0x8a5a33 : tronco, mat(0, 0.4, 0)),
    ];
    const foglie = v ? 6 : 7;
    for (let i = 0; i < foglie; i++) {
      const a = (i / foglie) * Math.PI * 2;
      const m = new THREE.Matrix4()
        .makeRotationY(a)
        .multiply(new THREE.Matrix4().makeTranslation(0.17, 0.85, 0))
        .multiply(new THREE.Matrix4().makeRotationZ(-0.45))
        .multiply(new THREE.Matrix4().makeScale(0.4, 0.025, 0.1));
      parti.push(parte(new THREE.BoxGeometry(1, 1, 1), v ? 0x58b83a : 0x3fae3a, m));
    }
    out[`palma${v}`] = unisci(parti);
  }
  out['roccia0'] = unisci([
    parte(new THREE.IcosahedronGeometry(0.5, 0), 0x8a8f98, mat(0, 0.25, 0, 1, 0.7, 1)),
  ]);
  out['roccia1'] = unisci([
    parte(new THREE.DodecahedronGeometry(0.5, 0), 0x7b8088, mat(0, 0.25, 0, 1.2, 0.6, 0.9)),
  ]);
  return out;
}

function vegetazione(piante: readonly Piantina[]): THREE.InstancedMesh[] {
  const geo = forme();
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const gruppi = new Map<string, Piantina[]>();
  for (const p of piante) {
    const key = `${p.tipo}${p.variante}`;
    const lista = gruppi.get(key);
    if (lista) lista.push(p);
    else gruppi.set(key, [p]);
  }
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const pos = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const col = new THREE.Color();
  const meshes: THREE.InstancedMesh[] = [];
  for (const [key, lista] of gruppi) {
    const g = geo[key]!;
    const mesh = new THREE.InstancedMesh(g, material, lista.length);
    lista.forEach((p, i) => {
      q.setFromAxisAngle(up, p.rotazione);
      pos.set(p.x, QUOTA_TERRENO - (p.tipo === 'roccia' ? 0.1 : 0), p.z);
      sc.set(p.altezza, p.altezza, p.altezza);
      m.compose(pos, q, sc);
      mesh.setMatrixAt(i, m);
      const b = 0.85 + 0.3 * (((i * 53) % 10) / 10);
      mesh.setColorAt(i, col.setRGB(b, b, b));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    meshes.push(mesh);
  }
  return meshes;
}

/** Terreno della giungla attorno al perimetro, con un buco rettangolare dove sta il livello. */
function terreno(p: Rettangolo, margine: number): THREE.Mesh {
  // dopo la rotazione di -90° attorno a x, la y della forma diventa -z nel mondo
  const shape = new THREE.Shape();
  shape.moveTo(p.minX - margine, -(p.minZ - margine));
  shape.lineTo(p.maxX + margine, -(p.minZ - margine));
  shape.lineTo(p.maxX + margine, -(p.maxZ + margine));
  shape.lineTo(p.minX - margine, -(p.maxZ + margine));
  const buco = new THREE.Path();
  buco.moveTo(p.minX, -p.minZ);
  buco.lineTo(p.minX, -p.maxZ);
  buco.lineTo(p.maxX, -p.maxZ);
  buco.lineTo(p.maxX, -p.minZ);
  shape.holes.push(buco);
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x3d8a3a }));
  mesh.position.y = QUOTA_TERRENO;
  return mesh;
}

/** Piccola texture di onde chiare su fondo neutro, che si ripete senza giunture (disegnata una volta). */
function texturaOnde(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const c = canvas.getContext('2d');
  if (c) {
    c.fillStyle = '#d8d8d8';
    c.fillRect(0, 0, size, size);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 3;
    c.lineCap = 'round';
    for (const [y, fase] of [
      [20, 0],
      [52, 1.7],
      [84, 3.1],
      [116, 4.6],
    ] as const) {
      c.beginPath();
      for (let x = 0; x <= size; x += 4) {
        const yy = y + Math.sin((x / size) * Math.PI * 2 + fase) * 5;
        if (x === 0) c.moveTo(x, yy);
        else c.lineTo(x, yy);
      }
      c.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** Crea l'ambientazione attorno al livello; `perimetro` è il rettangolo (x, z) del livello. */
export function createAmbiente(perimetro: Rettangolo): Ambiente {
  const group = new THREE.Group();

  // Orizzonte: cilindro senza nebbia, per primo, senza scrittura di profondità. Resta nascosto
  // finché l'immagine non è caricata (e per sempre se non si carica: resta il colore del cielo).
  const cielo = new THREE.Mesh(
    new THREE.CylinderGeometry(RAGGIO, RAGGIO, ALTEZZA, 48, 1, true),
    new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  cielo.renderOrder = -1000;
  cielo.frustumCulled = false;
  cielo.visible = false;
  // La giuntura a specchio sta ai lati del percorso (±x), il tempio davanti e dietro (±z).
  cielo.rotation.y = Math.PI / 2;
  cielo.position.y = QUOTA_OCCHI + (ORIZZONTE_V - 0.5) * ALTEZZA;
  group.add(cielo);
  void loadEnvTexture('orizzonte', 4).then((texture) => {
    if (!texture) return;
    texture.repeat.set(2, 1);
    texture.needsUpdate = true;
    const m = cielo.material as THREE.MeshBasicMaterial;
    m.map = texture;
    m.needsUpdate = true;
    cielo.visible = true;
  });

  group.add(terreno(perimetro, 45));

  // Fiume nei fossati: acqua leggermente trasparente su un fondale scuro.
  const w = perimetro.maxX - perimetro.minX;
  const d = perimetro.maxZ - perimetro.minZ;
  const cx = (perimetro.minX + perimetro.maxX) / 2;
  const cz = (perimetro.minZ + perimetro.maxZ) / 2;
  const fondale = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({ color: 0x0f4a52 }),
  );
  fondale.rotation.x = -Math.PI / 2;
  fondale.position.set(cx, QUOTA_FONDALE, cz);
  group.add(fondale);
  const onde = texturaOnde();
  onde.repeat.set(w / 5, d / 5);
  const acqua = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshStandardMaterial({
      color: 0x2a9fa0,
      map: onde,
      transparent: true,
      opacity: 0.82,
      roughness: 0.3,
    }),
  );
  acqua.rotation.x = -Math.PI / 2;
  acqua.position.set(cx, QUOTA_ACQUA, cz);
  group.add(acqua);
  const colA = new THREE.Color(0x2a9fa0);
  const colB = new THREE.Color(0x4fd0c0);
  const acquaMat = acqua.material as THREE.MeshStandardMaterial;

  for (const m of vegetazione(disponiVegetazione(perimetro, ISTANZE))) group.add(m);

  return {
    group,
    update(time, camera) {
      cielo.position.x = camera.x;
      cielo.position.z = camera.z;
      onde.offset.set(time * 0.02, time * 0.035);
      acquaMat.color.lerpColors(colA, colB, 0.5 + 0.5 * Math.sin(time * 0.8));
    },
    dispose() {
      disposeObject3D(group);
    },
  };
}
