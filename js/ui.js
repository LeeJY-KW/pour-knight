// DOM overlays: title, camp, records, help, shop, pause, game over. Plus toast messages.
const overlay = document.getElementById('overlay');
const toastEl = document.getElementById('toast');
let shop = { offers: [], refreshes: 0, freeLeft: 0 };
let titleStart = 1;
let abandonArmed = false;

function showOverlay(html, anim = true) {
  overlay.innerHTML = html;
  overlay.classList.remove('hidden');
  if (anim) { const p = overlay.querySelector('.panel'); if (p) p.classList.add('appear'); overlay.scrollTop = 0; }
  // count-up numbers
  overlay.querySelectorAll('[data-count]').forEach(el => {
    const target = +el.dataset.count;
    const t0 = performance.now();
    const stepFn = now => {
      const p = Math.min(1, (now - t0) / 900);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1 && el.isConnected) requestAnimationFrame(stepFn);
    };
    requestAnimationFrame(stepFn);
  });
}
function hideOverlay() {
  overlay.classList.add('hidden');
  overlay.innerHTML = '';
}

function pixImg(url, cls = '') { return `<img class="pix ${cls}" src="${url}" alt="">`; }
const coinI = () => pixImg(SPR.coinURL, 'ci');
const gemI = () => pixImg(SPR.gemURL, 'ci');

// ---- toast queue
const toastQ = [];
let toastBusy = false;
function toast(msg, color = '#f4f4f4') {
  toastQ.push({ msg, color });
  while (toastQ.length > 3) toastQ.shift();
  if (!toastBusy) nextToast();
}
function nextToast() {
  const t = toastQ.shift();
  if (!t) { toastBusy = false; return; }
  toastBusy = true;
  toastEl.textContent = t.msg;
  toastEl.style.color = t.color;
  toastEl.classList.add('show');
  setTimeout(() => { toastEl.classList.remove('show'); setTimeout(nextToast, 250); }, 2200);
}

let _logo = null;
function logoHTML() {
  if (!_logo) {
    const a = textImage('POUR', '#ffcd75', 1);
    const b = textImage('KNIGHT', '#73eff7', 1);
    const c = document.createElement('canvas');
    c.width = Math.max(a.width, b.width); c.height = a.height + b.height + 1;
    const g = c.getContext('2d');
    g.drawImage(a, Math.floor((c.width - a.width) / 2), 0);
    g.drawImage(b, Math.floor((c.width - b.width) / 2), a.height + 1);
    _logo = { url: c.toDataURL(), w: c.width, h: c.height };
  }
  const k = 5;
  return `<img class="pix logo" src="${_logo.url}" style="width:calc(var(--u)*${_logo.w * k});height:calc(var(--u)*${_logo.h * k})" alt="Pour Knight">`;
}

function musicLabel() { return MUSIC.enabled ? '음악: 켬' : '음악: 끔'; }
function sfxLabel() { return SFX.muted ? '효과음: 끔' : '효과음: 켬'; }
function soundButtons() {
  return `<button class="btn small" data-act="music">${musicLabel()}</button>
      <button class="btn small" data-act="sfx">${sfxLabel()}</button>`;
}

function buildHTML() {
  const ids = Object.keys(S.bought);
  if (!ids.length) return '<p class="stats">아직 스킬이 없습니다</p>';
  return '<div class="build">' + ids.map(id => {
    const sk = SKILL_BY_ID[id];
    if (!sk) return '';
    return `<span class="bi r${sk.rarity}" title="${sk.name}">${pixImg(SPR.iconURL[sk.icon])}<i>${S.bought[id]}</i></span>`;
  }).join('') + '</div>';
}

