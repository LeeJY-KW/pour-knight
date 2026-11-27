// Pixel sprites defined as strings. '.' = transparent. All art is original.
const PAL = {
  k: '#1a1c2c', w: '#f4f4f4', g: '#94b0c2', G: '#566c86',
  T: '#257179', c: '#73eff7', S: '#ffcd75', e: '#1a1c2c',
  B: '#3b5dc9', b: '#29366f', W: '#8a5a3c', y: '#f4b41b', Y: '#ffcd75', o: '#ef7d57',
  r: '#b13e53', R: '#7a2f5d', P: '#9b59d0', p: '#d6a8ff', d: '#5d275d',
  L: '#41a6f6', N: '#38b764', n: '#a7f070',
};

// Hero: teal-helmet crossbow knight with red cape, facing right (14x17)
const HERO = [
  '....kkkkkk....',
  '...kTTTTTTk...',
  '..kTcTTTTTTk..',
  '..kTcTTTTTTk..',
  '..kTTkkkkkkkk.',
  '..kTkSSSSeSk..',
  '..kkkSSSSSSk..',
  '...kkkSSSSk...',
  '..kkbBBkkkk...',
  'krkBBBBBBkkkkk',
  'krkBcBBBSWWWWk',
  'krkBBBBBBkkkkk',
  'krkByyyyBk....',
  '.krkBBBBk.....',
  '...kBkkBk.....',
  '...kgk.kgk....',
  '...kkk.kkk....',
];

const SLIME1 = [
  '....kkkk....',
  '..kkPPPPkk..',
  '.kPPpPPPPPk.',
  '.kPpPPPPPPk.',
  'kPPPPPPPPPPk',
  'kPwkPPPwkPPk',
  'kPwkPPPwkPPk',
  'kPPPPkkPPPPk',
  'kdPPPPPPPPdk',
  '.kkkkkkkkkk.',
];
const SLIME2 = [
  '............',
  '....kkkk....',
  '.kkkPPPPkkk.',
  'kPPpPPPPPPPk',
  'kPpPPPPPPPPk',
  'kPwkPPPwkPPk',
  'kPwkPPPwkPPk',
  'kPPPPkkPPPPk',
  'kdPPPPPPPPdk',
  'kkkkkkkkkkkk',
];
const MINI1 = ['..kkkk..', '.kPPPPk.', 'kPpPPPPk', 'kwkPwkPk', 'kPPPPPPk', '.kkkkkk.'];
const MINI2 = ['........', '.kkkkkk.', 'kPpPPPPk', 'kwkPwkPk', 'kPPPPPPk', 'kkkkkkkk'];

const BAT1 = [
  'k..........k',
  'kk...kk...kk',
  'kRk.kRRk.kRk',
  'kRRkRRRRkRRk',
  '.kRRwRRwRRk.',
  '..kRRRRRRk..',
  '...kRkkRk...',
  '....k..k....',
];
const BAT2 = [
  '............',
  '.....kk.....',
  '....kRRk....',
  '.kkkRRRRkkk.',
  'kRRRwRRwRRRk',
  'kRkRRRRRRkRk',
  'k..kRkkRk..k',
  '....k..k....',
];

const GOLEM1 = [
  '...kkkkkk...',
  '..kGGGGGGk..',
  '.kGgGGGGGGk.',
  '.kGokGGokGk.',
  '.kGGGGGGGGk.',
  '.kGGkkkkGGk.',
  'kkGGGGGGGGkk',
  'kGkGGgGGGkGk',
  'kGkGGGGGGkGk',
  'kGkGGGGGGkGk',
  'kkkkGGGGkkkk',
  '...kGkkGk...',
  '...kGk.kGk..',
  '...kkk.kkk..',
];
const GOLEM2 = GOLEM1.slice(0, 11).concat(['...kGkkGk...', '..kGk.kGk...', '..kkk.kkk...']);

const WOLF1 = [
  '.kk...........',
  'kGGk..........',
  'kGoGkkkkkkkk..',
  'kGGGGGGGGGGGkk',
  '.kkGGGGGGGGGGk',
  '...kGGGGGGGGk.',
  '...kGkkkkkGk..',
  '...kGk...kGk..',
  '...kk....kk...',
];
const WOLF2 = WOLF1.slice(0, 7).concat(['..kGk...kGk...', '..kk....kk....']);

const BOMB1 = [
  '.......o..',
  '......k...',
  '...kkkkk..',
  '..kbbbbbk.',
  '.kbLbbbbbk',
  '.kbLbbbbbk',
  '.kbwkbwkbk',
  '.kbbbbbbbk',
  '..kbbbbbk.',
  '..kk...kk.',
];
const BOMB2 = ['.......Y..'].concat(BOMB1.slice(1, 9), ['...kk.kk..']);

