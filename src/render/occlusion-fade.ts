// Ostacoli che coprono il personaggio: sfumano a opacità ridotta e tornano opachi.
import type { Material, Mesh } from 'three';

/** Opacità degli ostacoli che coprono. */
export const FADED_OPACITY = 0.3;
/** Durata della dissolvenza completa, in secondi. */
export const FADE_TIME = 0.15;

/** Avvicina `current` a `target` di al più (1 - FADED_OPACITY) / FADE_TIME al secondo. */
export function stepOpacity(current: number, target: number, dt: number): number {
  const step = ((1 - FADED_OPACITY) / FADE_TIME) * Math.max(0, dt);
  if (current < target) return Math.min(target, current + step);
  return Math.max(target, current - step);
}

/**
 * Applica la dissolvenza alle mesh per id. `transparent` è attivo solo mentre serve; con la scatola
 * trasparente `depthWrite` è spento, così non nasconde ciò che sta dietro.
 */
export class OcclusionFader {
  private readonly opacity = new Map<number, number>();
  private readonly covering = new Set<number>();

  constructor(private readonly meshes: ReadonlyMap<number, Mesh>) {}

  update(coveringIds: readonly number[], dt: number): void {
    this.covering.clear();
    for (const id of coveringIds) {
      this.covering.add(id);
      if (!this.opacity.has(id)) this.opacity.set(id, 1);
    }
    for (const [id, current] of this.opacity) {
      const next = stepOpacity(current, this.covering.has(id) ? FADED_OPACITY : 1, dt);
      const mesh = this.meshes.get(id);
      if (mesh) apply(mesh.material as Material, next);
      if (next >= 1) this.opacity.delete(id);
      else this.opacity.set(id, next);
    }
  }
}

function apply(material: Material, opacity: number): void {
  const transparent = opacity < 1;
  if (material.transparent !== transparent) {
    material.transparent = transparent;
    material.depthWrite = !transparent;
    material.needsUpdate = true;
  }
  material.opacity = opacity;
}