// ---------------------------------------------------------------- title
function showTitle() {
  const cps = checkpoints();
  if (!cps.includes(titleStart)) titleStart = cps[cps.length - 1];
  const run = META.run;
  showOverlay(`
    <div class="panel">
      ${logoHTML()}
      <p class="sub">컵을 기울여 구슬을 붓고, 배수 게이트로 불려서<br>몰려오는 몬스터 웨이브를 막아내라!</p>
      ${run ? `<button class="btn big" data-act="continue">이어하기 · WAVE ${run.S.wave + 1}</button><br>` : ''}
      ${cps.length > 1 ? `<div class="chips">시작 웨이브
        ${cps.map(c => `<button class="chip ${c === titleStart ? 'on' : ''}" data-act="cp" data-c="${c}">${c}</button>`).join('')}
        </div>` : ''}
      <div class="chips">난이도
        ${Object.entries(DIFFS).map(([k, d]) => {
          const locked = !diffUnlocked(k);
          const cleared = META.clears[k] ? ' ★' : '';
          return `<button class="chip ${(META.diff || 'normal') === k ? 'on' : ''}" data-act="diff" data-d="${k}" ${locked ? 'disabled' : ''}>${locked ? `🔒 ${DIFFS[d.unlockBy].name} 클리어` : d.name + cleared + (d.gem > 1 ? ` ${gemI()}x${d.gem}` : '')}</button>`;
        }).join('')}
      </div>
      <button class="btn ${run ? '' : 'big'}" data-act="start">${run ? '새로 시작' : '시작하기'}${titleStart > 1 ? ` (W${titleStart})` : ''}</button><br>
      <button class="btn blue" data-act="camp">${gemI()} 캠프 강화</button>
      <button class="btn purple" data-act="wardrobe">${pixImg(heroSkin().url, 'ci')} 옷장</button><br>
      <button class="btn small" data-act="records">기록·업적</button>
      <button class="btn small" data-act="help">도움말</button><br>
      ${soundButtons()}
      <p class="best">최고 WAVE ${META.best || '-'} · ${gemI()} ${META.gems}</p>
      ${run ? '<p class="stats">새로 시작하면 저장된 게임은 사라집니다</p>' : ''}
    </div>`);
}

const ballDot = col => `<span class="bdot" style="background:${col}"></span>`;

function showHelp() {
  showOverlay(`
    <div class="panel">
      <h2>도움말</h2>
      <div class="howto">
        <div>• <b>누르고 있기</b> : 컵 기울여 붓기</div>
        <div>• <b>좌우 드래그</b> : 컵 이동</div>
        <div>• 게이트(x2, x3…)를 지나면 구슬이 늘어남</div>
        <div>• 바닥에 닿은 구슬 = 기사의 화살</div>
        <div>• 남은 피해량은 다음 적에게 넘어감</div>
        <div>• 웨이브 클리어 → 코인으로 스킬 구매</div>
        <div>• 한 판은 <b>${RUN_WAVES}웨이브</b>. 마지막 웨이브의 거인을 쓰러뜨리면 승리</div>
        <div>• 5웨이브마다 보스, 4웨이브마다 새 지역</div>
        <div>• 게임이 끝나면 <b>보석</b> 획득 → 캠프에서 영구 강화</div>
        <div>• 보통을 깨면 어려움, 어려움을 깨면 악몽이 열림</div>
        <div>• 스킬을 최대 레벨까지 올리면 <b>전설 진화 스킬</b>이 상점에 등장</div>
        <div>• 상점에 들어갈 때마다 자동 저장</div>
        <div style="opacity:.75">PC: ←/→ 이동 · Space 붓기 · P 일시정지 · M 소리</div>
      </div>
      <div class="howto">
        <div><b>구슬 종류</b> (스킬로 등장 확률을 올림)</div>
        <div>${ballDot('#f4f4f4')} 흰 x1 · ${ballDot('#c9d6e3')} 은 x2 · ${ballDot('#ffcd75')} 금 x3 · ${ballDot('#ef4f5f')} 루비 x5</div>
        <div><span class="bdot rainbowdot"></span> 무지개 x10 · ${ballDot('#e8fbff')} 다이아몬드 x25</div>
        <div><b>원소 구슬</b> → 그 구슬로 만든 화살에 효과가 붙음</div>
        <div>${ballDot('#ef7d57')} 화염: 화상 · ${ballDot('#73eff7')} 얼음: 감속·빙결</div>
        <div>${ballDot('#ffe66d')} 번개: 주변 2명 감전 · ${ballDot('#94b0c2')} 폭탄: 폭발</div>
        <div style="opacity:.75">원소 탄약은 기사 머리 위에 색깔 칩으로 표시됩니다</div>
      </div>
      <div class="howto">
        <div><b>구덩이 장치</b></div>
        <div>• <b>x2 / x3 게이트</b> : 지나간 구슬이 배수만큼 늘어남</div>
        <div>• <b>^x2 리버스 게이트</b> : 늘린 뒤 위로 튕겨 올려서 위쪽 게이트를 한 번 더 통과</div>
        <div>• <b>스프링</b> : 구슬을 다시 위로 발사 (처음 한 번은 위쪽 게이트 재통과 가능)</div>
        <div>• <b>x2 범퍼</b> : 부딪힌 구슬이 둘로 분열</div>
        <div>• <b>포털 IN → OUT</b> : 위로 순간이동해서 게이트를 다시 통과</div>
        <div>• <b>GOLD 게이트</b> : 구슬이 황금 구슬(가치 3배)로 바뀜</div>
        <div>• <b>/2 함정 게이트</b> : 구슬 절반이 사라짐 → 피해서 부으세요</div>
        <div>• <b>회전 막대</b> : 구슬을 쳐냄 · <b>바닥 x2/x3 구역</b> : 거기 떨어진 구슬 가치 배수</div>
      </div>
      <div class="howto">
        <div><b>난이도</b></div>
        <div>보통 → (클리어) → 어려움 보석 x1.6 → (클리어) → 악몽 보석 x2.5, 웨이브 사이 회복 없음</div>
      </div>
      <div class="howto">
        <div><b>적 도감</b></div>
        <div>슬라임 · 박쥐(비행) · 늑대(빠름) · 골렘(단단함)</div>
        <div>폭탄병(닿으면 폭발) · 분열 슬라임(죽으면 2마리)</div>
        <div>방패 해골(받는 피해 60% 감소)</div>
        <div>주술사(주변 적 회복 → 먼저 처치)</div>
        <div>보스: 골렘 왕(W5) · 슬라임 왕(W10, 분열) · 박쥐 군주(W15, 소환) · 화산 거인(W20, 늑대 소환)</div>
      </div>
      <button class="btn" data-act="title">돌아가기</button>
    </div>`);
}

