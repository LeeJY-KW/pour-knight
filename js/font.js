// 3x5 bitmap pixel font. Each glyph = 15 bits (5 rows x 3 cols).
const GLYPHS = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111',
  '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001010010010',
  '8': '111101111101111', '9': '111101111001111',
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111',
  x: '000101010101000',
  '/': '001001010100100', '+': '000010111010000', '-': '000000111000000', '%': '101001010100101',
  '!': '010010010000010', ':': '000010000010000', '.': '000000000000010', ',': '000000000010100',
  '?': '111001010000010', '^': '010101000000000', '>': '100010001010100', '<': '001010100010001', ' ': '000000000000000',
};

function textWidth(str, s = 1) {
  str = String(str);
  return str.length ? (str.length * 4 - 1) * s : 0;
}

function _glyphs(g, str, ox, oy, s) {
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const bits = GLYPHS[ch] || GLYPHS[ch.toUpperCase()];
    if (!bits) continue;
    for (let p = 0; p < 15; p++) {
      if (bits.charCodeAt(p) === 49) {
        g.fillRect(ox + i * 4 * s + (p % 3) * s, oy + ((p / 3) | 0) * s, s, s);
      }
    }
  }
}

// outline: color string = full outline, "_color" = drop shadow only, null = none
function _renderText(str, color, s, outline) {
  const tw = textWidth(str, s);
  const c = document.createElement('canvas');
  c.width = Math.max(1, tw + 2);
  c.height = 5 * s + 2;
  const g = c.getContext('2d');
  if (outline) {
    if (outline[0] === '_') {
      g.fillStyle = outline.slice(1);
      _glyphs(g, str, 1, 2, s);
    } else {
      g.fillStyle = outline;
      for (const [ox, oy] of [[0, 1], [2, 1], [1, 0], [1, 2], [2, 2]]) _glyphs(g, str, ox, oy, s);
    }
  }
  g.fillStyle = color;
  _glyphs(g, str, 1, 1, s);
  return c;
}

const _textCache = new Map();

function drawText(ctx, str, x, y, color = '#f4f4f4', s = 1, align = 'left', outline = '#1a1c2c') {
  str = String(str);
  const key = str + '|' + color + '|' + s + '|' + outline;
  let c = _textCache.get(key);
  if (!c) {
    if (_textCache.size > 500) _textCache.clear();
    c = _renderText(str, color, s, outline);
    _textCache.set(key, c);
  }
  const tw = textWidth(str, s);
  let dx = x;
  if (align === 'center') dx = x - Math.floor(tw / 2);
  else if (align === 'right') dx = x - tw;
  ctx.drawImage(c, Math.round(dx) - 1, Math.round(y) - 1);
}

function textImage(str, color, s = 1, outline = '#1a1c2c') {
  return _renderText(String(str), color, s, outline);
}

function fmt(n) {
  n = Math.round(n);
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e4) return Math.round(n / 1000) + 'K';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}
