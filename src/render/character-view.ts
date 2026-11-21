import type { AnimationClip } from 'three';
import {
  AnimationMixer,
  AnimationUtils,
  Bone,
  Group,
  LoopOnce,
  LoopRepeat,
  SkinnedMesh,
  type AnimationAction,
  type Object3D,
} from 'three';
import {
  ALL_CLIPS,
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

/** Fotogrammi al secondo con cui si ritagliano le clip (i tempi restano in secondi). */
const CLIP_FPS = 30;

/**
 * Copia della clip senza lo spostamento orizzontale del bacino (le clip Mixamo di corsa e camminata
 * lo avanzano di qualche metro per ciclo, e a fine ciclo il personaggio scatterebbe indietro).
 * Toglie la deriva lineare da inizio a fine ciclo e riporta il primo fotogramma sulla posa di base.
 */
export function clipSulPosto(clip: AnimationClip, hips: Bone): AnimationClip {
  const out = clip.clone();
  const track = out.tracks.find((t) => t.name === `${hips.name}.position`);
  if (!track || track.times.length < 2) return out;
  const v = track.values;
  const n = track.times.length;
  const t0 = track.times[0]!;
  const span = track.times[n - 1]! - t0;
  if (span <= 0) return out;
  for (const axis of [0, 2] as const) {
    const first = v[axis]!;
    const drift = v[(n - 1) * 3 + axis]! - first;
    const bind = axis === 0 ? hips.position.x : hips.position.z;
    for (let i = 0; i < n; i++) {
      v[i * 3 + axis] = v[i * 3 + axis]! - (drift * (track.times[i]! - t0)) / span - first + bind;
    }
  }
  return out;
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

  constructor(model: LoadedModel, clipMap?: ClipMap, sulPosto = false) {
    this.root = model.scene;
    this.group.add(this.root);
    this.root.traverse((o) => {
      if (o instanceof SkinnedMesh) this.skinned.push(o);
    });
    this.mixer = new AnimationMixer(this.root);
    let hips: Bone | undefined;
    this.root.traverse((o) => {
      if (!hips && o instanceof Bone && !(o.parent instanceof Bone)) hips = o;
    });
    // clip logiche con lo stesso nome e lo stesso tratto condividono l'azione (niente reset al passaggio)
    const byKey = new Map<string, AnimationAction>();
    for (const logical of ALL_CLIPS) {
      const spec = clipSpecFor(clipMap, logical);
      if (!spec) continue;
      let clip = model.clips.find((c) => c.name === spec.nome);
      if (!clip) continue;
      const key = `${spec.nome}|${spec.inizio ?? ''}|${spec.fine ?? ''}`;
      let action = byKey.get(key);
      if (!action) {
        if (sulPosto && hips && LOOPING_CLIPS.has(logical)) clip = clipSulPosto(clip, hips);
        if (spec.inizio !== undefined || spec.fine !== undefined) {
          clip = AnimationUtils.subclip(
            clip,
            clip.name,
            Math.round((spec.inizio ?? 0) * CLIP_FPS),
            Math.round((spec.fine ?? clip.duration) * CLIP_FPS),
            CLIP_FPS,
          );
        }
        action = this.mixer.clipAction(clip);
        byKey.set(key, action);
      }
      this.actions.set(logical, action);
      this.speeds.set(logical, spec.velocita);
    }
    this.available = new Set(this.actions.keys());
  }

  /** Le clip logiche che questo modello può mostrare. */
  get availableClips(): ReadonlySet<CanonicalClip> {
    return this.available;
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
