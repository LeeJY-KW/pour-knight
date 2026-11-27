// ===== Core game: cup pouring, ball physics, multiplier gates, combat =====
const W = 270, H = 480, LS = 1.25; // LS = scale from layout design units (216x384)
const GROUND_Y = 130, PIT_TOP = 150, WALL_L = 8, WALL_R = 262, RAIL_Y = 155, CUP_Y = 169, HUD_H = 22;
const PORTAL_R = 17; // portal drawn radius; balls are captured inside the ring (R - 2)
const BALL_R = 1.5, MAX_BALLS = 750, GRAV = 525, VMAX = 300;
const HERO_X = 10, HERO_W = 14, HERO_H = 17;
const BTN_SPEED = { x: W - 44, y: 25, w: 21, h: 16 };
const BTN_PAUSE = { x: W - 21, y: 25, w: 18, h: 16 };

const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let canvas, ctx;
let S = null; // run state (null = title screen)
let eid = 0;

const world = {
  balls: [], enemies: [], arrows: [], parts: [], pops: [], gates: [], segs: [], queue: [], bolts: [],
  t: 0, waveT: 0, ammo: 0, cupBalls: 0, cupX: W / 2, cupTX: W / 2, tilt: 0, pourAcc: 0,
  fireT: 0, refillT: 0, regenT: 0, banner: null, shake: 0, heroFlash: 0, heroRecoil: 0,
  clearT: 0, overT: 0, killed: 0, total: 0, layoutIdx: -1, biomeIdx: -1,
  // effects
  ambient: [], ambAcc: 0, coinFx: [], coinBump: 0, flash: 0, warnT: 0, hurtT: 0,
  combo: 0, comboT: 0, comboShow: 0, collectGlow: 0, muzzle: 0,
  ballFx: [], cd: {}, rainT: 0, infT: 0, goldPour: 0, cupBump: 0, dropQueue: 0, dropAcc: 0,
  elem: { fire: 0, ice: 0, spark: 0, bomb: 0 }, elemRot: 0,
};
function clearElemAmmo() { for (const k of ELEMS) world.elem[k] = 0; }

// per-trigger cooldown so ball-reward loops (balls -> arrows -> crits -> balls) can't run away
function ready(key, sec) {
  const w = world;
  if ((w.cd[key] || -1e9) + sec > w.t) return false;
  w.cd[key] = w.t;
  return true;
}

// Bonus balls from skills never go into the cup (that let you pour forever).
// They fly to the top of the pit and drop by themselves as "bonus" balls,
// which the cup reload ignores and which can't retrigger ball-return skills.
function giveBalls(n, sx, sy, label = true) {
  const w = world;
  n = Math.round(n);
  if (n <= 0 || !S || S.state !== 'play') return;
  const parts = Math.min(n, 6);
  for (let i = 0; i < parts; i++) {
    const val = Math.floor(n / parts) + (i < n % parts ? 1 : 0);
    if (w.ballFx.length < 40) w.ballFx.push({ sx: sx + rand(-3, 3), sy: sy + rand(-3, 3), t: -i * 0.05, dur: rand(0.45, 0.65), val, arc: rand(25, 50) });
    else w.dropQueue += val;
  }
  if (label) addPop(w.cupX + 14, CUP_Y - 16, '+' + n, '#73eff7', 0.7);
}

// release queued bonus balls from just under the cup, a steady stream that needs no pouring
function releaseDrops(dt) {
  const w = world;
  if (w.dropQueue <= 0) { w.dropAcc = 0; return; }
  w.dropAcc += dt * 30;
  while (w.dropAcc >= 1 && w.dropQueue > 0) {
    w.dropAcc -= 1; w.dropQueue--;
    const kind = rollBallKind(false);
    w.balls.push({
      x: w.cupX + rand(-4, 4), y: CUP_Y + 9, vx: rand(-15, 15), vy: rand(30, 50),
      w: kindValue(kind), mask: 0, bm: 0, tele: false, rev: false, spr: 0, age: 0, kind, bonus: true,
    });
  }
}

const PALETTE_FX = ['#ef7d57', '#ffcd75', '#a7f070', '#73eff7', '#41a6f6', '#d6a8ff', '#f4f4f4'];
const pickOf = arr => arr[Math.floor(Math.random() * arr.length)];

// Weather / ambient particles per biome (battle area only)
const AMBIENT = {
  meadow: { rate: 3, make: () => ({ x: rand(0, W + 20), y: HUD_H, vx: rand(-14, -4), vy: rand(8, 16), col: pickOf(['#a7f070', '#f4f4f4', '#ffcd75']), life: 14, kind: 'leaf', ph: rand(0, 6) }) },
  desert: { rate: 9, make: () => ({ x: W + 2, y: rand(60, GROUND_Y), vx: rand(-140, -80), vy: rand(-4, 4), col: '#ffe1a1', life: 4, kind: 'streak', ph: 0 }) },
  snow: { rate: 14, make: () => ({ x: rand(0, W + 40), y: HUD_H, vx: rand(-12, -2), vy: rand(14, 26), col: '#f4f4f4', life: 12, kind: 'flake', ph: rand(0, 6) }) },
  night: { rate: 2.5, make: () => ({ x: rand(30, W), y: rand(60, GROUND_Y - 6), vx: rand(-6, 6), vy: rand(-4, 4), col: '#a7f070', life: rand(3, 6), kind: 'fly', ph: rand(0, 6) }) },
  volcano: { rate: 8, make: () => ({ x: rand(0, W), y: GROUND_Y, vx: rand(-6, 6), vy: rand(-34, -16), col: pickOf(['#ef7d57', '#ffcd75', '#b13e53']), life: rand(2, 4), kind: 'ember', ph: rand(0, 6) }) },
};
const input = { down: false, keyL: false, keyR: false, keyPour: false };
let skyBg = null, pitBg = null;

function biome() { return BIOMES[Math.max(0, world.biomeIdx)]; }

// ---------------------------------------------------------------- run / wave
function freshRunState(startAt) {
  return {
    wave: startAt, coins: 0, hp: 30, maxHp: 30, atkMul: 1, tempAtk: 1, tempAtkNext: 1,
    cupSize: 30, pourMul: 1, miss: 0, crit: 0, critMul: 3, fireMul: 1, coinMul: 1, pierce: 0,
    gold: 0, rainbow: 0, gateNext: 0, gateBonus: 0, gateWide: 0, bonusGate: 0,
    splash: 0, chain: 0, frost: 0, lifesteal: 0, thorns: 0, execute: 0, bossDmg: 0,
    interest: 0, discount: 0, revive: 0, multishot: 0, quickReload: 0, twin: 0, armor: 0,
    regen: 0, berserk: 0, firstStrike: 0, goldCoin: 0, extraCard: 0, freeReroll: 0,
    luck: 0, poison: 0, knockback: 0, snipe: 0, smite: 0, corpseBomb: 0, slowField: 0, nova: 0,
    barrier: 0, barrierLeft: 0, bounty: 0, recycle: 0, gateChain: 0, doubleFloor: 0,
    goldVal: 3, splashR: 18, chainN: 3, extraShot: 0, victory: false,
    // trigger skills that drop balls into the cup
    critRefill: 0, killRefill: 0, comboRefill: 0, boomRefill: 0, zapRefill: 0, gateJackpot: 0,
    hurtRefill: 0, dodgeShot: 0, dodgeRefill: 0, goldChain: 0, supply: 0, overcharge: 0,
    executeRefill: 0, ballRain: 0, bloodBall: 0, bossLoot: 0, infCup: 0,
    // ball types
    silver: 0, ruby: 0, diamond: 0, fireBall: 0, iceBall: 0, sparkBall: 0, bombBall: 0,
    alchemy: 0, polish: 0, elemAmp: 0, prism: 0, diamondCut: 0, rubyHeart: 0, elemFuse: 0,
    silverVal: 2, rubyVal: 5,
    bought: {}, kills: 0, bossKills: 0, gemsEarned: 0, state: 'play', startAt,
    hitThisWave: false, paused: false, prep: false, diff: 'normal',
  };
}
const diffOf = () => DIFFS[(S && S.diff) || 'normal'] || DIFFS.normal;

function newRun(startAt = 1) {
  S = freshRunState(startAt);
  S.diff = diffUnlocked(META.diff) ? META.diff : 'normal';
  // permanent camp bonuses
  S.maxHp += 4 * metaLv('hp'); S.hp = S.maxHp;
  S.atkMul += 0.05 * metaLv('atk');
  S.cupSize += 3 * metaLv('cup');
  S.coins += 10 * metaLv('coins') + checkpointCoins(startAt);
  S.coinMul += 0.04 * metaLv('coinGain');
  S.miss += 0.02 * metaLv('miss');
  for (let i = 0; i < metaLv('startSkill'); i++) {
    const pool = availableSkills().filter(sk => sk.rarity === 1 && sk.id !== 'heal');
    if (pool.length) grantSkill(pool[randi(0, pool.length - 1)]);
  }
  META.runs++;
  saveMeta();
  world.layoutIdx = -1;
  if (startAt > 1) {
    // checkpoint start: open a preparation shop first
    S.wave = startAt - 1; S.prep = true; S.state = 'shop';
    resetWorld(startAt);
    openShop();
  } else {
    startWave();
  }
}

function resetWorld(forWave = 1) {
  const w = world;
  w.balls.length = 0; w.arrows.length = 0; w.enemies.length = 0; w.parts.length = 0;
  w.pops.length = 0; w.bolts.length = 0; w.queue = []; w.ammo = 0; clearElemAmmo();
  w.banner = null; w.tilt = 0;
  const bi = biomeIndex(forWave);
  if (bi !== w.biomeIdx) { w.biomeIdx = bi; renderSkyBg(); }
  buildLayout(LAYOUTS[w.layoutIdx >= 0 ? w.layoutIdx : 0], 0);
}

function startWave() {
  const w = world;
  w.balls.length = 0; w.arrows.length = 0; w.enemies.length = 0; w.parts.length = 0;
  w.pops.length = 0; w.bolts.length = 0;
  const bi = biomeIndex(S.wave);
  const newBiome = bi !== w.biomeIdx;
  if (newBiome) { w.biomeIdx = bi; renderSkyBg(); }
  const pool = layoutsFor(S.diff).filter(i => i !== w.layoutIdx);
  let idx = S.wave === 1 ? 0 : pool[randi(0, pool.length - 1)];
  w.layoutIdx = idx;
  S.gateBonus = S.gateNext; S.gateNext = 0;
  S.tempAtk = S.tempAtkNext; S.tempAtkNext = 1;
  buildLayout(LAYOUTS[idx], S.gateBonus);
  w.queue = buildWave(S.wave, diffOf().count, S.diff);
  w.total = w.queue.length; w.killed = 0; w.waveT = 0; w.ammo = 0;
  w.cupBalls = S.cupSize; w.refillT = 0; w.fireT = 0; w.pourAcc = 0; clearElemAmmo();
  S.state = 'play'; S.hitThisWave = false;
  S.barrierLeft = S.barrier; w.smiteT = 0; w.rainT = 0; w.infT = 0; w.ballFx.length = 0; w.cd = {};
  w.dropQueue = 0; w.dropAcc = 0;
  w.goldPour = 0;
  if (S.supply) { w.cupBalls += 20 * S.supply; addPop(w.cupX + 14, CUP_Y - 16, '+' + 20 * S.supply, '#73eff7', 1); }
  const boss = S.wave % 5 === 0;
  setBanner(boss ? 'BOSS WAVE ' + S.wave : 'WAVE ' + S.wave, boss ? '#ef7d57' : '#ffcd75');
  if (boss) SFX.play('boss');
  if (newBiome && S.wave > 1) toast(`새로운 지역: ${BIOMES[bi].name}`, '#73eff7');
  if (S.wave > META.best) META.best = S.wave;
  if (S.wave >= 10) unlock('w10');
  META.bestByDiff[S.diff] = Math.max(META.bestByDiff[S.diff] || 0, S.wave);
  if (S.diff === 'nightmare' && S.wave >= 10) unlock('night10');
  checkCostumes();
  saveMeta();
}

