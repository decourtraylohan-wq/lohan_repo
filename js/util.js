// Utilitaires partagés
window.G = window.G || {};

G.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
G.lerp = (a, b, t) => a + (b - a) * t;
G.rand = (a, b) => a + Math.random() * (b - a);
G.randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
G.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// RNG déterministe (pour générer les maps de façon identique à chaque partie)
G.mulberry32 = function (seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Bruit de valeur 2D lissé
G.makeNoise = function (seed) {
  const rnd = G.mulberry32(seed);
  const perm = new Float32Array(256 * 256);
  for (let i = 0; i < perm.length; i++) perm[i] = rnd();
  const v = (x, y) => perm[((y & 255) << 8) | (x & 255)];
  const smooth = (t) => t * t * (3 - 2 * t);
  function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = smooth(x - xi), yf = smooth(y - yi);
    const a = v(xi, yi), b = v(xi + 1, yi), c = v(xi, yi + 1), d = v(xi + 1, yi + 1);
    return G.lerp(G.lerp(a, b, xf), G.lerp(c, d, xf), yf);
  }
  return function fbm(x, y, oct = 3) {
    let s = 0, amp = 1, f = 1, n = 0;
    for (let i = 0; i < oct; i++) { s += noise(x * f, y * f) * amp; n += amp; amp *= 0.5; f *= 2; }
    return s / n;
  };
};

G.store = {
  get(key, def) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; }
  },
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* stockage indisponible */ }
  },
};

G.fmtTime = function (s) {
  s = Math.floor(s);
  const m = Math.floor(s / 60), r = s % 60;
  return m + ':' + (r < 10 ? '0' : '') + r;
};

G.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
