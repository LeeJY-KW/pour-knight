// Pit layouts are authored in "design units" (216 x 384 grid) and scaled by LS (1.25) at build time.
// gate: { x, y, w, m, move?, spd? }   seg: [x1, y1, x2, y2] (solid ramp/wall)   pegs: { rows, y0, dy, dx }
const LAYOUTS = [
  {
    name: 'twin',
    gates: [{ x: 22, y: 188, w: 64, m: 2 }, { x: 130, y: 188, w: 64, m: 2 }, { x: 76, y: 292, w: 64, m: 3 }],
    segs: [[14, 232, 70, 262], [202, 232, 146, 262]],
  },
  {
    name: 'triple',
    gates: [
      { x: 12, y: 182, w: 58, m: 3 }, { x: 79, y: 182, w: 58, m: 2 }, { x: 146, y: 182, w: 58, m: 3 },
      { x: 58, y: 282, w: 100, m: 2, move: 40, spd: 1.3 },
    ],
    segs: [[74, 200, 74, 236], [142, 200, 142, 236]],
  },
  {
    name: 'zigzag',
    gates: [{ x: 16, y: 176, w: 72, m: 2 }, { x: 112, y: 234, w: 80, m: 3, move: 14, spd: 1.6 }, { x: 28, y: 316, w: 84, m: 2 }],
    segs: [[10, 204, 108, 224], [206, 264, 118, 288]],
  },
  {
    name: 'plinko',
    pegs: { rows: 6, y0: 168, dy: 20, dx: 22 },
    gates: [{ x: 12, y: 310, w: 58, m: 2 }, { x: 79, y: 310, w: 58, m: 4 }, { x: 146, y: 310, w: 58, m: 2 }],
    segs: [],
  },
  {
    name: 'drift',
    gates: [
      { x: 30, y: 172, w: 54, m: 2, move: 24, spd: 0.9 },
      { x: 108, y: 228, w: 72, m: 2, move: 28, spd: 1.3 },
      { x: 62, y: 298, w: 92, m: 3, move: 44, spd: 0.7 },
    ],
    segs: [[10, 252, 40, 264], [206, 252, 176, 264]],
  },
  {
    name: 'funnel',
    gates: [
      { x: 30, y: 176, w: 60, m: 2 }, { x: 126, y: 176, w: 60, m: 2 },
      { x: 84, y: 262, w: 48, m: 3 },
      { x: 20, y: 320, w: 70, m: 2, move: 20, spd: 1 }, { x: 126, y: 320, w: 70, m: 2, move: 20, spd: 1.2 },
    ],
    segs: [[10, 200, 90, 240], [206, 200, 126, 240]],
  },
  {
    name: 'split',
    gates: [
      { x: 30, y: 220, w: 44, m: 3 }, { x: 120, y: 220, w: 80, m: 2, move: 6, spd: 2 },
      { x: 40, y: 300, w: 136, m: 2 },
    ],
    segs: [[108, 186, 108, 252], [10, 262, 36, 282], [206, 262, 180, 282]],
  },
  {
    name: 'chaos',
    pegs: { rows: 3, y0: 204, dy: 20, dx: 24 },
    gates: [
      { x: 70, y: 172, w: 76, m: 2, move: 50, spd: 1.1 },
      { x: 20, y: 300, w: 80, m: 3, move: 20, spd: 0.8 }, { x: 126, y: 300, w: 76, m: 2, move: 20, spd: 1.3 },
    ],
    segs: [],
  },
  {
    name: 'cascade',
    gates: [{ x: 28, y: 172, w: 160, m: 2 }, { x: 58, y: 240, w: 100, m: 2 }, { x: 83, y: 310, w: 50, m: 3 }],
    segs: [[10, 195, 50, 228], [206, 195, 166, 228], [30, 262, 74, 292], [186, 262, 142, 292]],
  },
  // ---- layouts with special structures
  // bumpers [x, y, r, orbitR?, orbitSpd?, phase?]  portals [inX, inY, outX, outY]  spinners [x, y, len, spd]
  // springs [x1, y1, x2, y2] (sloped pad; balls launch along its upward normal)  zones [{x, w, m}] (bottom collector value multiplier)
  // gate flags: rev (fling ball back up), trap (50% lose), goldify (ball value x3)
  {
    name: 'bumper field',
    gates: [{ x: 40, y: 174, w: 136, m: 2 }, { x: 58, y: 312, w: 100, m: 2 }],
    bumpers: [[60, 226, 6], [108, 216, 6], [156, 226, 6], [84, 258, 6], [132, 258, 6]],
    segs: [],
    zones: [{ x: 6, w: 66, m: 1 }, { x: 72, w: 72, m: 2 }, { x: 144, w: 66, m: 1 }],
  },
  {
    name: 'reverse',
    gates: [
      { x: 20, y: 176, w: 80, m: 2 }, { x: 116, y: 176, w: 80, m: 2 },
      { x: 64, y: 268, w: 88, m: 2, rev: true },
      { x: 30, y: 330, w: 70, m: 2 }, { x: 116, y: 330, w: 70, m: 2 },
    ],
    segs: [[10, 226, 52, 250], [206, 226, 164, 250]],
  },
  {
    name: 'portal loop',
    gates: [{ x: 20, y: 190, w: 80, m: 2 }, { x: 116, y: 190, w: 80, m: 2 }, { x: 60, y: 262, w: 96, m: 3 }],
    portals: [[54, 346, 108, 160]],
    segs: [[206, 296, 70, 330]],
    zones: [{ x: 6, w: 20, m: 1 }, { x: 150, w: 60, m: 2 }],
  },
  {
    name: 'springs',
    gates: [{ x: 58, y: 182, w: 100, m: 3 }, { x: 14, y: 250, w: 70, m: 2 }, { x: 132, y: 250, w: 70, m: 2 }],
    springs: [[10, 326, 50, 344], [206, 326, 166, 344]], // high at the wall, sloping toward the middle
    segs: [[56, 300, 96, 322], [160, 300, 120, 322]],
    zones: [{ x: 96, w: 24, m: 3 }],
  },
  {
    name: 'windmill',
    gates: [{ x: 14, y: 180, w: 90, m: 2 }, { x: 112, y: 180, w: 90, m: 2 }, { x: 30, y: 300, w: 70, m: 3 }, { x: 116, y: 300, w: 70, m: 3 }],
    spinners: [[108, 240, 72, 1.6]],
    segs: [],
  },
  {
    name: 'risk',
    gates: [
      { x: 14, y: 196, w: 58, m: 3 }, { x: 80, y: 196, w: 56, trap: true }, { x: 144, y: 196, w: 58, m: 3 },
      { x: 58, y: 300, w: 100, goldify: true, move: 30, spd: 0.9 },
    ],
    bumpers: [[108, 250, 7]],
    segs: [[76, 214, 76, 236], [140, 214, 140, 236]],
    zones: [{ x: 6, w: 40, m: 2 }, { x: 170, w: 40, m: 2 }],
  },
  {
    name: 'orbit',
    gates: [{ x: 28, y: 176, w: 160, m: 2 }, { x: 58, y: 314, w: 100, m: 3, move: 30, spd: 0.8 }],
    bumpers: [[108, 244, 6, 34, 1.3, 0], [108, 244, 6, 34, 1.3, Math.PI]],
    portals: [[190, 352, 30, 158]],
    springs: [[10, 344, 42, 360]],
    segs: [],
  },
];

