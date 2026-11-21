// Every sound is synthesized with WebAudio: no audio files, no network.
// Footsteps are short filtered noise ticks; the guard's are lower, so you can
// tell whose feet you hear. Stings mark suspicion, alarm, pickup and the win.
export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let noiseBuffer = null;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      const len = Math.floor(ctx.sampleRate * 0.1);
      noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
      return true;
    } catch {
      return false;
    }
  }

  function unlock() {
    if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = 0) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, filterFreq, vol, pan, when = 0) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      src.connect(filter);
      filter.connect(gain);
      gain.connect(panner);
      panner.connect(master);
    } else {
      src.connect(filter);
      filter.connect(gain);
      gain.connect(master);
    }
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  return {
    unlock,
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    /** A footstep: pan -1..1 by screen side, volume by closeness. Guard steps are lower. */
    footstep(pan, vol, guard) {
      noise(0.07, guard ? 420 : 700, vol, pan);
    },
    suspicious() {
      tone(392, 0.16, 'triangle', 0.16);
      tone(311, 0.22, 'triangle', 0.16, 0.14);
    },
    alert() {
      tone(220, 0.14, 'sawtooth', 0.12);
      tone(277, 0.14, 'sawtooth', 0.12, 0.12);
      tone(370, 0.3, 'sawtooth', 0.14, 0.24);
    },
    nearMiss() {
      tone(98, 0.25, 'sine', 0.22, 0, 65);
    },
    pickup() {
      tone(880, 0.1, 'sine', 0.14);
      tone(1318, 0.16, 'sine', 0.12, 0.07);
    },
    opal() {
      tone(659, 0.12, 'sine', 0.15);
      tone(988, 0.12, 'sine', 0.15, 0.09);
      tone(1318, 0.24, 'sine', 0.15, 0.18);
    },
    caught() {
      tone(330, 0.2, 'sawtooth', 0.14, 0, 110);
      tone(220, 0.35, 'sawtooth', 0.12, 0.16, 70);
    },
    win() {
      tone(523, 0.14, 'triangle', 0.16);
      tone(659, 0.14, 'triangle', 0.16, 0.12);
      tone(784, 0.14, 'triangle', 0.16, 0.24);
      tone(1046, 0.32, 'triangle', 0.18, 0.36);
    },
    pebble() {
      noise(0.05, 1400, 0.12, 0);
    },
  };
}