function buildLayout(L, bonus) {
  const w = world;
  const wideK = 1 + 0.2 * ((S && S.gateWide) || 0);
  const defs = L.gates.map(g => Object.assign({}, g));
  // difficulty reshapes the map a little: narrower/faster gates, locked or trap gates
  const M = (S && diffOf().map) || {};
  if (M.narrow && M.narrow < 1) defs.forEach(g => { const nw = g.w * M.narrow; g.x += (g.w - nw) / 2; g.w = nw; });
  if (M.moveK) defs.forEach(g => { if (g.move) g.spd = (g.spd || 1) * M.moveK; });
  const plain = g => !g.move && !g.trap && !g.goldify && !g.rev && !g.lock;
  if (M.lockChance && Math.random() < M.lockChance) {
    const c = defs.filter(plain).sort((a, b) => (b.m || 2) - (a.m || 2))[0];
    if (c) { c.lock = 'weight'; c.need = M.need; c.m = (c.m || 2) + 1; }
  }
  if (M.trapChance && Math.random() < M.trapChance) {
    const c = defs.filter(g => plain(g) && (g.m || 2) === 2);
    if (c.length > 1) c[randi(0, c.length - 1)].trap = true;
  }
  const bg = S ? S.bonusGate : 0;
  if (bg > 0) {
    const bw = 50 + 25 * bg;
    defs.push({ x: (216 - bw) / 2, y: 352, w: bw, m: bg >= 3 ? 3 : 2, move: 40, spd: 0.8, bonusGate: true });
  }
  // 1) base geometry (unwidened) with each gate's sweep range
  const base = defs.map(g => {
    const gw = g.w * LS, gx = clamp(g.x * LS, WALL_L + 3, WALL_R - 3 - g.w * LS);
    const amp = g.move ? Math.max(0, Math.min(g.move * LS, gx - WALL_L - 3, WALL_R - 3 - (gx + gw))) : 0;
    return { g, gx, gw, amp, y: Math.round(g.y * LS) };
  });
  // 2) widen each gate only into free space: never past the walls or into a neighbour's sweep range
  const GAP = 6; // min pixels between neighbouring posts
  w.gates = base.map((b, i) => {
    const extra = b.gw * (wideK - 1);
    let roomL = b.gx - b.amp - (WALL_L + 3);
    let roomR = (WALL_R - 3) - (b.gx + b.gw + b.amp);
    base.forEach((o, j) => {
      if (j === i || Math.abs(o.y - b.y) > 24) return; // only gates on the same row can collide
      if (o.gx + o.gw / 2 < b.gx + b.gw / 2) roomL = Math.min(roomL, ((b.gx - b.amp) - (o.gx + o.gw + o.amp) - GAP) / 2);
      else roomR = Math.min(roomR, ((o.gx - o.amp) - (b.gx + b.gw + b.amp) - GAP) / 2);
    });
    // ramps / divider walls crossing this gate's row are hard limits too
    for (const s of L.segs) {
      const y0 = Math.min(s[1], s[3]) * LS, y1 = Math.max(s[1], s[3]) * LS;
      if (y1 < b.y - 12 || y0 > b.y + 12) continue;
      const x0 = Math.min(s[0], s[2]) * LS, x1 = Math.max(s[0], s[2]) * LS;
      if (x1 <= b.gx - b.amp) roomL = Math.min(roomL, (b.gx - b.amp) - x1 - GAP);
      else if (x0 >= b.gx + b.gw + b.amp) roomR = Math.min(roomR, x0 - (b.gx + b.gw + b.amp) - GAP);
    }
    roomL = Math.max(0, roomL); roomR = Math.max(0, roomR);
    let growL = Math.min(extra / 2, roomL), growR = Math.min(extra / 2, roomR);
    // hand unused growth to the other side if it has room
    growR = Math.min(roomR, growR + (extra / 2 - growL));
    growL = Math.min(roomL, growL + (extra / 2 - growR));
    const g = b.g;
    const special = g.trap || g.goldify;
    const gx = b.gx - growL, gw = b.gw + growL + growR;
    return {
      x: gx, bx: gx, y: b.y, w: gw, m: (g.m || 2) + (g.bonusGate || special ? 0 : bonus),
      amp: b.amp, spd: g.spd || 1, ph: Math.random() * 6.28, flash: 0, bonus: !!g.bonusGate,
      trap: !!g.trap, goldify: !!g.goldify, rev: !!g.rev,
      // lock: 'weight' opens once `need` balls rest on it; 'key' opens when a ball touches its key
      lock: g.lock || null, locked: !!g.lock, need: g.need || 20, held: 0,
      key: g.key ? { x: g.key[0] * LS, y: g.key[1] * LS } : null,
    };
  });
  // extra structures
  w.bumpers = (L.bumpers || []).map(b => ({ cx: b[0] * LS, cy: b[1] * LS, r: (b[2] || 6) * LS, orb: (b[3] || 0) * LS, spd: b[4] || 0, ph: b[5] || 0, x: b[0] * LS, y: b[1] * LS, flash: 0 }));
  w.portals = (L.portals || []).map(p => ({ ax: p[0] * LS, ay: p[1] * LS, bx: p[2] * LS, by: p[3] * LS, flash: 0 }));
  w.spinners = (L.spinners || []).map(s => ({ cx: s[0] * LS, cy: s[1] * LS, len: s[2] * LS, spd: s[3], ang: Math.random() * 6.28, x1: 0, y1: 0, x2: 0, y2: 0 }));
  w.springs = (L.springs || []).map(s => {
    const x1 = s[0] * LS, y1 = s[1] * LS, x2 = s[2] * LS, y2 = s[3] * LS;
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    let nx = dy / len, ny = -dx / len;
    if (ny > 0) { nx = -nx; ny = -ny; } // normal always points up, away from the pad
    return {
      x1, y1, x2, y2, nx, ny, comp: 0, top: Math.min(y1, y2),
      minX: Math.min(x1, x2) - 6, maxX: Math.max(x1, x2) + 6, minY: Math.min(y1, y2) - 6, maxY: Math.max(y1, y2) + 6,
    };
  });
  w.zones = (L.zones || [{ x: 6, w: 204, m: 1 }]).map(z => ({ x0: Math.max(WALL_L, z.x * LS), x1: Math.min(WALL_R, (z.x + z.w) * LS), m: z.m }));
  updateStructures(0);
  const mkSeg = (x1, y1, x2, y2, r) => ({
    x1, y1, x2, y2, r,
    minX: Math.min(x1, x2) - r - 3, maxX: Math.max(x1, x2) + r + 3,
    minY: Math.min(y1, y2) - r - 3, maxY: Math.max(y1, y2) + r + 3,
    peg: x1 === x2 && y1 === y2,
  });
  w.segs = L.segs.map(s => mkSeg(s[0] * LS, s[1] * LS, s[2] * LS, s[3] * LS, 1.5));
  if (L.pegs) {
    const p = L.pegs;
    for (let r = 0; r < p.rows; r++) {
      const y = (p.y0 + r * p.dy) * LS;
      const off = r % 2 ? p.dx / 2 : 0;
      for (let x = 18 + off; x <= 204; x += p.dx) w.segs.push(mkSeg(x * LS, y, x * LS, y, 1.5));
    }
  }
  renderPitBg();
}

function setBanner(txt, col, dur = 1.6) { world.banner = { txt, col, t: 0, dur }; }

// ---------------------------------------------------------------- update
function update(dt) {
  const w = world;
  w.t += dt;
  if (w.banner) { w.banner.t += dt; if (w.banner.t > w.banner.dur) w.banner = null; }
  w.shake = Math.max(0, w.shake - dt * 30);
  w.heroFlash = Math.max(0, w.heroFlash - dt);
  w.heroRecoil = Math.max(0, w.heroRecoil - dt);
  updateFx(dt);
  if (!S || S.paused) return;

  const playing = S.state === 'play';

  // cup movement + pouring
  if (input.keyL) w.cupTX -= 190 * dt;
  if (input.keyR) w.cupTX += 190 * dt;
  w.cupTX = clamp(w.cupTX, WALL_L + 9, WALL_R - 9);
  w.cupX += (w.cupTX - w.cupX) * Math.min(1, dt * 16);
  const wantPour = playing && (input.down || input.keyPour) && w.cupBalls > 0;
  w.tilt += ((wantPour ? 1.9 : 0) - w.tilt) * Math.min(1, dt * 14);
  if (wantPour && w.tilt > 1.1) {
    w.pourAcc += dt * 18 * S.pourMul;
    while (w.pourAcc >= 1 && w.cupBalls > 0) {
      w.pourAcc -= 1; w.cupBalls--; spawnBall();
      if (S.twin && Math.random() < 0.15 * S.twin) spawnBall();
    }
    SFX.play('pour');
  } else {
    w.pourAcc = Math.min(w.pourAcc, 0.99);
  }

  updateStructures(dt);
  if (playing) releaseDrops(dt);

  const steps = Math.max(2, Math.ceil(dt / 0.006));
  for (let i = 0; i < steps; i++) stepBalls(dt / steps);

  if (playing) {
    w.waveT += dt;
    while (w.queue.length && w.queue[0].t <= w.waveT) spawnEnemy(w.queue.shift().type);
    // Reload only looks at the cup's own balls: bonus drops and balls held on a weight lock don't count.
    // Normally we also wait for the ammo to run out, but never longer than 2.5s once the pit is clear.
    const cupBallsLeft = w.balls.some(b => !b.bonus && !b.holdGate);
    if (w.cupBalls === 0 && !cupBallsLeft) {
      w.refillT += dt;
      const wait = w.ammo <= 0 ? (S.quickReload ? 0.15 : 0.8) : 2.5;
      if (w.refillT > wait) {
        w.cupBalls = Math.round(S.cupSize * (1 + 0.2 * S.quickReload)); w.refillT = 0;
        if (S.nova) novaBlast();
        if (S.overcharge) w.goldPour = Math.round(w.cupBalls * 0.15 * S.overcharge);
        addPop(w.cupX, CUP_Y - 18, 'RELOAD', '#73eff7', 0.9, 2);
        SFX.play('reload');
      }
    } else w.refillT = 0;
    if (S.ballRain) {
      w.rainT += dt;
      if (w.rainT >= 10) { w.rainT = 0; giveBalls(10 * S.ballRain, w.cupX + rand(-60, 60), HUD_H + 4); }
    }
    if (S.infCup) {
      w.infT += dt;
      if (w.infT >= 6) { w.infT = 0; giveBalls(15, w.cupX, HUD_H + 4); }
    }
    if (S.smite) {
      w.smiteT += dt;
      if (w.smiteT >= 5) { w.smiteT = 0; smiteStrongest(); }
    }
    if (S.regen) {
      w.regenT += dt;
      const iv = 4 / S.regen;
      if (w.regenT >= iv) {
        w.regenT -= iv;
        if (S.hp < S.maxHp) { S.hp++; addPop(HERO_X + 7, GROUND_Y - 30, '+1', '#a7f070', 0.5); }
      }
    }
    if (w.balls.length >= 500) unlock('balls500');
    if (S.coins >= 500) unlock('rich');
  }

  updateHero(dt);
  updateArrows(dt);
  updateEnemies(dt);

  if (playing && w.queue.length === 0 && w.enemies.length === 0) onWaveClear();
  if (S.state === 'victory') {
    w.clearT += dt;
    if (Math.random() < dt * 4) confetti(25);
    if (w.clearT > 2.8) { S.state = 'over'; endRun(); }
  }
  if (S.state === 'cleared') {
    w.clearT += dt;
    if (w.clearT > 1.4) { S.state = 'shop'; openShop(); }
  }
  if (S.state === 'dying') {
    w.overT += dt;
    if (w.overT > 1.6) { S.state = 'over'; endRun(); }
  }
}

function onWaveClear() {
  const w = world;
  S.state = 'cleared'; w.clearT = 0;
  setBanner('CLEAR!', '#a7f070', 1.4);
  SFX.play('clear');
  confetti(S.wave % 5 === 0 ? 120 : 60);
  S.hp = Math.min(S.maxHp, S.hp + Math.round(S.maxHp * diffOf().heal));
  if (S.interest) {
    const g = Math.min(30 * S.interest, Math.floor(S.coins * 0.1 * S.interest));
    if (g > 0) { S.coins += g; addPop(W / 2, 62, 'INTEREST +' + g, '#ffcd75', 1.4); }
  }
  S.gemsEarned += 1 + Math.floor(S.wave / 5);
  unlock('w1');
  if (S.wave % 5 === 0 && !S.hitThisWave) unlock('flawless');
  if (S.wave >= RUN_WAVES) {
    // final boss down: the run is won
    S.victory = true; S.state = 'victory'; w.clearT = 0;
    setBanner('VICTORY!', '#ffcd75', 3);
    confetti(200);
    SFX.play('achieve');
  }
  saveMeta();
}

function endRun() {
  if (S.victory) {
    S.gemsEarned += 25;
    META.clears[S.diff] = 1;
    unlock({ normal: 'clearN', hard: 'clearH', nightmare: 'clearX' }[S.diff]);
  }
  const gems = Math.round(S.gemsEarned * (1 + 0.1 * metaLv('gemGain')) * diffOf().gem);
  S.finalGems = gems;
  META.gems += gems;
  META.best = Math.max(META.best, S.wave);
  META.bosses += S.bossKills;
  META.run = null;
  saveMeta();
  checkCostumes();
  showGameOver();
}

// ---------------------------------------------------------------- moving structures
function updateStructures(dt) {
  const w = world;
  for (const g of w.gates) {
    if (g.amp) g.x = g.bx + Math.sin(w.t * g.spd + g.ph) * g.amp;
    g.flash = Math.max(0, g.flash - dt);
  }
  for (const b of w.bumpers || []) {
    b.x = b.cx + Math.cos(w.t * b.spd + b.ph) * b.orb;
    b.y = b.cy + Math.sin(w.t * b.spd + b.ph) * b.orb * 0.6;
    b.flash = Math.max(0, b.flash - dt);
  }
  for (const s of w.spinners || []) {
    s.ang += s.spd * dt;
    const c = Math.cos(s.ang) * s.len / 2, sn = Math.sin(s.ang) * s.len / 2;
    s.x1 = s.cx - c; s.y1 = s.cy - sn; s.x2 = s.cx + c; s.y2 = s.cy + sn;
  }
  for (const p of w.portals || []) p.flash = Math.max(0, p.flash - dt);
  for (const s of w.springs || []) s.comp = Math.max(0, s.comp - dt);
}

// ---------------------------------------------------------------- balls
// ---- ball types. kind ids 0/1/2 kept for older code paths (white/gold/rainbow).
const BALL_KINDS = [
  { id: 'white', name: '흰 구슬', col: '#f4f4f4' },
  { id: 'gold', name: '금 구슬', col: '#ffcd75', edge: '#f4b41b' },
  { id: 'rainbow', name: '무지개 구슬', col: null },
  { id: 'silver', name: '은 구슬', col: '#c9d6e3', edge: '#566c86' },
  { id: 'ruby', name: '루비 구슬', col: '#ef4f5f', edge: '#5d275d' },
  { id: 'diamond', name: '다이아몬드 구슬', col: '#e8fbff', edge: '#41a6f6' },
  { id: 'fire', name: '화염 구슬', col: '#ef7d57', edge: '#b13e53', elem: 'fire' },
  { id: 'ice', name: '얼음 구슬', col: '#73eff7', edge: '#3b5dc9', elem: 'ice' },
  { id: 'spark', name: '번개 구슬', col: '#ffe66d', edge: '#f4b41b', elem: 'spark' },
  { id: 'bomb', name: '폭탄 구슬', col: '#566c86', edge: '#1a1c2c', core: '#ef7d57', elem: 'bomb' },
];
const ELEMS = ['fire', 'ice', 'spark', 'bomb'];
const ELEM_COL = { fire: '#ef7d57', ice: '#73eff7', spark: '#ffe66d', bomb: '#94b0c2', all: '#d6a8ff' };
const GEM_KINDS = [1, 3, 4, 5]; // gold, silver, ruby, diamond -> "보석 세공" boosts these

