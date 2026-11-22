// Keyboard and mouse, read once per frame. Movement keys give a direction;
// action keys are edge-triggered and taken once (takeActions clears them).
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;
export const ACTION_INTERACT = 16;
export const ACTION_PEBBLE = 32;
export const ACTION_NOTES = 64;

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
};

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let pebbleAt = null;
  let sneakHeld = false;
  let sprintHeld = false;

  function onKeyDown(event) {
    if (event.repeat) return;
    const dir = KEYMAP[event.code];
    if (dir) {
      held.add(dir);
      event.preventDefault();
      return;
    }
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') sneakHeld = true;
    else if (event.code === 'Space') { sprintHeld = true; event.preventDefault(); }
    else if (event.code === 'Enter') actions |= ACTION_CONFIRM;
    else if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    else if (event.code === 'KeyR') actions |= ACTION_RESTART;
    else if (event.code === 'KeyM') actions |= ACTION_MUTE;
    else if (event.code === 'KeyE') actions |= ACTION_INTERACT;
    else if (event.code === 'KeyH') actions |= ACTION_NOTES;
  }

  function onKeyUp(event) {
    const dir = KEYMAP[event.code];
    if (dir) held.delete(dir);
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') sneakHeld = false;
    if (event.code === 'Space') sprintHeld = false;
  }

  function onMouseDown(event) {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    if (event.button === 0) {
      pebbleAt = { x, y };
      actions |= ACTION_PEBBLE;
    }
    actions |= ACTION_CONFIRM;
  }

  function onBlur() {
    held.clear();
    sneakHeld = false;
    sprintHeld = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('blur', onBlur);

  return {
    direction() {
      let x = 0;
      let y = 0;
      if (held.has('left')) x -= 1;
      if (held.has('right')) x += 1;
      if (held.has('up')) y -= 1;
      if (held.has('down')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.sqrt(2);
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    isSneaking() {
      return sneakHeld;
    },
    isSprinting() {
      return sprintHeld && !sneakHeld;
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takePebble() {
      const at = pebbleAt;
      pebbleAt = null;
      return at;
    },
  };
}
