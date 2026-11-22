// The three heists. Each map is 26x13 tiles; the legend:
//   # wall   . lamplit floor   , shadow floor   C crate (tall cover)
//   P plant (cover)   = low display case (hides a sneaking player only)
//   B bookshelf (tall cover, blocks sight)   F fern thicket (hides a sneaking
//   player from a distance)   k loose floorboards (creak at any pace)
//   L hanging lamp (lit floor)   D exit door   O the night's prize
//   * optional loot   S player start
// Guards patrol fixed waypoints, pausing at each: a patrol you can learn.
import { COLS, ROWS } from './config.js';

export const LEVELS = [
  {
    name: 'THE HALCYON GALLERY',
    subtitle: 'Three night guards, one lamplit hall. Learn their beats, then cross it.',
    prize: 'MOON OPAL',
    map: [
      '##########################',
      '#BBBB,,,#........#,,,CO,,#',
      '#,*,,,,,#..C.L...#,F,F,,,#',
      '#,,,,,,,#....F...#,,,,,F,#',
      '#,,C,,,,#........#,,,,,,,#',
      '#,,,,,,,...=.C...#,,F,,,,#',
      '#,,,,,,,#.....*..#,,,,,,,#',
      '#,,P,,,,#..C..k..#,,,,*,,#',
      '#,,,,,,,#....k...#,,C,,,,#',
      '#,,,,,,,#...=..F..,,,,,,,#',
      '#,S,,,,,#..=.L...#,F,,,,D#',
      '#,,,P,C,#........#,,,,,,,#',
      '##########################',
    ],
    guards: [
      { waypoints: [[10, 2], [15, 2], [15, 6], [10, 6]] },
      { waypoints: [[19, 3], [23, 7], [19, 7]] },
      { waypoints: [[2, 4], [6, 9], [2, 9]] },
    ],
  },
  {
    name: 'THE SUN COURT',
    subtitle: 'Two guards cross the court. The lit middle is fast; the dark edge is safe.',
    prize: 'SUN DIAL',
    map: [
      '##########################',
      '#,,,,,,,,,,,,,,,,,,,,,,,,#',
      '#,,,,#....L....O..#,,,,,,#',
      '#,,,,#..C......C..#,,*,,,#',
      '#,,,,#............#,,,,,,#',
      '#,,,,#..=......=..#,,,,,,#',
      '#,,,,,,,,....*.......,,,,#',
      '#,,,,#............#,,P,,*#',
      '#,,,,#..C......C..#,,,,,,#',
      '#,,,,#............,,,,,,,#',
      '#,S,,#....*..L....#,,,D,,#',
      '#,,,,,,,,,,,,,,,,,,,,,,,,#',
      '##########################',
    ],
    guards: [
      { waypoints: [[6, 4], [17, 4]] },
      { waypoints: [[13, 2], [13, 10]] },
    ],
  },
  {
    name: 'THE JADE VAULT',
    subtitle: 'Three guards, three open lanes. Patience is the only key.',
    prize: 'JADE FOX',
    map: [
      '##########################',
      '#,,,,,,#,,,,,,,,,,#,,,,,,#',
      '#,S,,,,#,,,,O,,,,,#,,*,,,#',
      '#,,,,,,,,,,,,,,,,,,,,,,,,#',
      '#,,,,,,#..C....C..#,,,,,,#',
      '#,,,,,,#....L.....#,,P,,,#',
      '#,,,,,,,,,,,*,,,,,,,,,,,,#',
      '#,,,,,,#..=...=.L.#,,,,,,#',
      '#,,,,,,#..C....C..#,,*,,,#',
      '#,,,,,,,,,,,,,,,,,,,,,,,,#',
      '#,,,,,,#,,,,,,,,,,#,,D,,,#',
      '#,,,,,,#,,,,,,,,,,#,,,,,,#',
      '##########################',
    ],
    guards: [
      { waypoints: [[2, 3], [23, 3]] },
      { waypoints: [[2, 9], [23, 9]] },
      { waypoints: [[12, 4], [12, 8]] },
    ],
  },
];

/** Parse one level map into tiles, entities and lamp positions. */
export function parseLevel(def) {
  const tiles = [];
  const lamps = [];
  let start = null;
  let prize = null;
  let exit = null;
  let loot = [];
  for (let row = 0; row < ROWS; row += 1) {
    tiles.push([]);
    for (let col = 0; col < COLS; col += 1) {
      const ch = def.map[row][col];
      tiles[row].push(ch);
      if (ch === 'S') start = { col, row };
      if (ch === 'O') prize = { col, row };
      if (ch === 'D') exit = { col, row };
      if (ch === '*') loot.push({ col, row, taken: false });
      if (ch === 'L') lamps.push({ col, row });
    }
  }
  return { tiles, lamps, start, prize, exit, loot };
}

export function isWallTile(ch) {
  return ch === '#';
}

/** A tile blocks movement (walls, crates, plants, display cases, bookshelves, a locked door). */
export function blocksMove(ch, exitOpen) {
  if (ch === '#') return true;
  if (ch === 'C' || ch === 'P' || ch === '=' || ch === 'B') return true;
  if (ch === 'D') return !exitOpen;
  return false;
}

/** A tile blocks a guard's line of sight. Low cases hide only a sneaking player. */
export function blocksSight(ch, playerSneaking) {
  if (ch === '#' || ch === 'C' || ch === 'P' || ch === 'B') return true;
  if ((ch === '=' || ch === 'F') && playerSneaking) return true;
  return false;
}

export function isShadowTile(ch) {
  return ch === ',';
}