function showCamp(anim = true) {
  const rows = META_UPS.map(u => {
    const l = metaLv(u.id);
    const maxed = l >= u.max;
    const c = metaCost(u);
    return `<div class="row">
      <div class="ricon">${pixImg(SPR.iconURL[u.icon])}</div>
      <div class="rtext"><b>${u.name}</b> <span class="lv">Lv ${l}/${u.max}</span><br><span class="rdesc">${u.desc}</span></div>
      <button class="btn small" data-act="mbuy" data-id="${u.id}" ${maxed || META.gems < c ? 'disabled' : ''}>${maxed ? 'MAX' : gemI() + c}</button>
    </div>`;
  }).join('');
  showOverlay(`
    <div class="panel">
      <h2>캠프</h2>
      <div class="coinline">${gemI()} ${META.gems}</div>
      <p class="stats">보석은 게임이 끝날 때 도달한 웨이브와 보스 처치에 따라 얻습니다</p>
      <div class="list">${rows}</div>
      <button class="btn" data-act="title">돌아가기</button>
    </div>`, anim);
}

function costumeState(c) {
  if (META.costume === c.id) return 'worn';
  if (META.owned[c.id]) return 'owned';
  if (c.unlock.gems) return 'buy';
  return 'locked';
}

function showWardrobe(anim = true) {
  const cards = COSTUMES.map(c => {
    const st = costumeState(c);
    let btn;
    if (st === 'worn') btn = '<button class="btn" disabled>착용 중</button>';
    else if (st === 'owned') btn = `<button class="btn" data-act="wear" data-id="${c.id}">착용</button>`;
    else if (st === 'buy') btn = `<button class="btn blue" data-act="cbuy" data-id="${c.id}" ${META.gems >= c.unlock.gems ? '' : 'disabled'}>${gemI()}${c.unlock.gems}</button>`;
    else btn = `<div class="hint">🔒 ${c.unlock.hint}</div>`;
    return `<div class="skin ${st}">
      <div class="sprev"><img class="pix" src="${SKINS[c.id].url}" alt=""></div>
      <div class="name">${c.name}</div>
      <div class="trail" style="background:${c.arrow}"></div>
      ${btn}
    </div>`;
  }).join('');
  const owned = COSTUMES.filter(c => META.owned[c.id]).length;
  showOverlay(`
    <div class="panel">
      <h2>옷장</h2>
      <p class="stats">코스튬은 외형과 화살 색만 바꿉니다 · 보유 ${owned}/${COSTUMES.length}</p>
      <div class="coinline">${gemI()} ${META.gems}</div>
      <div class="skins">${cards}</div>
      <button class="btn" data-act="title">돌아가기</button>
    </div>`, anim);
}

