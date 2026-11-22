// VELVET VAULT — tuning numbers, colours and layout in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.
export const STEP = 1 / 60;
export const TILE = 48;
export const COLS = 26;
export const ROWS = 13;
export const FIELD_X = 16;
export const FIELD_Y = 56;
export const FIELD_W = COLS * TILE;
export const FIELD_H = ROWS * TILE;
export const HUD_H = 48;

export const PLAYER = {
  radius: 12,
  sneakRadius: 10,
  walkSpeed: 168,
  sneakSpeed: 96,
  sprintSpeed: 252,
  stepLength: 34,
};

export const GUARD = {
  radius: 13,
  patrolSpeed: 62,
  suspiciousSpeed: 88,
  alertSpeed: 138,
  searchSpeed: 82,
  returnSpeed: 96,
  coneRange: 260,
  coneHalfAngle: 0.60,
  pauseShort: 1.0,
  pauseLong: 2.0,
  lookAroundTime: 2.6,
  catchDistance: 26,
};

// Waypoints alternate a short and a long linger, so the beat is learnable
// but not metronomic; the badge on each waypoint shows its own linger.
export function lingerSeconds(index) {
  return index % 2 === 0 ? GUARD.pauseShort : GUARD.pauseLong;
}

export const DETECTION = {
  basePerSecond: 62,
  decayPerSecond: 30,
  suspiciousAt: 35,
  alertAt: 75,
  nearMissPeak: 50,
  nearMissFloor: 20,
  closeDistance: 70,
  closeFactor: 1.6,
  farFactor: 0.55,
  litFactor: 1.25,
  shadowFactor: 0.5,
  sneakFactor: 0.55,
  sprintFactor: 1.45,
  alarmSpeedBonus: 0.12,
  alarmRangeBonus: 10,
  alarmRateBonus: 0.15,
};

export const NOISE = {
  walkRadius: 46,
  sneakRadius: 14,
  sprintRadius: 120,
  pebbleRadius: 95,
  pickupRadius: 55,
};

export const TRIES_PER_LEVEL = 3;
export const MAX_ALARM = 3;
export const PEBBLES_PER_LEVEL = 5;

export const SCORES = {
  loot: 150,
  opal: 400,
  ghostBonus: 500,
  tryBonus: 200,
  timeParSeconds: 90,
  timeBonusPerSecond: 5,
};

export const PALETTE = {
  backdrop: '#0d0f14',
  hud: '#141821',
  hudLine: '#2a3040',
  text: '#eef1f5',
  muted: '#9aa3b2',
  gold: '#f2c94c',
  teal: '#2ec4b6',
  tealDark: '#1d8a80',
  guard: '#c0392b',
  guardDark: '#7e241b',
  floorLitA: '#52402a',
  floorLitB: '#5a472f',
  floorShadowA: '#1a2030',
  floorShadowB: '#1e2636',
  floorPlank: 'rgba(0,0,0,0.22)',
  floorStone: 'rgba(255,255,255,0.045)',
  wall: '#171b28',
  wallTop: '#39415a',
  wallBrick: 'rgba(0,0,0,0.35)',
  crate: '#6b4f2a',
  crateEdge: '#8a6a3c',
  plantPot: '#4a2f22',
  plantLeaf: '#2f6b3a',
  fernLeaf: '#3f8f4f',
  fernDark: '#2c6b3a',
  shelfFrame: '#3d2b1a',
  shelfBack: '#241a10',
  caseFrame: '#2e4a5a',
  caseGlass: '#7fb8c9',
  lampGlow: '#ffb85c',
  coneCalm: '#ffd76a',
  coneSuspicious: '#ff9a3c',
  coneAlert: '#ff4b4b',
  exitLocked: '#c0392b',
  exitOpen: '#39d98a',
  opal: '#7fe7f2',
  danger: '#ff5a4e',
  ok: '#39d98a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const BEST_KEY = 'velvet-vault.best';
