// The screenshot scenes behind ?shot=cover|patrol|alert|exit. Each one plays the
// real rules forward from a fresh world for a fixed time, steered by a small
// autopilot that walks tile waypoints, so the frame is what a short game really
// looks like and the same seed always gives the same frame.
import { STEP } from './config.js';
import { SCREEN_PLAY } from './render.js';
import { tileCenter } from './world.js';

const SAMPLE = STEP;

/** Steer the player along tile waypoints; returns the input for this step. */
function makeDriver(world) {
  let waypoints = [];
  let index = 0;
  let stuckT = 0;
  let lastX = 0;
  let lastY = 0;
  return {
    setWaypoints(tiles) {
      waypoints = tiles.map(([col, row]) => tileCenter(col, row));
      index = 0;
      stuckT = 0;
      lastX = world.state.player.x;
      lastY = world.state.player.y;
    },
    done() {
      return index >= waypoints.length;
    },
    input(stance) {
      const p = world.state.player;
      if (index >= waypoints.length) return { x: 0, y: 0 };
      const target = waypoints[index];
      const dx = target.x - p.x;
      const dy = target.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 10) {
        index += 1;
        stuckT = 0;
        return { x: 0, y: 0 };
      }
      const moved = Math.hypot(p.x - lastX, p.y - lastY);
      if (moved < 0.5) {
        stuckT += SAMPLE;
        if (stuckT > 2.5) {
          index += 1;
          stuckT = 0;
        }
      } else {
        stuckT = 0;
      }
      lastX = p.x;
      lastY = p.y;
      return { x: dx / dist, y: dy / dist };
    },
  };
}

function fakeInput(driver, stance) {
  return {
    direction: () => driver.input(stance),
    isSneaking: () => stance === 'sneak',
    isSprinting: () => stance === 'sprint',
  };
}

/**
 * Run segments of {tiles, stance, hold} then idle until totalSeconds.
 * Each segment drives its waypoints, then waits `hold` seconds in place.
 */
function runScene(world, levelIndex, segments, totalSeconds) {
  world.reset(levelIndex, false);
  const driver = makeDriver(world);
  let elapsed = 0;
  for (const seg of segments) {
    driver.setWaypoints(seg.tiles);
    let guard = 0;
    while (!driver.done() && elapsed < totalSeconds && guard < 60 / SAMPLE) {
      const actions = seg.interact && world.state.player.nearPrize ? 16 : 0;
      world.step(SAMPLE, fakeInput(driver, seg.stance || 'walk'), false, actions, null);
      elapsed += SAMPLE;
      guard += 1;
    }
    const hold = seg.hold || 0;
    let held = 0;
    while (held < hold && elapsed < totalSeconds) {
      const actions = seg.interact && world.state.player.nearPrize ? 16 : 0;
      world.step(SAMPLE, fakeInput(driver, seg.stance || 'walk'), false, actions, null);
      elapsed += SAMPLE;
      held += SAMPLE;
    }
  }
  while (elapsed < totalSeconds) {
    world.step(SAMPLE, fakeInput(driver, 'sneak'), false, 0, null);
    elapsed += SAMPLE;
  }
  return { screen: SCREEN_PLAY };
}

export function stageShot(name, world) {
  if (name === 'patrol') {
    // Level 2: crossing the sun court between two patrols, loot in the middle.
    return runScene(world, 1, [
      { tiles: [[4, 10], [4, 6], [11, 6]], stance: 'walk' },
    ], 5);
  }
  if (name === 'alert') {
    // Level 2: sprint up the shadow lane onto the vertical patrol's beat and
    // stand in its path — the guard walks into you, the cone goes red.
    return runScene(world, 1, [
      { tiles: [[2, 11], [12, 11], [12, 8], [13, 8]], stance: 'sprint', hold: 1.0 },
    ], 3.5);
  }
  if (name === 'exit') {
    // Level 1: wait in the shadows until the guard has passed, cross behind
    // him, take the Moon Opal, then stand at the open exit, ghost intact.
    return runScene(world, 0, [
      { tiles: [[5, 10], [5, 6], [9, 6]], stance: 'walk', hold: 4.5 },
      { tiles: [[9, 3], [16, 3], [20, 3], [22, 2]], stance: 'walk', interact: true, hold: 0.6 },
      { tiles: [[22, 9], [22, 10]], stance: 'walk' },
    ], 16);
  }
  // Cover (default): level 1, crouched in shadow behind a crate while the
  // guard's cone sweeps the hall and stops at the crate.
  return runScene(world, 0, [
    { tiles: [[5, 10], [5, 6], [9, 6], [9, 8], [11, 8]], stance: 'walk' },
  ], 21);
}