function kindValue(kind) {
  let v = 1;
  if (kind === 1) v = S.goldVal || 3;
  else if (kind === 2) v = 10;
  else if (kind === 3) v = S.silverVal || 2;
  else if (kind === 4) v = S.rubyVal || 5;
  else if (kind === 5) v = 25;
  if (S.polish && GEM_KINDS.includes(kind)) v *= 1 + 0.5 * S.polish;
  return v;
}

function rollBallKind(useGoldPour = true) {
  const w = world, r = Math.random;
  if (S.diamond && r() < 0.005 * S.diamond) return 5;
  if (S.rainbow && r() < 0.02 * S.rainbow) return 2;
  for (const [k, lv, p] of [[6, S.fireBall, 0.06], [7, S.iceBall, 0.06], [8, S.sparkBall, 0.06], [9, S.bombBall, 0.05]]) {
    if (lv && r() < p * lv) return k;
  }
  if (S.ruby && r() < 0.04 * S.ruby) return 4;
  if ((useGoldPour && w.goldPour > 0) || r() < S.gold) { if (useGoldPour && w.goldPour > 0) w.goldPour--; return 1; }
  if (S.silver && r() < 0.15 * S.silver) return 3;
  return 0;
}

// 연금술: white -> silver -> gold -> ruby
const ALCHEMY_UP = { 0: 3, 3: 1, 1: 4 };
function upgradeBall(b) {
  const next = ALCHEMY_UP[b.kind];
  if (next === undefined) return false;
  b.w = b.w / kindValue(b.kind) * kindValue(next);
  b.kind = next;
  return true;
}

function spawnBall() {
  const w = world;
  const a = w.tilt, ca = Math.cos(a), sa = Math.sin(a);
  const lx = 7, ly = -6; // cup lip in local coords
  const x = w.cupX + lx * ca - ly * sa;
  const y = CUP_Y + lx * sa + ly * ca;
  const kind = rollBallKind();
  let val = kindValue(kind);
  if (S.bloodBall && S.hp < S.maxHp * 0.3) val *= 2;
  w.balls.push({
    x, y, vx: rand(-17, 17) + (w.cupTX - w.cupX) * 0.6, vy: rand(12, 36),
    w: val, mask: 0, bm: 0, tele: false, rev: false, spr: 0, age: 0, kind,
  });
}

// clone a ball n times (used by gates, bumpers). Over the cap, the value folds into the original.
function spawnClones(b, n, spread = 50, xmin = -1e9, xmax = 1e9) {
  const w = world;
  const room = MAX_BALLS - w.balls.length;
  const k = Math.max(0, Math.min(n, room));
  const w0 = b.w;
  for (let i = 0; i < k; i++) {
    w.balls.push({
      x: clamp(b.x + rand(-2, 2), xmin, xmax), y: b.y + 0.5,
      vx: b.vx + rand(-spread, spread), vy: b.vy * rand(0.75, 1),
      w: w0, mask: b.mask, bm: b.bm, tele: b.tele, rev: b.rev, spr: b.spr, age: 0, kind: b.kind, bonus: b.bonus,
    });
  }
  if (k < n) b.w += (n - k) * w0;
}

function collideSeg(b, x1, y1, x2, y2, r) {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  let t = l2 > 0 ? ((b.x - x1) * dx + (b.y - y1) * dy) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = x1 + dx * t, cy = y1 + dy * t;
  let nx = b.x - cx, ny = b.y - cy;
  const d2 = nx * nx + ny * ny;
  const rr = r + BALL_R;
  if (d2 >= rr * rr) return false;
  let d = Math.sqrt(d2);
  if (d < 1e-4) { nx = 0; ny = -1; d = 1; } else { nx /= d; ny /= d; }
  b.x = cx + nx * rr; b.y = cy + ny * rr;
  const vn = b.vx * nx + b.vy * ny;
  if (vn < 0) {
    b.vx -= 1.35 * vn * nx; b.vy -= 1.35 * vn * ny;
    b.vx *= 0.985; b.vy *= 0.985;
  }
  return true;
}

function stepBalls(dt) {
  const w = world, balls = w.balls, gates = w.gates, segs = w.segs;
  for (let i = balls.length - 1; i >= 0; i--) {
    const b = balls[i];
    // balls resting on a weight lock stay frozen in place until it opens (never collected, never block reload)
    if (b.holdGate) { if (b.holdGate.locked) continue; b.holdGate = null; }
    b.age += dt;
    const py = b.y;
    b.vy += GRAV * dt;
    if (b.vy > VMAX) b.vy = VMAX;
    if (b.vx > VMAX) b.vx = VMAX; else if (b.vx < -VMAX) b.vx = -VMAX;
    b.x += b.vx * dt; b.y += b.vy * dt;

    if (b.x < WALL_L + BALL_R) { b.x = WALL_L + BALL_R; b.vx = Math.abs(b.vx) * 0.5; }
    else if (b.x > WALL_R - BALL_R) { b.x = WALL_R - BALL_R; b.vx = -Math.abs(b.vx) * 0.5; }
    if (b.y < PIT_TOP + 8) { b.y = PIT_TOP + 8; if (b.vy < 0) b.vy = -b.vy * 0.3; } // ceiling for launched balls

    // portal: once per ball, warps it back up so it can pass the gates again
    let warped = false;
    if (!b.tele) {
      for (const p of w.portals) {
        const dx = b.x - p.ax, dy = b.y - p.ay;
        if (dx * dx + dy * dy < (PORTAL_R - 2) * (PORTAL_R - 2)) {
          b.tele = true; b.mask = 0;
          b.x = p.bx + rand(-3, 3); b.y = p.by; b.vx = rand(-30, 30); b.vy = 30;
          p.flash = 0.15; warped = true;
          SFX.play('portal');
          break;
        }
      }
    }

    if (!warped) {
      for (let g = 0; g < gates.length; g++) {
        const gt = gates[g];
        if (b.mask & (1 << g)) continue;
        if (py < gt.y && b.y >= gt.y && b.x >= gt.x && b.x <= gt.x + gt.w) {
          if (gt.locked) {
            if (gt.lock === 'weight') { holdBall(b, gt); break; }
            b.mask |= 1 << g; continue; // key lock: the ball just drops through, nothing happens
          }
          const firstGate = b.mask === 0;
          b.mask |= 1 << g;
          if (gt.trap) {
            gt.flash = 0.08;
            if (Math.random() < 0.5) { b.dead = true; SFX.play('trap'); break; }
          } else if (gt.goldify) {
            if (b.kind === 0 || b.kind === 3) { b.w = b.w / kindValue(b.kind) * kindValue(1); b.kind = 1; }
            gt.flash = 0.08;
            SFX.play('gate');
          } else {
            const before = w.balls.length;
            multiplyBall(b, gt, firstGate ? S.gateChain : 0);
            if (gt.rev && !b.rev) reverseLaunch(b, gt, g, before);
          }
        }
      }
    }
    // key locks: any ball touching the key opens its gate
    for (const gt of gates) {
      if (!gt.locked || !gt.key) continue;
      const dx = b.x - gt.key.x, dy = b.y - gt.key.y;
      if (dx * dx + dy * dy < 81) unlockGate(gt);
    }
    // clone bumpers: bounce, and split the ball once per bumper
    for (let k = 0; k < w.bumpers.length; k++) {
      const bp = w.bumpers[k];
      const dx = b.x - bp.x, dy = b.y - bp.y, rr = bp.r + BALL_R, d2 = dx * dx + dy * dy;
      if (d2 >= rr * rr) continue;
      const d = Math.sqrt(d2) || 1, nx = dx / d, ny = dy / d;
      b.x = bp.x + nx * rr; b.y = bp.y + ny * rr;
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) { b.vx -= 1.8 * vn * nx; b.vy -= 1.8 * vn * ny; }
      b.vx += nx * 25; b.vy += ny * 25;
      if (!(b.bm & (1 << k))) {
        b.bm |= 1 << k;
        spawnClones(b, 1, 60);
        bp.flash = 0.12;
        SFX.play('bump');
      }
    }
    // springs: sloped pads that launch balls back up along their normal (twice per ball at most).
    // The first launch re-arms the gates above. Used-up balls just roll off the slope.
    for (const sp of w.springs) {
      if (b.x < sp.minX || b.x > sp.maxX || b.y < sp.minY || b.y > sp.maxY) continue;
      const into = b.vx * sp.nx + b.vy * sp.ny < -20; // moving into the pad, not resting on it
      if (!collideSeg(b, sp.x1, sp.y1, sp.x2, sp.y2, 2)) continue;
      if (into && b.spr < 2) {
        if (b.spr === 0) w.gates.forEach((o, j) => { if (o.y < sp.top) b.mask &= ~(1 << j); });
        b.spr++;
        const speed = rand(350, 400);
        b.vy = -speed; b.vx = sp.nx * speed * 0.45 + rand(-25, 25);
        sp.comp = 0.15;
        SFX.play('spring');
      }
    }
    // spinners: rotating bars that knock balls around
    for (const s of w.spinners) {
      if (Math.abs(b.x - s.cx) > s.len / 2 + 4 || Math.abs(b.y - s.cy) > s.len / 2 + 4) continue;
      if (collideSeg(b, s.x1, s.y1, s.x2, s.y2, 1.5)) {
        const rx = b.x - s.cx, ry = b.y - s.cy;
        b.vx += -ry * s.spd * 0.9; b.vy += rx * s.spd * 0.9;
      }
    }
    for (let s = 0; s < segs.length; s++) {
      const sg = segs[s];
      if (b.y < sg.minY || b.y > sg.maxY || b.x < sg.minX || b.x > sg.maxX) continue;
      collideSeg(b, sg.x1, sg.y1, sg.x2, sg.y2, sg.r);
    }
    for (let g = 0; g < gates.length; g++) {
      const gt = gates[g];
      if (b.y < gt.y - 13 || b.y > gt.y + 13) continue;
      if (Math.abs(b.x - gt.x) < 4) collideSeg(b, gt.x, gt.y - 9, gt.x, gt.y + 9, 1);
      else if (Math.abs(b.x - gt.x - gt.w) < 4) collideSeg(b, gt.x + gt.w, gt.y - 9, gt.x + gt.w, gt.y + 9, 1);
    }

    // a ball that has (nearly) stopped somewhere for a while counts as landed,
    // so nothing perched on a peg, post or pad can block the cup reload
    if (b.vx * b.vx + b.vy * b.vy < 400) b.still = (b.still || 0) + dt; else b.still = 0;

    if (b.dead || b.y > H - 6 || b.age > 12 || b.still > 1.2) {
      if (!b.dead) collectBall(b);
      else if (w.parts.length < 280) w.parts.push({ x: b.x, y: b.y, vx: rand(-20, 20), vy: rand(-30, 0), life: 0.25, max: 0.25, col: '#b13e53', g: 100 });
      balls[i] = balls[balls.length - 1];
      balls.pop();
    }
  }
}

// park a ball on a locked weight gate, stacked in neat rows above the bar
function holdBall(b, gt) {
  const idx = gt.held++;
  const cols = Math.max(1, Math.floor((gt.w - 4) / 4));
  const row = Math.floor(idx / cols);
  b.holdGate = gt;
  b.x = gt.x + 3 + (idx % cols) * 4 + (row % 2) * 2;
  b.y = gt.y - 9 - Math.min(row, 5) * 3;
  b.vx = 0; b.vy = 0;
  SFX.play('bump');
  if (gt.held >= gt.need) unlockGate(gt);
}

function unlockGate(gt) {
  const w = world;
  if (!gt.locked) return;
  gt.locked = false;
  gt.flash = 0.35;
  for (const b of w.balls) {
    if (b.holdGate === gt) { b.holdGate = null; b.vx = rand(-25, 25); b.vy = rand(20, 60); }
  }
  const cx = gt.x + gt.w / 2;
  addPop(cx, gt.y - 18, 'UNLOCK', '#ffcd75', 1, 2);
  for (let k = 0; k < 16 && w.parts.length < 320; k++) {
    w.parts.push({ x: cx + rand(-gt.w / 2, gt.w / 2), y: gt.y, vx: rand(-40, 40), vy: rand(-90, -20), life: 0.5, max: 0.5, col: k % 2 ? '#ffcd75' : '#f4f4f4', g: 220 });
  }
  if (gt.key) gt.keyGot = true;
  w.shake = Math.max(w.shake, 3);
  SFX.play('achieve');
}

function multiplyBall(b, gt, extra = 0) {
  const w = world;
  if (S && S.alchemy && Math.random() < 0.04 * S.alchemy && upgradeBall(b) && w.parts.length < 280) {
    w.parts.push({ x: b.x, y: gt.y - 4, vx: 0, vy: -40, life: 0.3, max: 0.3, col: BALL_KINDS[b.kind].col, g: 0 });
  }
  spawnClones(b, gt.m - 1 + extra, 50, gt.x + 1, gt.x + gt.w - 1);
  b.vx += rand(-18, 18);
  gt.flash = 0.1;
  if (S && S.gateJackpot && Math.random() < 0.02 * S.gateJackpot && ready('jackpot', 2.5)) {
    // jackpot: a burst of extra balls pours straight out of this gate
    addPop(b.x, gt.y - 12, 'JACKPOT', '#ffcd75', 0.9, 2);
    spawnClones(b, 8, 80, gt.x + 1, gt.x + gt.w - 1);
    for (let k = 0; k < 10 && w.parts.length < 300; k++) w.parts.push({ x: b.x, y: gt.y, vx: rand(-60, 60), vy: rand(-70, -20), life: 0.4, max: 0.4, col: k % 2 ? '#ffcd75' : '#f4f4f4', g: 200 });
  }
  if (Math.random() < 0.3 && w.parts.length < 260) {
    w.parts.push({ x: b.x, y: gt.y - 3, vx: rand(-20, 20), vy: rand(-45, -15), life: 0.25, max: 0.25, col: gt.bonus ? '#ffcd75' : '#f4f4f4', g: 120 });
  }
  SFX.play('gate');
}