const SKEL1 = [
  '....kkkk....',
  '...kwwwwk...',
  '...kwkwkk...',
  '...kwwwwk...',
  '....kwkwk...',
  '..kkkkkkk...',
  '.kLLkwgwkk..',
  'kLBBkgwgkwk.',
  'kLBBkwgwkwk.',
  'kLBBkkkkk...',
  'kLBBk.kgk...',
  '.kLk.kg.gk..',
  '..k..kw.wk..',
  '.....kk.kk..',
];
const SKEL2 = SKEL1.slice(0, 11).concat(['.kLk.kgk....', '..k..kwk....', '.....kkk....']);

const SHAMAN1 = [
  '.kk..kkkk...',
  'kcck.kdddk..',
  '.kk.kddddk..',
  '.kW.kdwkwk..',
  '.kW.kddddk..',
  '.kWkkPPPPkk.',
  '.kWPPPPPPPk.',
  '.kWkPPpPPPk.',
  '.kW.kPPPPk..',
  '.kW.kPPPPk..',
  '.kW.kPPPPPk.',
  '.kW.kPPPPPk.',
  '.kk.kkkkkkk.',
];

// Paper cup with teal band (14x12)
const CUP = [
  'kkkkkkkkkkkkkk',
  'kwwwwwwwwwwwgk',
  'kwwwwwwwwwwwgk',
  '.kwwwwwwwwwgk.',
  '.kLLLLLLLLLgk.',
  '.kLcLLLLLLLgk.',
  '.kLLLLLLLLLgk.',
  '..kwwwwwwwgk..',
  '..kwwwwwwwgk..',
  '..kwwwwwwwgk..',
  '...kwwwwwgk...',
  '...kkkkkkkk...',
];

const HEART5 = ['rr.rr', 'rrrrr', 'rrrrr', '.rrr.', '..r..'];
const COIN5 = ['.kkk.', 'kYwYk', 'kYYok', 'kYYok', '.kkk.'];

