import { consumeSteps, FIXED_STEP, GameLoop } from './app/game-loop';
import { createSceneContext, showError } from './app/scene-setup';
import { readUrlOptions } from './app/url-options';
import { FollowCamera, updateCameraAngles } from './camera/follow-camera';
import { InputManager } from './input/input-manager';
import levelJson from './missions/palestra/level.json';
import { createPlayer, stepPlayer, teleport } from './player/controller';
import { profileFor } from './player/profiles';
import { PlayerView } from './render/player-view';
import { FpsCounter } from './ui/debug-overlay';
import { buildLevel, validateLevel } from './world/build-level';

/** Ogni quanti secondi si aggiorna `body[data-pos]` (per lo smoke). */
const POS_INTERVAL = 0.25;

async function start(): Promise<void> {
  const app = document.getElementById('app');
  if (!app) throw new Error('#app mancante');

  const ctx = createSceneContext(app);
  if (!ctx) return;
  const { renderer, scene, camera } = ctx;

  const options = readUrlOptions(window.location.search);
  const profile = profileFor(options.pg);

  // Per ora esiste un solo livello (`options.level` vale sempre "palestra").
  const level = buildLevel(validateLevel(levelJson));
  scene.add(level.group);

  const player = createPlayer(level.start);
  const view = await PlayerView.create(profile);
  scene.add(view.group);

  const followCamera = new FollowCamera(camera);
  const input = new InputManager();
  input.attach(renderer.domElement);

  const counter = options.showFps ? new FpsCounter(document.body) : null;

  const writePos = (): void => {
    const p = player.position;
    document.body.dataset.pos = `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)}`;
  };
  writePos();
  document.body.dataset.ready = view.kind;

  let accumulator = 0;
  let posTimer = 0;
  const loop = new GameLoop((dt, rawDt) => {
    const frame = input.read();
    const moving = Math.hypot(frame.moveX, frame.moveY) > 0.01;
    updateCameraAngles(followCamera.angles, frame.lookX, frame.lookY, moving, player.facing, dt);

    const stepped = consumeSteps(accumulator, dt);
    accumulator = stepped.accumulator;
    for (let i = 0; i < stepped.steps; i++) {
      const events = stepPlayer(
        player,
        frame,
        followCamera.angles.yaw,
        profile,
        level.solids,
        FIXED_STEP,
      );
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
    followCamera.update(player.position, level.solids, dt);

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
