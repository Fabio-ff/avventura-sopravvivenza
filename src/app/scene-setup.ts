// Renderer, luci, nebbia, WebGL mancante e contesto perso. Budget tablet: niente ombre dinamiche.
import * as THREE from 'three';
import { rendererSettings } from '../render/renderer-settings';

const SKY = 0x9ad4f5;

export interface SceneContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
}

export function showError(app: HTMLElement, message: string): void {
  const p = document.createElement('p');
  p.textContent = message;
  p.style.cssText = 'margin:0;padding:2rem;font-size:1.25rem;text-align:center';
  app.replaceChildren(p);
}

/** Crea renderer, scena e camera dentro `app`; se manca WebGL mostra un messaggio e restituisce null. */
export function createSceneContext(app: HTMLElement): SceneContext | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: rendererSettings(window.devicePixelRatio).antialias,
    });
  } catch {
    showError(app, 'Il tuo browser non supporta WebGL: impossibile avviare il gioco.');
    return null;
  }
  // Budget tablet: niente ombre dinamiche, pixel ratio limitato a 2.
  renderer.setPixelRatio(rendererSettings(window.devicePixelRatio).pixelRatio);
  renderer.shadowMap.enabled = false;
  app.appendChild(renderer.domElement);

  // Contesto WebGL perso (tablet, memoria): messaggio breve finché non torna.
  let lostNotice: HTMLParagraphElement | null = null;
  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    if (lostNotice) return;
    lostNotice = document.createElement('p');
    lostNotice.id = 'context-lost';
    lostNotice.textContent = 'Grafica interrotta: sto provando a riprendere...';
    lostNotice.style.cssText =
      'position:fixed;left:0;right:0;top:40%;margin:0;padding:1rem;font-size:1.25rem;text-align:center;background:rgba(0,0,0,0.6)';
    document.body.appendChild(lostNotice);
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    lostNotice?.remove();
    lostNotice = null;
  });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 25, 90);

  // Luce: ambiente + sole + riempimento frontale sul volto (senza, il volto resta scuro).
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6fae5a, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(4, 8, 5);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xfff2e0, 1.4);
  fill.position.set(-1, 2, 6);
  scene.add(fill);

  // Fondo lontano sotto i fossati (si cade sotto y = -4), così non si vede il cielo sotto i piedi.
  const abyss = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({ color: 0x3f6b35 }),
  );
  abyss.rotation.x = -Math.PI / 2;
  abyss.position.y = -3.5;
  scene.add(abyss);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);

  const resize = (): void => {
    const w = app.clientWidth || window.innerWidth;
    const h = app.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();

  return { renderer, scene, camera };
}