// reverse gate: fling the ball (and its fresh clones) back upward; gates above count again
function reverseLaunch(b, gt, gi, start) {
  const w = world;
  let clearMask = 0;
  w.gates.forEach((o, j) => { if (j !== gi && o.y < gt.y) clearMask |= 1 << j; });
  const launch = o => {
    o.rev = true;
    o.mask &= ~clearMask;
    o.vy = -rand(370, 420);
    o.vx = o.vx * 0.5 + rand(-40, 40);
  };
  launch(b);
  for (let i = start; i < w.balls.length; i++) if (!w.balls[i].rev) launch(w.balls[i]); // its fresh clones
  SFX.play('spring');
}

function collectBall(b) {
  const w = world;
  let mult = 1;
  for (const z of w.zones) if (b.x >= z.x0 && b.x < z.x1) { mult = z.m; break; }
  if (S.doubleFloor && mult < 2 && b.x > WALL_L + (WALL_R - WALL_L) / 3 && b.x < WALL_L + (WALL_R - WALL_L) * 2 / 3) mult = 2;
  // only the cup's own balls can come back, and they come back as bonus drops, so this can't loop
  if (S.recycle && !b.bonus && Math.random() < 0.08 * S.recycle) w.dropQueue++;
  if (mult > 1) { b.w *= mult; if (Math.random() < 0.3 && w.parts.length < 300) w.parts.push({ x: b.x, y: H - 10, vx: 0, vy: -40, life: 0.3, max: 0.3, col: '#ffcd75', g: 0 }); }
  w.ammo += b.w;
  w.collectGlow = Math.min(1, w.collectGlow + 0.04 * Math.min(b.w, 10));
  if (b.kind === 1 && !b.bonus && S.goldChain && ready('goldChain', 0.25)) giveBalls(1, b.x, H - 8, false);
  const el = BALL_KINDS[b.kind].elem;
  if (el) w.elem[el] += b.w * mult;
  if (b.kind === 2 && S.prism) { for (const k of ELEMS) w.elem[k] += 10; w.ammo += 40; addPop(b.x, H - 24, 'PRISM', '#d6a8ff', 0.8); }
  if (b.kind === 4 && S.rubyHeart && S.hp < S.maxHp && ready('rubyHeart', 1)) { S.hp++; addPop(HERO_X + 7, GROUND_Y - 30, '+1', '#ef4f5f', 0.5); }
  if (b.kind === 5) {
    addPop(b.x, H - 24, 'DIAMOND', '#e8fbff', 1, 2);
    if (S.diamondCut) {
      const dmg = S.cupSize * S.atkMul * 1.5;
      for (const e of w.enemies) if (e.hp > 0 && e.x < W) damageEnemy(e, dmg, true, true);
      w.flash = Math.max(w.flash, 0.12); w.shake = Math.max(w.shake, 4);
      giveBalls(10, b.x, H - 10);
    }
  }
  if (b.kind === 1 && S.goldCoin && Math.random() < 0.5) S.coins += 1;
  if (Math.random() < 0.25 && w.parts.length < 300) {
    w.parts.push({ x: b.x, y: H - 7, vx: rand(-12, 12), vy: rand(-50, -18), life: 0.3, max: 0.3, col: b.kind ? (BALL_KINDS[b.kind].col || '#ffcd75') : '#73eff7', g: 0 });
  }
}

// ---------------------------------------------------------------- hero / arrows
function pickTarget(exclude) {
  let best = null;
  for (const e of world.enemies) {
    if (e.phased) continue;
    if (e.hp > 0 && e !== exclude && e.x < W - 6 && (!best || e.x < best.x)) best = e;
  }
  return best;
}

function updateHero(dt) {
  const w = world;
  if (!S || S.state === 'dying' || S.state === 'over') return;
  const iv = 1 / (14 * S.fireMul);
  const tgt = pickTarget();
  if (!tgt || w.ammo <= 0) { w.fireT = Math.min(w.fireT + dt, iv); return; }
  w.fireT += dt;
  let guard = 0;
  while (w.fireT >= iv && w.ammo > 0 && guard++ < 10) { w.fireT -= iv; fireArrow(tgt); }
}

function shootAt(t, dmg, crit, elem = null) {
  const sx = HERO_X + HERO_W, sy = GROUND_Y - 7 + rand(-1, 1);
  const lead = t.state === 'walk' ? t.spd * 0.15 : 0;
  const tx = t.x + t.w / 2 - lead, ty = t.y + t.h / 2;
  const dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy) || 1;
  const sp = 450;
  world.arrows.push({ x: sx, y: sy, vx: dx / d * sp, vy: dy / d * sp, dmg, crit, pierce: S.pierce, hits: [], elem });
}

// pick which element (if any) this arrow carries, spending that element's ammo
function takeElement(bundle) {
  const w = world;
  const pools = ELEMS.filter(k => w.elem[k] > 0.5);
  if (!pools.length) return null;
  if (S.elemFuse) {
    for (const k of pools) w.elem[k] = Math.max(0, w.elem[k] - bundle / pools.length);
    return 'all';
  }
  const k = pools[w.elemRot++ % pools.length];
  w.elem[k] = Math.max(0, w.elem[k] - bundle);
  return k;
}

function fireArrow(t) {
  const w = world;
  const bundle = Math.min(w.ammo, Math.max(1, Math.ceil(w.ammo / 36)));
  w.ammo -= bundle;
  const elem = takeElement(bundle);
  if (w.ammo <= 0) clearElemAmmo();
  let dmg = bundle * S.atkMul * S.tempAtk;
  if (S.berserk) dmg *= 1 + (1 - S.hp / S.maxHp);
  const crit = Math.random() < S.crit;
  if (crit) dmg *= S.critMul;
  if (crit && S.critRefill && ready('critRefill', 0.6)) giveBalls(2 * S.critRefill, HERO_X + HERO_W, GROUND_Y - 10, false);
  shootAt(t, dmg, crit, elem);
  const extraP = 0.25 * S.multishot + S.extraShot;
  const extra = Math.floor(extraP) + (Math.random() < extraP % 1 ? 1 : 0);
  for (let k = 0; k < extra; k++) shootAt(pickTarget(t) || t, dmg, crit, elem);
  w.heroRecoil = 0.06;
  w.muzzle = 0.05;
  SFX.play('shoot');
}

function updateArrows(dt) {
  const w = world, arr = w.arrows;
  for (let i = arr.length - 1; i >= 0; i--) {
    const a = arr[i];
    a.x += a.vx * dt; a.y += a.vy * dt;
    let dead = false;
    for (const e of w.enemies) {
      if (e.hp <= 0 || e.phased || a.hits.includes(e.id)) continue;
      if (a.x >= e.x - 1 && a.x <= e.x + e.w + 1 && a.y >= e.y - 1 && a.y <= e.y + e.h + 1) {
        a.hits.push(e.id);
        const before = e.hp;
        hitEnemy(e, a);
        if (e.hp <= 0) {
          a.dmg -= before; // overkill carries on to the next enemy
          if (a.dmg < 0.5) { dead = true; break; }
        } else if (a.pierce > 0) {
          a.pierce--;
        } else { dead = true; break; }
      }
    }
    if (dead || a.x > W + 8 || a.y > GROUND_Y + 2 || a.y < -10 || a.x < -10) {
      arr[i] = arr[arr.length - 1];
      arr.pop();
    }
  }
}

function hitEnemy(e, a) {
  let dmg = a.dmg;
  if (S.firstStrike && e.hp >= e.maxHp) dmg *= 2;
  if (e.boss && S.bossDmg) dmg *= 1 + 0.5 * S.bossDmg;
  if (S.snipe && e.x > W * 0.5) dmg *= 1 + 0.4 * S.snipe;
  if (S.poison) { e.poisonDps = Math.max(e.poisonDps || 0, a.dmg * 0.1 * S.poison); e.poisonT = 3; }
  // knockback: each enemy can only be pushed once every 0.7s, a little further per level
  if (S.knockback && !e.boss && !e.unstoppable && !(e.kbT > 0)) { e.x = Math.min(W + 6, e.x + [0, 4, 6, 8][Math.min(3, S.knockback)]); e.kbT = 0.7; }
  if (e.armor) dmg *= 1 - e.armor;
  damageEnemy(e, dmg, a.crit);
  if (a.elem && !e.dead) applyElem(e, a);
  if (S.frost && !e.unstoppable) e.slowT = 2;
  if (S.splash) splashAround(e, a.dmg * 0.3 * S.splash);
  if (S.chain && Math.random() < 0.05 + 0.1 * S.chain) chainFrom(e, a.dmg * 0.5);
  if (S.execute && e.hp > 0 && !e.boss && e.hp <= e.maxHp * 0.15) {
    addPop(e.x + e.w / 2, e.y - 12, 'EXECUTE', '#b13e53', 0.6);
    if (S.executeRefill) giveBalls(4, e.x + e.w / 2, e.y + e.h / 2, false);
    damageEnemy(e, e.hp + 1, false, true);
  }
  return dmg;
}

// elemental arrow effects (from 화염/얼음/번개/폭탄 구슬)
function applyElem(e, a) {
  const amp = 1 + 0.5 * S.elemAmp;
  const all = a.elem === 'all';
  if (all || a.elem === 'fire') { e.burnDps = Math.max(e.burnDps || 0, a.dmg * 0.15 * amp); e.burnT = 3; }
  if (all || a.elem === 'ice') {
    if (!e.unstoppable) e.slowT = Math.max(e.slowT, 2);
    if (!e.boss && !e.unstoppable && Math.random() < 0.08 * amp) { e.freezeT = 1.2; addPop(e.x + e.w / 2, e.y - 10, 'FREEZE', '#73eff7', 0.5, 1); }
  }
  if (all || a.elem === 'spark') chainFrom(e, a.dmg * 0.4 * amp, 2);
  if (all || a.elem === 'bomb') {
    splashAround(e, a.dmg * 0.5 * amp, 26);
    SFX.play('boom');
  }
}

function splashAround(src, amt, radius) {
  const cx = src.x + src.w / 2, cy = src.y + src.h / 2;
  let hits = 1;
  for (const o of world.enemies) {
    if (o === src || o.hp <= 0) continue;
    const r = radius || S.splashR || 18;
    if (Math.abs(o.x + o.w / 2 - cx) < r && Math.abs(o.y + o.h / 2 - cy) < r) { damageEnemy(o, amt, false, true); hits++; }
  }
  if (S.boomRefill && hits >= 3 && ready('boomRefill', 0.5)) giveBalls(4 * S.boomRefill, cx, cy);
  if (world.parts.length < 280) {
    for (let k = 0; k < 6; k++) {
      const an = k / 6 * 6.28;
      world.parts.push({ x: cx, y: cy, vx: Math.cos(an) * 60, vy: Math.sin(an) * 60, life: 0.18, max: 0.18, col: '#ef7d57', g: 0 });
    }
  }
}

function chainFrom(src, amt, maxN) {
  const cx = src.x + src.w / 2, cy = src.y + src.h / 2;
  const near = world.enemies
    .filter(o => o !== src && o.hp > 0 && Math.abs(o.x - src.x) < 75)
    .sort((a, b) => Math.abs(a.x - src.x) - Math.abs(b.x - src.x))
    .slice(0, maxN || S.chainN || 3);
  let px = cx, py = cy;
  for (const o of near) {
    const ox = o.x + o.w / 2, oy = o.y + o.h / 2;
    world.bolts.push({ x1: px, y1: py, x2: ox, y2: oy, life: 0.15 });
    damageEnemy(o, amt, false, true);
    px = ox; py = oy;
  }
  if (near.length) SFX.play('zap');
  if (S.zapRefill && near.length && ready('zapRefill', 0.4)) giveBalls(near.length * S.zapRefill, cx, cy, false);
}

// ---------------------------------------------------------------- enemies
function spawnEnemy(type, at) {
  const d = ETYPES[type];
  const n = S.wave;
  const sc = d.scale || 1;
  // gentle early curve, steeper after wave 8 so long runs eventually end
  const D = diffOf();
  const hs = D.hp * Math.pow(1.21, n - 1) * Math.pow(1.09, Math.max(0, n - 8));
  const e = {
    id: ++eid, type, spr: d.spr, boss: !!d.boss,
    x: at ? at.x : W + rand(2, 12), w: d.w * sc, h: d.h * sc,
    hp: Math.ceil(d.hp * hs * (at && at.hpK ? at.hpK : 1)), spd: d.spd * D.spd * rand(0.9, 1.1),
    dmg: Math.max(1, Math.round(d.dmg * D.dmg * (1 + 0.15 * (n - 1)))),
    coin: d.coin, color: d.color, fly: !!d.fly,
    armor: d.armor || 0,
    bomb: !!d.bomb, split: !!d.split, healer: !!d.healer, kingSplit: !!d.kingSplit, summon: d.summon || null, final: !!d.final,
    atkT: 0.3, atkCD: d.boss ? 1.6 : 1.1, abT: 2.5, flash: 0, anim: Math.random() * 3, lunge: 0, slowT: 0,
    stopX: HERO_X + HERO_W + 4 + rand(0, 12) + (d.boss ? 4 : 0), state: 'walk', splits: 0, dead: false,
  };
  e.phase = !!d.phase; e.unstoppable = !!d.unstoppable; e.phaseT = rand(0, 3);
  const rank = DIFF_RANK[S.diff] || 0;
  // harder difficulties: some ordinary enemies spawn as elites with an extra trait
  if (!e.boss && !at && S.wave >= 3 && Math.random() < D.elite) {
    e.elite = pickOf(['swift', 'stone', 'regen']);
    e.hp *= 2.2; e.coin *= 3;
    if (e.elite === 'swift') e.spd *= 1.5;
    if (e.elite === 'stone') e.armor = Math.min(0.75, e.armor + 0.35);
  }
  if (e.boss) { e.enrage = rank >= 1; if (rank >= 2 && !e.summon) e.summon = 'slime'; }
  e.maxHp = e.hp;
  if (e.fly) e.baseY = GROUND_Y - e.h - (d.boss ? 34 : rand(18, 40));
  else e.baseY = GROUND_Y - e.h;
  if (at && at.y !== undefined && !e.fly) e.baseY = GROUND_Y - e.h;
  e.y = e.baseY;
  world.enemies.push(e);
  if (e.boss) {
    world.shake = 6; world.warnT = 1.8;
    setBanner('WARNING', '#ef4f5f', 1.6);
    SFX.play('warning');
  }
  return e;
}

