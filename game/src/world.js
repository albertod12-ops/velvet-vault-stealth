// The simulation: one fixed step of the night. Guards patrol waypoints they can
// learn, grow suspicious when they see you, chase when they are sure, search
// where they last saw you, and go back to their beat. Getting seen is never
// instant death: suspicion has to climb, and breaking line of sight lets it fall.
import {
  COLS, DETECTION, FIELD_X, FIELD_Y, GUARD, MAX_ALARM, NOISE, PEBBLES_PER_LEVEL,
  PLAYER, ROWS, SCORES, STEP, TILE, TRIES_PER_LEVEL,
} from './config.js';
import { LEVELS, blocksMove, blocksSight, isShadowTile, parseLevel } from './levels.js';

export const EVENT_NONE = 0;
export const EVENT_LOOT = 1;
export const EVENT_OPAL = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_WIN = 8;
export const EVENT_ALARM = 16;
export const EVENT_SUSPICIOUS = 32;
export const EVENT_ALERT = 64;
export const EVENT_PEBBLE = 128;

export function tileCenter(col, row) {
  return { x: FIELD_X + col * TILE + TILE / 2, y: FIELD_Y + row * TILE + TILE / 2 };
}

function tileAtPx(state, x, y) {
  const col = Math.floor((x - FIELD_X) / TILE);
  const row = Math.floor((y - FIELD_Y) / TILE);
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return '#';
  return state.tiles[row][col];
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function createWorld(random) {
  const state = {
    levelIndex: 0,
    level: LEVELS[0],
    tiles: [],
    lamps: [],
    start: { col: 1, row: 1 },
    prize: { col: 1, row: 1 },
    exit: { col: 1, row: 1 },
    loot: [],
    player: null,
    guards: [],
    time: 0,
    score: 0,
    lootTaken: 0,
    lootTotal: 0,
    triesLeft: TRIES_PER_LEVEL,
    alarm: 0,
    pebbles: PEBBLES_PER_LEVEL,
    opalTaken: false,
    exitOpen: false,
    won: false,
    over: false,
    ghost: true,
    messages: [],
    rings: [],
    levelTime: 0,
    // Staging overlays, set by shots.js (and by H in live play): the field-notes
    // legend and the annotated callouts. Empty/off in a normal game.
    annotations: [],
    fieldNotes: false,
  };

  function toast(text) {
    state.messages.push({ text, ttl: 3.5 });
    if (state.messages.length > 3) state.messages.shift();
  }

  function addRing(x, y, maxR, color) {
    state.rings.push({ x, y, r: 6, maxR, color });
  }

  function resetGuards() {
    state.guards = state.level.guards.map((g) => {
      const first = tileCenter(g.waypoints[0][0], g.waypoints[0][1]);
      const second = tileCenter(g.waypoints[1][0], g.waypoints[1][1]);
      return {
        x: first.x,
        y: first.y,
        dir: Math.atan2(second.y - first.y, second.x - first.x),
        state: 'patrol',
        suspicion: 0,
        peak: 0,
        wpIndex: 1,
        pauseT: 0,
        lookT: 0,
        lookBase: 0,
        target: null,
        lastSeen: null,
        searchPoints: [],
        searchIndex: 0,
        lostT: 0,
        stepPhase: 0,
        waypoints: g.waypoints,
      };
    });
  }

  function reset(levelIndex, keepTries) {
    state.levelIndex = levelIndex;
    state.level = LEVELS[levelIndex];
    const parsed = parseLevel(state.level);
    state.tiles = parsed.tiles;
    state.lamps = parsed.lamps;
    state.start = parsed.start;
    state.prize = parsed.prize;
    state.exit = parsed.exit;
    state.loot = parsed.loot;
    state.lootTotal = parsed.loot.length;
    state.lootTaken = 0;
    state.time = 0;
    state.levelTime = 0;
    state.alarm = 0;
    state.pebbles = PEBBLES_PER_LEVEL;
    state.opalTaken = false;
    state.exitOpen = false;
    state.won = false;
    state.over = false;
    state.ghost = true;
    state.messages = [];
    state.rings = [];
    state.annotations = [];
    state.fieldNotes = false;
    if (!keepTries) state.triesLeft = TRIES_PER_LEVEL;
    const s = tileCenter(state.start.col, state.start.row);
    state.player = {
      x: s.x, y: s.y, dir: 0, stance: 'walk', moving: false,
      stepPhase: 0, nearPrize: false,
    };
    resetGuards();
  }

  function respawn() {
    const s = tileCenter(state.start.col, state.start.row);
    state.player.x = s.x;
    state.player.y = s.y;
    state.player.dir = 0;
    resetGuards();
    toast(state.triesLeft > 0 ? `Caught! Nerve left: ${state.triesLeft}` : 'Caught!');
  }

  function moveEntity(e, dx, dy, radius) {
    const nx = e.x + dx;
    if (!hitsWall(nx, e.y, radius)) e.x = nx;
    const ny = e.y + dy;
    if (!hitsWall(e.x, ny, radius)) e.y = ny;
  }

  function hitsWall(x, y, radius) {
    const left = Math.floor((x - radius - FIELD_X) / TILE);
    const right = Math.floor((x + radius - FIELD_X) / TILE);
    const top = Math.floor((y - radius - FIELD_Y) / TILE);
    const bottom = Math.floor((y + radius - FIELD_Y) / TILE);
    for (let row = top; row <= bottom; row += 1) {
      for (let col = left; col <= right; col += 1) {
        if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return true;
        if (blocksMove(state.tiles[row][col], state.exitOpen)) {
          const cx = FIELD_X + col * TILE;
          const cy = FIELD_Y + row * TILE;
          const nearX = clamp(x, cx, cx + TILE);
          const nearY = clamp(y, cy, cy + TILE);
          if ((x - nearX) * (x - nearX) + (y - nearY) * (y - nearY) < radius * radius) return true;
        }
      }
    }
    return false;
  }

  function coneRange() {
    return GUARD.coneRange + state.alarm * DETECTION.alarmRangeBonus;
  }

  function inCone(guard, x, y) {
    const dx = x - guard.x;
    const dy = y - guard.y;
    const dist = Math.hypot(dx, dy);
    if (dist > coneRange()) return false;
    if (dist < 4) return true;
    return Math.abs(angleDiff(Math.atan2(dy, dx), guard.dir)) <= GUARD.coneHalfAngle;
  }

  function hasLOS(guard, x, y, sneaking) {
    const dx = x - guard.x;
    const dy = y - guard.y;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.floor(dist / 5));
    for (let i = 1; i < steps; i += 1) {
      const px = guard.x + (dx * i) / steps;
      const py = guard.y + (dy * i) / steps;
      if (blocksSight(tileAtPx(state, px, py), sneaking)) return false;
    }
    return true;
  }

  /** Distance from (x,y) along angle until a wall, crate or plant stops the ray. */
  function castRay(x, y, angle, maxDist) {
    const step = 4;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    for (let d = step; d <= maxDist; d += step) {
      const px = x + dx * d;
      const py = y + dy * d;
      const ch = tileAtPx(state, px, py);
      if (ch === '#' || ch === 'C' || ch === 'P' || ch === 'B') return d;
    }
    return maxDist;
  }

  function conePoints(guard) {
    const range = coneRange();
    const points = [];
    const rays = 28;
    for (let i = 0; i <= rays; i += 1) {
      const a = guard.dir - GUARD.coneHalfAngle + (2 * GUARD.coneHalfAngle * i) / rays;
      const d = castRay(guard.x, guard.y, a, range);
      points.push({ x: guard.x + Math.cos(a) * d, y: guard.y + Math.sin(a) * d });
    }
    return points;
  }

  function makeNoise(x, y, radius, events) {
    addRing(x, y, radius, 'rgba(242, 201, 76, 0.55)');
    for (const guard of state.guards) {
      if (guard.state !== 'patrol' && guard.state !== 'return') continue;
      if (Math.hypot(guard.x - x, guard.y - y) > radius) continue;
      guard.state = 'suspicious';
      guard.target = { x, y };
      guard.suspicion = Math.max(guard.suspicion, 30);
      guard.lookT = 0;
    }
    return events;
  }

  function nearMiss() {
    if (state.alarm >= MAX_ALARM) return EVENT_NONE;
    state.alarm += 1;
    state.ghost = false;
    toast(`NEAR MISS — the alarm rises (${state.alarm}/${MAX_ALARM})`);
    return EVENT_ALARM;
  }

  function updateGuard(guard, dt, events) {
    const p = state.player;
    const pDist = Math.hypot(p.x - guard.x, p.y - guard.y);
    const pTile = tileAtPx(state, p.x, p.y);
    // Tall ferns hide a sneaking player — unless the watchman is close enough
    // to part them. That exception is decided here, not in hasLOS.
    const seen = inCone(guard, p.x, p.y)
      && (hasLOS(guard, p.x, p.y, p.stance === 'sneak') || (pTile === 'F' && pDist < 80));
    if (seen) {
      const dist = Math.hypot(p.x - guard.x, p.y - guard.y);
      const t = clamp(1 - dist / coneRange(), 0, 1);
      const distFactor = DETECTION.farFactor + (DETECTION.closeFactor - DETECTION.farFactor) * t;
      const tile = tileAtPx(state, p.x, p.y);
      const lightFactor = isShadowTile(tile) ? DETECTION.shadowFactor : DETECTION.litFactor;
      const stanceFactor = p.stance === 'sneak' ? DETECTION.sneakFactor : p.stance === 'sprint' ? DETECTION.sprintFactor : 1;
      const alarmFactor = 1 + DETECTION.alarmRateBonus * state.alarm;
      guard.suspicion = Math.min(100, guard.suspicion + DETECTION.basePerSecond * distFactor * lightFactor * stanceFactor * alarmFactor * dt);
      guard.peak = Math.max(guard.peak, guard.suspicion);
      guard.lastSeen = { x: p.x, y: p.y };
      guard.lostT = 0;
      // A suspicious guard that still sees you tracks you, it does not walk
      // to where you were a second ago.
      if (guard.state === 'suspicious') guard.target = { x: p.x, y: p.y };
      if (guard.suspicion >= DETECTION.alertAt && guard.state !== 'alert') {
        guard.state = 'alert';
        toast('SPOTTED — run for the shadows!');
        events |= EVENT_ALERT;
      } else if (guard.suspicion >= DETECTION.suspiciousAt && (guard.state === 'patrol' || guard.state === 'return')) {
        guard.state = 'suspicious';
        guard.target = { x: p.x, y: p.y };
        events |= EVENT_SUSPICIOUS;
      }
    } else {
      guard.suspicion = Math.max(0, guard.suspicion - DETECTION.decayPerSecond * dt);
      guard.lostT += dt;
      if (guard.state === 'alert' && guard.suspicion < DETECTION.nearMissFloor) {
        if (guard.peak >= DETECTION.nearMissPeak) events |= nearMiss();
        guard.peak = 0;
        guard.state = 'search';
        guard.searchT = 0;
        guard.searchPoints = [];
        guard.searchIndex = 0;
      } else if (guard.state === 'suspicious' && guard.suspicion < DETECTION.nearMissFloor) {
        if (guard.peak >= DETECTION.nearMissPeak) events |= nearMiss();
        guard.peak = 0;
        guard.state = 'return';
        guard.target = null;
      }
    }

    const speedMul = 1 + DETECTION.alarmSpeedBonus * state.alarm;
    let speed = 0;
    let target = null;
    if (guard.state === 'patrol') {
      if (guard.pauseT > 0) {
        guard.pauseT -= dt;
        guard.dir += Math.sin(state.time * 1.4 + guard.x) * 0.012;
      } else {
        const wp = tileCenter(guard.waypoints[guard.wpIndex][0], guard.waypoints[guard.wpIndex][1]);
        target = wp;
        speed = GUARD.patrolSpeed * speedMul;
        if (Math.hypot(wp.x - guard.x, wp.y - guard.y) < 6) {
          guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
          guard.pauseT = GUARD.pauseAtWaypoint;
        }
      }
    } else if (guard.state === 'suspicious') {
      if (guard.target) {
        target = guard.target;
        speed = GUARD.suspiciousSpeed * speedMul;
        if (Math.hypot(target.x - guard.x, target.y - guard.y) < 8) {
          guard.target = null;
          guard.lookT = GUARD.lookAroundTime;
          guard.lookBase = guard.dir;
        }
      } else if (guard.lookT > 0) {
        guard.lookT -= dt;
        guard.dir = guard.lookBase + Math.sin((GUARD.lookAroundTime - guard.lookT) * 2.2) * 0.9;
        if (guard.lookT <= 0) guard.state = 'return';
      } else {
        guard.state = 'return';
      }
    } else if (guard.state === 'alert') {
      target = guard.lastSeen || { x: p.x, y: p.y };
      speed = GUARD.alertSpeed * speedMul;
      if (Math.hypot(target.x - guard.x, target.y - guard.y) < 10 && guard.lostT > 3) {
        guard.state = 'search';
        guard.searchT = 0;
        guard.searchPoints = [];
        guard.searchIndex = 0;
      }
    } else if (guard.state === 'search') {
      if (guard.searchPoints.length === 0) {
        for (let i = 0; i < 2; i += 1) {
          const a = random() * Math.PI * 2;
          const r = 60 + random() * 60;
          guard.searchPoints.push({
            x: clamp((guard.lastSeen?.x ?? guard.x) + Math.cos(a) * r, FIELD_X + 30, FIELD_X + COLS * TILE - 30),
            y: clamp((guard.lastSeen?.y ?? guard.y) + Math.sin(a) * r, FIELD_Y + 30, FIELD_Y + ROWS * TILE - 30),
          });
        }
      }
      if (guard.searchIndex < guard.searchPoints.length) {
        target = guard.searchPoints[guard.searchIndex];
        speed = GUARD.searchSpeed * speedMul;
        if (Math.hypot(target.x - guard.x, target.y - guard.y) < 10) {
          guard.searchIndex += 1;
          guard.lookT = 1.2;
        }
      } else {
        guard.state = 'return';
      }
    } else if (guard.state === 'return') {
      let best = null;
      let bestD = Infinity;
      for (let i = 0; i < guard.waypoints.length; i += 1) {
        const wp = tileCenter(guard.waypoints[i][0], guard.waypoints[i][1]);
        const d = Math.hypot(wp.x - guard.x, wp.y - guard.y);
        if (d < bestD) { bestD = d; best = i; }
      }
      const wp = tileCenter(guard.waypoints[best][0], guard.waypoints[best][1]);
      target = wp;
      speed = GUARD.returnSpeed * speedMul;
      if (bestD < 6) {
        guard.wpIndex = (best + 1) % guard.waypoints.length;
        guard.state = 'patrol';
        guard.suspicion = 0;
      }
    }

    if (target && speed > 0) {
      const dx = target.x - guard.x;
      const dy = target.y - guard.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.01) {
        guard.dir = Math.atan2(dy, dx);
        const stepLen = Math.min(speed * dt, dist);
        moveEntity(guard, (dx / dist) * stepLen, (dy / dist) * stepLen, GUARD.radius);
        guard.stepPhase += stepLen;
        if (guard.stepPhase >= PLAYER.stepLength) {
          guard.stepPhase = 0;
          const pd = Math.hypot(guard.x - p.x, guard.y - p.y);
          if (pd < 340) {
            addRing(guard.x, guard.y, 26, 'rgba(255, 90, 78, 0.4)');
          }
          guard.justStepped = true;
        } else {
          guard.justStepped = false;
        }
      }
    }
    return events;
  }

  /** One fixed step. `actions` is the bitmask main already took this frame. */
  function step(dt, input, attract, actions, pebbleAt) {
    let events = EVENT_NONE;
    state.time += dt;
    for (let i = state.messages.length - 1; i >= 0; i -= 1) {
      state.messages[i].ttl -= dt;
      if (state.messages[i].ttl <= 0) state.messages.splice(i, 1);
    }
    for (let i = state.rings.length - 1; i >= 0; i -= 1) {
      state.rings[i].r += 90 * dt;
      if (state.rings[i].r >= state.rings[i].maxR) state.rings.splice(i, 1);
    }

    if (attract) {
      for (const guard of state.guards) {
        guard.suspicion = 0;
        const speedMul = 1;
        if (guard.pauseT > 0) {
          guard.pauseT -= dt;
        } else {
          const wp = tileCenter(guard.waypoints[guard.wpIndex][0], guard.waypoints[guard.wpIndex][1]);
          const dx = wp.x - guard.x;
          const dy = wp.y - guard.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 6) {
            guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
            guard.pauseT = GUARD.pauseAtWaypoint;
          } else if (dist > 0.01) {
            guard.dir = Math.atan2(dy, dx);
            const stepLen = Math.min(GUARD.patrolSpeed * speedMul * dt, dist);
            moveEntity(guard, (dx / dist) * stepLen, (dy / dist) * stepLen, GUARD.radius);
          }
        }
      }
      return events;
    }

    if (state.won || state.over) return events;
    state.levelTime += dt;

    const p = state.player;
    const dir = input.direction();
    p.stance = input.isSneaking() ? 'sneak' : input.isSprinting() ? 'sprint' : 'walk';
    const speed = p.stance === 'sneak' ? PLAYER.sneakSpeed : p.stance === 'sprint' ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
    p.moving = dir.x !== 0 || dir.y !== 0;
    if (p.moving) {
      p.dir = Math.atan2(dir.y, dir.x);
      const radius = p.stance === 'sneak' ? PLAYER.sneakRadius : PLAYER.radius;
      moveEntity(p, dir.x * speed * dt, dir.y * speed * dt, radius);
      p.stepPhase += speed * dt;
      if (p.stepPhase >= PLAYER.stepLength) {
        p.stepPhase = 0;
        // Creaky boards betray even a sneak: a step on them carries like a walk.
        const onCreaky = tileAtPx(state, p.x, p.y) === 'k';
        const noiseR = p.stance === 'sneak'
          ? (onCreaky ? NOISE.walkRadius : NOISE.sneakRadius)
          : p.stance === 'sprint' ? NOISE.sprintRadius : NOISE.walkRadius;
        makeNoise(p.x, p.y, noiseR, events);
        addRing(p.x, p.y, noiseR, onCreaky ? 'rgba(255, 154, 60, 0.5)' : 'rgba(238, 241, 245, 0.35)');
        p.justStepped = true;
      } else {
        p.justStepped = false;
      }
    } else {
      p.justStepped = false;
    }

    // Pebble toss: click a spot nearby to make noise there and pull a guard over.
    const pebble = pebbleAt || null;
    if (pebble && state.pebbles > 0) {
      if (Math.hypot(pebble.x - p.x, pebble.y - p.y) < 280) {
        state.pebbles -= 1;
        makeNoise(pebble.x, pebble.y, NOISE.pebbleRadius, events);
        toast(`Pebble tossed (${state.pebbles} left) — they heard that`);
        events |= EVENT_PEBBLE;
      }
    }

    // Loot: brushed past, pocketed.
    for (const item of state.loot) {
      if (item.taken) continue;
      const c = tileCenter(item.col, item.row);
      if (Math.hypot(c.x - p.x, c.y - p.y) < 26) {
        item.taken = true;
        state.lootTaken += 1;
        state.score += SCORES.loot;
        toast(`Loot pocketed +${SCORES.loot}`);
        events |= EVENT_LOOT;
        makeNoise(p.x, p.y, NOISE.pickupRadius, events);
      }
    }

    // The prize: press E beside it.
    const prizeC = tileCenter(state.prize.col, state.prize.row);
    p.nearPrize = !state.opalTaken && Math.hypot(prizeC.x - p.x, prizeC.y - p.y) < 42;
    if (p.nearPrize && actions & 16) {
      state.opalTaken = true;
      state.exitOpen = true;
      state.score += SCORES.opal;
      toast(`${state.level.prize} secured — reach the exit unseen!`);
      events |= EVENT_OPAL;
    }

    // The exit, once it is open.
    if (state.exitOpen) {
      const exitC = tileCenter(state.exit.col, state.exit.row);
      if (Math.hypot(exitC.x - p.x, exitC.y - p.y) < 26) {
        state.won = true;
        const timeBonus = Math.max(0, Math.floor((SCORES.timeParSeconds - state.levelTime) * SCORES.timeBonusPerSecond));
        const ghostBonus = state.ghost ? SCORES.ghostBonus : 0;
        const tryBonus = state.triesLeft * SCORES.tryBonus;
        state.score += timeBonus + ghostBonus + tryBonus;
        state.winBreakdown = { timeBonus, ghostBonus, tryBonus };
        events |= EVENT_WIN;
        return events;
      }
    }

    for (const guard of state.guards) {
      events = updateGuard(guard, dt, events);
      if (Math.hypot(guard.x - p.x, guard.y - p.y) < GUARD.catchDistance
        && (guard.state === 'alert' || guard.suspicion >= DETECTION.alertAt)) {
        state.triesLeft -= 1;
        state.ghost = false;
        events |= EVENT_CAUGHT;
        if (state.triesLeft <= 0) state.over = true;
        return events;
      }
    }
    return events;
  }

  reset(0, false);

  return {
    state,
    reset,
    respawn,
    step,
    tileAtPx,
    tileCenter,
    conePoints,
    inCone,
    hasLOS,
    toast,
    makeNoise,
  };
}
