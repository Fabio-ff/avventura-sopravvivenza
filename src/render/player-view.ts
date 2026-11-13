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
import { CharacterView } from './character-view';
import type { CharacterState } from './clip-for';
import { instantiate, loadCharacterModel } from './model-cache';

/** Altezza del personaggio nella scena, in metri. */
const MODEL_HEIGHT = STAND_HEIGHT;
const TURN_RATE = 14;
const SQUASH_RATE = 18;
const PLACEHOLDER_COLOR = 0xf2c14e;

export interface ViewParams {
  state: CharacterState;
  /** Velocità dell'animazione (la camminata è la corsa rallentata). */
  timeScale: number;
  /** Scala verticale del modello (accovacciato = schiacciato). */
  squash: number;
}

/** Dalla modalità del giocatore alla clip, alla velocità e alla scala. */
export function viewParamsFor(mode: PlayerMode): ViewParams {
  switch (mode) {
    case 'cammina':
      return { state: 'run', timeScale: 0.45, squash: 1 };
    case 'corre':
      return { state: 'run', timeScale: 1, squash: 1 };
    case 'salta':
      return { state: 'jump', timeScale: 1, squash: 1 };
    case 'cade':
      return { state: 'fall', timeScale: 1, squash: 1 };
    case 'colpito':
      return { state: 'hit', timeScale: 1, squash: 1 };
    case 'accovacciato':
      return { state: 'idle', timeScale: 1, squash: CROUCH_HEIGHT / STAND_HEIGHT };
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

/** Clona i materiali delle mesh e li tinge (il colore si moltiplica alla texture). */
function tint(root: THREE.Object3D, color: string): void {
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const tintOne = (m: THREE.Material): THREE.Material => {
      const c = m.clone();
      if ('color' in c && c.color instanceof THREE.Color) c.color.set(color);
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

export class PlayerView {
  /** Da aggiungere alla scena: contiene personaggio e ombra. */
  readonly group = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly shadow = createBlobShadow();
  private heading: number | null = null;
  private squash = 1;

  private constructor(
    private readonly character: CharacterView | null,
    model: THREE.Object3D,
    /** 'golden' se il modello è caricato, altrimenti 'segnaposto'. */
    readonly kind: 'golden' | 'segnaposto',
  ) {
    this.body.add(model);
    this.group.add(this.body, this.shadow);
  }

  /** Carica il modello di Golden tinto col colore del profilo; se manca resta la capsula tinta. */
  static async create(profile: AbilityProfile): Promise<PlayerView> {
    try {
      const loaded = await loadCharacterModel('characters/golden.glb');
      if (loaded) {
        const model = instantiate(loaded);
        normalize(model.scene);
        if (profile.colore) tint(model.scene, profile.colore);
        return new PlayerView(new CharacterView(model), model.scene, 'golden');
      }
    } catch (error) {
      console.warn('[model] segnaposto per characters/golden.glb', error);
    }
    return new PlayerView(
      null,
      createPlaceholder(profile.colore ?? PLACEHOLDER_COLOR),
      'segnaposto',
    );
  }

  update(state: PlayerState, solids: readonly Solid[], dt: number): void {
    const params = viewParamsFor(state.mode);
    const p = state.position;
    this.group.position.set(p.x, p.y, p.z);

    this.heading =
      this.heading === null
        ? state.facing
        : approachAngle(this.heading, state.facing, TURN_RATE, dt);
    this.body.rotation.y = this.heading;
    this.squash += (params.squash - this.squash) * (1 - Math.exp(-SQUASH_RATE * dt));
    this.body.scale.y = this.squash;

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