function nextGoalHTML() {
  const locked = COSTUMES.filter(c => !META.owned[c.id]);
  const buyable = locked.filter(c => c.unlock.gems).sort((a, b) => a.unlock.gems - b.unlock.gems)[0];
  const prog = locked.find(c => c.unlock.req);
  const camp = META_UPS.filter(u => metaLv(u.id) < u.max).sort((a, b) => metaCost(a) - metaCost(b))[0];
  const lines = [];
  if (camp) lines.push(`캠프: ${camp.name} Lv${metaLv(camp.id) + 1} — ${gemI()}${metaCost(camp)}${META.gems >= metaCost(camp) ? ' <b class="ok">구매 가능!</b>' : ''}`);
  if (buyable) lines.push(`옷장: ${buyable.name} — ${gemI()}${buyable.unlock.gems}${META.gems >= buyable.unlock.gems ? ' <b class="ok">구매 가능!</b>' : ''}`);
  if (prog) lines.push(`코스튬 해금: ${prog.name} — ${prog.unlock.hint}`);
  return lines.length ? `<div class="howto goals"><div><b>다음 목표</b></div>${lines.map(l => `<div>• ${l}</div>`).join('')}</div>` : '';
}

function showRecords() {
  const done = ACHS.filter(a => META.ach[a.id]).length;
  const achs = ACHS.map(a => `<div class="row ach ${META.ach[a.id] ? 'done' : ''}">
      <div class="rtext"><b>${META.ach[a.id] ? '★' : '☆'} ${a.name}</b><br><span class="rdesc">${a.desc}</span></div>
      <span class="reward">${gemI()}${a.gems}</span></div>`).join('');
  showOverlay(`
    <div class="panel">
      <h2>기록</h2>
      <p>최고 WAVE <b style="color:#ffcd75">${META.best || '-'}</b> · 플레이 ${META.runs}회</p>
      <p>누적 처치 ${META.kills.toLocaleString()} · 보스 ${META.bosses}</p>
      <h3>업적 ${done}/${ACHS.length}</h3>
      <div class="list">${achs}</div>
      <button class="btn" data-act="title">돌아가기</button>
    </div>`);
}

// ---------------------------------------------------------------- shop
function openShop(restored) {
  if (!restored) {
    shop.refreshes = 0;
    shop.freeLeft = S.freeReroll ? 1 : 0;
    shop.offers = rollOffers(3 + S.extraCard);
  }
  if (Object.keys(S.bought).length >= 15) unlock('collector');
  saveRun();
  renderShop();
}

function refreshCost() {
  if (shop.freeLeft > 0) return 0;
  return Math.round((10 + shop.refreshes * 8) * (1 + (S.wave - 1) * 0.04));
}

