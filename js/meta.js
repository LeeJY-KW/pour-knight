// Persistent progression: gems, camp upgrades, achievements, run save, settings.
const META_KEY = 'pourknight_v2';
let META = null;

function loadMeta() {
  let m = null;
  try { m = JSON.parse(localStorage.getItem(META_KEY) || 'null'); } catch (e) { m = null; }
  META = Object.assign(
    { gems: 0, up: {}, best: 0, runs: 0, kills: 0, bosses: 0, muted: false, music: true, speed: 1, run: null, ach: {},
      costume: 'teal', owned: { teal: 1 }, diff: 'normal', bestByDiff: {}, clears: {} },
    m || {},
  );
  if (!META.owned) META.owned = { teal: 1 };
  if (!META.bestByDiff) META.bestByDiff = {};
  if (!META.clears) META.clears = {};
  try {
    const old = parseInt(localStorage.getItem('pourknight_best') || '0', 10) || 0;
    if (old > META.best) META.best = old;
  } catch (e) { /* ignore */ }
}

function saveMeta() {
  try { localStorage.setItem(META_KEY, JSON.stringify(META)); } catch (e) { /* storage unavailable */ }
}

function metaLv(id) { return (META.up && META.up[id]) || 0; }

// Permanent camp upgrades bought with gems
const META_UPS = [
  { id: 'hp', icon: 'heart', name: '단련된 체력', desc: '시작 체력 +4', max: 10, base: 10, step: 8 },
  { id: 'atk', icon: 'sword', name: '명궁의 손', desc: '기본 공격력 +5%', max: 10, base: 12, step: 10 },
  { id: 'cup', icon: 'cup', name: '대형 컵', desc: '시작 컵 용량 +3', max: 10, base: 10, step: 8 },
  { id: 'coins', icon: 'coin', name: '여행 자금', desc: '시작 코인 +10', max: 8, base: 8, step: 6 },
  { id: 'coinGain', icon: 'interest', name: '상인의 눈', desc: '코인 획득 +4%', max: 8, base: 15, step: 10 },
  { id: 'miss', icon: 'shield', name: '날렵함', desc: '회피 +2%', max: 5, base: 15, step: 10 },
  { id: 'startSkill', icon: 'cards', name: '준비된 기사', desc: '시작할 때 무작위 일반 스킬 +1', max: 3, base: 30, step: 30 },
  { id: 'gemGain', icon: 'gem', name: '보석 감정사', desc: '보석 획득 +10%', max: 5, base: 20, step: 15 },
];
function metaCost(u) { return u.base + u.step * metaLv(u.id); }

// Runs are a fixed 20 waves now, so every run starts at wave 1.
function checkpoints() { return [1]; }
function checkpointCoins() { return 0; }

const ACHS = [
  { id: 'w1', name: '첫 걸음', desc: '웨이브 1 클리어', gems: 5 },
  { id: 'boss1', name: '거인 사냥', desc: '보스 처치', gems: 10 },
  { id: 'w10', name: '숙련 기사', desc: '웨이브 10 도달', gems: 15 },
  { id: 'clearN', name: '정복자', desc: '보통 클리어', gems: 50 },
  { id: 'clearH', name: '강철 의지', desc: '어려움 클리어', gems: 80 },
  { id: 'clearX', name: '악몽을 넘어', desc: '악몽 클리어', gems: 150 },
  { id: 'evolve', name: '전설의 힘', desc: '전설 스킬(진화) 획득', gems: 20 },
  { id: 'balls500', name: '구슬 폭포', desc: '구슬 500개를 한꺼번에 띄우기', gems: 15 },
  { id: 'hit1k', name: '한 방', desc: '한 번에 1,000 피해', gems: 15 },
  { id: 'rich', name: '부자', desc: '코인 500개 보유', gems: 15 },
  { id: 'collector', name: '수집가', desc: '한 판에 스킬 15종 보유', gems: 20 },
  { id: 'phoenix', name: '불사조', desc: '부활하기', gems: 10 },
  { id: 'flawless', name: '완벽한 방어', desc: '피해 없이 보스 웨이브 클리어', gems: 25 },
  { id: 'k1000', name: '백전노장', desc: '누적 처치 1,000', gems: 20 },
  { id: 'k10000', name: '학살자', desc: '누적 처치 10,000', gems: 60 },
  { id: 'night10', name: '악몽의 문턱', desc: '악몽에서 웨이브 10 도달', gems: 50 },
];

function unlock(id) {
  if (!META || META.ach[id]) return;
  const a = ACHS.find(x => x.id === id);
  if (!a) return;
  META.ach[id] = 1;
  META.gems += a.gems;
  saveMeta();
  toast(`업적 달성! ${a.name}  +${a.gems} 보석`, '#ffcd75');
  SFX.play('achieve');
  checkCostumes();
}

// ---- costumes: progress-based ones unlock automatically
function checkCostumes() {
  let changed = false;
  for (const c of COSTUMES) {
    if (META.owned[c.id] || !c.unlock.req) continue;
    if (c.unlock.req()) {
      META.owned[c.id] = 1;
      changed = true;
      toast(`새 코스튬 해금! ${c.name} (옷장에서 착용)`, '#d6a8ff');
    }
  }
  if (changed) saveMeta();
}

// ---- run save (taken at every shop so closing the app never loses a run)
function saveRun() {
  if (!S) return;
  META.run = {
    S: JSON.parse(JSON.stringify(S)),
    shop: {
      offers: shop.offers.map(o => ({ id: o.sk.id, cost: o.cost, sold: o.sold })),
      refreshes: shop.refreshes, freeLeft: shop.freeLeft,
    },
  };
  saveMeta();
}
function clearRun() { META.run = null; saveMeta(); }