function damageEnemy(e, dmg, crit, quiet) {
  const w = world;
  if (e.dead) return;
  e.hp -= dmg;
  e.flash = 0.08;
  if (dmg >= 1000) unlock('hit1k');
  if (!quiet || w.pops.length < 12) {
    if (w.pops.length < 18) addPop(e.x + e.w / 2 + rand(-3, 3), e.y - 8, fmt(Math.max(1, dmg)), crit ? '#ffcd75' : '#f4f4f4', 0.5, crit ? 2 : 1);
  }
  if (w.parts.length < 260) {
    for (let k = 0; k < 2; k++) w.parts.push({ x: e.x + 2, y: e.y + e.h / 2, vx: rand(-25, 40), vy: rand(-50, 12), life: 0.25, max: 0.25, col: '#f4f4f4', g: 250 });
  }
  SFX.play('hit');
  // slime king splits off minions at 66% and 33%
  if (e.kingSplit && e.hp > 0) {
    const thr = e.splits === 0 ? 0.66 : e.splits === 1 ? 0.33 : -1;
    if (e.hp < e.maxHp * thr) {
      e.splits++;
      for (let k = 0; k < 3; k++) spawnEnemy('slime', { x: e.x + rand(-4, 20) });
      w.total += 3;
      w.shake = 4;
    }
  }
  if (e.hp <= 0) killEnemy(e);
}

let corpseDepth = 0;

// cup refilled: shockwave on every enemy on screen
function novaBlast() {
  const w = world;
  const dmg = S.cupSize * S.atkMul * 0.5 * S.nova;
  for (const e of w.enemies) if (e.hp > 0 && e.x < W) damageEnemy(e, dmg, false, true);
  w.shake = Math.max(w.shake, 4);
  w.flash = Math.max(w.flash, 0.08);
  SFX.play('boom');
}

// lightning from the sky on the enemy with the most hp
function smiteStrongest() {
  const w = world;
  let t = null;
  for (const e of w.enemies) if (e.hp > 0 && e.x < W - 4 && (!t || e.hp > t.hp)) t = e;
  if (!t) return;
  const cx = t.x + t.w / 2;
  w.bolts.push({ x1: cx + rand(-10, 10), y1: HUD_H, x2: cx, y2: t.y + t.h / 2, life: 0.22 });
  damageEnemy(t, t.maxHp * (t.boss ? 0.03 : 0.12) * S.smite, true);
  SFX.play('zap');
}

function killEnemy(e, noReward) {
  const w = world;
  if (e.dead) return;
  e.dead = true; e.hp = 0;
  if (!noReward) {
    const gain = Math.ceil(e.coin * S.coinMul * (1 + (S.wave - 1) * 0.04));
    S.coins += gain; S.kills++; w.killed++;
    META.kills++;
    if (META.kills >= 1000) unlock('k1000');
    if (META.kills >= 10000) unlock('k10000');
    addPop(e.x + e.w / 2, e.y - 12, '+' + gain, '#ffcd75', 0.8);
    const nCoins = Math.min(e.boss ? 8 : 3, 1 + Math.floor(gain / 8));
    for (let k = 0; k < nCoins && w.coinFx.length < 36; k++) {
      w.coinFx.push({ sx: e.x + e.w / 2 + rand(-4, 4), sy: e.y + rand(0, e.h), t: -k * 0.05, dur: rand(0.45, 0.7), arc: rand(20, 45) });
    }
    w.combo++; w.comboT = 1.2;
    if (w.combo >= 5) { w.comboShow = 1.2; if (w.combo % 5 === 0) SFX.play('combo', w.combo); }
    const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
    if (S.comboRefill && w.combo % 10 === 0) giveBalls(6 * S.comboRefill, ex, ey);
    if (S.killRefill && Math.random() < 0.2 * S.killRefill) giveBalls(2, ex, ey, false);
    if (e.boss && S.bossLoot) { S.coins += 50; addPop(ex, e.y - 24, '+50', '#ffcd75', 1); giveBalls(30, ex, ey); }
    if (S.bounty && Math.random() < 0.1 * S.bounty) {
      S.coins += 5; addPop(e.x + e.w / 2, e.y - 22, 'BOUNTY +5', '#ffcd75', 0.8);
    }
    if (S.lifesteal && Math.random() < 0.15 * S.lifesteal && S.hp < S.maxHp) {
      S.hp++; addPop(HERO_X + 7, GROUND_Y - 30, '+1', '#a7f070', 0.5);
    }
    SFX.play('coin');
  } else {
    w.killed++;
  }
  if (S.corpseBomb && corpseDepth < 3) {
    corpseDepth++;
    const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
    let hits = 0;
    for (const o of w.enemies) {
      if (o === e || o.hp <= 0 || o.dead) continue;
      if (Math.abs(o.x + o.w / 2 - cx) < 24 && Math.abs(o.y + o.h / 2 - cy) < 24) { damageEnemy(o, e.maxHp * 0.25 * S.corpseBomb, false, true); hits++; }
    }
    if (S.boomRefill && hits >= 3 && ready('boomRefill', 0.5)) giveBalls(4 * S.boomRefill, cx, cy);
    for (let k = 0; k < 8 && w.parts.length < 320; k++) {
      const an = k / 8 * Math.PI * 2;
      w.parts.push({ x: cx, y: cy, vx: Math.cos(an) * 70, vy: Math.sin(an) * 70, life: 0.2, max: 0.2, col: '#ef7d57', g: 0 });
    }
    corpseDepth--;
  }
  if (e.split) {
    for (let k = 0; k < 2; k++) {
      const m = spawnEnemy('mini', { x: e.x + k * 8, hpK: 1 });
      m.stopX = Math.max(m.stopX, HERO_X + HERO_W + 4);
    }
    w.total += 2;
  }
  if (e.boss) {
    w.shake = 10; w.flash = 0.3; S.bossKills++; S.gemsEarned += 2;
    SFX.play('bossDie');
    unlock('boss1');
  } else SFX.play('poof');
  const nP = e.boss ? 50 : 10;
  for (let k = 0; k < nP && w.parts.length < 320; k++) {
    w.parts.push({ x: e.x + rand(0, e.w), y: e.y + rand(0, e.h), vx: rand(-60, 60), vy: rand(-100, -12), life: rand(0.3, 0.6), max: 0.6, col: Math.random() < 0.3 ? '#1a1c2c' : e.color, g: 320 });
  }
  // white "poof" ring
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2, ringN = e.boss ? 16 : 8, sp = e.boss ? 90 : 45;
  for (let k = 0; k < ringN && w.parts.length < 330; k++) {
    const an = k / ringN * Math.PI * 2;
    w.parts.push({ x: cx, y: cy, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, life: 0.2, max: 0.2, col: '#f4f4f4', g: 0 });
  }
}

function updateEnemies(dt) {
  const w = world;
  for (const e of w.enemies) {
    e.flash = Math.max(0, e.flash - dt);
    e.lunge = Math.max(0, e.lunge - dt);
    e.slowT = Math.max(0, e.slowT - dt);
    if (e.kbT > 0) e.kbT -= dt;
    e.anim += dt;
    if (e.poisonT > 0 && e.hp > 0 && !e.dead) {
      e.poisonT -= dt;
      const d = e.poisonDps * dt;
      e.hp -= d;
      e.poisonAcc = (e.poisonAcc || 0) + d;
      if (e.poisonAcc >= Math.max(1, e.maxHp * 0.05)) {
        if (w.pops.length < 18) addPop(e.x + e.w / 2, e.y - 6, fmt(e.poisonAcc), '#a7f070', 0.4, 1);
        e.poisonAcc = 0;
      }
      if (e.hp <= 0) killEnemy(e);
    }
    if (e.burnT > 0 && e.hp > 0 && !e.dead) { // 화염 구슬 burn
      e.burnT -= dt;
      const d = e.burnDps * dt;
      e.hp -= d;
      e.burnAcc = (e.burnAcc || 0) + d;
      if (e.burnAcc >= Math.max(1, e.maxHp * 0.05)) {
        if (w.pops.length < 18) addPop(e.x + e.w / 2, e.y - 6, fmt(e.burnAcc), '#ef7d57', 0.4, 1);
        e.burnAcc = 0;
      }
      if (w.parts.length < 280 && Math.random() < dt * 12) w.parts.push({ x: e.x + rand(0, e.w), y: e.y + rand(0, e.h / 2), vx: 0, vy: -25, life: 0.3, max: 0.3, col: Math.random() < 0.5 ? '#ef7d57' : '#ffcd75', g: 0 });
      if (e.hp <= 0) killEnemy(e);
    }
    if (e.hp <= 0) continue;
    if (e.freezeT > 0) { e.freezeT -= dt; continue; } // frozen solid: no moving, no attacking
    if (e.fly) e.y = e.baseY + Math.sin(e.anim * 5) * 2;
    if (e.phase) { e.phaseT += dt; e.phased = (e.phaseT % 3) > 2; } // wraith: 1s of every 3s it can't be hit
    if (e.elite === 'regen') e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.03 * dt);
    if (e.enrage && !e.enraged && e.hp < e.maxHp * 0.5) {
      e.enraged = true; e.spd *= 1.6; e.atkCD *= 0.7;
      addPop(e.x + e.w / 2, e.y - 16, 'ENRAGE', '#ef4f5f', 1, 2);
      world.shake = Math.max(world.shake, 5);
    }

    // abilities
    if (e.healer || e.summon) {
      e.abT -= dt;
      if (e.abT <= 0) {
        if (e.healer) {
          e.abT = 3;
          for (const o of w.enemies) {
            if (o === e || o.hp <= 0 || Math.abs(o.x - e.x) > 60) continue;
            o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.15);
            if (w.parts.length < 280) w.parts.push({ x: o.x + o.w / 2, y: o.y, vx: 0, vy: -30, life: 0.5, max: 0.5, col: '#a7f070', g: 0 });
          }
          addPop(e.x + e.w / 2, e.y - 6, 'HEAL', '#a7f070', 0.5);
        } else if (e.summon && w.enemies.length < 45) {
          e.abT = 5;
          for (let k = 0; k < 2; k++) spawnEnemy(e.summon, { x: e.x + rand(0, 16) });
          w.total += 2;
        }
      }
    }

    if (e.x > e.stopX) {
      const near = S.slowField && e.x < HERO_X + 110 ? 0.65 : 1;
      e.x -= e.spd * (e.slowT > 0 ? 0.6 : 1) * near * dt; e.state = 'walk';
    } else if (e.bomb) {
      // bomber explodes on contact
      if (S.state === 'play') heroHit(e, e.dmg);
      for (let k = 0; k < 24 && w.parts.length < 300; k++) {
        w.parts.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, vx: rand(-90, 90), vy: rand(-110, 10), life: rand(0.2, 0.5), max: 0.5, col: k % 2 ? '#ef7d57' : '#ffcd75', g: 200 });
      }
      w.shake = Math.max(w.shake, 5);
      SFX.play('boom');
      killEnemy(e, true);
    } else {
      e.state = 'atk';
      e.atkT -= dt;
      if (e.atkT <= 0) {
        e.atkT = e.atkCD; e.lunge = 0.15;
        if (S.state === 'play') heroHit(e);
      }
    }
  }
  w.enemies = w.enemies.filter(e => e.hp > 0);
}

function heroHit(e, dmgOverride) {
  const w = world;
  if (Math.random() < S.miss) {
    addPop(HERO_X + 7, GROUND_Y - 26, 'MISS', '#94b0c2', 0.6);
    if (S.dodgeShot && e.hp > 0) shootAt(e, S.cupSize * S.atkMul * 0.3 * S.dodgeShot, true);
    if (S.dodgeRefill) giveBalls(S.dodgeRefill, HERO_X + 7, GROUND_Y - 10, false);
    return;
  }
  if (S.barrierLeft > 0) {
    S.barrierLeft--;
    addPop(HERO_X + 7, GROUND_Y - 26, 'BLOCK', '#73eff7', 0.6);
    SFX.play('bump');
    return;
  }
  const d = Math.max(1, (dmgOverride || e.dmg) - S.armor);
  S.hp -= d;
  S.hitThisWave = true;
  w.heroFlash = 0.15;
  w.hurtT = 0.35;
  w.shake = Math.max(w.shake, e.boss ? 6 : 2);
  addPop(HERO_X + 7, GROUND_Y - 26, '-' + d, '#ef7d57', 0.6, 2);
  SFX.play('hurt');
  if (S.hurtRefill) giveBalls(6 * S.hurtRefill, HERO_X + 7, GROUND_Y - 10);
  if (S.thorns && e.hp > 0 && !e.bomb) {
    const frac = e.boss ? 0.05 : 0.25;
    damageEnemy(e, e.maxHp * frac * S.thorns, false, true);
  }
  if (S.hp <= 0) heroDown();
}

function heroDown() {
  const w = world;
  if (S.revive > 0) {
    S.revive--;
    S.hp = Math.round(S.maxHp * 0.5);
    setBanner('REVIVE!', '#ffcd75', 1.4);
    for (const e of w.enemies) { e.x = Math.min(W + 10, e.x + 80); e.atkT = 1; }
    for (let k = 0; k < 30 && w.parts.length < 300; k++) {
      w.parts.push({ x: HERO_X + 7, y: GROUND_Y - 8, vx: rand(-60, 60), vy: rand(-120, -20), life: 0.6, max: 0.6, col: k % 2 ? '#ffcd75' : '#ef7d57', g: 150 });
    }
    unlock('phoenix');
    SFX.play('revive');
    return;
  }
  S.hp = 0; S.state = 'dying'; w.overT = 0;
  setBanner('DEFEATED', '#ef7d57', 1.6);
  SFX.play('over');
}