// Difficulty presets: multipliers on enemy hp/dmg/speed/count, between-wave heal, gem reward
const DIFFS = {
  normal: { name: '보통', tag: '', color: '#a7f070', hp: 1, dmg: 1, spd: 1, count: 1, heal: 0.05, gem: 1, unlockBy: null },
  hard: { name: '어려움', tag: 'HARD', color: '#ef7d57', hp: 1.45, dmg: 1.3, spd: 1.1, count: 1.2, heal: 0.03, gem: 1.6, unlockBy: 'normal' },
  nightmare: { name: '악몽', tag: 'NIGHTMARE', color: '#ef4f5f', hp: 2.1, dmg: 1.5, spd: 1.2, count: 1.35, heal: 0, gem: 2.5, unlockBy: 'hard' },
};

// One biome per 10 waves (cycles). Purely visual.
const BIOMES = [
  { key: 'meadow', name: '초원', sky: ['#29366f', '#3b5dc9', '#41a6f6', '#73eff7'], cloud: '#f4f4f4', far: '#566c86', near: '#257179',
    deco: 'pine', decoCol: '#1a3a3a', top: '#a7f070', grass: '#38b764', dirt: '#8a5a3c', dirtD: '#6b4430',
    pit: '#3a2a28', pitA: '#33241f', pitB: '#45322d', wall: '#6b4a35', wallHi: '#8a6446' },
  { key: 'desert', name: '모래 사막', sky: ['#5d275d', '#b13e53', '#ef7d57', '#ffcd75'], cloud: '#ffe1a1', far: '#c27c4e', near: '#a35a3a',
    deco: 'cactus', decoCol: '#257179', top: '#ffe1a1', grass: '#e0b45a', dirt: '#b07a42', dirtD: '#8a5a32',
    pit: '#4a3424', pitA: '#402c1e', pitB: '#563e2b', wall: '#8a5a32', wallHi: '#b07a42' },
  { key: 'snow', name: '얼음 설원', sky: ['#333c57', '#566c86', '#94b0c2', '#d6e4ef'], cloud: '#f4f4f4', far: '#94b0c2', near: '#d6e4ef',
    deco: 'snowpine', decoCol: '#257179', top: '#ffffff', grass: '#d6e4ef', dirt: '#566c86', dirtD: '#333c57',
    pit: '#262c3e', pitA: '#20253a', pitB: '#2e3548', wall: '#566c86', wallHi: '#94b0c2' },
  { key: 'night', name: '밤의 숲', sky: ['#0e0f1a', '#1a1c2c', '#29366f', '#333c57'], cloud: null, stars: true, far: '#1f2a44', near: '#16303a',
    deco: 'pine', decoCol: '#0e1f22', top: '#38b764', grass: '#257179', dirt: '#4a3326', dirtD: '#33241f',
    pit: '#1e1a24', pitA: '#18151e', pitB: '#26202d', wall: '#3a2a3a', wallHi: '#5d275d' },
  { key: 'volcano', name: '화산 지대', sky: ['#1a1c2c', '#5d275d', '#b13e53', '#ef7d57'], cloud: '#566c86', far: '#333c57', near: '#1a1c2c',
    deco: 'rock', decoCol: '#333c57', top: '#ef7d57', grass: '#b13e53', dirt: '#333c57', dirtD: '#1a1c2c',
    pit: '#2a1a1c', pitA: '#221416', pitB: '#3a2022', wall: '#4a2a2a', wallHi: '#b13e53' },
];
// a difficulty opens once the one before it has been cleared
function diffUnlocked(k) { const d = DIFFS[k]; return !!d && (!d.unlockBy || !!(META.clears || {})[d.unlockBy]); }

