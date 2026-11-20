import { consumeSteps, FIXED_STEP, GameLoop } from './app/game-loop';
import { createSceneContext, showError } from './app/scene-setup';
import { readUrlOptions } from './app/url-options';
import {
  FollowCamera,
  occluders,
  updateCameraAngles,
  type OcclusionTargets,
} from './camera/follow-camera';
import { InputManager } from './input/input-manager';
import { JumpLatch } from './input/jump-latch';
import levelJson from './missions/palestra/level.json';
import { createPlayer, stepPlayer, teleport } from './player/controller';
import { profileFor } from './player/profiles';
import { OcclusionFader } from './render/occlusion-fade';
import { PlayerView } from './render/player-view';
import { showCharacterMenu, showMenuButton } from './ui/character-menu';
import { FpsCounter } from './ui/debug-overlay';
import { screenFor } from './ui/menu-logic';
import { buildLevel, validateLevel, type BuiltLevel } from './world/build-level';

/** Ogni quanti secondi si aggiorna `body[data-pos]` (per lo smoke). */
const POS_INTERVAL = 0.25;

function setPoint(
  out: { x: number; y: number; z: number },
  p: { x: number; y: number; z: number },
  h: number,
): void {
  out.x = p.x;
  out.y = p.y + h;
  out.z = p.z;
}

async function start(): Promise<void> {
  const app = document.getElementById('app');
  if (!app) throw new Error('#app mancante');

  // Senza un personaggio valido nell'indirizzo: solo il menu, niente scena né modelli.
  const options = readUrlOptions(window.location.search);
  if (screenFor(options) === 'menu' || options.pg === null) {
    showCharacterMenu();
    return;
  }
  const profile = profileFor(options.pg);

  const ctx = createSceneContext(app);
  if (!ctx) return;
  const { renderer, scene, camera } = ctx;
  showMenuButton();

  // Per ora esiste un solo livello (`options.level` vale sempre "palestra").
  let level: BuiltLevel;
  try {
    level = buildLevel(validateLevel(levelJson));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(error);
    showError(app, `Livello non valido: ${reason}`);
    return;
  }
  scene.add(level.group);

  const player = createPlayer(level.start);
  // Alla partenza si guarda verso il percorso (-z), non verso la camera.
  player.facing = Math.PI;
  const view = await PlayerView.create(profile);
  scene.add(view.group);

  const followCamera = new FollowCamera(camera);
  const input = new InputManager();
  input.attach(renderer.domElement);

  const fader = new OcclusionFader(level.meshes);
  const coverTargets: OcclusionTargets = {
    head: { x: 0, y: 0, z: 0 },
    chest: { x: 0, y: 0, z: 0 },
    feet: { x: 0, y: 0, z: 0 },
  };
  const covering: number[] = [];

  const counter = options.showFps ? new FpsCounter(document.body) : null;

  const writePos = (): void => {
    const p = player.position;
    document.body.dataset.pos = `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)}`;
  };
  writePos();
  document.body.dataset.ready = view.kind;

  const jumpLatch = new JumpLatch();
  let accumulator = 0;
  let posTimer = 0;
  const loop = new GameLoop((dt, rawDt) => {
    const frame = input.read();
    jumpLatch.feed(frame.jump);
    updateCameraAngles(
      followCamera.angles,
      frame.lookX,
      frame.lookY,
      frame.moveX,
      frame.moveY,
      player.facing,
      dt,
    );

    const stepped = consumeSteps(accumulator, dt);
    accumulator = stepped.accumulator;
    for (let i = 0; i < stepped.steps; i++) {
      const events = stepPlayer(
        player,
        { ...frame, jump: jumpLatch.value() },
        followCamera.angles.yaw,
        profile,
        level.solids,
        FIXED_STEP,
      );
      jumpLatch.consume();
      for (const event of events) {
        // Le vite arrivano nel Task 4: per ora si torna all'ultimo punto sicuro.
        if (event.type === 'caduto') {
          teleport(player, player.safePoint, level.solids);
          followCamera.snap();
        }
      }
    }

    level.sync();
    view.update(player, level.solids, dt);
    followCamera.update(player.position, level.solids, dt, player.crouching);

    // ostacoli tra camera e personaggio: sfumano
    const pp = player.position;
    const crouch = player.crouching;
    setPoint(coverTargets.head, pp, crouch ? 1.1 : 1.7);
    setPoint(coverTargets.chest, pp, crouch ? 0.6 : 0.9);
    setPoint(coverTargets.feet, pp, 0.1);
    occluders(camera.position, coverTargets, level.solids, covering);
    fader.update(covering, dt);

    posTimer += dt;
    if (posTimer >= POS_INTERVAL) {
      posTimer = 0;
      writePos();
    }
    counter?.update(rawDt);
    renderer.render(scene, camera);
  });
  loop.start();
}

start().catch((error: unknown) => {
  console.error(error);
  const app = document.getElementById('app');
  if (app) showError(app, 'Qualcosa è andato storto: impossibile avviare il gioco.');
});
