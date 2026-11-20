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
import { Hud } from './hud/hud';
import {
  applyKnockback,
  createPlayer,
  stepPlayer,
  teleport,
  type PlayerInput,
} from './player/controller';
import { blinkHidden, createLives, registerFall, registerHit, tickLives } from './player/lives';
import { profileFor } from './player/profiles';
import { OcclusionFader } from './render/occlusion-fade';
import { PlayerView } from './render/player-view';
import { showCharacterMenu, showMenuButton } from './ui/character-menu';
import { FpsCounter } from './ui/debug-overlay';
import { screenFor } from './ui/menu-logic';
import { buildLevel, validateLevel, type BuiltLevel } from './world/build-level';
import { knockOrigin } from './world/movers';
import type { Solid } from './world/solids';

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

  const lives = createLives(profile.vite);
  const hud = new Hud(document.body, profile.nome, profile.vite);

  const counter = options.showFps ? new FpsCounter(document.body) : null;

  const writePos = (): void => {
    const p = player.position;
    document.body.dataset.pos = `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)}`;
  };
  writePos();
  document.body.dataset.ready = view.kind;

  const jumpLatch = new JumpLatch();
  let accumulator = 0;
  /** Tempo di simulazione per la trappola: avanza solo a passi fissi, quindi mai a salti dopo una pausa. */
  let simTime = 0;
  // Oggetti riusati a ogni passo, per non allocare nei percorsi caldi.
  const stepInput: PlayerInput = { moveX: 0, moveY: 0, walk: false, jump: false, crouch: false };
  const origin = { x: 0, y: 0, z: 0 };
  const solidById = new Map<number, Solid>(level.solids.map((s) => [s.id, s]));
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
      // la trappola si muove prima del giocatore: il contatto vale anche a giocatore fermo
      simTime += FIXED_STEP;
      level.setMoverTime(simTime);
      const defeated = lives.phase === 'sconfitto';
      stepInput.moveX = defeated ? 0 : frame.moveX;
      stepInput.moveY = defeated ? 0 : frame.moveY;
      stepInput.walk = !defeated && frame.walk;
      stepInput.crouch = !defeated && frame.crouch;
      stepInput.jump = !defeated && jumpLatch.value();
      const events = stepPlayer(
        player,
        stepInput,
        followCamera.angles.yaw,
        profile,
        level.solids,
        FIXED_STEP,
      );
      jumpLatch.consume();
      for (const event of events) {
        if (event.type === 'colpito') {
          if (registerHit(lives) === null) continue;
          const trap = solidById.get(event.hazardId);
          if (trap)
            applyKnockback(
              player,
              knockOrigin(origin, trap, level.motoOf(trap.id), player.position),
            );
        } else if (registerFall(lives) !== null) {
          // una vita in meno (anche l'ultima: la scritta compare sul punto sicuro)
          teleport(player, player.safePoint, level.solids);
          followCamera.snap();
        }
      }
      if (tickLives(lives, FIXED_STEP) === 'ripartenza') {
        // ripartenza: partenza, masso e spingibili al loro posto, trappola al tempo zero
        level.reset();
        simTime = 0;
        teleport(player, level.start, level.solids);
        player.facing = Math.PI;
        followCamera.snap();
      }
    }

    hud.setLives(lives.vite);
    hud.setDefeat(lives.phase === 'sconfitto');
    view.setBlinkHidden(blinkHidden(lives.invuln));
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