// One run = RUN_WAVES waves; the region changes every 4 waves so a run visits all 5 regions.
const RUN_WAVES = 20;
function biomeIndex(wave) { return Math.min(BIOMES.length - 1, Math.floor((wave - 1) / 4)); }

// Enemy archetypes (all original pixel monsters). Speeds in px/s at 270x480.
const ETYPES = {
  slime: { spr: 'slime', hp: 17, spd: 17, dmg: 1, coin: 3, w: 12, h: 10, color: '#9b59d0' },
  mini: { spr: 'mini', hp: 6, spd: 24, dmg: 1, coin: 1, w: 8, h: 6, color: '#38b764' },
  bat: { spr: 'bat', hp: 11, spd: 28, dmg: 1, coin: 3, w: 12, h: 8, fly: true, color: '#b13e53' },
  wolf: { spr: 'wolf', hp: 12, spd: 42, dmg: 2, coin: 4, w: 14, h: 9, color: '#8a6446' },
  golem: { spr: 'golem', hp: 56, spd: 10, dmg: 3, coin: 6, w: 12, h: 14, color: '#94b0c2' },
  bomber: { spr: 'bomber', hp: 18, spd: 19, dmg: 4, coin: 4, w: 10, h: 10, bomb: true, color: '#29366f' },
  splitter: { spr: 'splitter', hp: 32, spd: 14, dmg: 2, coin: 4, w: 12, h: 10, split: true, color: '#38b764' },
  shield: { spr: 'shield', hp: 34, spd: 12, dmg: 2, coin: 6, w: 12, h: 14, armor: 0.6, color: '#f4f4f4' }, // armor = damage reduction fraction
  shaman: { spr: 'shaman', hp: 26, spd: 11, dmg: 1, coin: 7, w: 12, h: 13, healer: true, color: '#38b764' },
  golemKing: { spr: 'golemKing', hp: 240, spd: 6, dmg: 5, coin: 45, w: 12, h: 14, scale: 2, boss: true, color: '#ef7d57' },
  slimeKing: { spr: 'slimeKing', hp: 210, spd: 7, dmg: 4, coin: 45, w: 12, h: 10, scale: 2, boss: true, kingSplit: true, color: '#b13e53' },
  batLord: { spr: 'batLord', hp: 170, spd: 8, dmg: 4, coin: 45, w: 12, h: 8, scale: 2, boss: true, fly: true, summon: 'bat', color: '#566c86' },
  titan: { spr: 'titan', hp: 480, spd: 5, dmg: 7, coin: 120, w: 12, h: 14, scale: 3, boss: true, summon: 'wolf', final: true, color: '#ef7d57' },
};
const BOSSES = ['golemKing', 'slimeKing', 'batLord', 'titan']; // waves 5, 10, 15, 20 (final)

