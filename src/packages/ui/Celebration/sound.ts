/**
 * Web Audio helpers for the birthday celebration.
 *
 * iOS is the constraining platform here, and it needs four things to make
 * sound at all:
 *   1. `navigator.audioSession.type = 'playback'` — otherwise the hardware
 *      ringer switch silences Web Audio entirely (iOS 16.4+).
 *   2. The AudioContext resumed inside a real user gesture.
 *   3. An actual buffer played during that gesture, not just `resume()`.
 *   4. Buffers already decoded, so playback starts synchronously rather than
 *      after an `await` (which loses the gesture's audio permission).
 *
 * `primeAudio()` handles 1-4 on the first tap anywhere on the page, so by the
 * time the toggle is pressed everything is decoded and the context is running.
 */

let ctx: AudioContext | null = null;
let currentJingle: AudioBufferSourceNode | null = null;
let primed = false;

/** Seconds of the jingle to play before fading out. */
const JINGLE_MAX_S = 5;
const JINGLE_FADE_S = 1.2;

const POP_SRC = '/pop.mp3';

/** Jingle variants, chosen with `?jingle=<key>` so one build can serve
 *  several prototype links. Each file is pre-trimmed to its best few bars. */
const JINGLE_VARIANTS: Record<string, string> = {
  default: '/birthday-jingle.mp3',
  cats: '/jingle-cats.mp3',
};

/** Read at module load — the router drops the query string once it navigates. */
const jingleSrc = (() => {
  try {
    const key = new URLSearchParams(window.location.search).get('jingle');
    return (key && JINGLE_VARIANTS[key]) || JINGLE_VARIANTS.default;
  } catch {
    return JINGLE_VARIANTS.default;
  }
})();

/** Decoded buffers by src. `null` = still loading, 'missing' = fetch failed. */
const buffers = new Map<string, AudioBuffer | 'missing'>();

function setPlaybackSession() {
  // Non-standard, iOS Safari 16.4+: declares this page as media playback so
  // the silent switch doesn't mute us. Harmless no-op elsewhere.
  try {
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (session) session.type = 'playback';
  } catch {
    /* not supported */
  }
}

function getCtx(): AudioContext {
  if (!ctx) {
    setPlaybackSession();
    ctx = new AudioContext();
  }
  return ctx;
}

async function load(src: string) {
  if (buffers.has(src)) return;
  const c = getCtx();
  try {
    const res = await fetch(src);
    const type = res.headers.get('content-type') ?? '';
    // Vite/Vercel serve index.html for missing files — verify it's audio.
    if (!res.ok || type.includes('text/html')) throw new Error('missing');
    buffers.set(src, await c.decodeAudioData(await res.arrayBuffer()));
  } catch {
    buffers.set(src, 'missing');
  }
}

/**
 * Unlock and warm up audio. Safe to call repeatedly; only the first call does
 * work. MUST be invoked from inside a user gesture (a tap/click handler).
 */
export function primeAudio() {
  const c = getCtx();
  if (c.state === 'suspended') void c.resume();

  if (primed) return;
  primed = true;

  // A one-sample silent blip played in-gesture is what actually flips iOS
  // out of its locked state; resume() alone is not always enough.
  try {
    const blip = c.createBufferSource();
    blip.buffer = c.createBuffer(1, 1, c.sampleRate);
    blip.connect(c.destination);
    blip.start(0);
  } catch {
    /* ignore */
  }

  void load(POP_SRC);
  void load(jingleSrc);
}

/** Back-compat alias — same contract as primeAudio. */
export const unlockAudio = primeAudio;

