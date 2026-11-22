// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps, and the renderer paints what is there. The game moves between
// title, intro, play, paused, level-clear, game-over and final screens.
//
// ?seed=N fixes the night. ?shot=cover|patrol|alert|exit (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { LEVELS } from './levels.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import {
  ACTION_CONFIRM, ACTION_INTERACT, ACTION_MUTE, ACTION_NOTES, ACTION_PAUSE, ACTION_RESTART,
  createInput,
} from './input.js';
import {
  EVENT_ALARM, EVENT_ALERT, EVENT_CAUGHT, EVENT_LOOT, EVENT_OPAL, EVENT_PEBBLE,
  EVENT_SUSPICIOUS, EVENT_WIN, createWorld,
} from './world.js';
import {
  SCREEN_FINAL, SCREEN_INTRO, SCREEN_LEVEL_CLEAR, SCREEN_OVER, SCREEN_PAUSED,
  SCREEN_PLAY, SCREEN_TITLE, createRenderer,
} from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, 0, (g) => world.conePoints(g));
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let attractWorld = world;
  attractWorld.reset(0, false);

  function announce(message) {
    status.textContent = message;
  }

  function playSounds(events) {
    const p = world.state.player;
    if (p && p.justStepped) {
      const pan = Math.max(-0.9, Math.min(0.9, (p.x - 640) / 640));
      audio.footstep(pan, p.stance === 'sprint' ? 0.2 : p.stance === 'sneak' ? 0.05 : 0.12, false);
    }
    for (const guard of world.state.guards) {
      if (guard.justStepped) {
        const d = Math.hypot(guard.x - p.x, guard.y - p.y);
        const pan = Math.max(-0.9, Math.min(0.9, (guard.x - p.x) / 340));
        audio.footstep(pan, Math.max(0.03, 0.16 * (1 - d / 340)), true);
      }
    }
    if (events & EVENT_SUSPICIOUS) audio.suspicious();
    if (events & EVENT_ALERT) audio.alert();
    if (events & EVENT_ALARM) audio.nearMiss();
    if (events & EVENT_LOOT) audio.pickup();
    if (events & EVENT_OPAL) audio.opal();
    if (events & EVENT_CAUGHT) audio.caught();
    if (events & EVENT_WIN) audio.win();
    if (events & EVENT_PEBBLE) audio.pebble();
  }

  function startLevel(index) {
    world.reset(index, false);
    accumulator = 0;
    screen = SCREEN_INTRO;
    announce(`${LEVELS[index].name}. ${LEVELS[index].subtitle}`);
  }

  function handleActions() {
    const actions = input.takeActions();
    const pebbleAt = input.takePebble();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) {
        audio.unlock();
        startLevel(0);
      }
      return null;
    }
    if (screen === SCREEN_INTRO) {
      if (actions & ACTION_CONFIRM) {
        screen = SCREEN_PLAY;
        announce('Playing. Stay in the shadows.');
      }
      return null;
    }
    if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (actions & ACTION_RESTART) {
        startLevel(world.state.levelIndex);
      }
      if (actions & ACTION_NOTES) {
        world.state.fieldNotes = !world.state.fieldNotes;
        announce(world.state.fieldNotes ? 'Field notes open.' : 'Field notes closed.');
      }
      return { actions, pebbleAt };
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & ACTION_PAUSE || actions & ACTION_CONFIRM) screen = SCREEN_PLAY;
      else if (actions & ACTION_RESTART) startLevel(world.state.levelIndex);
      return null;
    }
    if (screen === SCREEN_LEVEL_CLEAR) {
      if (actions & ACTION_CONFIRM) {
        if (world.state.levelIndex + 1 < LEVELS.length) startLevel(world.state.levelIndex + 1);
        else {
          screen = SCREEN_FINAL;
          if (world.state.score > best) { best = world.state.score; saveBest(best); }
        }
      }
      return null;
    }
    if (screen === SCREEN_OVER) {
      if (actions & ACTION_CONFIRM) startLevel(world.state.levelIndex);
      return null;
    }
    if (screen === SCREEN_FINAL) {
      if (actions & ACTION_CONFIRM) startLevel(0);
      return null;
    }
    return null;
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, null, true);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const frame = handleActions();
    if (!frame) return;
    const events = world.step(STEP, input, false, frame.actions, frame.pebbleAt);
    playSounds(events);
    if (events & EVENT_WIN) {
      if (world.state.levelIndex + 1 < LEVELS.length) {
        screen = SCREEN_LEVEL_CLEAR;
        announce(`Level clear. Score ${world.state.score}.`);
      } else {
        screen = SCREEN_FINAL;
        if (world.state.score > best) { best = world.state.score; saveBest(best); }
        announce(`The vault is yours. Final score ${world.state.score}.`);
      }
    } else if (events & EVENT_CAUGHT) {
      if (world.state.over) {
        screen = SCREEN_OVER;
        announce(`Caught. Score ${world.state.score}. Best ${best}.`);
      } else {
        world.respawn();
        announce(`Caught! ${world.state.triesLeft} ${world.state.triesLeft === 1 ? 'try' : 'tries'} left.`);
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    if (screen === SCREEN_TITLE) {
      handleActions();
      while (accumulator >= STEP) {
        world.step(STEP, null, true);
        accumulator -= STEP;
      }
    } else if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
      if (screen !== SCREEN_PLAY) accumulator = 0;
    } else {
      handleActions();
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, (g) => world.conePoints(g));
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Velvet Vault. Press Enter or click to play.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
