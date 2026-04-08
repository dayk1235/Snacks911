/**
 * Singleton sound engine using Web Audio API.
 * All functions safely no-op if audio hasn't been initialized or is disabled.
 */

interface AudioState {
  ctx: AudioContext | null;
  ambientGain: GainNode | null;
  ambientOscs: OscillatorNode[];
  enabled: boolean;
}

const state: AudioState = {
  ctx: null,
  ambientGain: null,
  ambientOscs: [],
  enabled: false,
};

export const initAudio = (): void => {
  if (state.ctx) return;
  const Ctx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  state.ctx = new Ctx();
};

export const isSoundEnabled = (): boolean => state.enabled;

export const toggleSound = (): boolean => {
  if (!state.ctx) initAudio();
  state.enabled = !state.enabled;
  state.enabled ? startAmbient() : stopAmbient();
  return state.enabled;
};

/** Soft high pitch blip — very subtle hover feedback */
export const playHover = (): void => {
  if (!state.enabled || !state.ctx) return;
  const ctx = state.ctx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(900, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.09);
  gain.gain.setValueAtTime(0.022, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.14);
};

/** Short triangle-wave click tap */
export const playClick = (): void => {
  if (!state.enabled || !state.ctx) return;
  const ctx = state.ctx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(440, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.07);
  gain.gain.setValueAtTime(0.055, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.11);
};

/** Deep ambient drone (two oscillators a perfect 5th apart) */
const startAmbient = (): void => {
  if (!state.ctx) return;
  stopAmbient();
  const ctx = state.ctx;

  const o1 = ctx.createOscillator();
  const o2 = ctx.createOscillator();
  const gn = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  o1.type = 'sine';
  o1.frequency.value = 55; // A1
  o2.type = 'sine';
  o2.frequency.value = 82.4; // E2 — perfect 5th above

  filter.type = 'lowpass';
  filter.frequency.value = 180;

  gn.gain.setValueAtTime(0, ctx.currentTime);
  gn.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 1.8);

  o1.connect(filter);
  o2.connect(filter);
  filter.connect(gn);
  gn.connect(ctx.destination);

  o1.start();
  o2.start();

  state.ambientGain = gn;
  state.ambientOscs = [o1, o2];
};

const stopAmbient = (): void => {
  if (!state.ctx || !state.ambientGain) return;
  const ctx = state.ctx;
  state.ambientGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
  const oscs = state.ambientOscs;
  setTimeout(() => {
    oscs.forEach((o) => {
      try {
        o.stop();
      } catch {
        // already stopped
      }
    });
  }, 700);
  state.ambientGain = null;
  state.ambientOscs = [];
};
