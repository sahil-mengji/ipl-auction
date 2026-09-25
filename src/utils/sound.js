// Synthesized sound engine (Web Audio, no assets): bid blips, gavel knocks,
// sold fanfare, and a low-key generative music loop. All local per device;
// persisted mute/volume in localStorage.

let ctx = null;
let master = null;
let musicGain = null;
let musicTimer = null;
let musicStep = 0;

const store = {
  get muted() {
    return window.localStorage.getItem("ipl-muted") === "1";
  },
  set muted(v) {
    window.localStorage.setItem("ipl-muted", v ? "1" : "0");
  },
  get volume() {
    const v = Number(window.localStorage.getItem("ipl-volume"));
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.7;
  },
  set volume(v) {
    window.localStorage.setItem("ipl-volume", String(v));
  },
  get music() {
    return window.localStorage.getItem("ipl-music") === "1";
  },
  set music(v) {
    window.localStorage.setItem("ipl-music", v ? "1" : "0");
  },
};

const ac = () => {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = store.muted ? 0 : store.volume;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.35;
    musicGain.connect(master);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
};

export const isMuted = () => store.muted;
export const getVolume = () => store.volume;
export const isMusicOn = () => store.music;

export const setMuted = (m) => {
  store.muted = m;
  if (master && ctx) master.gain.setValueAtTime(m ? 0 : store.volume, ctx.currentTime);
};

export const setVolume = (v) => {
  store.volume = v;
  if (master && ctx && !store.muted) master.gain.setValueAtTime(v, ctx.currentTime);
};

const tone = (freq, at, dur, type = "sine", vol = 0.5, dest = null) => {
  const c = ac();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(vol, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, at + dur);
  o.connect(g);
  g.connect(dest ?? master);
  o.start(at);
  o.stop(at + dur + 0.05);
};

// Real audio samples from /public, layered with the synth.
const sampleCache = {};
const sample = (file) => {
  if (!sampleCache[file]) {
    const a = new Audio(`${import.meta.env.BASE_URL}${file}`);
    a.preload = "auto";
    sampleCache[file] = a;
  }
  return sampleCache[file];
};

const playSample = (file, volScale = 1) => {
  if (store.muted) return;
  try {
    const a = sample(file);
    a.volume = Math.min(1, store.volume * volScale);
    a.currentTime = 0;
    void a.play().catch(() => {});
  } catch {
    /* autoplay blocked before first gesture */
  }
};

// IPL trumpet sting (public/ipl-trumpet.mp3).
export const playTrumpet = () => playSample("ipl-trumpet.mp3", 0.9);

// Coin cascade (public/coin.mp3) — paired with money-increase animation.
export const playCoin = () => playSample("coin.mp3", 0.8);

const knock = (at, vol = 0.8) => {
  const c = ac();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "square";
  o.frequency.setValueAtTime(160, at);
  o.frequency.exponentialRampToValueAtTime(60, at + 0.09);
  g.gain.setValueAtTime(vol, at);
  g.gain.exponentialRampToValueAtTime(0.001, at + 0.12);
  o.connect(g);
  g.connect(master);
  o.start(at);
  o.stop(at + 0.15);
};

export const playBid = () => {
  if (store.muted) return;
  const t = ac().currentTime;
  tone(660, t, 0.12, "sine", 0.4);
  tone(880, t + 0.09, 0.16, "sine", 0.4);
};

// Soft tick as the big number starts rolling to its new value.
export const playTick = () => {
  if (store.muted) return;
  const t = ac().currentTime;
  tone(1200, t, 0.06, "sine", 0.25);
};

// Cha-ching when a bid is placed/confirmed.
export const playBidPlaced = () => {
  if (store.muted) return;
  const t = ac().currentTime;
  tone(987.77, t, 0.12, "sine", 0.45);
  tone(1318.5, t + 0.1, 0.25, "sine", 0.45);
};

export const playGavel = () => {
  if (store.muted) return;
  const t = ac().currentTime;
  knock(t);
  knock(t + 0.18);
  knock(t + 0.36, 1);
};

// Full local sold sting (classic screen): trumpet only.
export const playSold = () => playTrumpet();

export const playUnsold = () => {
  if (store.muted) return;
  const t = ac().currentTime;
  tone(392, t, 0.25, "triangle", 0.4);
  tone(261.6, t + 0.2, 0.4, "triangle", 0.4);
};

// Generative low-key loop: soft pentatonic pad over a heartbeat bass.
const SCALE = [220, 261.63, 293.66, 329.63, 392, 440, 523.25];
const PROG = [0, 3, 4, 2];

export const startMusic = () => {
  store.music = true;
  const c = ac();
  if (musicTimer) return;
  musicStep = 0;
  musicTimer = setInterval(() => {
    if (store.muted || !store.music) return;
    const t = c.currentTime + 0.05;
    const root = SCALE[PROG[Math.floor(musicStep / 2) % PROG.length] % SCALE.length];
    tone(55, t, 0.9, "sine", 0.5, musicGain);
    tone(root * 2, t, 1.6, "sine", 0.16, musicGain);
    if (musicStep % 2 === 0) {
      tone(root * 3, t + 0.4, 1.2, "triangle", 0.08, musicGain);
    }
    musicStep += 1;
  }, 900);
};

export const stopMusic = () => {
  store.music = false;
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
};