// ---------------------------------------------------------------- fx
function addPop(x, y, txt, col, life = 0.6, s = 1) {
  world.pops.push({ x, y, txt, col, life, max: life, s });
}

function updateFx(dt) {
  const w = world;
  for (let i = w.parts.length - 1; i >= 0; i--) {
    const p = w.parts[i];
    p.life -= dt; p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.life <= 0) { w.parts[i] = w.parts[w.parts.length - 1]; w.parts.pop(); }
  }
  for (let i = w.pops.length - 1; i >= 0; i--) {
    const p = w.pops[i];
    p.life -= dt; p.y -= 20 * dt;
    if (p.life <= 0) w.pops.splice(i, 1);
  }
  for (let i = w.bolts.length - 1; i >= 0; i--) {
    w.bolts[i].life -= dt;
    if (w.bolts[i].life <= 0) w.bolts.splice(i, 1);
  }
  // weather
  const amb = AMBIENT[biome().key];
  if (amb) {
    w.ambAcc += dt * amb.rate;
    while (w.ambAcc >= 1) { w.ambAcc -= 1; if (w.ambient.length < 60) w.ambient.push(amb.make()); }
  }
  for (let i = w.ambient.length - 1; i >= 0; i--) {
    const p = w.ambient[i];
    p.life -= dt; p.ph += dt;
    const sway = (p.kind === 'leaf' || p.kind === 'flake') ? Math.sin(p.ph * 2) * 8 : p.kind === 'fly' ? Math.sin(p.ph * 1.3) * 6 : 0;
    p.x += (p.vx + sway) * dt; p.y += p.vy * dt;
    if (p.life <= 0 || p.x < -6 || p.y > GROUND_Y + 1 || p.y < HUD_H - 2) { w.ambient[i] = w.ambient[w.ambient.length - 1]; w.ambient.pop(); }
  }
  // coins flying to the HUD
  for (let i = w.coinFx.length - 1; i >= 0; i--) {
    const c = w.coinFx[i];
    c.t += dt;
    if (c.t >= c.dur) { w.coinFx[i] = w.coinFx[w.coinFx.length - 1]; w.coinFx.pop(); w.coinBump = 0.12; }
  }
  w.coinBump = Math.max(0, w.coinBump - dt);
  // balls flying into the cup
  for (let i = w.ballFx.length - 1; i >= 0; i--) {
    const f = w.ballFx[i];
    f.t += dt;
    if (f.t >= f.dur) {
      w.dropQueue += f.val; w.cupBump = 0.12;
      w.ballFx[i] = w.ballFx[w.ballFx.length - 1]; w.ballFx.pop();
      SFX.play('bump');
    }
  }
  w.cupBump = Math.max(0, w.cupBump - dt);
  w.flash = Math.max(0, w.flash - dt);
  w.warnT = Math.max(0, w.warnT - dt);
  w.hurtT = Math.max(0, w.hurtT - dt);
  w.muzzle = Math.max(0, w.muzzle - dt);
  w.collectGlow = Math.max(0, w.collectGlow - dt * 2.5);
  w.comboShow = Math.max(0, w.comboShow - dt);
  if (w.comboT > 0) { w.comboT -= dt; if (w.comboT <= 0) w.combo = 0; }
}

function confetti(n = 70) {
  const w = world;
  for (let k = 0; k < n && w.parts.length < 320; k++) {
    w.parts.push({ x: rand(0, W), y: rand(-10, 20), vx: rand(-25, 25), vy: rand(10, 60), life: rand(1, 1.8), max: 1.8, col: pickOf(PALETTE_FX), g: 60, big: true });
  }
}

// ---------------------------------------------------------------- backgrounds
function pxLine(g, x1, y1, x2, y2, th, color) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))));
  g.fillStyle = color;
  const h = Math.floor(th / 2);
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x1 + (x2 - x1) * i / n), y = Math.round(y1 + (y2 - y1) * i / n);
    g.fillRect(x - h, y - h, th, th);
  }
}

function renderSkyBg() {
  const B = biome();
  const c = document.createElement('canvas');
  c.width = W; c.height = PIT_TOP;
  const g = c.getContext('2d');
  const rnd = mulberry32(7 + world.biomeIdx * 13);
  const ys = [0, 20, 48, 78];
  for (let i = 0; i < 4; i++) {
    g.fillStyle = B.sky[i];
    g.fillRect(0, ys[i], W, (i < 3 ? ys[i + 1] : GROUND_Y) - ys[i]);
  }
  for (let i = 1; i < 4; i++) { // dithered band edges
    g.fillStyle = B.sky[i - 1];
    for (let x = 0; x < W; x += 2) g.fillRect(x + (i % 2), ys[i], 1, 1);
  }
  if (B.stars) {
    for (let i = 0; i < 50; i++) { g.fillStyle = rnd() < 0.3 ? '#ffcd75' : '#f4f4f4'; g.fillRect(Math.floor(rnd() * W), Math.floor(rnd() * 70), 1, 1); }
    g.fillStyle = '#f4f4f4'; g.fillRect(212, 22, 10, 10); g.fillRect(211, 24, 12, 6); g.fillRect(214, 21, 6, 12);
    g.fillStyle = '#94b0c2'; g.fillRect(215, 25, 2, 2); g.fillRect(218, 28, 2, 1);
  }
  if (B.cloud) {
    g.fillStyle = B.cloud;
    for (let i = 0; i < 6; i++) {
      const cx = Math.floor(rnd() * W), cy = 20 + Math.floor(rnd() * 44);
      g.fillRect(cx, cy, 20, 3); g.fillRect(cx + 4, cy - 2, 11, 2); g.fillRect(cx + 7, cy - 4, 6, 2);
    }
  }
  g.fillStyle = B.far;
  for (let x = 0; x < W; x++) {
    const h = 88 + Math.round(Math.sin(x * 0.036) * 11 + Math.sin(x * 0.11 + 1) * 5);
    g.fillRect(x, h, 1, GROUND_Y - h);
  }
  if (B.key === 'snow') { // snow caps
    g.fillStyle = '#f4f4f4';
    for (let x = 0; x < W; x++) {
      const h = 88 + Math.round(Math.sin(x * 0.036) * 11 + Math.sin(x * 0.11 + 1) * 5);
      if (h < 86) g.fillRect(x, h, 1, 3);
    }
  }
  g.fillStyle = B.near;
  for (let x = 0; x < W; x++) {
    const h = 108 + Math.round(Math.sin(x * 0.056 + 2) * 6 + Math.sin(x * 0.17) * 2);
    g.fillRect(x, h, 1, GROUND_Y - h);
  }
  if (B.key === 'volcano') { // lava cracks on far hills
    g.fillStyle = '#ef7d57';
    for (let i = 0; i < 14; i++) { const x = Math.floor(rnd() * W), y = 112 + Math.floor(rnd() * 14); g.fillRect(x, y, 1 + Math.floor(rnd() * 3), 1); }
  }
  // decorations
  for (let i = 0; i < 11; i++) {
    const px = 36 + Math.floor(rnd() * (W - 36)), base = 120 + Math.floor(rnd() * 7);
    if (B.deco === 'pine' || B.deco === 'snowpine') {
      const hh = 10 + Math.floor(rnd() * 8);
      g.fillStyle = B.decoCol;
      for (let k = 0; k < hh; k++) { const ww = 1 + Math.floor(k / 2); g.fillRect(px - ww, base - hh + k, ww * 2 + 1, 1); }
      if (B.deco === 'snowpine') { g.fillStyle = '#f4f4f4'; g.fillRect(px - 1, base - hh, 3, 2); g.fillRect(px - 3, base - hh + 5, 2, 1); g.fillRect(px + 2, base - hh + 7, 2, 1); }
      g.fillStyle = '#4a2f24'; g.fillRect(px, base, 1, 3);
    } else if (B.deco === 'cactus') {
      const hh = 8 + Math.floor(rnd() * 6);
      g.fillStyle = B.decoCol;
      g.fillRect(px, base - hh, 3, hh + 3); g.fillRect(px - 3, base - hh + 4, 2, 4); g.fillRect(px - 3, base - hh + 7, 3, 1);
      g.fillRect(px + 4, base - hh + 2, 2, 4); g.fillRect(px + 3, base - hh + 5, 3, 1);
    } else if (B.deco === 'rock') {
      const hh = 4 + Math.floor(rnd() * 5);
      g.fillStyle = B.decoCol; g.fillRect(px - 3, base - hh + 3, 7, hh);
      g.fillStyle = '#ef7d57'; g.fillRect(px, base - hh + 4, 1, 2);
    }
  }
  // ground
  g.fillStyle = B.top; g.fillRect(0, GROUND_Y, W, 1);
  g.fillStyle = B.grass; g.fillRect(0, GROUND_Y + 1, W, 4);
  g.fillStyle = B.dirt; g.fillRect(0, GROUND_Y + 5, W, PIT_TOP - GROUND_Y - 5);
  g.fillStyle = B.dirtD;
  for (let i = 0; i < 80; i++) g.fillRect(Math.floor(rnd() * W), GROUND_Y + 6 + Math.floor(rnd() * 11), 2, 1);
  g.fillStyle = B.grass;
  for (let x = 0; x < W; x += 3) if (rnd() < 0.5) g.fillRect(x, GROUND_Y + 5, 1, 1);
  // stone lip of the pit
  g.fillStyle = '#1a1c2c'; g.fillRect(0, PIT_TOP - 3, W, 3);
  g.fillStyle = '#566c86';
  for (let x = 0; x < W; x += 9) g.fillRect(x + 1, PIT_TOP - 3, 7, 2);
  skyBg = c;
}

function renderPitBg() {
  const B = biome();
  const c = document.createElement('canvas');
  const ph = H - PIT_TOP;
  c.width = W; c.height = ph;
  const g = c.getContext('2d');
  const rnd = mulberry32(42);
  g.fillStyle = B.pit; g.fillRect(0, 0, W, ph);
  for (let i = 0; i < 320; i++) {
    g.fillStyle = rnd() < 0.5 ? B.pitA : B.pitB;
    g.fillRect(Math.floor(rnd() * W), Math.floor(rnd() * ph), 1 + Math.floor(rnd() * 3), 1);
  }
  // walls
  g.fillStyle = B.wall; g.fillRect(0, 0, WALL_L, ph); g.fillRect(WALL_R, 0, W - WALL_R, ph);
  g.fillStyle = B.wallHi; g.fillRect(WALL_L - 1, 0, 1, ph); g.fillRect(WALL_R, 0, 1, ph);
  g.fillStyle = 'rgba(0,0,0,0.25)';
  for (let y = 4; y < ph; y += 10) { g.fillRect(0, y, WALL_L - 1, 1); g.fillRect(WALL_R + 1, y + 5, W - WALL_R - 1, 1); }
  // rail
  g.fillStyle = '#1a1c2c'; g.fillRect(WALL_L, RAIL_Y - PIT_TOP - 1, WALL_R - WALL_L, 3);
  g.fillStyle = '#94b0c2'; g.fillRect(WALL_L, RAIL_Y - PIT_TOP, WALL_R - WALL_L, 1);
  // collector at the bottom
  g.fillStyle = '#1a1c2c'; g.fillRect(WALL_L, ph - 7, WALL_R - WALL_L, 7);
  g.fillStyle = '#257179'; g.fillRect(WALL_L, ph - 6, WALL_R - WALL_L, 6);
  g.fillStyle = '#73eff7';
  for (let x = WALL_L + 7; x < WALL_R - 4; x += 13) { g.fillRect(x, ph - 5, 1, 1); g.fillRect(x - 1, ph - 4, 3, 1); g.fillRect(x - 2, ph - 3, 5, 1); }
  // bonus zones on the collector (ball value x m)
  for (const z of world.zones || []) {
    if (z.m <= 1) continue;
    const x0 = Math.round(z.x0), zw = Math.round(z.x1 - z.x0);
    g.fillStyle = '#1a1c2c'; g.fillRect(x0, ph - 9, zw, 9);
    g.fillStyle = z.m >= 3 ? '#ef7d57' : '#f4b41b'; g.fillRect(x0 + 1, ph - 8, zw - 2, 8);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x0 + 1, ph - 8, zw - 2, 1);
    g.globalAlpha = 0.22; g.fillRect(x0 + 1, ph - 30, zw - 2, 22); g.globalAlpha = 1;
    drawText(g, 'x' + z.m, x0 + zw / 2, ph - 22, '#ffcd75', 2, 'center');
  }
  // ramps & pegs
  for (const s of world.segs) {
    const y1 = s.y1 - PIT_TOP, y2 = s.y2 - PIT_TOP;
    if (s.peg) {
      g.fillStyle = '#1a1c2c'; g.fillRect(Math.round(s.x1) - 2, Math.round(y1) - 2, 5, 5);
      g.fillStyle = '#c8a26b'; g.fillRect(Math.round(s.x1) - 1, Math.round(y1) - 1, 3, 3);
      g.fillStyle = '#f0d7a1'; g.fillRect(Math.round(s.x1) - 1, Math.round(y1) - 1, 1, 1);
    } else {
      pxLine(g, s.x1, y1, s.x2, y2, 5, '#1a1c2c');
      pxLine(g, s.x1, y1, s.x2, y2, 3, '#c8a26b');
      pxLine(g, s.x1, y1 - 1, s.x2, y2 - 1, 1, '#f0d7a1');
    }
  }
  pitBg = c;
}

// ---------------------------------------------------------------- render
const GATE_COL = { 2: '#a59a4a', 3: '#38b764', 4: '#3b9bd6', 5: '#b55dd6', 6: '#f4b41b' };