function renderShop(anim = true, flashIdx = -1) {
  const cards = shop.offers.map((o, i) => {
    const sk = o.sk;
    const stars = sk.rarity === 4 ? '전설' : '★'.repeat(sk.rarity) + '☆'.repeat(3 - sk.rarity);
    const owned = S.bought[sk.id] || 0;
    const can = !o.sold && S.coins >= o.cost;
    return `
      <div class="card r${sk.rarity} ${o.sold ? 'sold' : ''} ${i === flashIdx ? 'flash' : ''}">
        <div class="icon">${pixImg(SPR.iconURL[sk.icon])}</div>
        <div class="name">${sk.name}</div>
        <div class="desc">${sk.desc}</div>
        <div class="stars">${stars}${owned ? ` Lv${owned}` : ''}</div>
        <button class="btn" data-act="buy" data-i="${i}" ${can ? '' : 'disabled'}>
          ${o.sold ? '구매 완료' : coinI() + o.cost}
        </button>
      </div>`;
  }).join('');
  const rc = refreshCost();
  const title = S.prep ? `WAVE ${S.wave + 1} 출발 준비` : `WAVE ${S.wave} 클리어!`;
  showOverlay(`
    <div class="panel">
      <h2>${title}</h2>
      <div class="coinline">${coinI()}${S.coins}</div>
      <p class="stats">체력 ${S.hp}/${S.maxHp} · 공격 x${S.atkMul.toFixed(2)} · 컵 ${S.cupSize} · 회피 ${Math.round(S.miss * 100)}%</p>
      <div class="cards ${shop.offers.length > 3 ? 'four' : ''}">${cards}</div>
      <button class="btn small pink" data-act="refresh" ${S.coins >= rc ? '' : 'disabled'}>새로고침 ${rc ? coinI() + rc : '(무료)'}</button>
      <br>
      <button class="btn big" data-act="next">다음 웨이브 ▶</button>
      <details class="mybuild" ${shop.buildOpen ? 'open' : ''}><summary>내 스킬 (${Object.keys(S.bought).length}종)</summary>${buildHTML()}</details>
    </div>`, anim);
  const det = overlay.querySelector('.mybuild');
  if (det) det.addEventListener('toggle', () => { shop.buildOpen = det.open; });
}

// ---------------------------------------------------------------- pause / game over
function pauseGame() {
  if (!S || S.state !== 'play' || S.paused) return;
  S.paused = true;
  input.down = false; input.keyPour = false;
  abandonArmed = false;
  showPause();
}
function showPause() {
  showOverlay(`
    <div class="panel">
      <h2>일시정지</h2>
      <p>WAVE ${S.wave} · ${coinI()}${S.coins}</p>
      ${buildHTML()}
      <button class="btn big" data-act="resume">계속하기</button><br>
      ${soundButtons()}
      <button class="btn small" data-act="help">도움말</button><br>
      <button class="btn small pink" data-act="abandon">${abandonArmed ? '정말 포기할까요? (한 번 더)' : '포기하기'}</button>
    </div>`);
}

function showGameOver() {
  showOverlay(`
    <div class="panel">
      ${S.victory
        ? `<h2>승리!</h2><p><b style="color:#ffcd75">${DIFFS[S.diff || 'normal'].name}</b> 난이도 ${RUN_WAVES}웨이브 돌파!</p>
           ${S.diff !== 'nightmare' ? `<p class="ok">${DIFFS[S.diff === 'normal' ? 'hard' : 'nightmare'].name} 난이도가 열렸습니다</p>` : '<p class="ok">모든 난이도 정복!</p>'}`
        : `<h2 class="red">쓰러졌다...</h2>
           <p>도달한 웨이브: <b style="color:#ffcd75">WAVE ${S.wave}/${RUN_WAVES}</b> · ${DIFFS[S.diff || 'normal'].name}</p>`}
      <p>처치 ${S.kills} · 보스 ${S.bossKills}</p>
      <div class="coinline">+${gemI()} <span data-count="${S.finalGems || 0}">0</span></div>
      <p class="best">최고 기록: WAVE ${META.best} · 보유 보석 ${META.gems}</p>
      ${nextGoalHTML()}
      ${buildHTML()}
      <button class="btn big" data-act="restart">다시 도전</button><br>
      <button class="btn blue" data-act="camp">${gemI()} 캠프 강화</button>
      <button class="btn purple" data-act="wardrobe">옷장</button>
      <button class="btn small" data-act="title">타이틀로</button>
    </div>`);
}

function goTitle() {
  S = null;
  world.layoutIdx = 0;
  resetWorld(1);
  showTitle();
}

function continueRun() {
  const run = META.run;
  if (!run) return;
  S = Object.assign(freshRunState(1), run.S);
  S.state = 'shop'; S.paused = false;
  world.layoutIdx = -1;
  resetWorld(S.wave + 1);
  shop.offers = run.shop.offers.filter(o => SKILL_BY_ID[o.id]).map(o => ({ sk: SKILL_BY_ID[o.id], cost: o.cost, sold: o.sold }));
  shop.refreshes = run.shop.refreshes || 0;
  shop.freeLeft = run.shop.freeLeft || 0;
  openShop(true);
}

