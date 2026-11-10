import * as THREE from 'three';
import { clampFrameDt } from './app/frame-time';

const SKY = 0x9ad4f5;

function showError(app: HTMLElement, message: string): void {
  const p = document.createElement('p');
  p.textContent = message;
  p.style.cssText = 'margin:0;padding:2rem;font-size:1.25rem;text-align:center';
  app.replaceChildren(p);
}

function start(): void {
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
    new THREE.MeshBasicMaterial({ color: 0x6fae5a }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  camera.position.set(0, 3, 8);
  camera.lookAt(0, 1, 0);

  function resize(): void {
    const w = app!.clientWidth || window.innerWidth;
    const h = app!.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    clampFrameDt(clock.getDelta());
    renderer.render(scene, camera);
  });
}

start();
