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
  coneRange: 200,
  coneHalfAngle: 0.62,
  pauseAtWaypoint: 1.4,
  lookAroundTime: 2.6,
  catchDistance: 26,
};

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
  floorLitA: '#3b2f24',
  floorLitB: '#423627',
  floorShadowA: '#202839',
  floorShadowB: '#242e42',
  wall: '#151923',
  wallTop: '#333b4f',
  crate: '#6b4f2a',
  crateEdge: '#8a6a3c',
  plantPot: '#4a2f22',
  plantLeaf: '#2f6b3a',
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
