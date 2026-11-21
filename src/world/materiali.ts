// Texture condivise delle scatole del livello. Se una texture non si carica, la scatola resta a tinta unita.
import * as THREE from 'three';
import { MATERIALI, type LevelData, type Materiale } from './build-level';

export type TextureSet = Partial<Record<Materiale, THREE.Texture>>;

/** Quota del colore della scatola mescolata al bianco: tinge la texture senza coprirla. */
export const QUOTA_TINTA = 0.3;

/** Colore del materiale: bianco mescolato con il colore della scatola. */
export function tinta(colore: string, quota: number = QUOTA_TINTA): THREE.Color {
  return new THREE.Color(0xffffff).lerp(new THREE.Color(colore), quota);
}

/** Carica una texture con ripetizione a specchio e mipmap; null se il caricamento fallisce. */
export function loadEnvTexture(
  name: string,
  anisotropy: number,
  loader: THREE.TextureLoader = new THREE.TextureLoader(),
): Promise<THREE.Texture | null> {
  return new Promise((resolve) => {
    loader.load(
      `${import.meta.env.BASE_URL}assets/env/${name}.jpg`,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.MirroredRepeatWrapping;
        texture.wrapT = THREE.MirroredRepeatWrapping;
        texture.anisotropy = anisotropy;
        resolve(texture);
      },
      undefined,
      () => {
        console.warn(`Texture "${name}" non caricata: resto a tinta unita.`);
        resolve(null);
      },
    );
  });
}

export async function loadLevelTextures(anisotropy: number): Promise<TextureSet> {
  const loaded = await Promise.all(MATERIALI.map((m) => loadEnvTexture(m, anisotropy)));
  const set: TextureSet = {};
  MATERIALI.forEach((m, i) => {
    const t = loaded[i];
    if (t) set[m] = t;
  });
  return set;
}

/** Applica le texture ai materiali delle scatole (uno per scatola, texture condivise). */
export function applyTextures(
  level: LevelData,
  meshes: ReadonlyMap<number, THREE.Mesh>,
  set: TextureSet,
): void {
  for (const b of level.scatole) {
    const texture = b.materiale ? set[b.materiale] : undefined;
    const mesh = meshes.get(b.id);
    if (!texture || !mesh) continue;
    const material = mesh.material as THREE.MeshStandardMaterial;
    material.map = texture;
    material.color.copy(tinta(b.colore));
    material.needsUpdate = true;
  }
}
