// Il giocatore a schermo: modello (o segnaposto a capsula), clip, orientamento, tinta e ombra a macchia.
import * as THREE from 'three';
import { approachAngle } from '../app/angles';
import {
  CROUCH_HEIGHT,
  STAND_HEIGHT,
  type PlayerMode,
  type PlayerState,
} from '../player/controller';
import type { AbilityProfile } from '../player/profiles';
import { groundBelow, type Solid } from '../world/solids';
import { attaccaAccessorio } from './accessorio';
import { CharacterView } from './character-view';
import type { CanonicalClip, CharacterState } from './clip-for';
import { instantiate, loadCharacterModel } from './model-cache';

/** Altezza del personaggio nella scena, in metri. */
const MODEL_HEIGHT = STAND_HEIGHT;
const TURN_RATE = 14;
const SQUASH_RATE = 18;
/** Sopra questa velocità orizzontale (m/s) il giocatore risulta in movimento. */
const MOVING_SPEED = 0.1;
const PLACEHOLDER_COLOR = 0xf2c14e;
/** Oscillazione verticale di chi fluttua: ampiezza in metri e periodo in secondi. */
const HOVER_AMPLITUDE = 0.06;
const HOVER_PERIOD = 2;

/** Fluttuazione da accovacciati: fissa e bassa, così la testa non entra nell'architrave a 1,2 m. */
export const CROUCH_HOVER = 0.05;

/** Altezza visiva del modello sopra il suolo al tempo `t` (0 se non fluttua). */
export function hoverOffset(fluttua: number | undefined, t: number, crouching = false): number {
  if (!fluttua) return 0;
  if (crouching) return Math.min(fluttua, CROUCH_HOVER);
  return fluttua + HOVER_AMPLITUDE * Math.sin((2 * Math.PI * t) / HOVER_PERIOD);
}

export interface ViewParams {
  state: CharacterState;
  /** Velocità dell'animazione (senza clip `walk`, la camminata è la corsa rallentata). */
  timeScale: number;
  /** Scala verticale del modello (accovacciato senza clip dedicate = schiacciato). */
  squash: number;
}

const NO_CLIPS: ReadonlySet<CanonicalClip> = new Set<CanonicalClip>();
const SQUASHED = CROUCH_HEIGHT / STAND_HEIGHT;

/**
 * Dalla modalità del giocatore (e se si sta muovendo) alla clip, alla velocità e alla scala, date le
 * clip del modello. Ripieghi: senza `walk` la corsa rallentata; accovacciato in movimento senza
 * `crouchWalk` usa `crouch`; senza clip da accovacciato idle schiacciato.
 */
export function viewParamsFor(
  mode: PlayerMode,
  moving = false,
  available: ReadonlySet<CanonicalClip> = NO_CLIPS,
): ViewParams {
  switch (mode) {
    case 'cammina':
      return available.has('walk')
        ? { state: 'walk', timeScale: 1, squash: 1 }
        : { state: 'run', timeScale: 0.45, squash: 1 };
    case 'corre':
      return { state: 'run', timeScale: 1, squash: 1 };
    case 'salta':
      return { state: 'jump', timeScale: 1, squash: 1 };
    case 'cade':
      return { state: 'fall', timeScale: 1, squash: 1 };
    case 'colpito':
      return { state: 'hit', timeScale: 1, squash: 1 };
    case 'accovacciato':
      if (moving && available.has('crouchWalk'))
        return { state: 'crouchWalk', timeScale: 1, squash: 1 };
      if (available.has('crouch')) return { state: 'crouch', timeScale: 1, squash: 1 };
      return { state: 'idle', timeScale: 1, squash: SQUASHED };
    default:
      return { state: 'idle', timeScale: 1, squash: 1 };
  }
}

/** Segnaposto se il GLB non si carica: una capsula con la testa, mai uno schermo nero. */
function createPlaceholder(color: THREE.ColorRepresentation): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, MODEL_HEIGHT - 0.9, 4, 12), material);
  body.position.y = (MODEL_HEIGHT - 0.5) / 2 + 0.1;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), material);
  head.position.y = MODEL_HEIGHT - 0.3;
  group.add(body, head);
  return group;
}

/** Scala il modello a `MODEL_HEIGHT`, piedi a terra e centrato in orizzontale. */
function normalize(root: THREE.Object3D): void {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  if (size.y > 0) root.scale.multiplyScalar(MODEL_HEIGHT / size.y);
  const fitted = new THREE.Box3().setFromObject(root);
  const center = fitted.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= fitted.min.y;
}

/**
 * Clona i materiali delle mesh (così la sfumatura vicino alla camera non tocca la cache dei modelli)
 * e, se serve, li tinge (il colore si moltiplica alla texture).
 */
function prepareMaterials(root: THREE.Object3D, color?: string): void {
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const tintOne = (m: THREE.Material): THREE.Material => {
      const c = m.clone();
      if (color && 'color' in c && c.color instanceof THREE.Color) c.color.set(color);
      return c;
    };
    o.material = Array.isArray(o.material) ? o.material.map(tintOne) : tintOne(o.material);
  });
}

/** Ombra finta a macchia sotto i piedi (niente ombre dinamiche). */
function createBlobShadow(): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(0,0,0,0.55)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0, 1.0),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      depthWrite: false,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

