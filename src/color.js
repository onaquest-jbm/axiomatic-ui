'use strict';
// Small color helpers shared by the compiler, the linter and the auditor. No dependencies.

function parseColor(input) {
  if (!input) return null;
  const s = String(input).trim().toLowerCase();
  let m = s.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }
  m = s.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean);
    const num = (p, scale) => (p.endsWith('%') ? (parseFloat(p) / 100) * scale : parseFloat(p));
    return {
      r: num(parts[0], 255),
      g: num(parts[1], 255),
      b: num(parts[2], 255),
      a: parts[3] !== undefined ? num(parts[3], 1) : 1,
    };
  }
  m = s.match(/^hsla?\(([^)]+)\)$/);
  if (m) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean);
    const h = parseFloat(parts[0]);
    const sat = parseFloat(parts[1]) / 100;
    const l = parseFloat(parts[2]) / 100;
    const a = parts[3] !== undefined ? parseFloat(parts[3]) : 1;
    const k = (n) => (n + h / 30) % 12;
    const f = (n) => l - sat * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255, a };
  }
  return null;
}

function luminance({ r, g, b }) {
  const lin = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a, b) {
  const ca = typeof a === 'string' ? parseColor(a) : a;
  const cb = typeof b === 'string' ? parseColor(b) : b;
  if (!ca || !cb) return null;
  const la = luminance(ca);
  const lb = luminance(cb);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function hsl({ r, g, b }) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: h * 60, s, l };
}

// The blue-violet-magenta band that Tailwind's indigo/violet/purple defaults live in.
function isDefaultPurple(color) {
  const c = typeof color === 'string' ? parseColor(color) : color;
  if (!c) return false;
  const { h, s } = hsl(c);
  return s > 0.35 && h >= 235 && h <= 300;
}

module.exports = { parseColor, luminance, contrast, hsl, isDefaultPurple };

// ---- OKLCH, so lightness can be solved for exact contrast targets at a chosen hue.
function oklchToRgb(L, C, h) {
  const hr = (h * Math.PI) / 180;
  const a = C * Math.cos(hr), b = C * Math.sin(hr);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  const enc = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
  const [r, g, bb] = lin.map(enc);
  return { r: r * 255, g: g * 255, b: bb * 255, a: 1, inGamut: [r, g, bb].every((v) => v >= -0.0005 && v <= 1.0005) };
}

function rgbToOklch({ r, g, b }) {
  const dec = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const R = dec(r), G = dec(g), B = dec(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const Bv = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.sqrt(A * A + Bv * Bv);
  let h = (Math.atan2(Bv, A) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { L, C, h };
}

// Largest chroma <= C that is displayable in sRGB at this L and h.
function fitGamut(L, C, h) {
  let lo = 0, hi = C;
  if (oklchToRgb(L, C, h).inGamut) return C;
  for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (oklchToRgb(L, mid, h).inGamut) lo = mid; else hi = mid; }
  return lo;
}

function toHex({ r, g, b }) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

// Solve OKLCH lightness so the color has exactly `target` contrast against `against`,
// on the darker side (towards black) or the lighter side (towards white).
function solveLightness(target, against, h, C, side) {
  let lo = side === 'darker' ? 0 : rgbToOklch(parseColor(against)).L;
  let hi = side === 'darker' ? rgbToOklch(parseColor(against)).L : 1;
  let best = null;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const rgb = oklchToRgb(mid, fitGamut(mid, C, h), h);
    const ratio = contrast(rgb, against);
    // Moving away from the background raises contrast.
    const tooLow = ratio < target;
    if (side === 'darker') { if (tooLow) hi = mid; else { lo = mid; best = rgb; } }
    else { if (tooLow) lo = mid; else { hi = mid; best = rgb; } }
  }
  return best ? toHex(best) : (side === 'darker' ? '#000000' : '#ffffff');
}

function oklchHex(L, C, h) { return toHex(oklchToRgb(L, fitGamut(L, C, h), h)); }

module.exports.oklchToRgb = oklchToRgb;
module.exports.rgbToOklch = rgbToOklch;
module.exports.fitGamut = fitGamut;
module.exports.toHex = toHex;
module.exports.solveLightness = solveLightness;
module.exports.oklchHex = oklchHex;