overlay.addEventListener('click', e => {
  const btn = e.target.closest('[data-act]');
  if (!btn || btn.disabled) return;
  SFX.init();
  const act = btn.dataset.act;
  switch (act) {
    case 'start':
    case 'restart':
      SFX.play('click');
      hideOverlay();
      newRun(checkpoints().includes(titleStart) ? titleStart : 1);
      break;
    case 'continue':
      SFX.play('click');
      continueRun();
      break;
    case 'diff':
      META.diff = btn.dataset.d; saveMeta();
      SFX.play('click');
      showTitle();
      break;
    case 'cp':
      titleStart = +btn.dataset.c;
      SFX.play('click');
      showTitle();
      break;
    case 'title': SFX.play('click'); if (S && S.state === 'over') S = null; if (S && S.paused) showPause(); else goTitle(); break;
    case 'camp': SFX.play('click'); S = null; showCamp(); break;
    case 'records': SFX.play('click'); showRecords(); break;
    case 'help': SFX.play('click'); showHelp(); break;
    case 'music':
      MUSIC.setEnabled(!MUSIC.enabled); META.music = MUSIC.enabled; saveMeta();
      btn.textContent = musicLabel();
      break;
    case 'sfx':
      SFX.setMuted(!SFX.muted); META.muted = SFX.muted; saveMeta();
      btn.textContent = sfxLabel();
      SFX.play('click');
      break;
    case 'wardrobe': SFX.play('click'); S = null; showWardrobe(); break;
    case 'wear':
      META.costume = btn.dataset.id; saveMeta();
      SFX.play('buy');
      showWardrobe(false);
      break;
    case 'cbuy': {
      const c = COSTUMES.find(x => x.id === btn.dataset.id);
      if (!c || META.owned[c.id] || !c.unlock.gems || META.gems < c.unlock.gems) { SFX.play('deny'); return; }
      META.gems -= c.unlock.gems;
      META.owned[c.id] = 1;
      META.costume = c.id;
      saveMeta();
      SFX.play('achieve');
      toast(`${c.name} 획득!`, '#d6a8ff');
      showWardrobe(false);
      break;
    }
    case 'mbuy': {
      const u = META_UPS.find(x => x.id === btn.dataset.id);
      const c = metaCost(u);
      if (!u || metaLv(u.id) >= u.max || META.gems < c) { SFX.play('deny'); return; }
      META.gems -= c;
      META.up[u.id] = metaLv(u.id) + 1;
      saveMeta();
      SFX.play('buy');
      showCamp(false);
      break;
    }
    case 'buy': {
      const o = shop.offers[+btn.dataset.i];
      if (!o || o.sold || S.coins < o.cost) { SFX.play('deny'); return; }
      S.coins -= o.cost;
      grantSkill(o.sk);
      o.sold = true;
      for (const x of shop.offers) if (!x.sold) x.cost = skillCost(x.sk);
      if (Object.keys(S.bought).length >= 15) unlock('collector');
      SFX.play('buy');
      saveRun();
      renderShop(false, +btn.dataset.i);
      break;
    }
    case 'refresh': {
      const rc = refreshCost();
      if (S.coins < rc) { SFX.play('deny'); return; }
      S.coins -= rc;
      if (shop.freeLeft > 0) shop.freeLeft--; else shop.refreshes++;
      shop.offers = rollOffers(3 + S.extraCard);
      SFX.play('click');
      saveRun();
      renderShop(false);
      overlay.querySelectorAll('.card').forEach(c => c.classList.add('deal'));
      break;
    }
    case 'next':
      SFX.play('click');
      hideOverlay();
      S.prep = false;
      S.wave++;
      startWave();
      break;
    case 'resume':
      SFX.play('click');
      S.paused = false;
      hideOverlay();
      break;
    case 'abandon':
      if (!abandonArmed) { abandonArmed = true; showPause(); return; }
      S.paused = false;
      S.state = 'over';
      endRun();
      break;
  }
});
