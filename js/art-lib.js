/* STREET VAULT — art-lib.js : shared drawing helpers for the SVG car renderer */
(function () {
  'use strict';
  const SV = (window.SV = window.SV || {});
  const U = SV.util, D = SV.data;
  const A = (SV.art = SV.art || {});

  const N = (n) => Math.round(n * 10) / 10;
  A.N = N;

  /* Rounded polygon path: pts = [[x,y]...], radii = per-vertex corner radius */
  A.roundedPoly = function (pts, radii) {
    const n = pts.length;
    let d = '';
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
      const r = radii[i] || 0;
      const v1 = [p0[0] - p1[0], p0[1] - p1[1]], v2 = [p2[0] - p1[0], p2[1] - p1[1]];
      const l1 = Math.hypot(v1[0], v1[1]) || 1, l2 = Math.hypot(v2[0], v2[1]) || 1;
      const k = Math.min(r, l1 * 0.5, l2 * 0.5);
      const a = [p1[0] + (v1[0] / l1) * k, p1[1] + (v1[1] / l1) * k];
      const b = [p1[0] + (v2[0] / l2) * k, p1[1] + (v2[1] / l2) * k];
      d += (i ? 'L' : 'M') + N(a[0]) + ' ' + N(a[1]) + 'Q' + N(p1[0]) + ' ' + N(p1[1]) + ' ' + N(b[0]) + ' ' + N(b[1]);
    }
    return d + 'Z';
  };
  A.poly = (pts) => pts.map((p) => N(p[0]) + ',' + N(p[1])).join(' ');

  /* Build -> resolved, validated parts. Renderer never trusts the raw build. */
  A.resolve = function (carItem, build) {
    const b = build || {};
    const get = (slot) => {
      const it = b[slot] ? D.ITEM[b[slot]] : null;
      return it && it.slot === slot && D.compatible(it, carItem.id) ? it : null;
    };
    const r = { car: carItem, parts: {} };
    D.SLOT_KEYS.forEach((s) => { r.parts[s] = get(s); });
    r.paint = r.parts.paint ? r.parts.paint.vis : { finish: 'gloss', c1: carItem.car.color };
    r.wheel = r.parts.wheels;
    r.wheelCol = U.isHex(b.wheelColor) ? b.wheelColor : null;
    r.plateText = typeof b.plateText === 'string' && b.plateText ? b.plateText.toUpperCase().slice(0, D.ECON.maxPlateText) : null;
    return r;
  };

  /* ----- shared defs: carbon weave, gold, paint gradient ----- */
  A.carbonDef = (id) =>
    '<pattern id="' + id + '" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
    '<rect width="8" height="8" fill="#1a1c21"/><rect width="4" height="4" fill="#2f323a"/><rect x="4" y="4" width="4" height="4" fill="#2f323a"/>' +
    '<rect width="8" height="1" fill="#383b43" opacity=".55"/></pattern>';
  A.goldDef = (id) =>
    '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset=".45" stop-color="#d9a21b"/><stop offset=".5" stop-color="#7a5408"/><stop offset="1" stop-color="#e8bb44"/></linearGradient>';

  A.matFill = function (mat, uid) {
    if (mat === 'carbon') return 'url(#' + uid + 'cf)';
    if (mat === 'body') return 'url(#' + uid + 'pf)';
    if (mat === 'gold') return 'url(#' + uid + 'gd)';
    if (mat === 'red') return '#c0182b';
    return '#2b2d35';
  };

  /* Paint gradient (user-space, so every body part shares one continuous finish) */
  A.paintDef = function (id, v, g, anim) {
    const c1 = v.c1, c2 = v.c2 || c1, c3 = v.c3 || c2;
    const sh = U.shade, mx = U.mix;
    let stops, diag = false, hi = 0.45, mov = false;
    switch (v.finish) {
      case 'metallic': stops = [[0, sh(c1, 0.38)], [0.35, sh(c1, 0.06)], [0.62, sh(c1, -0.14)], [1, sh(c1, -0.52)]]; hi = 0.5; break;
      case 'matte':    stops = [[0, sh(c1, 0.08)], [1, sh(c1, -0.22)]]; hi = 0; break;
      case 'pearl':    stops = [[0, sh(c1, 0.22)], [0.35, c1], [0.7, mx(c1, c2, 0.8)], [1, sh(c2, -0.35)]]; diag = true; hi = 0.4; break;
      case 'chrome':   stops = [[0, mx('#ffffff', c1, 0.35)], [0.3, mx('#dfe6ee', c1, 0.55)], [0.47, sh(c1, -0.55)], [0.5, '#ffffff'], [0.57, sh(c1, -0.4)], [0.82, sh(c1, -0.1)], [1, sh(c1, -0.62)]]; hi = 0.18; break;
      case 'flip':     stops = [[0, c3], [0.3, c2], [0.62, c1], [1, sh(c1, -0.45)]]; diag = true; hi = 0.35; mov = true; break;
      case 'holo':     stops = [[0, c1], [0.25, c2], [0.5, c3], [0.75, c2], [1, c1]]; diag = true; hi = 0.3; mov = true; break;
      case 'void':     stops = [[0, '#101018'], [0.5, '#050507'], [0.86, mx('#050507', c2, 0.5)], [1, mx('#050507', c3, 0.75)]]; hi = 0.14; break;
      default:         stops = [[0, sh(c1, 0.2)], [0.45, c1], [1, sh(c1, -0.42)]]; hi = 0.5;
    }
    let x1 = 0, y1 = g.roof - 6, x2 = 0, y2 = g.sill + 4;
    if (diag) { x1 = g.tail; y1 = g.roof; x2 = g.nose; y2 = g.sill + 20; }
    let anims = '';
    if (mov && anim) {
      anims = '<animateTransform attributeName="gradientTransform" type="translate" values="0 0;' + (g.nose - g.tail) * 0.8 + ' 0;0 0" dur="9s" repeatCount="indefinite"/>';
    }
    return {
      hi: hi,
      def: '<linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" spreadMethod="reflect" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '">' +
        stops.map((s) => '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"/>').join('') + anims + '</linearGradient>',
    };
  };

  /* ----- wheel (side view) ----- */
  function spokePoly(cx, cy, a, r0, r1, w0, w1) {
    const c = Math.cos(a), s = Math.sin(a), px = -s, py = c;
    return A.poly([
      [cx + c * r0 + px * w0, cy + s * r0 + py * w0],
      [cx + c * r1 + px * w1, cy + s * r1 + py * w1],
      [cx + c * r1 - px * w1, cy + s * r1 - py * w1],
      [cx + c * r0 - px * w0, cy + s * r0 - py * w0],
    ]);
  }
  A.wheel = function (v, cx, cy, R, colOv, uid) {
    v = v || { style: 'steel', n: 6, col: '#8b9098' };
    const k = R / 30;
    const col = !v.fixed && colOv ? colOv : v.col;
    const lipC = v.lip && !(colOv && !v.fixed && !v.lip) ? v.lip : U.shade(col, 0.22);
    const dark = U.shade(col, -0.45);
    const rr = R * 0.74, f = rr * 0.9, hub = f * 0.22;
    const n = v.n || 5, st = v.style;
    const tag = (x) => (v.carbon ? 'url(#' + uid + 'cf)' : x);
    let s = '';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="#0c0d0f"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + N(R * 0.93) + '" fill="none" stroke="#202227" stroke-width="' + N(1.4 * k) + '"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + N(R * 0.84) + '" fill="none" stroke="#17181b" stroke-width="' + N(2 * k) + '"/>';
    /* brake disc + caliper */
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + N(rr * 0.92) + '" fill="#3b3e45"/>';
    s += '<path d="M' + N(cx + Math.cos(-0.9) * rr * 0.88) + ' ' + N(cy + Math.sin(-0.9) * rr * 0.88) + 'A' + N(rr * 0.88) + ' ' + N(rr * 0.88) + ' 0 0 1 ' + N(cx + Math.cos(0.15) * rr * 0.88) + ' ' + N(cy + Math.sin(0.15) * rr * 0.88) + '" fill="none" stroke="#c0182b" stroke-width="' + N(5 * k) + '" stroke-linecap="round"/>';
    /* barrel + well */
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + N(rr) + '" fill="' + lipC + '"/>';
    if (v.deepLip) s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + N(rr * 0.96) + '" fill="none" stroke="' + U.shade(lipC, -0.35) + '" stroke-width="' + N(1.2 * k) + '"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + N(rr * 0.9) + '" fill="#0b0b0d"/>';
    const fillF = tag(col);
    const strokeD = U.shade(col, -0.5);
    switch (st) {
      case 'steel':
        s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + N(f) + '" fill="' + fillF + '"/>';
        for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.2832 + 0.26; s += '<circle cx="' + N(cx + Math.cos(a) * f * 0.62) + '" cy="' + N(cy + Math.sin(a) * f * 0.62) + '" r="' + N(f * 0.13) + '" fill="#0b0b0d"/>'; }
        s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + N(f * 0.3) + '" fill="' + U.shade(col, 0.2) + '"/>';
        break;
      case 'classic':
        s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + N(f) + '" fill="' + fillF + '"/>';
        [0.88, 0.66, 0.44].forEach((m) => { s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + N(f * m) + '" fill="none" stroke="' + strokeD + '" stroke-width="' + N(0.9 * k) + '"/>'; });
        for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.2832; s += '<line x1="' + N(cx + Math.cos(a) * f * 0.3) + '" y1="' + N(cy + Math.sin(a) * f * 0.3) + '" x2="' + N(cx + Math.cos(a) * f * 0.88) + '" y2="' + N(cy + Math.sin(a) * f * 0.88) + '" stroke="' + strokeD + '" stroke-width="' + N(0.7 * k) + '"/>'; }
        s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + N(f * 0.22) + '" fill="' + U.shade(col, 0.35) + '"/>';
        break;
      case 'spoke':
        for (let i = 0; i < n; i++) s += '<polygon points="' + spokePoly(cx, cy, (i / n) * 6.2832 - 1.5708, hub, f, (v.w || 6) * k * 0.45, (v.w || 6) * k * 0.62) + '" fill="' + fillF + '" stroke="' + strokeD + '" stroke-width="' + N(0.5 * k) + '"/>';
        break;
      case 'twin':
        for (let i = 0; i < n; i++) { const a = (i / n) * 6.2832 - 1.5708; [-0.1, 0.1].forEach((o) => { s += '<polygon points="' + spokePoly(cx, cy, a + o, hub, f, 1.5 * k, 2.4 * k) + '" fill="' + fillF + '"/>'; }); }
        break;
      case 'mesh':
        for (let i = 0; i < n; i++) {
          const a = (i / n) * 6.2832;
          const x1 = cx + Math.cos(a) * hub * 1.2, y1 = cy + Math.sin(a) * hub * 1.2;
          s += '<line x1="' + N(x1) + '" y1="' + N(y1) + '" x2="' + N(cx + Math.cos(a + 0.55) * f) + '" y2="' + N(cy + Math.sin(a + 0.55) * f) + '" stroke="' + col + '" stroke-width="' + N(1.7 * k) + '"/>';
          s += '<line x1="' + N(x1) + '" y1="' + N(y1) + '" x2="' + N(cx + Math.cos(a - 0.55) * f) + '" y2="' + N(cy + Math.sin(a - 0.55) * f) + '" stroke="' + col + '" stroke-width="' + N(1.7 * k) + '"/>';
        }
        break;
      case 'disc':
        s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + N(f) + '" fill="' + fillF + '"/>';
        s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + N(f * 0.8) + '" fill="none" stroke="' + strokeD + '" stroke-width="' + N(0.8 * k) + '"/>';
        for (let i = 0; i < (v.n || 0); i++) { const a = (i / v.n) * 6.2832; s += '<circle cx="' + N(cx + Math.cos(a) * f * 0.62) + '" cy="' + N(cy + Math.sin(a) * f * 0.62) + '" r="' + N(f * 0.075) + '" fill="#0b0b0d"/>'; }
        break;
      case 'turbo':
        for (let i = 0; i < n; i++) {
          const a = (i / n) * 6.2832;
          const p0 = [cx + Math.cos(a) * hub, cy + Math.sin(a) * hub];
          const p1 = [cx + Math.cos(a + 0.7) * f, cy + Math.sin(a + 0.7) * f];
          const p2 = [cx + Math.cos(a + 0.7 + 0.32) * f, cy + Math.sin(a + 0.7 + 0.32) * f];
          const cA = [cx + Math.cos(a + 0.15) * f * 0.62, cy + Math.sin(a + 0.15) * f * 0.62];
          const cB = [cx + Math.cos(a + 0.42) * f * 0.45, cy + Math.sin(a + 0.42) * f * 0.45];
          s += '<path d="M' + N(p0[0]) + ' ' + N(p0[1]) + 'Q' + N(cA[0]) + ' ' + N(cA[1]) + ' ' + N(p1[0]) + ' ' + N(p1[1]) + 'L' + N(p2[0]) + ' ' + N(p2[1]) + 'Q' + N(cB[0]) + ' ' + N(cB[1]) + ' ' + N(p0[0]) + ' ' + N(p0[1]) + 'Z" fill="' + fillF + '"/>';
        }
        break;
      case 'star': {
        const pts = [];
        for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * 6.2832 - 1.5708, rad = i % 2 ? f * 0.46 : f; pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]); }
        s += '<polygon points="' + A.poly(pts) + '" fill="' + fillF + '" stroke="' + strokeD + '" stroke-width="' + N(0.6 * k) + '" stroke-linejoin="round"/>';
        break;
      }
      case 'deep':
        s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + N(rr * 0.97) + '" fill="' + U.shade(col, 0.25) + '"/>';
        s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + N(rr * 0.75) + '" fill="#0b0b0d"/>';
        for (let i = 0; i < n; i++) s += '<polygon points="' + spokePoly(cx, cy, (i / n) * 6.2832 - 1.5708, hub, rr * 0.78, 2.8 * k, 3.6 * k) + '" fill="' + col + '"/>';
        for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.2832; s += '<circle cx="' + N(cx + Math.cos(a) * rr * 0.87) + '" cy="' + N(cy + Math.sin(a) * rr * 0.87) + '" r="' + N(0.9 * k) + '" fill="' + U.shade(col, -0.55) + '"/>'; }
        break;
      case 'split':
        for (let i = 0; i < n; i++) {
          const a = (i / n) * 6.2832 - 1.5708;
          s += '<polygon points="' + spokePoly(cx, cy, a, hub, f * 0.58, 3 * k, 2.6 * k) + '" fill="' + col + '"/>';
          [-0.24, 0.24].forEach((o) => {
            const sx = cx + Math.cos(a) * f * 0.56, sy = cy + Math.sin(a) * f * 0.56;
            const ex = cx + Math.cos(a + o) * f, ey = cy + Math.sin(a + o) * f;
            s += '<line x1="' + N(sx) + '" y1="' + N(sy) + '" x2="' + N(ex) + '" y2="' + N(ey) + '" stroke="' + col + '" stroke-width="' + N(3 * k) + '" stroke-linecap="round"/>';
          });
        }
        break;
      case 'hex': {
        const pts = [];
        for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.2832; pts.push([cx + Math.cos(a) * f, cy + Math.sin(a) * f]); }
        s += '<polygon points="' + A.poly(pts) + '" fill="' + fillF + '" stroke="' + strokeD + '" stroke-width="' + N(0.8 * k) + '" stroke-linejoin="round"/>';
        const p2 = pts.map((p) => [cx + (p[0] - cx) * 0.62, cy + (p[1] - cy) * 0.62]);
        s += '<polygon points="' + A.poly(p2) + '" fill="#0b0b0d" opacity=".9"/>';
        for (let i = 0; i < 6; i++) s += '<circle cx="' + N((pts[i][0] + cx) / 2 + (pts[i][0] - cx) * 0.2) + '" cy="' + N((pts[i][1] + cy) / 2 + (pts[i][1] - cy) * 0.2) + '" r="' + N(1.5 * k) + '" fill="' + U.shade(col, 0.4) + '"/>';
        break;
      }
      case 'ring':
        s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + N(f) + '" fill="' + col + '"/>';
        s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + N(f * 0.64) + '" fill="none" stroke="' + v.glow + '" stroke-opacity=".35" stroke-width="' + N(6 * k) + '"/>';
        s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + N(f * 0.64) + '" fill="none" stroke="' + v.glow + '" stroke-width="' + N(2 * k) + '"/>';
        for (let i = 0; i < n; i++) s += '<polygon points="' + spokePoly(cx, cy, (i / n) * 6.2832, hub, f * 0.98, 1.6 * k, 2.2 * k) + '" fill="' + U.shade(col, 0.15) + '"/>';
        break;
      case 'web': {
        for (let i = 0; i < n; i++) {
          const a = (i / n) * 6.2832;
          s += '<line x1="' + N(cx + Math.cos(a) * hub) + '" y1="' + N(cy + Math.sin(a) * hub) + '" x2="' + N(cx + Math.cos(a + (i % 2 ? 0.28 : -0.28)) * f) + '" y2="' + N(cy + Math.sin(a + (i % 2 ? 0.28 : -0.28)) * f) + '" stroke="' + col + '" stroke-width="' + N(1.1 * k) + '"/>';
        }
        [0.38, 0.62, 0.84].forEach((m) => { s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + N(f * m) + '" fill="none" stroke="' + col + '" stroke-width="' + N(0.8 * k) + '"/>'; });
        break;
      }
      default:
        s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + N(f) + '" fill="' + fillF + '"/>';
    }
    /* hub + lug nuts */
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + N(hub) + '" fill="' + U.shade(col, -0.25) + '" stroke="' + U.shade(col, 0.3) + '" stroke-width="' + N(0.8 * k) + '"/>';
    for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.2832 - 1.5708; s += '<circle cx="' + N(cx + Math.cos(a) * hub * 0.62) + '" cy="' + N(cy + Math.sin(a) * hub * 0.62) + '" r="' + N(0.9 * k) + '" fill="' + U.shade(col, 0.55) + '"/>'; }
    /* rim lip highlight */
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + N(rr) + '" fill="none" stroke="' + U.shade(lipC, 0.35) + '" stroke-opacity=".6" stroke-width="' + N(0.9 * k) + '"/>';
    return s;
  };

  /* Standalone wheel image (for thumbnails) */
  A.wheelSVG = function (item, colOv) {
    const uid = 'wh' + U.hashHex(item.id + (colOv || ''));
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="art-svg"><defs>' + A.carbonDef(uid + 'cf') + '</defs>' + A.wheel(item.vis, 50, 50, 46, colOv || null, uid) + '</svg>';
  };
})();
