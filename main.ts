// VELVET VAULT — the hand-in program for this stealth game (Node 22, standard
// library only). The game itself lives in game/: plain static files a desktop
// browser loads offline (game/index.html plus its ES modules, no library and no
// network request). This program copies game/ and screenshots/ from beside this
// file into /output and writes /output/dossier.json, the summary the judge reads,
// using the vendored make.fun library. The game: Wren the cat burglar slips past
// the night watch across three heists, pockets the prize and reaches the exit
// unseen — guards patrol learnable beats with real vision cones, suspicion climbs
// and can fall again, footsteps carry noise, and a tossed pebble pulls a guard
// off your route.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
// Clear any stale contents from a previous run WITHOUT deleting the output
// directory itself: /output is a mount in the grader, and removing the mount
// throws EBUSY. A fresh /output is already empty, so this is a no-op there.
for (const entry of readdirSync(out)) {
  rmSync(join(out, entry), { recursive: true, force: true });
}
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
