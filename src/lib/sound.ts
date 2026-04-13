/**
 * Singleton sound engine using Web Audio API.
 * All functions safely no-op if audio hasn't been initialized or is disabled.
 */

interface AudioState {
  ctx: AudioContext | null;
  ambientGain: GainNode | null;
  ambientOscs: OscillatorNode[];
  enabled: boolean;
  popEnabled: boolean; // always-on subtle pop
}

const state: AudioState = {
  ctx: null,
  ambientGain: null,
  ambientOscs: [],
  enabled: false,
  popEnabled: true,
};

let ambientStopTimeout: ReturnType<typeof setTimeout> | null = null;
let orderLoopAudio: HTMLAudioElement | null = null;
let orderLoopActive = false;

export const initAudio = (): void => {
  if (state.ctx) return;
  const Ctx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  state.ctx = new Ctx();
};

/** Ensures AudioContext is running (must be called from a user gesture) */
const ensureCtx = (): AudioContext | null => {
  if (!state.ctx) initAudio();
  if (state.ctx?.state === 'suspended') state.ctx.resume();
  return state.ctx;
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

/**
 * Always-on subtle pop sound for button clicks.
 * Very gentle and warm — like a soft "toc" sound.
 * Designed to be pleasant and not annoying even after hundreds of clicks.
 */
export const playButtonPop = (): void => {
  if (!state.popEnabled) return;
  const ctx = ensureCtx();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Warm sine pop — very soft
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(520, now);
  osc.frequency.exponentialRampToValueAtTime(280, now + 0.06);

  // Very subtle volume — barely perceptible but satisfying
  gain.gain.setValueAtTime(0.018, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.1);

  // Tiny harmonic overtone for warmth
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1040, now);
  osc2.frequency.exponentialRampToValueAtTime(560, now + 0.04);
  gain2.gain.setValueAtTime(0.006, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now);
  osc2.stop(now + 0.06);
};

/**
 * Sets up global click listener so ALL buttons/links produce a subtle pop.
 * Call once from the main page component.
 */
export const initGlobalButtonPop = (): (() => void) => {
  const handler = (e: MouseEvent) => {
    const target = e.target as Element;
    if (target.closest('button, a, [data-cursor-hover], [role="button"]')) {
      playButtonPop();
    }
  };
  document.addEventListener('click', handler, { passive: true });
  return () => document.removeEventListener('click', handler);
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

  // Cancel any pending stop timeout to prevent stacking
  if (ambientStopTimeout) clearTimeout(ambientStopTimeout);

  state.ambientGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
  const oscs = state.ambientOscs;
  ambientStopTimeout = setTimeout(() => {
    oscs.forEach((o) => {
      try { o.stop(); } catch { /* already stopped */ }
    });
    ambientStopTimeout = null;
  }, 700);
  state.ambientGain = null;
  state.ambientOscs = [];
};

/**
 * POS-style order notification sound.
 * Two-tone chime: bright then warm. Plays once, no loop.
 * Works even if global sound is disabled — always enabled for orders.
 */
export const playOrderNotification = (): void => {
  const ctx = ensureCtx();
  if (!ctx) return;

  const now = ctx.currentTime;

  // First tone: bright, attention-grabbing
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(880, now);
  osc1.frequency.exponentialRampToValueAtTime(780, now + 0.15);
  gain1.gain.setValueAtTime(0.12, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.28);

  // Second tone: warm confirmation, slightly delayed
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1100, now + 0.12);
  osc2.frequency.exponentialRampToValueAtTime(980, now + 0.3);
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.linearRampToValueAtTime(0.1, now + 0.12);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.12);
  osc2.stop(now + 0.48);

  // Subtle high harmonic for clarity
  const osc3 = ctx.createOscillator();
  const gain3 = ctx.createGain();
  osc3.type = 'sine';
  osc3.frequency.setValueAtTime(1760, now + 0.12);
  gain3.gain.setValueAtTime(0, now);
  gain3.gain.linearRampToValueAtTime(0.03, now + 0.14);
  gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  osc3.connect(gain3);
  gain3.connect(ctx.destination);
  osc3.start(now + 0.12);
  osc3.stop(now + 0.38);
};

/**
 * Persistent order alert loop — plays continuously until stopped.
 * Uses HTMLAudioElement with a base64-encoded short alert tone.
 * Prevents overlap — only one loop can be active at a time.
 */
export const startOrderLoop = (): void => {
  if (orderLoopActive) return; // prevent overlap
  orderLoopActive = true;

  // Ensure AudioContext is ready
  ensureCtx();

  // Create audio element with a built-in alert tone
  // Using a short beep as data URI — no external file needed
  orderLoopAudio = new Audio();
  orderLoopAudio.loop = true;
  orderLoopAudio.volume = 0.7;

  // Generate a simple beep tone as WAV data URI (800Hz, 200ms)
  orderLoopAudio.src = createBeepWav(880, 0.2);
  orderLoopAudio.play().catch(() => {
    // Autoplay blocked — will try on next user gesture
  });
};

export const stopOrderLoop = (): void => {
  if (!orderLoopActive) return;
  orderLoopActive = false;
  if (orderLoopAudio) {
    orderLoopAudio.pause();
    orderLoopAudio.src = '';
    orderLoopAudio = null;
  }
};

/**
 * Generate a minimal WAV data URI for a beep tone.
 * Frequency in Hz, duration in seconds.
 */
function createBeepWav(frequency: number, duration: number): string {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + numSamples);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples, true);

  // Generate sine wave
  const amplitude = 128;
  const offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * frequency * t);
    view.setUint8(offset + i, Math.floor((sample + 1) * amplitude));
  }

  // Convert to base64 data URI
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(binary);
}