// 8x8 icons: [rows, paletteOverride?]
const ICONS = {
  heart: [['.kk..kk.', 'krrkkrrk', 'krwrrrrk', 'krrrrrrk', '.krrrrk.', '..krrk..', '...kk...', '........']],
  sword: [['......kk', '.....kwk', '....kwgk', 'k..kwgk.', 'kYkwgk..', '.kYgk...', '.kWkYk..', 'kWk..k..']],
  rage: [['......kk', '.....kwk', '....kwgk', 'k..kwgk.', 'kYkwgk..', '.kYgk...', '.kWkYk..', 'kWk..k..'], { w: '#ef7d57', g: '#b13e53' }],
  cup: [['kkkkkkkk', 'kwwwwwgk', 'kwwwwwgk', '.kLLLgk.', '.kwwwgk.', '.kwwwgk.', '..kwgk..', '..kkkk..']],
  reload: [['kkkkkkkk', 'kwwwwwgk', 'kwwwwwgk', '.kNNNgk.', '.kwwwgk.', '.kwwwgk.', '..kwgk..', '..kkkk..']],
  bolt: [['....kkk.', '...kYYk.', '..kYYk..', '.kYYYYk.', '.kkYYk..', '..kYk...', '..kk....', '.k......']],
  chain: [['....kkk.', '...kcck.', '..kcck..', '.kcccck.', '.kkcck..', '..kck...', '..kk....', '.k......']],
  shield: [['kkkkkkkk', 'kBLBBBBk', 'kLBBBBBk', 'kBBBBBBk', 'kBBBBBBk', '.kBBBBk.', '..kBBk..', '...kk...']],
  armor: [['kkkkkkkk', 'kGgGGGGk', 'kgGGGGGk', 'kGGGGGGk', 'kGGGGGGk', '.kGGGGk.', '..kGGk..', '...kk...']],
  star: [['...kk...', '..kYYk..', 'kkkYYkkk', 'kYYYYYYk', '.kYYYYk.', '.kYkkYk.', 'kYk..kYk', 'kk....kk']],
  critDmg: [['...kk...', '..kook..', 'kkkookkk', 'koooooook'.slice(0, 8), '.kooook.', '.kokkok.', 'kok..kok', 'kk....kk']],
  coin: [['..kkkk..', '.kYYYYk.', 'kYYwYYyk', 'kYwYYYyk', 'kYYYYYyk', 'kYYYYyyk', '.kyyyyk.', '..kkkk..']],
  gate: [['k......k', 'kkkkkkkk', 'kNNNNNNk', 'kNwNwNwk', 'kNNNNNNk', 'kkkkkkkk', 'k......k', 'k......k']],
  gateGold: [['k......k', 'kkkkkkkk', 'kYYYYYYk', 'kYwYwYwk', 'kYYYYYYk', 'kkkkkkkk', 'k......k', 'k......k']],
  gateWide: [['........', 'kkkkkkkk', 'kLLLLLLk', 'kLwLLwLk', 'kLLLLLLk', 'kkkkkkkk', 'k......k', '........']],
  potion: [['..kkkk..', '...kk...', '..kwwk..', '.krrrrk.', 'krrwrrrk', 'krrrrrrk', 'krrrrrrk', '.kkkkkk.']],
  arrow: [['........', '.....k..', 'k....kk.', 'kwwwwwwk', 'k....kk.', '.....k..', '........', '........']],
  arrow2: [['.....k..', 'k....kk.', 'kwwwwwwk', 'k....kk.', '.k...k..', '.kk..kk.', 'kwwwwwwk', '.kk..kk.']],
  multi: [['.....k..', 'kwwwwwk.', '.....k..', '.....k..', 'kwwwwwwk', '.....k..', '.....k..', 'kwwwwwk.']],
  ball: [['........', '..kkkk..', '.kYYYYk.', '.kYwYYk.', '.kYYYok.', '.kYYook.', '..kkkk..', '........']],
  rainbow: [['........', '..kkkk..', '.kroYYk.', '.kYnNNk.', '.kNNLLk.', '.kLLPPk.', '..kkkk..', '........']],
  twin: [['........', '.kkk....', 'kwwwk...', 'kwwwkkk.', '.kkkwwwk', '...kwwwk', '....kkk.', '........']],
  boom: [['k..k..k.', '.kok.ok.', '..oYYo..', 'koYwwYok', '.oYwwYo.', '..oYYo..', '.ko..ok.', 'k..k..k.']],
  frost: [['...k....', '.k.c.k..', '..kck...', 'kccwcck.', '..kck...', '.k.c.k..', '...k....', '........']],
  refill: [['..kNk...', '.kNNNk..', '..kNk...', 'kkkkkkkk', 'kwwwwwgk', '.kwwwgk.', '.kwwwgk.', '..kkkk..']],
  jackpot: [['kkkkkkkk', 'kYrYrYrk', 'kYrYrYrk', 'kkkkkkkk', '.kYYYYk.', '..kYYk..', '...kk...', '........']],
  crate: [['kkkkkkkk', 'kWWWWWWk', 'kWkWWkWk', 'kWWkkWWk', 'kWWkkWWk', 'kWkWWkWk', 'kWWWWWWk', 'kkkkkkkk']],
  rain: [['.kk.....', 'kwwk.kk.', '.kk.kwwk', '.....kk.', '..kk....', '.kwwk...', '..kk.kk.', '....kwwk']],
  poison: [['...kk...', '..kNNk..', '..kNNk..', '.kNNNNk.', 'kNNnNNNk', 'kNnNNNNk', '.kNNNNk.', '..kkkk..']],
  push: [['........', 'k.k.k...', '.....k..', 'kwk.kwk.', 'kwwwwwwk', 'kwk.kwk.', '.....k..', 'k.k.k...']],
  drop: [['...kk...', '..krrk..', '..krrk..', '.krrrrk.', 'krrwrrrk', 'krwrrrrk', '.krrrrk.', '..kkkk..']],
  thorns: [['...k....', '..kgk.k.', 'k.kgkkgk', 'gkGGGGgk', 'kGGGGGGk', 'kGgGGgGk', 'kGGGGGGk', '.kkkkkk.']],
  skull: [['.kkkkkk.', 'kwwwwwwk', 'kwkwwkwk', 'kwkwwkwk', 'kwwwwwwk', '.kwkwkk.', '.kwwwwk.', '..kkkk..']],
  crown: [['........', 'k.k..k.k', 'kYkkkkYk', 'kYYkkYYk', 'kYYYYYYk', 'kYrYYrYk', 'kYYYYYYk', 'kkkkkkkk']],
  interest: [['..kkkk..', '.kYYYYk.', '.kkkkkk.', '.kYYYYk.', 'kkkkkkkk', 'kYYYYYYk', 'kyyyyyyk', 'kkkkkkkk']],
  tag: [['.kkkkkk.', 'kooooook', 'kowookok', 'koookook', 'kookoook', 'kokoowok', 'kooooook', '.kkkkkk.']],
  feather: [['......kk', '.....kok', '....koYk', '...koYk.', '..koYk..', '.koYk...', '.kkk....', 'k.......']],
  regen: [['..kkkk..', '..kNNk..', 'kkkNNkkk', 'kNNNNNNk', 'kNNNNNNk', 'kkkNNkkk', '..kNNk..', '..kkkk..']],
  berserk: [['.kkkkkk.', 'krrrrrrk', 'krkrrkrk', 'krrkkrrk', 'krrrrrrk', 'krkkkkrk', 'krrrrrrk', '.kkkkkk.']],
  target: [['..kkkk..', '.krrrrk.', 'krwwwwrk', 'krwrrwrk', 'krwrrwrk', 'krwwwwrk', '.krrrrk.', '..kkkk..']],
  cards: [['kkkkk...', 'kLLLkkkk', 'kLLLkwwk', 'kLLLkwwk', 'kLLLkwwk', 'kkkkkwwk', '....kwwk', '....kkkk']],
  reroll: [['..kkkkk.', '.kNNNNNk', 'kNk...kk', 'kNk.....', '.....kNk', 'kk...kNk', 'kNNNNNk.', '.kkkkk..']],
  gem: [['........', '..kkkk..', '.kcwcck.', 'kccccLLk', '.kcccLk.', '..kcLk..', '...kk...', '........']],
  goldhand: [['..kkkk..', '.kYYYYk.', 'kYYwYYyk', 'kYNNNNyk', 'kYNwNNyk', 'kYNNNNyk', '.kyyyyk.', '..kkkk..']],
  slow: [['.kkkkkk.', 'kccccccK'.slice(0, 7) + 'k', 'kcwkkcck', 'kckwkcck', 'kcckwcck', 'kcccckck', 'kccccccK'.slice(0, 7) + 'k', '.kkkkkk.']],
};

