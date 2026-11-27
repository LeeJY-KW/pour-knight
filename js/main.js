// Boot, resize, input, main loop.
canvas = document.getElementById('game');
ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

function resize() {
  const wrap = document.getElementById('wrap');
  let s = Math.min(window.innerWidth / W, window.innerHeight / H);
  if (s >= 2) s = Math.floor(s * 4) / 4; // keep pixels fairly even on big screens
  const ww = Math.floor(W * s), hh = Math.floor(H * s);
  wrap.style.width = ww + 'px';
  wrap.style.height = hh + 'px';
  // UI unit stays relative to a 216-wide layout so menus keep their size
  document.documentElement.style.setProperty('--u', (ww / 216) + 'px');
}

// ---- input
function toGame(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
}
const inRect = (p, r) => p.x >= r.x - 2 && p.x <= r.x + r.w + 2 && p.y >= r.y - 2 && p.y <= r.y + r.h + 2;

canvas.addEventListener('pointerdown', e => {
  SFX.init();
  const p = toGame(e);
  if (S && (S.state === 'play' || S.state === 'cleared') && !S.paused) {
    if (inRect(p, BTN_PAUSE)) { if (S.state === 'play') { SFX.play('click'); pauseGame(); } return; }
    if (inRect(p, BTN_SPEED)) { META.speed = META.speed === 1 ? 2 : 1; saveMeta(); SFX.play('click'); return; }
  }
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  input.down = true;
  world.cupTX = p.x;
  e.preventDefault();
});
canvas.addEventListener('pointermove', e => {
  if (input.down || e.pointerType === 'mouse') world.cupTX = toGame(e).x;
});
const release = () => { input.down = false; };
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
canvas.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { input.down = false; input.keyPour = false; pauseGame(); }
});

window.addEventListener('keydown', e => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.keyL = true;
  else if (e.code === 'ArrowRight' || e.code === 'KeyD') input.keyR = true;
  else if (e.code === 'Space') { input.keyPour = true; SFX.init(); e.preventDefault(); }
  else if (e.code === 'KeyM') { SFX.init(); MUSIC.setEnabled(!MUSIC.enabled); META.music = MUSIC.enabled; saveMeta(); }
  else if (e.code === 'KeyN') { SFX.setMuted(!SFX.muted); META.muted = SFX.muted; saveMeta(); }
  else if (e.code === 'KeyP' || e.code === 'Escape') pauseGame();
});
window.addEventListener('keyup', e => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.keyL = false;
  else if (e.code === 'ArrowRight' || e.code === 'KeyD') input.keyR = false;
  else if (e.code === 'Space') input.keyPour = false;
});

// ---- loop
let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05;
  if (dt < 0) dt = 0;
  const fast = S && !S.paused && (S.state === 'play' || S.state === 'cleared') ? META.speed : 1;
  for (let i = 0; i < fast; i++) update(dt);
  render();
  MUSIC.set(desiredTrack());
  MUSIC.duck(!!(S && S.paused));
  requestAnimationFrame(frame);
}

loadMeta();
SFX.muted = !!META.muted;
MUSIC.enabled = META.music !== false;
// browsers only allow audio after a user gesture: unlock on the first tap/click anywhere
window.addEventListener('pointerdown', () => SFX.init(), { once: false, capture: true });
buildSprites();
world.layoutIdx = 0;
resetWorld(1);
resize();
window.addEventListener('resize', resize);
showTitle();
requestAnimationFrame(frame);
