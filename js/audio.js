// Synthesized sound effects (WebAudio). No audio files needed.
// Owns the AudioContext and the two output buses: sfxGain and musicGain.
const SFX = {
  ac: null,
  sfxGain: null,
  musicGain: null,
  noise: null,
  muted: false,
  last: {},
  gaps: { portal: 90, bump: 50, spring: 60, trap: 60, pour: 70, gate: 40, shoot: 50, hit: 55, coin: 70, hurt: 120, zap: 80, boom: 120, poof: 60, combo: 120 },

  init() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
    try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ac = null; return; }
    const ac = this.ac;
    // gentle high-cut on both buses so nothing gets shrill or ear-piercing
    const highCut = freq => { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq; f.Q.value = 0.5; f.connect(ac.destination); return f; };
    this.sfxGain = ac.createGain();
    this.sfxGain.gain.value = this.muted ? 0 : 1;
    this.sfxGain.connect(highCut(4200));
    this.musicGain = ac.createGain();
    this.musicGain.gain.value = MUSIC.enabled ? MUSIC.volume : 0;
    this.musicGain.connect(highCut(3000));
    // 1 second of white noise, shared by drums and noisy effects
    const len = ac.sampleRate;
    this.noise = ac.createBuffer(1, len, ac.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    MUSIC.onReady();
  },

  setMuted(m) {
    this.muted = m;
    if (this.sfxGain) this.sfxGain.gain.value = m ? 0 : 1;
  },

  tone(freq, dur, type = 'square', vol = 0.04, slide = 0, delay = 0) {
    const ac = this.ac;
    if (!ac || this.muted) return;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.sfxGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  },

  // filtered noise burst: type = 'lowpass' | 'highpass' | 'bandpass'
  hiss(dur, vol, type = 'bandpass', freq = 1500, q = 1, delay = 0, sweepTo = 0) {
    const ac = this.ac;
    if (!ac || this.muted || !this.noise) return;
    const t = ac.currentTime + delay;
    const src = ac.createBufferSource();
    src.buffer = this.noise;
    const f = ac.createBiquadFilter();
    f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.sfxGain);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  },

  play(name, arg) {
    if (!this.ac || this.muted) return;
    const now = performance.now();
    const gap = this.gaps[name] || 0;
    if (gap && now - (this.last[name] || 0) < gap) return;
    this.last[name] = now;
    const r = Math.random();
    switch (name) {
      case 'pour': this.tone(420 + r * 120, 0.035, 'triangle', 0.016); break;
      case 'gate': this.tone(520 + r * 160, 0.05, 'triangle', 0.02, 120); break;
      case 'shoot': this.hiss(0.04, 0.02, 'bandpass', 1800, 0.8); this.tone(330 + r * 60, 0.04, 'triangle', 0.014, -120); break;
      case 'hit': this.hiss(0.05, 0.05, 'bandpass', 700 + r * 300, 1.2); this.tone(140 + r * 40, 0.05, 'square', 0.014, -60); break;
      case 'poof': this.hiss(0.12, 0.045, 'bandpass', 1400, 0.8, 0, 500); break;
      case 'coin': this.tone(659, 0.05, 'triangle', 0.03); this.tone(880, 0.08, 'triangle', 0.03, 0, 0.05); break;
      case 'hurt': this.hiss(0.15, 0.08, 'lowpass', 1200, 0.7); this.tone(220, 0.15, 'sawtooth', 0.035, -120); break;
      case 'reload': this.tone(330, 0.06, 'triangle', 0.04, 100); this.tone(494, 0.07, 'triangle', 0.04, 100, 0.06); break;
      case 'clear': [392, 494, 587, 784].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.045, 0, i * 0.09)); break;
      case 'buy': this.tone(440, 0.06, 'triangle', 0.04); this.tone(554, 0.08, 'triangle', 0.04, 0, 0.06); this.tone(659, 0.12, 'triangle', 0.04, 0, 0.12); break;
      case 'deny': this.tone(140, 0.12, 'square', 0.035); break;
      case 'boss': this.tone(110, 0.5, 'sawtooth', 0.05, -40); this.tone(82, 0.5, 'sawtooth', 0.05, -20, 0.25); break;
      case 'warning':
        for (let i = 0; i < 3; i++) { this.tone(523, 0.18, 'triangle', 0.05, -150, i * 0.32); this.tone(262, 0.18, 'square', 0.025, -80, i * 0.32); }
        break;
      case 'over': [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.05, 0, i * 0.18)); break;
      case 'click': this.tone(440, 0.03, 'triangle', 0.04); break;
      case 'portal': this.tone(220 + r * 60, 0.18, 'sine', 0.04, 330); this.hiss(0.15, 0.015, 'bandpass', 1500, 2, 0, 600); break;
      case 'bump': this.tone(330 + r * 100, 0.06, 'triangle', 0.035, 150); break;
      case 'spring': this.tone(150, 0.16, 'triangle', 0.04, 300); break;
      case 'trap': this.tone(300, 0.08, 'sawtooth', 0.02, -200); break;
      case 'zap': this.hiss(0.08, 0.035, 'bandpass', 2200, 0.7); this.tone(600 + r * 200, 0.07, 'sawtooth', 0.015, -350); break;
      case 'boom': this.hiss(0.45, 0.16, 'lowpass', 900, 0.8, 0, 80); this.tone(90, 0.3, 'sine', 0.12, -50); break;
      case 'bossDie':
        this.hiss(0.9, 0.18, 'lowpass', 1600, 0.7, 0, 60);
        [196, 262, 330, 392, 523].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.05, 0, 0.25 + i * 0.07));
        break;
      case 'combo': { const n = arg || 5; this.tone(392 + Math.min(n, 40) * 6, 0.08, 'triangle', 0.04, 80); break; }
      case 'revive': [262, 330, 392, 494, 587].forEach((f, i) => this.tone(f, 0.15, 'triangle', 0.05, 0, i * 0.07)); break;
      case 'achieve': [523, 659, 784].forEach((f, i) => this.tone(f, 0.13, 'triangle', 0.045, 0, i * 0.08)); break;
    }
  },
};