// Hero costumes (cosmetic). pal = palette override on the HERO sprite; arrow = arrow trail color.
// unlock: { gems } to buy in the wardrobe, or { req, hint } unlocked automatically by progress.
const COSTUMES = [
  { id: 'teal', name: '청록 기사', pal: {}, arrow: '#c8a26b', unlock: {} },
  { id: 'crimson', name: '진홍 기사', pal: { T: '#b13e53', c: '#ef7d57', B: '#5d275d', b: '#3a1a3a', r: '#ffcd75' }, arrow: '#ef7d57', unlock: { gems: 40 } },
  { id: 'ranger', name: '숲의 사냥꾼', pal: { T: '#38b764', c: '#a7f070', B: '#8a5a3c', b: '#6b4430', r: '#257179', y: '#a7f070' }, arrow: '#a7f070', unlock: { gems: 40 } },
  { id: 'slime', name: '슬라임 옷', pal: { T: '#9b59d0', c: '#d6a8ff', B: '#9b59d0', b: '#5d275d', r: '#d6a8ff', y: '#f4f4f4' }, arrow: '#d6a8ff',
    unlock: { req: () => META.kills >= 1000, hint: '누적 처치 1,000' } },
  { id: 'frost', name: '서리 기사', pal: { T: '#94b0c2', c: '#f4f4f4', B: '#41a6f6', b: '#29366f', r: '#73eff7', y: '#f4f4f4' }, arrow: '#73eff7',
    unlock: { req: () => !!(META.clears || {}).normal, hint: '보통 클리어' } },
  { id: 'shadow', name: '그림자 기사', pal: { T: '#333c57', c: '#566c86', B: '#29366f', b: '#1a1c2c', r: '#5d275d', S: '#c9d6e3', y: '#5d275d' }, arrow: '#9b59d0',
    unlock: { req: () => ((META.bestByDiff || {}).hard || 0) >= 10, hint: '어려움 WAVE 10 도달' } },
  { id: 'flame', name: '화염 기사', pal: { T: '#ef7d57', c: '#ffcd75', B: '#b13e53', b: '#5d275d', r: '#f4b41b', y: '#ef7d57' }, arrow: '#ef7d57',
    unlock: { req: () => !!(META.clears || {}).hard, hint: '어려움 클리어' } },
  { id: 'gold', name: '황금 기사', pal: { T: '#f4b41b', c: '#ffe1a1', B: '#c8a26b', b: '#8a6446', r: '#b13e53', y: '#f4f4f4' }, arrow: '#ffcd75',
    unlock: { req: () => Object.keys(META.ach || {}).length >= 10, hint: '업적 10개 달성' } },
  { id: 'nightmare', name: '악몽 기사', pal: { T: '#333c57', c: '#b13e53', B: '#5d275d', b: '#1a1c2c', r: '#b13e53', S: '#94b0c2', y: '#ef4f5f', W: '#5d275d' }, arrow: '#ef4f5f',
    unlock: { req: () => !!(META.clears || {}).nightmare, hint: '악몽 클리어' } },
  { id: 'royal', name: '왕실 근위대', pal: { T: '#f4f4f4', c: '#ffffff', B: '#3b5dc9', b: '#29366f', r: '#b13e53', y: '#ffcd75' }, arrow: '#41a6f6', unlock: { gems: 250 } },
];
const SKINS = {};
function buildSkins() {
  for (const c of COSTUMES) {
    const img = makeSprite(HERO, c.pal);
    SKINS[c.id] = { img, flash: makeFlash(img), arrow: c.arrow, url: img.toDataURL() };
  }
}
function heroSkin() {
  const id = (typeof META !== 'undefined' && META && META.costume) || 'teal';
  return SKINS[id] || SKINS.teal;
}

