import {
  AnimationMixer,
  Group,
  LoopOnce,
  LoopRepeat,
  SkinnedMesh,
  type AnimationAction,
  type Object3D,
} from 'three';
import {
  CANONICAL_CLIPS,
  clipFor,
  clipSpecFor,
  LOOPING_CLIPS,
  resolveClip,
  type CanonicalClip,
  type ClipMap,
  type CharacterState,
} from './clip-for';
import type { LoadedModel } from './model-cache';

/** Durata della dissolvenza tra due clip, in secondi. */
export const CROSSFADE_SECONDS = 0.15;

/**
 * Passando a una clip la cui azione è la stessa di quella in corso (clip diverse del profilo che
 * puntano alla stessa animazione) non si riparte da capo: cambia solo la velocità.
 */
export function needsReset(current: unknown, next: unknown): boolean {
  return current !== next;
}

/**
 * Un personaggio disegnato con un modello vero: un `AnimationMixer` e una clip per stato scelta da
 * `clipFor`. `model` deve essere un'istanza propria (`instantiate`).
 */
export class CharacterView {
  readonly group = new Group();
  readonly mixer: AnimationMixer;
  private readonly actions = new Map<CanonicalClip, AnimationAction>();
  /** Clip disponibili, calcolate una volta sola (niente allocazioni per frame). */
  private readonly available: ReadonlySet<CanonicalClip>;
  private readonly root: Object3D;
  private readonly skinned: SkinnedMesh[] = [];
  private readonly speeds = new Map<CanonicalClip, number>();
  private active: CanonicalClip | null = null;

  constructor(model: LoadedModel, clipMap?: ClipMap) {
    this.root = model.scene;
    this.group.add(this.root);
    this.root.traverse((o) => {
      if (o instanceof SkinnedMesh) this.skinned.push(o);
    });
    this.mixer = new AnimationMixer(this.root);
    for (const logical of CANONICAL_CLIPS) {
      const spec = clipSpecFor(clipMap, logical);
      const clip = model.clips.find((c) => c.name === spec.nome);
      if (!clip) continue;
      this.actions.set(logical, this.mixer.clipAction(clip));
      this.speeds.set(logical, spec.velocita);
    }
    this.available = new Set(this.actions.keys());
  }

  /** La clip canonica in corso, o null nella posa di base. */
  get currentClip(): CanonicalClip | null {
    return this.active;
  }

  /** Mostra lo stato (con dissolvenza dalla clip precedente) e fa avanzare l'animazione di `dt`. */
  update(state: CharacterState, dt: number): void {
    this.select(resolveClip(clipFor(state), this.available));
    this.mixer.update(Number.isFinite(dt) && dt > 0 ? dt : 0);
  }

  private select(clip: CanonicalClip | null): void {
    if (clip === this.active) return;
    if (clip === null) {
      this.mixer.stopAllAction();
      this.active = null;
      return;
    }
    const to = this.actions.get(clip);
    if (!to) return;
    const from = this.active ? this.actions.get(this.active) : undefined;
    if (!needsReset(from, to)) {
      // stessa azione: l'animazione continua, cambia solo la velocità
      to.setEffectiveTimeScale(this.speeds.get(clip) ?? 1);
      this.active = clip;
      return;
    }
    to.reset();
    to.enabled = true;
    to.setEffectiveWeight(1);
    to.setEffectiveTimeScale(this.speeds.get(clip) ?? 1);
    if (LOOPING_CLIPS.has(clip)) {
      to.setLoop(LoopRepeat, Infinity);
    } else {
      to.setLoop(LoopOnce, 1);
      to.clampWhenFinished = true;
    }
    if (from && from !== to) {
      to.fadeIn(CROSSFADE_SECONDS);
      from.fadeOut(CROSSFADE_SECONDS);
    }
    to.play();
    this.active = clip;
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.root);
    for (const mesh of this.skinned) mesh.skeleton.dispose();
  }
}
