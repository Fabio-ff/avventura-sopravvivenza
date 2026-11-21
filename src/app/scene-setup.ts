// Renderer, luci, nebbia, WebGL mancante e contesto perso. Budget tablet: niente ombre dinamiche.
import * as THREE from 'three';
import { rendererSettings } from '../render/renderer-settings';
import { COLORE_CIELO, COLORE_FOSCHIA } from '../world/ambiente';

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
  scene.background = new THREE.Color(COLORE_CIELO);
  scene.fog = new THREE.Fog(COLORE_FOSCHIA, 25, 90);

  // Luce: ambiente + sole + riempimento frontale sul volto (senza, il volto resta scuro).
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x5fae4a, 1.5));
  const sun = new THREE.DirectionalLight(0xfff0c4, 1.7);
  sun.position.set(4, 8, 5);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xfff2e0, 1.4);
  fill.position.set(-1, 2, 6);
  scene.add(fill);

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
