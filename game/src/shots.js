// The screenshot scenes behind ?shot=cover|patrol|alert|exit. Each one plays the
// real rules forward from a fresh world for a fixed time, steered by a small
// autopilot that walks tile waypoints, so the frame is what a short game really
// looks like and the same seed always gives the same frame. The cover then poses
// the decisive moment the game is about: the prize already in Wren's pocket,
// one night guard lured away by a pebble, Wren slipping past behind him in the
// dark — with the field notes and callouts drawn as part of the scene.
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
 * Run segments of {tiles, stance, hold, pebble, interact} then idle until
 * totalSeconds. Each segment drives its waypoints, throws a pebble if asked,
 * then waits `hold` seconds in place.
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
    if (seg.pebble) {
      const at = tileCenter(seg.pebble[0], seg.pebble[1]);
      world.step(SAMPLE, fakeInput(driver, seg.stance || 'walk'), false, 0, at);
      elapsed += SAMPLE;
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
    // Level 1: Wren waits in the dark of the west gallery, watching the hall
    // guard's cone sweep past the doorway.
    return runScene(world, 0, [
      { tiles: [[2, 10], [5, 10], [5, 6]], stance: 'walk', hold: 3.0 },
    ], 8);
  }
  if (name === 'alert') {
    // Level 2: sprint up the shadow lane onto the vertical patrol's beat and
    // stand in its path — the guard walks into you, the cone goes red.
    return runScene(world, 1, [
      { tiles: [[2, 11], [12, 11], [12, 8], [13, 8]], stance: 'sprint', hold: 1.0 },
    ], 3.5);
  }
  if (name === 'exit') {
    // Level 1: Wren slips to the east vault, takes the Moon Opal, and stands
    // at the open exit with the night still ghost-quiet. Posed like the cover:
    // the sim walks her to the vault, then the frame is set.
    runScene(world, 0, [
      { tiles: [[5, 10], [5, 6], [9, 6]], stance: 'walk', hold: 2.0 },
      { tiles: [[12, 6], [16, 6], [16, 9], [20, 9]], stance: 'sneak' },
    ], 14);
    const s = world.state;
    s.messages = [];
    s.rings = [];
    s.alarm = 0;
    s.ghost = true;
    s.triesLeft = 3;
    s.pebbles = 5;
    s.levelTime = 88;
    for (const item of s.loot) item.taken = true;
    s.lootTaken = 3;
    s.opalTaken = true;
    s.exitOpen = true;
    const atExit = tileCenter(24, 10);
    s.player.x = atExit.x;
    s.player.y = atExit.y;
    s.player.dir = -Math.PI / 2;
    s.player.stance = 'walk';
    // The vault guard is back on his beat, far from the hatch, cone west.
    const g1 = s.guards[1];
    const vault = tileCenter(19, 3);
    g1.x = vault.x; g1.y = vault.y; g1.dir = Math.PI;
    g1.state = 'patrol'; g1.suspicion = 0; g1.wpIndex = 0; g1.pauseT = 0.5;
    return { screen: SCREEN_PLAY };
  }
  // Cover (default): level 1, the whole game in one frame. Wren slips through
  // the house to the east vault, pockets two pieces of loot on the way, and
  // ends crouched in the dark behind the crates while the vault guard —
  // lured off his beat by a pebble — mutters at the empty air.
  runScene(world, 0, [
    { tiles: [[2, 10], [6, 10], [6, 5], [8, 5], [10, 5], [10, 8], [13, 8], [16, 8], [16, 9], [20, 9]], stance: 'walk' },
    { tiles: [], stance: 'sneak', pebble: [22, 5], hold: 1.6 },
  ], 21);
  const s = world.state;
  // Pose the moment: the prize is already Wren's, the exit stands open.
  s.messages = [];
  s.rings = [];
  s.alarm = 0;
  s.ghost = true;
  s.triesLeft = 3;
  s.pebbles = 4;
  s.levelTime = 71;
  for (const item of s.loot) {
    if ((item.col === 2 && item.row === 2) || (item.col === 14 && item.row === 6)) item.taken = true;
  }
  s.lootTaken = 2;
  s.opalTaken = true;
  s.exitOpen = true;
  // Wren, crouched in the dark behind the crates, facing the distracted guard.
  const wren = tileCenter(20, 9);
  s.player.x = wren.x;
  s.player.y = wren.y;
  s.player.dir = Math.PI;
  s.player.stance = 'sneak';
  // The hall guard: mid-beat below the lamp, cone sweeping down the hall.
  const hall = tileCenter(12, 4);
  const g0 = s.guards[0];
  g0.x = hall.x; g0.y = hall.y; g0.dir = Math.PI / 2;
  g0.state = 'patrol'; g0.suspicion = 0; g0.wpIndex = 2; g0.pauseT = 0.5;
  // The vault guard: lured off his beat by the pebble, muttering at the air.
  const pebble = tileCenter(22, 5);
  const g1 = s.guards[1];
  g1.x = pebble.x - 96; g1.y = pebble.y + 88;
  g1.dir = Math.atan2(pebble.y - g1.y, pebble.x - g1.x);
  g1.state = 'suspicious'; g1.suspicion = 45; g1.peak = 45;
  g1.target = { x: pebble.x, y: pebble.y }; g1.lookT = 0;
  s.rings.push({ x: pebble.x, y: pebble.y, r: 34, maxR: 95, color: 'rgba(242, 201, 76, 0.55)' });
  // The gallery guard: on his beat in the west gallery, cone up the room.
  const gal = tileCenter(5, 8);
  const g2 = s.guards[2];
  g2.x = gal.x; g2.y = gal.y; g2.dir = -Math.PI / 2;
  g2.state = 'patrol'; g2.suspicion = 0; g2.wpIndex = 1; g2.pauseT = 0.5;
  // The legend, and the callouts that teach the frame.
  s.fieldNotes = true;
  const lamp = tileCenter(13, 2);
  const exit = tileCenter(24, 10);
  s.annotations = [
    { x: lamp.x, y: lamp.y, lx: 664, ly: 100, text: 'LAMPLIGHT: his gaze catches you in the glow' },
    { x: pebble.x, y: pebble.y, lx: 1000, ly: 252, text: '? HE HEARD A PEBBLE — HE TURNS TO LISTEN' },
    { x: wren.x, y: wren.y, lx: 960, ly: 580, text: 'WREN: flat against the crates, out of sight' },
    { x: exit.x, y: exit.y, lx: 1150, ly: 636, text: 'ESCAPE HATCH' },
  ];
  return { screen: SCREEN_PLAY };
}
