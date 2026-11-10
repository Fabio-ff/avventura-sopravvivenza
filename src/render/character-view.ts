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
  LOOPING_CLIPS,
  resolveClip,
  type CanonicalClip,
  type CharacterState,
} from './clip-for';
import type { LoadedModel } from './model-cache';

/** Durata della dissolvenza tra due clip, in secondi. */
export const CROSSFADE_SECONDS = 0.15;

/**
 * Un personaggio disegnato con un modello vero: un `AnimationMixer` e una clip per stato scelta da
 * `clipFor`. `model` deve essere un'istanza propria (`instantiate`).
 */
export class CharacterView {
  readonly group = new Group();
  readonly mixer: AnimationMixer;
  private readonly actions = new Map<CanonicalClip, AnimationAction>();
  private readonly root: Object3D;
  private readonly skinned: SkinnedMesh[] = [];
  private active: CanonicalClip | null = null;

  constructor(model: LoadedModel) {
    this.root = model.scene;
    this.group.add(this.root);
    this.root.traverse((o) => {
      if (o instanceof SkinnedMesh) this.skinned.push(o);
    });
    this.mixer = new AnimationMixer(this.root);
    for (const clip of model.clips) {
      const name = CANONICAL_CLIPS.find((c) => c === clip.name);
      if (name) this.actions.set(name, this.mixer.clipAction(clip));
    }
  }

  /** La clip canonica in corso, o null nella posa di base. */
  get currentClip(): CanonicalClip | null {
    return this.active;
  }

  /** Mostra lo stato (con dissolvenza dalla clip precedente) e fa avanzare l'animazione di `dt`. */
  update(state: CharacterState, dt: number): void {
    this.select(resolveClip(clipFor(state), new Set(this.actions.keys())));
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
    to.reset();
    to.enabled = true;
    to.setEffectiveWeight(1);
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