const ROSTER = [
  { type: 'slime', from: 1, w: n => Math.max(3, 10 - n * 0.3) },
  { type: 'bat', from: 2, w: () => 5 },
  { type: 'wolf', from: 3, w: () => 4 },
  { type: 'golem', from: 6, w: () => 4 },
  { type: 'bomber', from: 8, w: () => 3 },
  { type: 'splitter', from: 9, w: () => 3 },
  { type: 'shield', from: 10, w: () => 3 },
  { type: 'shaman', from: 12, w: () => 2 },
];

function pickEnemyType(n) {
  const pool = ROSTER.filter(r => n >= r.from).map(r => ({ t: r.type, w: r.w(n) }));
  const total = pool.reduce((a, p) => a + p.w, 0);
  let r = Math.random() * total;
  for (const p of pool) { r -= p.w; if (r <= 0) return p.t; }
  return pool[0].t;
}

function buildWave(n, countMul = 1) {
  const q = [];
  const boss = n % 5 === 0;
  let count = Math.round(Math.min(8 + Math.floor(n * 2.1), 60) * countMul);
  if (boss) count = Math.floor(count * 0.6);
  let t = 0.8;
  const pace = Math.max(0.45, 1 - n * 0.015) / Math.sqrt(countMul);
  for (let i = 0; i < count; i++) {
    q.push({ t, type: pickEnemyType(n) });
    t += (i % 5 === 4) ? 1.4 + Math.random() * 0.7 : (0.3 + Math.random() * 0.3) * pace;
  }
  if (boss) q.push({ t: 3, type: BOSSES[Math.min(BOSSES.length - 1, n / 5 - 1)] });
  q.sort((a, b) => a.t - b.t);
  return q;
}
