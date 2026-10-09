/* STREET VAULT — util.js : small shared helpers (no game logic) */
(function () {
  'use strict';
  const SV = (window.SV = window.SV || {});
  const U = (SV.util = {});

  U.esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  U.fmt = (n) => Math.floor(Number(n) || 0).toLocaleString('en-US');
  U.clone = (o) => JSON.parse(JSON.stringify(o));
  U.isInt = (n) => typeof n === 'number' && Number.isFinite(n) && Math.floor(n) === n;
  U.isObj = (o) => o !== null && typeof o === 'object' && !Array.isArray(o);

  /* Random float in [0,1). Uses crypto when present. */
  U.rand = function () {
    try {
      const a = new Uint32Array(1);
      (window.crypto || window.msCrypto).getRandomValues(a);
      return a[0] / 4294967296;
    } catch (e) {
      return Math.random();
    }
  };
  /* Deterministic RNG for daily task selection */
  U.mulberry = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  U.hash = function (str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  };
  U.hashHex = (str) => U.hash(str).toString(36);

  /* ---- colour helpers ---- */
  U.hex2rgb = function (h) {
    h = String(h || '#000').replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  U.rgb2hex = (r, g, b) =>
    '#' + [r, g, b].map((v) => U.clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  U.mix = function (a, b, t) {
    const x = U.hex2rgb(a), y = U.hex2rgb(b);
    return U.rgb2hex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
  };
  /* amt>0 lighten toward white, amt<0 darken toward black */
  U.shade = (hex, amt) => (amt >= 0 ? U.mix(hex, '#ffffff', amt) : U.mix(hex, '#000000', -amt));
  U.rgba = function (hex, a) {
    const c = U.hex2rgb(hex);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  };
  U.isHex = (s) => typeof s === 'string' && /^#[0-9a-fA-F]{6}$/.test(s);

  /* ---- tiny event bus ---- */
  const handlers = {};
  SV.bus = {
    on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); return () => SV.bus.off(ev, fn); },
    off(ev, fn) { handlers[ev] = (handlers[ev] || []).filter((f) => f !== fn); },
    emit(ev, payload) {
      (handlers[ev] || []).slice().forEach((fn) => {
        try { fn(payload); } catch (e) { console.error('[bus:' + ev + ']', e); }
      });
    },
  };

  /* ---- DOM ---- */
  U.$ = (sel, root) => (root || document).querySelector(sel);
  U.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  U.el = function (html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };
  U.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
})();
