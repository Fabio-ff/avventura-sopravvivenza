import * as THREE from 'three';
import { GameLoop } from './app/game-loop';
import { readUrlOptions } from './app/url-options';
import { CharacterView } from './render/character-view';
import { instantiate, loadCharacterModel } from './render/model-cache';
import { FpsCounter } from './ui/debug-overlay';

const SKY = 0x9ad4f5;
/** Altezza di Golden nella scena, in metri. */
const GOLDEN_HEIGHT = 1.8;
/** Larghezza minima da tenere inquadrata (braccia e margine), in metri. */
const FRAME_WIDTH = 1.8;
const FRAME_MARGIN = 1.2;

function showError(app: HTMLElement, message: string): void {
  const p = document.createElement('p');
  p.textContent = message;
  p.style.cssText = 'margin:0;padding:2rem;font-size:1.25rem;text-align:center';
  app.replaceChildren(p);
}

/** Segnaposto se il GLB non si carica: una capsula con la testa, mai uno schermo nero. */
function createPlaceholder(): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0xf2c14e });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, GOLDEN_HEIGHT - 0.9, 4, 12), material);
  body.position.y = (GOLDEN_HEIGHT - 0.5) / 2 + 0.1;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), material);
  head.position.y = GOLDEN_HEIGHT - 0.3;
  group.add(body, head);
  return group;
}

/** Scala il modello a `GOLDEN_HEIGHT`, piedi a terra e centrato in orizzontale. */
function normalize(root: THREE.Object3D): void {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  if (size.y > 0) root.scale.multiplyScalar(GOLDEN_HEIGHT / size.y);
  const fitted = new THREE.Box3().setFromObject(root);
  const center = fitted.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= fitted.min.y;
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
  mesh.position.y = 0.01;
  return mesh;
}

async function start(): Promise<void> {
  const app = document.getElementById('app');
  if (!app) throw new Error('#app mancante');

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch {
    showError(app, 'Il tuo browser non supporta WebGL: impossibile avviare il gioco.');
    return;
  }
  // Budget tablet: niente ombre dinamiche, pixel ratio limitato a 2.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = false;
  app.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 20, 80);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x6fae5a }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  scene.add(createBlobShadow());

  // Luce: ambiente + sole + riempimento frontale sul volto (senza, il volto resta scuro).
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6fae5a, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(4, 8, 5);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xfff2e0, 1.4);
  fill.position.set(-1, 2, 6);
  scene.add(fill);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);

  /** Camera fissa a tre quarti: la distanza si adatta perché Golden stia intera in verticale e orizzontale. */
  function frameCamera(): void {
    const vHalf = THREE.MathUtils.degToRad(camera.fov / 2);
    const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
    const dist =
      Math.max(GOLDEN_HEIGHT / 2 / Math.tan(vHalf), FRAME_WIDTH / 2 / Math.tan(hHalf)) *
      FRAME_MARGIN;
    const dir = new THREE.Vector3(0.55, 0.15, 1).normalize();
    const target = new THREE.Vector3(0, GOLDEN_HEIGHT * 0.4, 0);
    camera.position.copy(target).addScaledVector(dir, dist);
    camera.lookAt(target);
  }

  function resize(): void {
    const w = app!.clientWidth || window.innerWidth;
    const h = app!.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    frameCamera();
  }
  window.addEventListener('resize', resize);
  resize();

  const counter = readUrlOptions(window.location.search).showFps
    ? new FpsCounter(document.body)
    : null;

  const loaded = await loadCharacterModel('characters/golden.glb');
  let view: CharacterView | null = null;
  if (loaded) {
    const model = instantiate(loaded);
    normalize(model.scene);
    view = new CharacterView(model);
    scene.add(view.group);
  } else {
    scene.add(createPlaceholder());
  }
  document.body.dataset.ready = loaded ? 'golden' : 'segnaposto';

  const loop = new GameLoop((dt) => {
    view?.update('idle', dt);
    counter?.update(dt);
    renderer.render(scene, camera);
  });
  loop.start();
}

void start();