// ball-type icons reuse the ball template with recolors
ICONS.silverBall = [ICONS.ball[0], { Y: '#c9d6e3', o: '#566c86' }];
ICONS.rubyBall = [ICONS.ball[0], { Y: '#ef4f5f', o: '#5d275d' }];
ICONS.fireBall = [ICONS.ball[0], { Y: '#ef7d57', o: '#b13e53', w: '#ffcd75' }];
ICONS.iceBall = [ICONS.ball[0], { Y: '#73eff7', o: '#3b5dc9' }];
ICONS.sparkBall = [ICONS.ball[0], { Y: '#ffe66d', o: '#f4b41b' }];
ICONS.bombBall = [ICONS.ball[0], { Y: '#566c86', o: '#1a1c2c', w: '#ef7d57' }];
ICONS.diamondBall = [ICONS.gem[0], { c: '#e8fbff', L: '#41a6f6' }];
ICONS.flask = [['..kkkk..', '...kk...', '...kk...', '..kNNk..', '.kNnNNk.', 'kNNNNNNk', 'kNNNNnNk', '.kkkkkk.']];

function makeSprite(rows, over) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      if (!ch || ch === '.') continue;
      const col = (over && over[ch]) || PAL[ch];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

function makeFlash(src) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

const SPR = {};

function buildSprites() {
  const anim = (frames, over) => {
    const f = frames.map(r => makeSprite(r, over));
    return { frames: f, flash: f.map(makeFlash) };
  };
  SPR.hero = makeSprite(HERO);
  SPR.heroFlash = makeFlash(SPR.hero);
  buildSkins();
  SPR.slime = anim([SLIME1, SLIME2]);
  SPR.splitter = anim([SLIME1, SLIME2], { P: '#38b764', p: '#a7f070', d: '#257179' });
  SPR.mini = anim([MINI1, MINI2], { P: '#38b764', p: '#a7f070' });
  SPR.bat = anim([BAT1, BAT2]);
  SPR.wolf = anim([WOLF1, WOLF2], { G: '#8a6446', g: '#c8a26b', o: '#ef7d57' });
  SPR.golem = anim([GOLEM1, GOLEM2]);
  SPR.bomber = anim([BOMB1, BOMB2]);
  SPR.shield = anim([SKEL1, SKEL2]);
  SPR.shaman = anim([SHAMAN1, SHAMAN1], { P: '#257179', p: '#38b764' });
  SPR.shaman.frames[1] = makeSprite(SHAMAN1, { P: '#257179', p: '#38b764', c: '#f4f4f4' });
  SPR.golemKing = anim([GOLEM1, GOLEM2], { G: '#b13e53', g: '#ef7d57', o: '#ffcd75' });
  SPR.slimeKing = anim([SLIME1, SLIME2], { P: '#b13e53', p: '#ef7d57', d: '#5d275d', w: '#ffcd75' });
  SPR.batLord = anim([BAT1, BAT2], { R: '#333c57', w: '#ffcd75' });
  SPR.titan = anim([GOLEM1, GOLEM2], { G: '#333c57', g: '#ef7d57', o: '#ffcd75' });
  SPR.cup = makeSprite(CUP);
  SPR.heart5 = makeSprite(HEART5);
  SPR.coin5 = makeSprite(COIN5);
  SPR.iconURL = {};
  for (const k in ICONS) SPR.iconURL[k] = makeSprite(ICONS[k][0], ICONS[k][1]).toDataURL();
  SPR.coinURL = SPR.iconURL.coin;
  SPR.gemURL = SPR.iconURL.gem;
}