function render() {
  const w = world;
  ctx.fillStyle = '#0e0f1a';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  if (w.shake > 0) ctx.translate(Math.round(rand(-1, 1) * w.shake * 0.5), Math.round(rand(-1, 1) * w.shake * 0.5));
  ctx.drawImage(skyBg, 0, 0);
  ctx.drawImage(pitBg, 0, PIT_TOP);
  drawAmbient();
  drawCollectorGlow();
  drawEnemies();
  drawHero();
  drawArrows();
  drawBolts();
  drawGates();
  drawStructures();
  drawBalls();
  drawCup();
  drawBallFx();
  drawParts();
  drawPops();
  ctx.restore();
  drawWarning();
  drawHurt();
  if (S) drawHUD();
  drawCoinFx();
  drawCombo();
  drawBanner();
  if (w.flash > 0) {
    ctx.globalAlpha = Math.min(0.7, w.flash * 2.5);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
}

function drawAmbient() {
  for (const p of world.ambient) {
    const x = Math.round(p.x), y = Math.round(p.y);
    if (p.kind === 'fly') {
      const a = 0.5 + 0.5 * Math.sin(p.ph * 4);
      ctx.globalAlpha = a; ctx.fillStyle = p.col; ctx.fillRect(x, y, 1, 1);
      ctx.globalAlpha = a * 0.35; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3);
    } else if (p.kind === 'streak') {
      ctx.globalAlpha = 0.6; ctx.fillStyle = p.col; ctx.fillRect(x, y, 4, 1);
    } else if (p.kind === 'ember') {
      ctx.globalAlpha = clamp(p.life / 2, 0, 1); ctx.fillStyle = p.col; ctx.fillRect(x, y, 1, 1);
    } else if (p.kind === 'leaf') {
      ctx.globalAlpha = 0.9; ctx.fillStyle = p.col;
      ctx.fillRect(x, y, Math.sin(p.ph * 3) > 0 ? 2 : 1, 1);
    } else {
      ctx.globalAlpha = 0.85; ctx.fillStyle = p.col; ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.globalAlpha = 1;
}

function drawCollectorGlow() {
  const g = world.collectGlow;
  if (g <= 0) return;
  ctx.globalAlpha = g * 0.7;
  ctx.fillStyle = '#73eff7';
  ctx.fillRect(WALL_L, H - 6, WALL_R - WALL_L, 6);
  ctx.globalAlpha = g * 0.35;
  ctx.fillRect(WALL_L, H - 9, WALL_R - WALL_L, 3);
  ctx.globalAlpha = 1;
}

function drawWarning() {
  const t = world.warnT;
  if (t <= 0) return;
  const on = Math.floor(t * 6) % 2 === 0;
  ctx.globalAlpha = on ? 0.22 : 0.08;
  ctx.fillStyle = '#b13e53';
  ctx.fillRect(0, HUD_H, W, GROUND_Y - HUD_H);
  ctx.globalAlpha = 1;
  if (on) {
    ctx.fillStyle = '#ef4f5f';
    ctx.fillRect(0, HUD_H, W, 2); ctx.fillRect(0, GROUND_Y - 2, W, 2);
  }
}

function drawHurt() {
  const t = world.hurtT;
  if (t <= 0) return;
  ctx.globalAlpha = t / 0.35 * 0.55;
  ctx.fillStyle = '#b13e53';
  ctx.fillRect(0, 0, W, 4); ctx.fillRect(0, H - 4, W, 4);
  ctx.fillRect(0, 0, 4, H); ctx.fillRect(W - 4, 0, 4, H);
  ctx.globalAlpha *= 0.5;
  ctx.fillRect(4, 4, W - 8, 3); ctx.fillRect(4, H - 7, W - 8, 3);
  ctx.fillRect(4, 4, 3, H - 8); ctx.fillRect(W - 7, 4, 3, H - 8);
  ctx.globalAlpha = 1;
}

function drawBallFx() {
  const w = world;
  for (const f of w.ballFx) {
    if (f.t < 0) continue;
    const p = f.t / f.dur, e = p * p * (3 - 2 * p);
    const x = f.sx + (w.cupX - f.sx) * e, y = f.sy + (CUP_Y - 4 - f.sy) * e - Math.sin(p * Math.PI) * f.arc;
    const rx = Math.round(x), ry = Math.round(y);
    ctx.fillStyle = '#257179'; ctx.fillRect(rx - 2, ry - 1, 5, 3); ctx.fillRect(rx - 1, ry - 2, 3, 5);
    ctx.fillStyle = '#f4f4f4'; ctx.fillRect(rx - 1, ry, 3, 1); ctx.fillRect(rx, ry - 1, 1, 3);
  }
}

function drawCoinFx() {
  const tx = W - 7, ty = 6;
  for (const c of world.coinFx) {
    if (c.t < 0) continue;
    const p = c.t / c.dur;
    const e = p * p * (3 - 2 * p); // smoothstep
    const x = c.sx + (tx - c.sx) * e;
    const y = c.sy + (ty - c.sy) * e - Math.sin(p * Math.PI) * c.arc;
    ctx.drawImage(SPR.coin5, Math.round(x - 2), Math.round(y - 2));
  }
}

function drawCombo() {
  const w = world;
  if (w.comboShow <= 0 || w.combo < 5) return;
  const big = w.combo >= 20;
  const col = PALETTE_FX[Math.floor(w.t * 10) % 4];
  ctx.globalAlpha = clamp(w.comboShow * 2, 0, 1);
  drawText(ctx, w.combo + ' COMBO', W - 6, 46, col, big ? 2 : 1, 'right');
  ctx.globalAlpha = 1;
}

function drawHero() {
  const w = world;
  const skin = heroSkin();
  const img = w.heroFlash > 0 ? skin.flash : skin.img;
  const dead = S && (S.state === 'dying' || S.state === 'over');
  const x = HERO_X - (w.heroRecoil > 0 ? 1 : 0);
  if (dead) {
    ctx.save();
    ctx.translate(x + 7, GROUND_Y - 1);
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(img, -7, -14);
    ctx.restore();
  } else {
    const bob = Math.floor(w.t * 2) % 2;
    // body bobs one pixel, feet stay planted
    ctx.drawImage(img, 0, 0, HERO_W, 15, x, GROUND_Y - HERO_H + bob, HERO_W, 15);
    if (S && S.barrierLeft > 0) { // shield bubble
      ctx.globalAlpha = 0.45 + 0.2 * Math.sin(w.t * 5);
      ctx.fillStyle = '#73eff7';
      ctx.fillRect(x - 3, GROUND_Y - HERO_H - 3, 1, HERO_H + 2); ctx.fillRect(x + HERO_W + 2, GROUND_Y - HERO_H - 3, 1, HERO_H + 2);
      ctx.fillRect(x - 2, GROUND_Y - HERO_H - 4, HERO_W + 4, 1);
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(img, 0, 15, HERO_W, 2, x, GROUND_Y - 2, HERO_W, 2);
    if (w.muzzle > 0) {
      const mx = x + HERO_W, my = GROUND_Y - 8 + bob;
      ctx.fillStyle = '#ffcd75'; ctx.fillRect(mx, my - 1, 2, 3);
      ctx.fillStyle = '#f4f4f4'; ctx.fillRect(mx + 1, my, 2, 1);
    }
  }
  if (S && w.ammo > 0) {
    drawText(ctx, fmt(w.ammo), Math.max(HERO_X + 7, textWidth(fmt(w.ammo), 2) / 2 + 2), GROUND_Y - 31, '#73eff7', 2, 'center');
    // elemental ammo carried by this batch (colored chips)
    let ex = 2;
    for (const k of ELEMS) {
      if (w.elem[k] < 0.5) continue;
      ctx.fillStyle = '#1a1c2c'; ctx.fillRect(ex, GROUND_Y - 43, 5, 5);
      ctx.fillStyle = ELEM_COL[k]; ctx.fillRect(ex + 1, GROUND_Y - 42, 3, 3);
      const t = fmt(w.elem[k]);
      drawText(ctx, t, ex + 7, GROUND_Y - 43, ELEM_COL[k], 1, 'left');
      ex += 9 + textWidth(t, 1);
    }
  }
}

function drawEnemies() {
  for (const e of world.enemies) {
    const set = SPR[e.spr];
    const fr = Math.floor(e.anim * (e.state === 'walk' ? 5 : 3)) % 2;
    const img = e.flash > 0 ? set.flash[fr] : set.frames[fr];
    const lx = e.lunge > 0 ? -2 : 0;
    if (e.phased) ctx.globalAlpha = 0.3;
    ctx.drawImage(img, Math.round(e.x + lx), Math.round(e.y), e.w, e.h);
    ctx.globalAlpha = 1;
    if (e.elite) { // pulsing elite frame, color by trait
      ctx.globalAlpha = 0.55 + 0.35 * Math.sin(world.t * 6 + e.id);
      ctx.fillStyle = e.elite === 'swift' ? '#73eff7' : e.elite === 'stone' ? '#ffcd75' : '#a7f070';
      const ex = Math.round(e.x + lx) - 2, ey = Math.round(e.y) - 2;
      ctx.fillRect(ex, ey, e.w + 4, 1); ctx.fillRect(ex, ey + e.h + 3, e.w + 4, 1);
      ctx.fillRect(ex, ey, 1, e.h + 4); ctx.fillRect(ex + e.w + 3, ey, 1, e.h + 4);
      ctx.globalAlpha = 1;
    }
    if (e.freezeT > 0) {
      ctx.globalAlpha = 0.55; ctx.fillStyle = '#73eff7';
      ctx.fillRect(Math.round(e.x), Math.round(e.y), e.w, e.h);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#e8fbff'; ctx.fillRect(Math.round(e.x) - 1, Math.round(e.y) - 1, e.w + 2, 1); ctx.fillRect(Math.round(e.x) - 1, Math.round(e.y + e.h), e.w + 2, 1);
    }
    if (e.burnT > 0) { ctx.fillStyle = Math.floor(world.t * 10) % 2 ? '#ef7d57' : '#ffcd75'; ctx.fillRect(Math.round(e.x + e.w - 3), Math.round(e.y - 1), 2, 1); }
    if (e.poisonT > 0) { ctx.fillStyle = '#a7f070'; ctx.fillRect(Math.round(e.x + 1 + (Math.floor(world.t * 8) % 3)), Math.round(e.y - 1), 1, 1); }
    if (e.slowT > 0) { ctx.fillStyle = '#73eff7'; ctx.fillRect(Math.round(e.x + 2), Math.round(e.y + e.h), e.w - 4, 1); }
    if (e.hp < e.maxHp || e.boss) {
      const bw = e.boss ? 28 : 12;
      const bx = Math.round(e.x + e.w / 2 - bw / 2), by = Math.round(e.y) - 4;
      ctx.fillStyle = '#1a1c2c'; ctx.fillRect(bx - 1, by - 1, bw + 2, 4);
      ctx.fillStyle = '#5d275d'; ctx.fillRect(bx, by, bw, 2);
      ctx.fillStyle = e.armor ? '#94b0c2' : '#ef4f5f';
      ctx.fillRect(bx, by, Math.max(1, Math.round(bw * e.hp / e.maxHp)), 2);
    }
  }
}

function drawArrows() {
  const trail = heroSkin().arrow;
  for (const a of world.arrows) {
    const sp = Math.hypot(a.vx, a.vy) || 1;
    const nx = a.vx / sp, ny = a.vy / sp;
    const ec = a.elem ? (a.elem === 'all' ? RAINBOW[Math.floor(world.t * 12) % RAINBOW.length] : ELEM_COL[a.elem]) : null;
    if (ec) { ctx.fillStyle = ec; ctx.fillRect(Math.round(a.x) - 1, Math.round(a.y) - 1, 3, 3); }
    ctx.fillStyle = a.crit ? '#ffcd75' : '#f4f4f4';
    ctx.fillRect(Math.round(a.x), Math.round(a.y), 1, 1);
    ctx.fillStyle = ec || (a.crit ? '#ef7d57' : trail);
    for (let k = 1; k < 6; k++) ctx.fillRect(Math.round(a.x - nx * k), Math.round(a.y - ny * k), 1, 1);
  }
}

function drawBolts() {
  for (const b of world.bolts) {
    ctx.fillStyle = Math.floor(b.life * 40) % 2 ? '#f4f4f4' : '#73eff7';
    const n = Math.max(2, Math.ceil(Math.hypot(b.x2 - b.x1, b.y2 - b.y1) / 2));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const jitter = i > 0 && i < n ? randi(-2, 2) : 0;
      ctx.fillRect(Math.round(b.x1 + (b.x2 - b.x1) * t), Math.round(b.y1 + (b.y2 - b.y1) * t) + jitter, 1, 1);
    }
  }
}

function gateLook(g) {
  if (g.locked) return { col: '#566c86', label: '', dark: false };
  if (g.trap) return { col: '#b13e53', label: '/2', dark: false };
  if (g.goldify) return { col: '#f4b41b', label: 'GOLD', dark: true };
  if (g.rev) return { col: '#73eff7', label: '^x' + g.m, dark: true };
  if (g.bonus) return { col: '#f4b41b', label: 'x' + g.m, dark: true };
  return { col: GATE_COL[Math.min(6, g.m)] || GATE_COL[2], label: 'x' + g.m, dark: false };
}

function drawGates() {
  for (const g of world.gates) {
    const x = Math.round(g.x), y = g.y, gw = Math.round(g.w);
    const look = gateLook(g);
    const col = g.flash > 0 ? '#f4f4f4' : look.col;
    ctx.fillStyle = '#1a1c2c'; ctx.fillRect(x - 1, y - 6, gw + 2, 13);
    ctx.fillStyle = col; ctx.fillRect(x, y - 5, gw, 11);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x, y - 5, gw, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(x, y + 5, gw, 1);
    if (g.rev) { // chevrons hinting the upward fling
      ctx.fillStyle = 'rgba(26,28,44,0.35)';
      for (let cx = x + 4; cx < x + gw - 4; cx += 10) { ctx.fillRect(cx, y + 2, 1, 1); ctx.fillRect(cx - 1, y + 3, 3, 1); }
    }
    for (const px of [x, x + gw]) {
      ctx.fillStyle = '#1a1c2c'; ctx.fillRect(px - 2, y - 10, 4, 21);
      ctx.fillStyle = '#c8a26b'; ctx.fillRect(px - 1, y - 9, 2, 19);
      ctx.fillStyle = '#f0d7a1'; ctx.fillRect(px - 1, y - 9, 1, 19);
    }
    if (g.locked) {
      // padlock on the left of the bar, then the progress (weight) or the reward multiplier (key)
      const lx = x + 4, ly = y - 4;
      ctx.fillStyle = '#1a1c2c'; ctx.fillRect(lx, ly + 2, 9, 7); ctx.fillRect(lx + 1, ly - 2, 7, 5);
      ctx.fillStyle = '#94b0c2'; ctx.fillRect(lx + 2, ly - 1, 5, 1); ctx.fillRect(lx + 2, ly - 1, 1, 3); ctx.fillRect(lx + 6, ly - 1, 1, 3);
      ctx.fillStyle = '#ffcd75'; ctx.fillRect(lx + 1, ly + 3, 7, 5);
      ctx.fillStyle = '#1a1c2c'; ctx.fillRect(lx + 4, ly + 4, 1, 2);
      const label = g.lock === 'weight' ? g.held + '/' + g.need : 'x' + g.m;
      drawText(ctx, label, x + gw / 2 + 6, y - 4, '#e8eef5', 2, 'center', '_#1a1c2c');
      continue;
    }
    const s = textWidth(look.label, 2) <= gw - 8 ? 2 : 1;
    const tc = g.flash > 0 || look.dark ? '#1a1c2c' : '#f4f4f4';
    drawText(ctx, look.label, x + gw / 2, y - (s === 2 ? 4 : 2), tc, s, 'center', g.flash > 0 || look.dark ? null : '_#1a1c2c');
  }
  // floating keys for key-locked gates
  for (const g of world.gates) {
    if (!g.locked || !g.key) continue;
    const kx = Math.round(g.key.x), ky = Math.round(g.key.y + Math.sin(world.t * 3) * 2);
    ctx.globalAlpha = 0.25 + 0.15 * Math.sin(world.t * 5);
    pxDisc(kx, ky, 9, '#ffcd75');
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#1a1c2c';
    ctx.fillRect(kx - 6, ky - 4, 7, 7); ctx.fillRect(kx, ky - 1, 8, 3); ctx.fillRect(kx + 4, ky + 1, 2, 3); ctx.fillRect(kx + 7, ky + 1, 2, 3);
    ctx.fillStyle = '#ffcd75';
    ctx.fillRect(kx - 5, ky - 3, 5, 5); ctx.fillRect(kx, ky, 8, 1); ctx.fillRect(kx + 5, ky + 1, 1, 2); ctx.fillRect(kx + 7, ky + 1, 1, 2);
    ctx.fillStyle = '#1a1c2c'; ctx.fillRect(kx - 3, ky - 1, 1, 1);
  }
}

function pxDisc(cx, cy, r, color) {
  ctx.fillStyle = color;
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy));
    ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
  }
}

