// Everything the eye sees: the floor and its shadows, the lamps' warm pools,
// the guards' cones hugging the walls, the HUD, and every screen. The cone is
// a real fan of rays, so it bends around crates exactly as the guard's sight does.
import {
  COLS, FIELD_H, FIELD_W, FIELD_X, FIELD_Y, GUARD, HUD_H, PALETTE, ROWS, TILE,
} from './config.js';
import { tileCenter } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_INTRO = 'intro';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_LEVEL_CLEAR = 'clear';
export const SCREEN_OVER = 'over';
export const SCREEN_FINAL = 'final';

function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function coneColor(guard) {
  if (guard.state === 'alert') return PALETTE.coneAlert;
  if (guard.state === 'suspicious' || guard.state === 'search') return PALETTE.coneSuspicious;
  return PALETTE.coneCalm;
}

function coneAlpha(guard) {
  if (guard.state === 'alert') return 0.38;
  if (guard.state === 'suspicious' || guard.state === 'search') return 0.3;
  return 0.2;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function drawFloor(state) {
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const ch = state.tiles[row][col];
        const x = FIELD_X + col * TILE;
        const y = FIELD_Y + row * TILE;
        if (ch === '#') {
          ctx.fillStyle = PALETTE.wall;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = PALETTE.wallTop;
          ctx.fillRect(x, y, TILE, 3);
          continue;
        }
        const shadow = ch === ',';
        const alt = (col + row) % 2 === 0;
        ctx.fillStyle = shadow
          ? alt ? PALETTE.floorShadowA : PALETTE.floorShadowB
          : alt ? PALETTE.floorLitA : PALETTE.floorLitB;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(x, y + TILE - 2, TILE, 2);
        ctx.fillRect(x + TILE - 2, y, 2, TILE);
      }
    }
  }

  function drawLampGlow(state) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const lamp of state.lamps) {
      const c = tileCenter(lamp.col, lamp.row);
      const pulse = 0.10 + 0.03 * Math.sin(state.time * 2 + lamp.col);
      const g = ctx.createRadialGradient(c.x, c.y, 8, c.x, c.y, 150);
      g.addColorStop(0, `rgba(255, 184, 92, ${pulse + 0.12})`);
      g.addColorStop(1, 'rgba(255, 184, 92, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 150, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCover(state) {
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const ch = state.tiles[row][col];
        const x = FIELD_X + col * TILE;
        const y = FIELD_Y + row * TILE;
        if (ch === 'C') {
          ctx.fillStyle = PALETTE.crate;
          ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
          ctx.strokeStyle = PALETTE.crateEdge;
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
          ctx.beginPath();
          ctx.moveTo(x + 4, y + 4);
          ctx.lineTo(x + TILE - 4, y + TILE - 4);
          ctx.moveTo(x + TILE - 4, y + 4);
          ctx.lineTo(x + 4, y + TILE - 4);
          ctx.stroke();
        } else if (ch === 'P') {
          ctx.fillStyle = PALETTE.plantPot;
          ctx.fillRect(x + 12, y + 26, TILE - 24, 14);
          ctx.fillStyle = PALETTE.plantLeaf;
          ctx.beginPath();
          ctx.arc(x + 16, y + 18, 10, 0, Math.PI * 2);
          ctx.arc(x + 32, y + 14, 11, 0, Math.PI * 2);
          ctx.arc(x + 24, y + 26, 9, 0, Math.PI * 2);
          ctx.fill();
        } else if (ch === '=') {
          ctx.fillStyle = PALETTE.caseFrame;
          ctx.fillRect(x + 3, y + 6, TILE - 6, TILE - 12);
          ctx.fillStyle = 'rgba(127, 184, 201, 0.35)';
          ctx.fillRect(x + 7, y + 10, TILE - 14, TILE - 20);
          ctx.strokeStyle = 'rgba(238, 241, 245, 0.5)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x + 10, y + TILE - 10);
          ctx.lineTo(x + TILE - 14, y + 12);
          ctx.stroke();
        } else if (ch === 'L') {
          ctx.fillStyle = '#3a2c18';
          ctx.beginPath();
          ctx.arc(x + TILE / 2, y + TILE / 2, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = PALETTE.lampGlow;
          ctx.beginPath();
          ctx.arc(x + TILE / 2, y + TILE / 2, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff3d6';
          ctx.beginPath();
          ctx.arc(x + TILE / 2, y + TILE / 2, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function drawExit(state) {
    const c = tileCenter(state.exit.col, state.exit.row);
    const x = FIELD_X + state.exit.col * TILE;
    const y = FIELD_Y + state.exit.row * TILE;
    ctx.save();
    if (state.exitOpen) {
      const g = ctx.createRadialGradient(c.x, c.y, 4, c.x, c.y, 60);
      g.addColorStop(0, 'rgba(57, 217, 138, 0.5)');
      g.addColorStop(1, 'rgba(57, 217, 138, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.exitOpen;
      ctx.fillRect(x + 6, y + 4, TILE - 12, TILE - 8);
      ctx.fillStyle = '#0d0f14';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('EXIT', c.x, c.y + 4);
    } else {
      ctx.fillStyle = '#241a1a';
      ctx.fillRect(x + 6, y + 4, TILE - 12, TILE - 8);
      ctx.strokeStyle = PALETTE.exitLocked;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 6, y + 4, TILE - 12, TILE - 8);
      ctx.fillStyle = PALETTE.exitLocked;
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LOCKED', c.x, c.y + 4);
    }
    ctx.restore();
  }

  function drawPrizeAndLoot(state) {
    if (!state.opalTaken) {
      const c = tileCenter(state.prize.col, state.prize.row);
      const pulse = 0.5 + 0.3 * Math.sin(state.time * 3);
      ctx.save();
      const g = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, 46);
      g.addColorStop(0, `rgba(127, 231, 242, ${pulse})`);
      g.addColorStop(1, 'rgba(127, 231, 242, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.opal;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y - 13);
      ctx.lineTo(c.x + 10, c.y);
      ctx.lineTo(c.x, c.y + 13);
      ctx.lineTo(c.x - 10, c.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(c.x, c.y - 6);
      ctx.lineTo(c.x + 4, c.y);
      ctx.lineTo(c.x, c.y + 6);
      ctx.lineTo(c.x - 4, c.y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    for (const item of state.loot) {
      if (item.taken) continue;
      const c = tileCenter(item.col, item.row);
      ctx.save();
      ctx.fillStyle = PALETTE.gold;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y - 8);
      ctx.lineTo(c.x + 7, c.y);
      ctx.lineTo(c.x, c.y + 8);
      ctx.lineTo(c.x - 7, c.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(c.x - 4, c.y + 4);
      ctx.lineTo(c.x + 4, c.y - 4);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawPatrolPaths(state) {
    ctx.save();
    ctx.setLineDash([2, 7]);
    ctx.lineWidth = 2;
    for (const guard of state.guards) {
      if (guard.state !== 'patrol' && guard.state !== 'return') continue;
      ctx.strokeStyle = 'rgba(238, 241, 245, 0.22)';
      ctx.fillStyle = 'rgba(238, 241, 245, 0.3)';
      ctx.beginPath();
      guard.waypoints.forEach(([col, row], i) => {
        const c = tileCenter(col, row);
        if (i === 0) ctx.moveTo(c.x, c.y);
        else ctx.lineTo(c.x, c.y);
      });
      ctx.closePath();
      ctx.stroke();
      for (const [col, row] of guard.waypoints) {
        const c = tileCenter(col, row);
        ctx.beginPath();
        ctx.arc(c.x, c.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawCones(state, conePoints) {
    ctx.save();
    for (const guard of state.guards) {
      const points = conePoints(guard);
      ctx.fillStyle = coneColor(guard);
      ctx.globalAlpha = coneAlpha(guard);
      ctx.beginPath();
      ctx.moveTo(guard.x, guard.y);
      for (const pt of points) ctx.lineTo(pt.x, pt.y);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = coneAlpha(guard) + 0.25;
      ctx.strokeStyle = coneColor(guard);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(guard.x, guard.y);
      ctx.lineTo(points[0].x, points[0].y);
      ctx.moveTo(guard.x, guard.y);
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawGuards(state) {
    for (const guard of state.guards) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(guard.x, guard.y + 10, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.guard;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PALETTE.guardDark;
      ctx.lineWidth = 2;
      ctx.stroke();
      // Facing tick and helmet shine.
      ctx.strokeStyle = '#f5d7d2';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(guard.x + Math.cos(guard.dir) * 6, guard.y + Math.sin(guard.dir) * 6);
      ctx.lineTo(guard.x + Math.cos(guard.dir) * 14, guard.y + Math.sin(guard.dir) * 14);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.arc(guard.x - 4, guard.y - 5, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Suspicion arc over the head.
      if (guard.suspicion > 2) {
        ctx.strokeStyle = guard.suspicion >= 75 ? PALETTE.danger : PALETTE.gold;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(guard.x, guard.y, 18, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * guard.suspicion) / 100);
        ctx.stroke();
      }
      // ? when curious, ! when chasing.
      if (guard.state === 'suspicious' || guard.state === 'search') {
        ctx.fillStyle = PALETTE.gold;
        ctx.font = 'bold 20px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('?', guard.x, guard.y - 22);
      } else if (guard.state === 'alert') {
        ctx.fillStyle = PALETTE.danger;
        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', guard.x, guard.y - 22);
      }
      ctx.restore();
    }
  }

  function drawPlayer(state) {
    const p = state.player;
    if (!p) return;
    ctx.save();
    const r = p.stance === 'sneak' ? 10 : 12;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 9, 11, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // A faint ring when standing in shadow: the dark is working for you.
    const tile = state.tiles[Math.floor((p.y - FIELD_Y) / TILE)]?.[Math.floor((p.x - FIELD_X) / TILE)];
    if (tile === ',') {
      ctx.strokeStyle = 'rgba(127, 184, 201, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = p.stance === 'sneak' ? PALETTE.tealDark : PALETTE.teal;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0d3b37';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Hood point in the facing direction.
    ctx.fillStyle = p.stance === 'sneak' ? PALETTE.tealDark : PALETTE.teal;
    ctx.beginPath();
    ctx.moveTo(p.x + Math.cos(p.dir) * r * 0.4, p.y + Math.sin(p.dir) * r * 0.4);
    ctx.lineTo(p.x + Math.cos(p.dir - 0.5) * (r + 5), p.y + Math.sin(p.dir - 0.5) * (r + 5));
    ctx.lineTo(p.x + Math.cos(p.dir + 0.5) * (r + 5), p.y + Math.sin(p.dir + 0.5) * (r + 5));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#0d0f14';
    ctx.beginPath();
    ctx.arc(p.x + Math.cos(p.dir) * 4, p.y + Math.sin(p.dir) * 4, 2.5, 0, Math.PI * 2);
    ctx.fill();
    if (p.stance === 'sprint') {
      ctx.strokeStyle = 'rgba(238, 241, 245, 0.5)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 2; i += 1) {
        const bx = p.x - Math.cos(p.dir) * (r + 6 + i * 6);
        const by = p.y - Math.sin(p.dir) * (r + 6 + i * 6);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx - Math.cos(p.dir) * 8, by - Math.sin(p.dir) * 8);
        ctx.stroke();
      }
    }
    ctx.restore();
    if (p.nearPrize) {
      ctx.save();
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Press E — take the ${state.level.prize}`, p.x, p.y - 26);
      ctx.restore();
    }
  }

  function drawRings(state) {
    ctx.save();
    for (const ring of state.rings) {
      const a = Math.max(0, 1 - ring.r / ring.maxR);
      ctx.strokeStyle = ring.color.replace(/[\d.]+\)$/, `${(a * 0.8).toFixed(2)})`);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawToasts(state) {
    ctx.save();
    ctx.textAlign = 'center';
    let y = HUD_H + 22;
    for (const m of state.messages) {
      ctx.globalAlpha = Math.min(1, m.ttl);
      ctx.font = 'bold 14px system-ui, sans-serif';
      const w = ctx.measureText(m.text).width + 24;
      ctx.fillStyle = 'rgba(13, 15, 20, 0.85)';
      ctx.fillRect(FIELD_W / 2 + FIELD_X - w / 2, y - 16, w, 24);
      ctx.fillStyle = PALETTE.text;
      ctx.fillText(m.text, FIELD_W / 2 + FIELD_X, y + 1);
      y += 28;
    }
    ctx.restore();
  }

  function drawHUD(state) {
    ctx.save();
    ctx.fillStyle = PALETTE.hud;
    ctx.fillRect(0, 0, FIELD_W + 2 * FIELD_X, HUD_H);
    ctx.fillStyle = PALETTE.hudLine;
    ctx.fillRect(0, HUD_H, FIELD_W + 2 * FIELD_X, 2);
    ctx.textBaseline = 'middle';
    // Left: level and objective.
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`LEVEL ${state.levelIndex + 1} · ${state.level.name}`, 16, 15);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '12px system-ui, sans-serif';
    const objective = state.opalTaken ? 'Reach the exit — unseen' : `Steal the ${state.level.prize}, then reach the exit`;
    ctx.fillText(objective, 16, 34);
    // Centre: how seen you are.
    const maxSuspicion = state.guards.reduce((m, g) => Math.max(m, g.suspicion), 0);
    const cx = 640;
    ctx.fillStyle = PALETTE.muted;
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('SEEN', cx - 100, 24);
    ctx.fillStyle = '#0d0f14';
    ctx.fillRect(cx - 92, 16, 184, 14);
    ctx.fillStyle = maxSuspicion >= 75 ? PALETTE.danger : maxSuspicion >= 35 ? '#ff9a3c' : PALETTE.gold;
    ctx.fillRect(cx - 92, 16, 184 * (maxSuspicion / 100), 14);
    ctx.strokeStyle = PALETTE.hudLine;
    ctx.strokeRect(cx - 92, 16, 184, 14);
    // Right: alarm pips, loot, time, tries, pebbles, ghost.
    ctx.textAlign = 'right';
    let x = 1264;
    ctx.fillStyle = PALETTE.muted;
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText('ALARM', x - 52, 15);
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = i < state.alarm ? PALETTE.danger : '#2a3040';
      ctx.beginPath();
      ctx.arc(x - 44 + i * 16, 15, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.text;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`◆ ${state.lootTaken}/${state.lootTotal}`, x, 34);
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(`TIME ${fmtTime(state.levelTime)}`, x - 90, 34);
    ctx.fillText(`TRIES ${state.triesLeft}`, x - 190, 34);
    ctx.fillText(`PEBBLES ${state.pebbles}`, x - 280, 34);
    if (state.alarm === 0 && !state.won) {
      ctx.fillStyle = PALETTE.ok;
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText('GHOST', x - 380, 34);
    }
    ctx.restore();
  }

  function panel(title, lines, footnote) {
    ctx.save();
    ctx.fillStyle = 'rgba(13, 15, 20, 0.82)';
    ctx.fillRect(0, 0, FIELD_W + 2 * FIELD_X, FIELD_H + FIELD_Y + 40);
    const w = 640;
    const h = 120 + lines.length * 30;
    const x = (FIELD_W + 2 * FIELD_X - w) / 2;
    const y = (FIELD_H + FIELD_Y + 40 - h) / 2;
    ctx.fillStyle = PALETTE.hud;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillText(title, 640, y + 52);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '15px system-ui, sans-serif';
    lines.forEach((line, i) => {
      ctx.fillText(line, 640, y + 92 + i * 30);
    });
    if (footnote) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText(footnote, 640, y + h - 24);
    }
    ctx.restore();
  }

  function drawField(state, conePoints) {
    drawFloor(state);
    drawLampGlow(state);
    drawCover(state);
    drawExit(state);
    drawPrizeAndLoot(state);
    drawPatrolPaths(state);
    drawCones(state, conePoints);
    drawGuards(state);
    drawPlayer(state);
    drawRings(state);
  }

  function draw(state, screen, best, conePoints) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.strokeStyle = '#1c2130';
    ctx.lineWidth = 2;
    ctx.strokeRect(FIELD_X - 2, FIELD_Y - 2, FIELD_W + 4, FIELD_H + 4);
    ctx.restore();

    if (screen === SCREEN_TITLE) {
      drawField(state, conePoints);
      panel('VELVET VAULT', [
        'A stealth game in three heists. You are Wren, a cat burglar.',
        'Slip past the night watch, pocket the prize, leave unseen.',
        'WASD / arrows — move    SHIFT — sneak    SPACE — sprint',
        'E — take the prize    CLICK — toss a pebble    P — pause    M — mute',
      ], 'ENTER or CLICK to play · best score ' + best);
      return;
    }
    drawField(state, conePoints);
    drawHUD(state);
    drawToasts(state);
    if (screen === SCREEN_INTRO) {
      panel(state.level.name, [
        state.level.subtitle,
        `Prize: ${state.level.prize} · Guards: ${state.guards.length} · Loot: ${state.lootTotal}`,
        'Shadow hides you. Crates block their sight. Pebbles pull them away.',
      ], 'ENTER to begin the heist');
    } else if (screen === SCREEN_PAUSED) {
      panel('PAUSED', ['The watch waits for no one. Except now.'], 'P to resume · R to restart the level');
    } else if (screen === SCREEN_LEVEL_CLEAR) {
      const b = state.winBreakdown || { timeBonus: 0, ghostBonus: 0, tryBonus: 0 };
      panel('LEVEL CLEAR — UNSEEN', [
        `Time bonus  +${b.timeBonus}`,
        state.ghost ? `GHOST bonus  +${b.ghostBonus}  (alarm never rose)` : 'Ghost bonus  +0  (the alarm rose)',
        `Nerve bonus  +${b.tryBonus}`,
        `Score  ${state.score}`,
      ], state.levelIndex + 1 < 3 ? 'ENTER — the next heist' : 'ENTER — the final tally');
    } else if (screen === SCREEN_OVER) {
      panel('CAUGHT', [
        'The watch found you, and the night is over.',
        `Score  ${state.score} · Best  ${best}`,
      ], 'ENTER — try the night again');
    } else if (screen === SCREEN_FINAL) {
      panel('THE VAULT IS YOURS', [
        'Three heists, three prizes, one shadow that never got caught.',
        `Final score  ${state.score} · Best  ${best}`,
      ], 'ENTER — play the night again');
    }
    // Vignette.
    ctx.save();
    const g = ctx.createRadialGradient(640, 360, 320, 640, 360, 760);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  return { draw };
}