/** Oggetto in mano del profilo: se il modello non si carica o l'osso manca, nessun oggetto e nessun errore. */
async function attachHeld(root: THREE.Object3D, profile: AbilityProfile): Promise<string | null> {
  const acc = profile.accessorio;
  if (!acc) return null;
  try {
    const loaded = await loadCharacterModel(acc.modello);
    if (!loaded) return null;
    const item = instantiate(loaded).scene;
    const size = new THREE.Box3().setFromObject(item).getSize(new THREE.Vector3());
    prepareMaterials(item);
    return attaccaAccessorio(root, item, size.y, acc) ? acc.modello : null;
  } catch (error) {
    console.warn('[accessorio] non attaccato per', acc.modello, error);
    return null;
  }
}

export class PlayerView {
  /** Modello dell'oggetto in mano, se attaccato. */
  heldKind: string | null = null;
  /** Da aggiungere alla scena: contiene personaggio e ombra. */
  readonly group = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly shadow = createBlobShadow();
  private heading: number | null = null;
  private squash = 1;
  private time = 0;
  private blinkHidden = false;
  private opacity = 1;
  private readonly baseMaterials: {
    material: THREE.Material;
    transparent: boolean;
    opacity: number;
  }[];

  private constructor(
    private readonly character: CharacterView | null,
    model: THREE.Object3D,
    /** Altezza di fluttuazione in metri (0 = piedi a terra). */
    private readonly fluttua: number,
    /** Id del personaggio se il modello è caricato ('golden' per i segnaposto tinti), altrimenti 'segnaposto'. */
    readonly kind: string,
    /** Scala verticale con le clip da accovacciato (1 = nessuna correzione). */
    private readonly crouchScale = 1,
  ) {
    this.body.add(model);
    this.group.add(this.body, this.shadow);
    const seen = new Set<THREE.Material>();
    model.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) seen.add(m);
    });
    this.baseMaterials = [...seen].map((material) => ({
      material,
      transparent: material.transparent,
      opacity: material.opacity,
    }));
  }

  /** Carica il modello del profilo (Golden se non ne ha uno), tinto se serve; se manca resta la capsula. */
  static async create(profile: AbilityProfile): Promise<PlayerView> {
    let file = 'characters/golden.glb';
    try {
      file = profile.modello ?? 'characters/golden.glb';
      const loaded = await loadCharacterModel(file);
      if (loaded) {
        const model = instantiate(loaded);
        normalize(model.scene);
        prepareMaterials(model.scene, profile.colore ?? undefined);
        const inMano = await attachHeld(model.scene, profile);
        const view = new PlayerView(
          new CharacterView(model, profile.clip, profile.sulPosto),
          model.scene,
          profile.fluttua ?? 0,
          profile.modello ? profile.id : 'golden',
          profile.scalaAccovacciato ?? 1,
        );
        view.heldKind = inMano;
        return view;
      }
    } catch (error) {
      console.warn('[model] segnaposto per', file, error);
    }
    return new PlayerView(
      null,
      createPlaceholder(profile.colore ?? PLACEHOLDER_COLOR),
      0,
      'segnaposto',
    );
  }

  /** Lampeggio dopo un colpo: nasconde il modello (l'ombra resta); nessun materiale toccato. */
  setBlinkHidden(hidden: boolean): void {
    this.blinkHidden = hidden;
    this.body.visible = !hidden && this.opacity > 0;
  }

  /** Sfuma il modello (1 = pieno, 0 = invisibile) quando la camera è vicinissima; l'ombra resta. */
  setOpacity(opacity: number): void {
    if (opacity === this.opacity) return;
    this.opacity = opacity;
    this.body.visible = !this.blinkHidden && opacity > 0;
    for (const base of this.baseMaterials) {
      const transparent = base.transparent || opacity < 1;
      if (base.material.transparent !== transparent) {
        base.material.transparent = transparent;
        base.material.needsUpdate = true;
      }
      base.material.opacity = base.opacity * opacity;
    }
  }

  update(state: PlayerState, solids: readonly Solid[], dt: number): void {
    const moving = Math.hypot(state.velocity.x, state.velocity.z) > MOVING_SPEED;
    const params = viewParamsFor(state.mode, moving, this.character?.availableClips);
    const p = state.position;
    this.group.position.set(p.x, p.y, p.z);

    this.heading =
      this.heading === null
        ? state.facing
        : approachAngle(this.heading, state.facing, TURN_RATE, dt);
    this.body.rotation.y = this.heading;
    // la correzione di altezza serve solo alla clip da accovacciato in movimento (più alta della posa ferma)
    const targetSquash = params.state === 'crouchWalk' ? this.crouchScale : params.squash;
    this.squash += (targetSquash - this.squash) * (1 - Math.exp(-SQUASH_RATE * dt));
    this.body.scale.y = this.squash;
    this.time += dt;
    this.body.position.y = hoverOffset(this.fluttua, this.time, state.crouching);

    if (this.character) {
      this.character.mixer.timeScale = params.timeScale;
      this.character.update(params.state, dt);
    }

    // l'ombra resta sul suolo sotto i piedi e si rimpicciolisce con l'altezza
    const ground = groundBelow(solids, p.x, p.z, p.y);
    this.shadow.visible = ground !== null;
    if (ground !== null) {
      const h = Math.max(0, p.y - ground);
      this.shadow.position.set(0, ground - p.y + 0.02, 0);
      const s = 1.1 / (1 + h * 0.6);
      this.shadow.scale.set(s, s, 1);
    }
  }
}