function drawStructures() {
  const w = world;
  for (const s of w.spinners) {
    pxLine(ctx, s.x1, s.y1, s.x2, s.y2, 5, '#1a1c2c');
    pxLine(ctx, s.x1, s.y1, s.x2, s.y2, 3, '#94b0c2');
    ctx.fillStyle = '#1a1c2c'; ctx.fillRect(Math.round(s.cx) - 2, Math.round(s.cy) - 2, 5, 5);
    ctx.fillStyle = '#ffcd75'; ctx.fillRect(Math.round(s.cx) - 1, Math.round(s.cy) - 1, 3, 3);
  }
  for (const b of w.bumpers) {
    const cx = Math.round(b.x), cy = Math.round(b.y), r = Math.round(b.r);
    pxDisc(cx, cy, r + 1, '#1a1c2c');
    pxDisc(cx, cy, r, b.flash > 0 ? '#f4f4f4' : '#a05bc4');
    pxDisc(cx - 1, cy - 1, r - 3, b.flash > 0 ? '#f4f4f4' : '#d6a8ff');
    drawText(ctx, 'x2', cx + 1, cy - 2, '#1a1c2c', 1, 'center', null);
  }
  for (const p of w.portals) {
    const spin = w.t * 4, R = PORTAL_R;
    for (const [px, py, c1, c2, label] of [[p.ax, p.ay, '#9b59d0', '#d6a8ff', 'IN'], [p.bx, p.by, '#3b5dc9', '#73eff7', 'OUT']]) {
      const cx = Math.round(px), cy = Math.round(py);
      pxDisc(cx, cy, R, '#1a1c2c');
      pxDisc(cx, cy, R - 1, p.flash > 0 ? '#f4f4f4' : c1); // glowing ring
      pxDisc(cx, cy, R - 4, '#1a1c2c'); // dark swirl hole that holds the label
      for (let k = 0; k < 8; k++) { // sparks swirling along the ring
        const an = (label === 'IN' ? spin : -spin) + k / 8 * Math.PI * 2;
        ctx.fillStyle = k % 2 ? c2 : '#f4f4f4';
        ctx.fillRect(Math.round(px + Math.cos(an) * (R - 2.5)), Math.round(py + Math.sin(an) * (R - 2.5)), 1, 1);
      }
      drawText(ctx, label, cx + 1, cy - 4, c2, 2, 'center', null);
    }
  }
  for (const s of w.springs) {
    const c = s.comp > 0 ? 3 : 0;
    const ox = -s.nx * c, oy = -s.ny * c; // plate pushed down into the coil when it fires
    const bx = -s.nx * 10, by = -s.ny * 10; // base plate offset (below the pad)
    // coils between base and plate
    for (let i = 0; i < 5; i++) {
      const t = (i + 0.5) / 5;
      const px = s.x1 + (s.x2 - s.x1) * t, py = s.y1 + (s.y2 - s.y1) * t;
      const zig = i % 2 ? 2 : -2;
      pxLine(ctx, px + ox, py + oy, px + bx / 2 + zig, py + by / 2, 1, '#94b0c2');
      pxLine(ctx, px + bx / 2 + zig, py + by / 2, px + bx, py + by, 1, '#566c86');
    }
    pxLine(ctx, s.x1 + bx, s.y1 + by, s.x2 + bx, s.y2 + by, 3, '#1a1c2c');
    pxLine(ctx, s.x1 + ox, s.y1 + oy, s.x2 + ox, s.y2 + oy, 5, '#1a1c2c');
    pxLine(ctx, s.x1 + ox, s.y1 + oy, s.x2 + ox, s.y2 + oy, 3, s.comp > 0 ? '#ffcd75' : '#ef7d57');
    pxLine(ctx, s.x1 + ox, s.y1 + oy - 1, s.x2 + ox, s.y2 + oy - 1, 1, '#ffcd75');
  }
}

const RAINBOW = ['#ef7d57', '#ffcd75', '#a7f070', '#73eff7', '#41a6f6', '#d6a8ff'];
function drawBalls() {
  const balls = world.balls, t = world.t;
  // common white balls first in one batch (they are the bulk)
  ctx.fillStyle = '#f4f4f4';
  for (const b of balls) {
    if (b.kind !== 0) continue;
    const x = Math.round(b.x), y = Math.round(b.y);
    ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3);
  }
  for (const b of balls) {
    if (b.kind === 0) continue;
    const x = Math.round(b.x), y = Math.round(b.y);
    const K = BALL_KINDS[b.kind];
    if (b.kind === 2) { // rainbow: cycling colors
      ctx.fillStyle = RAINBOW[Math.floor(t * 12 + b.x) % RAINBOW.length];
      ctx.fillRect(x - 1, y - 1, 3, 3);
      continue;
    }
    if (b.kind === 4 || b.kind === 5 || b.kind === 9) { // ruby / diamond / bomb: square gem with dark rim
      ctx.fillStyle = K.edge; ctx.fillRect(x - 2, y - 1, 5, 3); ctx.fillRect(x - 1, y - 2, 3, 5);
      ctx.fillStyle = K.col; ctx.fillRect(x - 1, y - 1, 3, 3);
      if (b.kind === 5) { ctx.fillStyle = Math.floor(t * 10 + b.x) % 3 ? '#ffffff' : '#41a6f6'; ctx.fillRect(x - 1, y - 1, 1, 1); }
      else if (b.kind === 9) { ctx.fillStyle = Math.floor(t * 8 + b.y) % 2 ? K.core : '#ffcd75'; ctx.fillRect(x, y, 1, 1); }
      else { ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 1, 1, 1); }
      continue;
    }
    // silver / gold / elements: plus shape with a tinted rim; sparks and flames flicker
    let col = K.col;
    if (b.kind === 6 && Math.floor(t * 12 + b.x) % 2) col = '#ffcd75';
    if (b.kind === 8 && Math.floor(t * 14 + b.y) % 2) col = '#ffffff';
    if (K.elem || b.kind === 3) { ctx.fillStyle = K.edge; ctx.fillRect(x - 1, y - 1, 3, 3); }
    ctx.fillStyle = col;
    ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3);
  }
}

function drawCup() {
  const w = world;
  const cx = Math.round(w.cupX);
  const a = w.tilt;
  const topX = cx + 6 * Math.sin(a), topY = CUP_Y - 6 * Math.cos(a);
  pxLine(ctx, cx, RAIL_Y + 2, Math.round(topX), Math.round(topY), 1, '#94b0c2');
  ctx.fillStyle = '#1a1c2c'; ctx.fillRect(cx - 6, RAIL_Y - 3, 12, 6);
  ctx.fillStyle = '#ffcd75'; ctx.fillRect(cx - 5, RAIL_Y - 2, 10, 4);
  ctx.fillStyle = '#ef7d57'; ctx.fillRect(cx - 5, RAIL_Y + 1, 10, 1);
  ctx.save();
  ctx.translate(cx, CUP_Y);
  ctx.rotate(a);
  ctx.drawImage(SPR.cup, -7, -6);
  ctx.restore();
  if (S) {
    const empty = w.cupBalls === 0;
    const txt = empty ? (Math.floor(w.t * 4) % 2 ? '...' : '') : fmt(w.cupBalls);
    if (txt) drawText(ctx, txt, cx - 11, CUP_Y - 5, empty ? '#94b0c2' : '#f4f4f4', 2, 'right');
  }
}

function drawParts() {
  for (const p of world.parts) {
    ctx.globalAlpha = clamp(p.life / p.max * 1.5, 0, 1);
    ctx.fillStyle = p.col;
    if (p.big) ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.sin(p.life * 20) > 0 ? 2 : 1, 2);
    else ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
  }
  ctx.globalAlpha = 1;
}

function drawPops() {
  for (const p of world.pops) {
    ctx.globalAlpha = clamp(p.life / p.max * 2, 0, 1);
    drawText(ctx, p.txt, p.x, p.y, p.col, p.s, 'center');
  }
  ctx.globalAlpha = 1;
}

function drawButton(r, label, on) {
  ctx.fillStyle = '#1a1c2c'; ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = on ? '#ef7d57' : '#566c86'; ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, 1);
  drawText(ctx, label, r.x + r.w / 2, r.y + 3, '#f4f4f4', 2, 'center', null);
}

function drawHUD() {
  const w = world;
  ctx.fillStyle = 'rgba(26,28,44,0.85)';
  ctx.fillRect(0, 0, W, HUD_H);
  ctx.drawImage(SPR.heart5, 3, 6, 10, 10);
  const hpK = clamp(S.hp / S.maxHp, 0, 1);
  ctx.fillStyle = '#1a1c2c'; ctx.fillRect(16, 6, 52, 10);
  ctx.fillStyle = '#5d275d'; ctx.fillRect(17, 7, 50, 8);
  ctx.fillStyle = hpK > 0.3 ? '#ef4f5f' : (Math.floor(w.t * 6) % 2 ? '#ef4f5f' : '#ffcd75');
  ctx.fillRect(17, 7, Math.round(50 * hpK), 8);
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(17, 7, Math.round(50 * hpK), 2);
  drawText(ctx, S.hp + '/' + S.maxHp, 72, 6, '#f4f4f4', 2, 'left', null);
  drawText(ctx, 'W' + S.wave + '/' + RUN_WAVES, W / 2 + 28, 4, S.wave >= RUN_WAVES ? '#ef7d57' : '#ffcd75', 2, 'center', null);
  const prog = w.total ? w.killed / w.total : 0;
  ctx.fillStyle = '#333c57'; ctx.fillRect(W / 2 + 10, 17, 36, 2);
  ctx.fillStyle = '#a7f070'; ctx.fillRect(W / 2 + 10, 17, Math.round(36 * Math.min(1, prog)), 2);
  const bump = w.coinBump > 0;
  ctx.drawImage(SPR.coin5, W - 13, bump ? 5 : 6, 10, 10);
  drawText(ctx, fmt(S.coins), W - 16, 6, bump ? '#f4f4f4' : '#ffcd75', 2, 'right', null);
  if (S.state === 'play' || S.state === 'cleared') {
    drawButton(BTN_SPEED, 'x' + META.speed, META.speed > 1);
    drawButton(BTN_PAUSE, 'II', false);
  }
  let bx = 4;
  const D = DIFFS[S.diff || 'normal'];
  if (D.tag) { drawText(ctx, D.tag, bx, HUD_H + 4, D.color, 2, 'left'); bx += textWidth(D.tag, 2) + 6; }
  if (S.tempAtk > 1) { drawText(ctx, 'RAGE', bx, HUD_H + 4, '#ef7d57', 2, 'left'); bx += 38; }
  if (S.gateBonus > 0) drawText(ctx, 'GATE+' + S.gateBonus, bx, HUD_H + 4, '#a7f070', 2, 'left');
}

function drawBanner() {
  const b = world.banner;
  if (!b) return;
  const p = b.t / b.dur;
  let a = 1;
  if (p < 0.15) a = p / 0.15; else if (p > 0.75) a = (1 - p) / 0.25;
  ctx.globalAlpha = clamp(a, 0, 1);
  const y = 54 + (p < 0.15 ? -(1 - p / 0.15) * 8 : 0);
  const s = 2;
  drawText(ctx, b.txt, W / 2, y, b.col, s, 'center');
  ctx.globalAlpha = 1;
}
