// Procedural chiptune BGM. Each track is generated once from a small recipe
// (key, scale, chord progression, tempo, instruments, seed) so there are no audio files.
// Melodies come from a seeded generator: same seed -> same tune every time.

const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  harm: [0, 2, 3, 5, 7, 8, 11],
  phryg: [0, 1, 4, 5, 7, 8, 10], // phrygian dominant
};

// prog = scale degrees of each bar's chord (0 = tonic)
const SONGS = {
  title: { bpm: 92, root: 60, scale: 'major', prog: [0, 4, 5, 3], lead: 'p25', seed: 11, drums: 'soft', arp: 'up8', bass: 'half', density: 0.45 },
  shop: { bpm: 86, root: 65, scale: 'major', prog: [0, 5, 1, 4], lead: 'tri', seed: 53, drums: 'none', arp: 'up8', bass: 'half', density: 0.35 },
  meadow: { bpm: 124, root: 62, scale: 'major', prog: [0, 3, 4, 0, 5, 3, 4, 4], lead: 'p25', seed: 3, drums: 'pop', arp: 'up16', bass: 'octave', density: 0.6 },
  desert: { bpm: 112, root: 62, scale: 'phryg', prog: [0, 1, 0, 6, 0, 1, 6, 0], lead: 'p12', seed: 7, drums: 'tribal', arp: 'updown8', bass: 'pulse', density: 0.55 },
  snow: { bpm: 100, root: 65, scale: 'lydian', prog: [0, 1, 0, 4], lead: 'tri', seed: 19, drums: 'soft', arp: 'up16', bass: 'half', density: 0.4 },
  night: { bpm: 108, root: 57, scale: 'dorian', prog: [0, 3, 0, 6, 0, 3, 4, 4], lead: 'p25', seed: 23, drums: 'pop', arp: 'up8', bass: 'walk', density: 0.5 },
  volcano: { bpm: 142, root: 57, scale: 'minor', prog: [0, 6, 5, 4], lead: 'p50', seed: 31, drums: 'drive', arp: 'up16', bass: 'octave', density: 0.65 },
  boss: { bpm: 152, root: 52, scale: 'harm', prog: [0, 0, 5, 4, 0, 0, 3, 4], lead: 'p25', seed: 41, drums: 'drive', arp: 'up16', bass: 'octave', density: 0.7 },
};

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function sdeg(sc, d) {
  const n = sc.length, o = Math.floor(d / n), i = ((d % n) + n) % n;
  return sc[i] + 12 * o;
}
function seeded(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function genSong(def) {
  const rng = seeded(def.seed);
  const pick = arr => arr[Math.floor(rng() * arr.length)];
  const sc = SCALES[def.scale];
  const bars = 16; // the chord progression repeats to fill 16 bars
  const steps = bars * 16;
  const ev = Array.from({ length: steps }, () => []);
  const MAX_MIDI = 74; // D5: hard ceiling so nothing gets shrill
  const add = (step, e) => {
    if (e.midi) while (e.midi > MAX_MIDI) e.midi -= 12;
    ev[((step % steps) + steps) % steps].push(e);
  };
  const chordOfBar = b => def.prog[b % def.prog.length];
  const chordAt = step => chordOfBar(Math.floor(step / 16) % bars);

  // --- lead: two 2-bar phrases (A, B) of notes relative to the bar's chord root
  const makePhrase = () => {
    const ph = [];
    let rel = pick([0, 2, 4]);
    let s = 0;
    while (s < 32) {
      const strong = s % 8 === 0, beat = s % 4 === 0, eighth = s % 2 === 0;
      const p = strong ? 0.9 : beat ? def.density + 0.2 : eighth ? def.density * 0.6 : def.density * 0.15;
      if (rng() < p) {
        if (strong) rel = pick([0, 2, 4, 7]);
        else rel = Math.max(-2, Math.min(9, rel + pick([-2, -1, -1, 1, 1, 2])));
        const dur = !eighth ? 1 : beat && rng() < 0.4 ? 4 : 2;
        ph.push({ s, rel, dur: Math.min(dur, 32 - s) });
        s += dur;
      } else s += 1;
    }
    return ph;
  };
  const A = makePhrase(), B = makePhrase(), C = makePhrase();
  // 8 two-bar slots: theme, answer, theme, bridge, (breakdown: no lead), answer, theme, bridge -> home
  const order = [A, B, A, C, null, B, A, C];
  const leadVol = def.lead === 'tri' ? 0.09 : 0.045;
  const lastIdx = order.length - 1;
  order.forEach((ph, pi) => {
    if (!ph) return;
    const last = pi === lastIdx;
    ph.forEach((n, ni) => {
      const step = pi * 32 + n.s;
      let rel = n.rel;
      if (last && ni === ph.length - 1) rel = 0; // resolve home at the end of the loop
      add(step, { inst: 'lead', midi: def.root + sdeg(sc, chordAt(step) + rel), dur: n.dur, vol: leadVol });
    });
  });

  // --- bass, arpeggio, drums per bar
  for (let b = 0; b < bars; b++) {
    const deg = chordOfBar(b);
    const s0 = b * 16;
    const breakdown = b === 8 || b === 9; // drums thin out while the lead rests
    let bassRoot = def.root - 12 + sdeg(sc, deg);
    if (bassRoot > def.root - 5) bassRoot -= 12;
    const bv = 0.11;
    if (def.bass === 'half') { add(s0, { inst: 'bass', midi: bassRoot, dur: 7, vol: bv }); add(s0 + 8, { inst: 'bass', midi: bassRoot, dur: 7, vol: bv }); }
    else if (def.bass === 'octave') { for (let i = 0; i < 16; i += 2) add(s0 + i, { inst: 'bass', midi: bassRoot + (i % 4 === 2 ? 12 : 0), dur: 2, vol: bv }); }
    else if (def.bass === 'pulse') { for (const i of [0, 3, 6, 8, 11, 14]) add(s0 + i, { inst: 'bass', midi: bassRoot, dur: 2, vol: bv }); }
    else if (def.bass === 'walk') {
      const walk = [0, 2, 4, 5];
      walk.forEach((r, i) => add(s0 + i * 4, { inst: 'bass', midi: bassRoot + sdeg(sc, deg + r) - sdeg(sc, deg), dur: 3, vol: bv }));
    }

    const tones = [0, 2, 4, 7].map(r => def.root - 12 + sdeg(sc, deg + r));
    const av = 0.022;
    if (def.arp === 'up8') for (let i = 0; i < 16; i += 2) add(s0 + i, { inst: 'arp', midi: tones[(i / 2) % 4], dur: 1, vol: av });
    else if (def.arp === 'up16') for (let i = 0; i < 16; i++) add(s0 + i, { inst: 'arp', midi: tones[i % 4], dur: 1, vol: av * 0.8 });
    else if (def.arp === 'updown8') { const seq = [0, 1, 2, 3, 2, 1, 0, 1]; for (let i = 0; i < 8; i++) add(s0 + i * 2, { inst: 'arp', midi: tones[seq[i]], dur: 1, vol: av }); }

    const fill = b === bars - 1 || b === 7;
    const D = (i, inst, vol) => { if (!breakdown || inst === 'hat' || (inst === 'kick' && i === 0)) add(s0 + i, { inst, vol }); };
    if (def.drums === 'soft') { D(0, 'kick', 0.35); D(10, 'kick', 0.2); for (let i = 2; i < 16; i += 4) D(i, 'hat', 0.025); D(12, 'snare', 0.04); }
    else if (def.drums === 'pop') {
      D(0, 'kick', 0.45); D(8, 'kick', 0.45); D(10, 'kick', 0.25);
      D(4, 'snare', 0.09); D(12, 'snare', 0.09);
      for (let i = 0; i < 16; i += 2) D(i, 'hat', i % 4 === 2 ? 0.035 : 0.02);
      if (fill) { D(13, 'snare', 0.05); D(14, 'snare', 0.07); D(15, 'snare', 0.09); }
    } else if (def.drums === 'drive') {
      for (const i of [0, 4, 8, 12, 14]) D(i, 'kick', 0.5);
      D(4, 'snare', 0.1); D(12, 'snare', 0.1);
      for (let i = 0; i < 16; i++) D(i, 'hat', i % 2 ? 0.015 : 0.03);
      if (fill) for (let i = 12; i < 16; i++) D(i, 'snare', 0.05 + (i - 12) * 0.02);
    } else if (def.drums === 'tribal') {
      for (const i of [0, 6, 10]) D(i, 'kick', 0.45);
      for (const i of [3, 11, 14]) D(i, 'tom', 0.3);
      for (let i = 2; i < 16; i += 4) D(i, 'hat', 0.03);
      D(8, 'snare', 0.05);
    }
  }
  return { def, steps, ev, stepDur: 60 / def.bpm / 4 };
}

const MUSIC = {
  ac: null,
  enabled: true,
  volume: 0.7,
  songs: {},
  song: null,
  curId: null,
  wantId: null,
  trackGain: null,
  step: 0,
  nextT: 0,
  timer: null,
  waves: {},
  ducked: false,

  onReady() {
    this.ac = SFX.ac;
    if (!this.ac) return;
    const pulse = duty => {
      const n = 32, re = new Float32Array(n), im = new Float32Array(n);
      for (let i = 1; i < n; i++) {
        re[i] = Math.sin(2 * Math.PI * i * duty) / (i * Math.PI);
        im[i] = 2 * Math.pow(Math.sin(Math.PI * i * duty), 2) / (i * Math.PI);
      }
      return this.ac.createPeriodicWave(re, im);
    };
    this.waves = { p12: pulse(0.125), p25: pulse(0.25), p50: pulse(0.5) };
    if (!this.timer) this.timer = setInterval(() => this.tick(), 25);
    if (this.enabled && this.wantId) this._switch();
  },

  // called every frame with the track the game wants right now (or null for silence)
  set(id) {
    this.wantId = id;
    if (!this.ac) return;
    if (!this.enabled) { if (this.curId) this._stop(); return; }
    if (this.curId !== id) this._switch();
  },

  setEnabled(on) {
    this.enabled = on;
    if (SFX.musicGain) SFX.musicGain.gain.value = on ? this.volume * (this.ducked ? 0.35 : 1) : 0;
    if (!on) this._stop();
    else if (this.ac && this.wantId) this._switch();
  },

  duck(on) {
    if (on === this.ducked) return;
    this.ducked = on;
    if (SFX.musicGain && this.enabled) SFX.musicGain.gain.setTargetAtTime(this.volume * (on ? 0.35 : 1), this.ac.currentTime, 0.1);
  },

  _stop() {
    if (this.trackGain && this.ac) {
      const g = this.trackGain;
      g.gain.setTargetAtTime(0, this.ac.currentTime, 0.12);
      setTimeout(() => { try { g.disconnect(); } catch (e) { /* already gone */ } }, 1500);
    }
    this.trackGain = null; this.song = null; this.curId = null;
  },

  _switch() {
    this._stop();
    const id = this.wantId;
    if (!id || !SONGS[id]) return;
    if (!this.songs[id]) this.songs[id] = genSong(SONGS[id]);
    this.song = this.songs[id];
    this.curId = id;
    this.trackGain = this.ac.createGain();
    this.trackGain.gain.setValueAtTime(0, this.ac.currentTime);
    this.trackGain.gain.linearRampToValueAtTime(1, this.ac.currentTime + 0.4);
    this.trackGain.connect(SFX.musicGain);
    this.step = 0;
    this.nextT = this.ac.currentTime + 0.1;
  },

  tick() {
    if (!this.song || !this.ac) return;
    const now = this.ac.currentTime;
    if (this.nextT < now - 0.2) this.nextT = now + 0.05; // tab was asleep: resync instead of bursting
    while (this.nextT < now + 0.12) {
      for (const e of this.song.ev[this.step]) this.voice(e, this.nextT);
      this.nextT += this.song.stepDur;
      this.step = (this.step + 1) % this.song.steps;
    }
  },

  voice(e, t) {
    const ac = this.ac, out = this.trackGain;
    if (!out) return;
    const sd = this.song.stepDur;
    if (e.inst === 'kick' || e.inst === 'tom') {
      const o = ac.createOscillator(), g = ac.createGain();
      const f0 = e.inst === 'kick' ? 150 : 180, f1 = e.inst === 'kick' ? 42 : 90;
      o.type = 'sine';
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + 0.12);
      g.gain.setValueAtTime(e.vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.connect(g).connect(out);
      o.start(t); o.stop(t + 0.2);
      return;
    }
    if (e.inst === 'snare' || e.inst === 'hat') {
      if (!SFX.noise) return;
      const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      src.buffer = SFX.noise;
      const snare = e.inst === 'snare';
      f.type = 'bandpass';
      f.frequency.value = snare ? 1400 : 4200; // hats kept in a mellow band instead of the piercing top end
      f.Q.value = snare ? 0.8 : 0.9;
      if (!snare) e = Object.assign({}, e, { vol: e.vol * 0.7 });
      const len = snare ? 0.12 : 0.035;
      g.gain.setValueAtTime(e.vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + len);
      src.connect(f).connect(g).connect(out);
      src.start(t, Math.random() * 0.8); src.stop(t + len + 0.02);
      return;
    }
    // pitched voices
    const o = ac.createOscillator(), g = ac.createGain();
    const lead = this.song.def.lead;
    if (e.inst === 'bass') o.type = 'triangle';
    else if (e.inst === 'arp') o.type = 'triangle';
    else if (lead === 'tri') o.type = 'triangle';
    else o.setPeriodicWave(this.waves[lead === 'p12' ? 'p25' : lead] || this.waves.p25); // thin 12.5% pulse is too shrill
    o.frequency.setValueAtTime(mtof(e.midi), t);
    const d = Math.max(0.05, e.dur * sd);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(e.vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(e.vol * 0.55, t + Math.min(0.12, d * 0.6));
    g.gain.setValueAtTime(e.vol * 0.55, t + d * 0.85);
    g.gain.exponentialRampToValueAtTime(0.0005, t + d + 0.05);
    o.connect(g).connect(out);
    o.start(t); o.stop(t + d + 0.08);
  },
};

// Which track should be playing right now
function desiredTrack() {
  if (!S) return 'title';
  if (S.state === 'dying') return null;
  if (S.state === 'over') return 'title';
  if (S.state === 'victory') return 'shop';
  if (S.state === 'shop') return 'shop';
  if (S.wave % 5 === 0) return 'boss';
  return BIOMES[Math.max(0, world.biomeIdx)].key;
}