/** Champagne cork pop, with a synth fallback if the file is unavailable. */
export function playPop(delayMs = 0) {
  const c = getCtx();
  const buf = buffers.get(POP_SRC);
  const t = c.currentTime + delayMs / 1000;

  if (buf === undefined) {
    // Not warmed yet — load then play as soon as it lands.
    void load(POP_SRC).then(() => playPop(0));
    return;
  }
  if (buf === 'missing') {
    playSynthPop(c, t);
    return;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.value = 0.9;
  src.connect(g).connect(c.destination);
  src.start(t);
}

/**
 * Plays the selected jingle variant, trimmed to JINGLE_MAX_S with a fade-out,
 * falling back to a synthesized "Happy Birthday" if the file is unavailable.
 */
export function playJingle(delayMs = 0) {
  const c = getCtx();
  stopJingle(); // don't stack takes on rapid re-triggers
  const buf = buffers.get(jingleSrc);
  const t = c.currentTime + delayMs / 1000;

  if (buf === undefined) {
    void load(jingleSrc).then(() => playJingle(delayMs));
    return;
  }
  if (buf === 'missing') {
    playSynthJingle(c, t);
    return;
  }

  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  const play = Math.min(JINGLE_MAX_S, buf.duration);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.55, t + 0.15);
  g.gain.setValueAtTime(0.55, t + play - JINGLE_FADE_S);
  g.gain.linearRampToValueAtTime(0.0001, t + play);
  src.connect(g).connect(c.destination);
  src.start(t);
  src.stop(t + play);
  currentJingle = src;
}

/** Snapshot of audio state, for the `?debug=1` readout. */
export function audioDiagnostics() {
  const state = (src: string) => {
    const b = buffers.get(src);
    return b === undefined ? 'loading' : b === 'missing' ? 'MISSING' : 'ready';
  };
  return {
    context: ctx?.state ?? 'not created',
    audioSession:
      (navigator as unknown as { audioSession?: { type: string } }).audioSession?.type ??
      'unsupported',
    pop: state(POP_SRC),
    jingle: state(jingleSrc),
    jingleSrc,
    vibrate: typeof navigator.vibrate === 'function' ? 'available' : 'UNAVAILABLE',
  };
}

/** Stop any in-flight jingle (e.g. birthday mode toggled back off). */
export function stopJingle() {
  try {
    currentJingle?.stop();
  } catch {
    /* already stopped */
  }
  currentJingle = null;
}

/* ── Synth fallbacks ─────────────────────────────────────────────────────── */

/** Fallback pop: a burst of filtered noise + a pitched-down thump. */
function playSynthPop(c: AudioContext, t: number) {
  const noiseLen = 0.09;
  const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * noiseLen), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  const noiseFilter = c.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 2400;
  noiseFilter.Q.value = 0.8;
  const noiseGain = c.createGain();
  noiseGain.gain.setValueAtTime(0.5, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + noiseLen);
  noise.connect(noiseFilter).connect(noiseGain).connect(c.destination);
  noise.start(t);

  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, t);
  osc.frequency.exponentialRampToValueAtTime(70, t + 0.12);
  const oscGain = c.createGain();
  oscGain.gain.setValueAtTime(0.6, t);
  oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
  osc.connect(oscGain).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.14);
}

// "Happy Birthday" — first two phrases, in C major. [semitones from C4, beats]
const JINGLE_NOTES: Array<[number, number]> = [
  [0, 0.75], [0, 0.25], [2, 1], [0, 1], [5, 1], [4, 2],
  [0, 0.75], [0, 0.25], [2, 1], [0, 1], [7, 1], [5, 2],
];
const JINGLE_BPM = 150;

function playSynthJingle(c: AudioContext, startAt: number) {
  const beat = 60 / JINGLE_BPM;
  const master = c.createGain();
  master.gain.value = 0.16;
  master.connect(c.destination);

  let t = startAt;
  for (const [semi, beats] of JINGLE_NOTES) {
    const dur = beats * beat;
    const freq = 261.63 * Math.pow(2, semi / 12);
    // Two slightly-detuned triangles = warm chiptune tone
    for (const detune of [0, 6]) {
      const osc = c.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      osc.detune.value = detune;
      const g = c.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(1, t + 0.02);
      g.gain.setValueAtTime(1, t + dur * 0.6);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.95);
      osc.connect(g).connect(master);
      osc.start(t);
      osc.stop(t + dur);
    }
    t += dur;
  }
}
