/* STREET VAULT — art-side.js : layered side-view car renderer.
   Layers: aura/neon -> underbody -> wing -> body(paint) -> decals -> shading -> body parts -> glass -> lights -> arches -> wheels -> effects. */
(function () {
  'use strict';
  const SV = (window.SV = window.SV || {});
  const U = SV.util, D = SV.data, A = SV.art;
  const N = A.N;

  /* open rounded polyline */
  function roundedLine(pts, radii) {
    let d = '';
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i], r = radii[i] || 0;
      if (i === 0) { d += 'M' + N(p1[0]) + ' ' + N(p1[1]); continue; }
      if (i === pts.length - 1) { d += 'L' + N(p1[0]) + ' ' + N(p1[1]); continue; }
      const p0 = pts[i - 1], p2 = pts[i + 1];
      const v1 = [p0[0] - p1[0], p0[1] - p1[1]], v2 = [p2[0] - p1[0], p2[1] - p1[1]];
      const l1 = Math.hypot(v1[0], v1[1]) || 1, l2 = Math.hypot(v2[0], v2[1]) || 1;
      const k = Math.min(r, l1 * 0.5, l2 * 0.5);
      const a = [p1[0] + (v1[0] / l1) * k, p1[1] + (v1[1] / l1) * k], b = [p1[0] + (v2[0] / l2) * k, p1[1] + (v2[1] / l2) * k];
      d += 'L' + N(a[0]) + ' ' + N(a[1]) + 'Q' + N(p1[0]) + ' ' + N(p1[1]) + ' ' + N(b[0]) + ' ' + N(b[1]);
    }
    return d;
  }

  function geo(g) {
    const o = {};
    o.belt = Math.min(g.ty, g.hy) + 7;
    o.sy = Math.round(g.ty * 0.35 + g.sill * 0.65);              // shoulder line
    o.pts = [[g.tail, g.sill], [g.tail, g.ty], [g.rg, g.ty], [g.rr, g.roof], [g.rf, g.roof], [g.cw, g.hy], [g.nose, g.ny], [g.nose, g.sill]];
    o.body = A.roundedPoly(o.pts, g.rad);
    const lx = (y) => (y >= g.ty ? g.rg : g.rg + ((g.rr - g.rg) * (y - g.ty)) / (g.roof - g.ty));
    const ex = (y) => g.rf + ((g.cw - g.rf) * (Math.min(y, g.hy - 2) - g.roof)) / (g.hy - g.roof);
    const top = g.roof + 9;
    o.win = [[lx(o.belt) + 9, o.belt], [lx(top) + 9, top], [ex(top) - 7, top], [ex(o.belt) - 7, o.belt]];
    o.winPath = A.roundedPoly(o.win, [3, 12, 10, 3]);
    o.hp = (t) => [g.cw + (g.nose - g.cw) * t, g.hy + (g.ny - g.hy) * t];
    o.doorF = g.cw - 20; o.doorR = Math.max(g.rr - 12, g.tail + 40);
    o.dx = (o.doorF + o.doorR) / 2; o.dy = (o.belt + g.sill) / 2 + 1;
    return o;
  }
  A.sideGeo = geo;

  /* top-profile open path offset down by `off` (stripes follow the roof line) */
  function topLine(g, off) {
    const pts = [[g.tail - 8, g.ty + off], [g.rg, g.ty + off], [g.rr, g.roof + off], [g.rf, g.roof + off], [g.cw, g.hy + off], [g.nose + 8, g.ny + off]];
    return roundedLine(pts, [0, g.rad[2], g.rad[3], g.rad[4], g.rad[5], 0]);
  }

  /* ------------------------------------------------------------------ BODY PARTS */
  const PARTS = {
    /* front bumpers — anchored at the nose */
    fb_lip(c) { const n = c.g.nose, s = c.g.sill; return `<path d="M${n - 34} ${s - 2}Q${n - 8} ${s - 10} ${n + 4} ${s - 8}L${n + 5} ${s + 3}L${n - 34} ${s + 3}Z" fill="${c.m}"/>`; },
    fb_split(c) { const n = c.g.nose, s = c.g.sill; return `<path d="M${n - 62} ${s + 3}L${n + 14} ${s + 3}L${n + 10} ${s - 8}Q${n - 8} ${s - 14} ${n - 62} ${s - 6}Z" fill="${c.m}"/><rect x="${n - 46}" y="${s - 31}" width="38" height="11" rx="3" fill="#0b0b0d"/><path d="M${n - 44} ${s - 28}h34M${n - 44} ${s - 24}h34" stroke="#2c2f36" stroke-width="1.2"/>`; },
    fb_track(c) { const n = c.g.nose, s = c.g.sill; return `<path d="M${n - 96} ${s + 4}L${n + 30} ${s + 4}L${n + 22} ${s - 3}L${n - 96} ${s - 3}Z" fill="${c.m}"/><path d="M${n - 12} ${s - 3}L${n + 4} ${s - 28}L${n - 4} ${s - 3}Z" fill="${c.m}" stroke="#2a2d34" stroke-width="1"/><rect x="${n - 56}" y="${s - 28}" width="46" height="14" rx="3" fill="#0b0b0d"/><path d="M${n - 54} ${s - 21}h42" stroke="#2c2f36" stroke-width="1.4"/><path d="M${n - 96} ${s + 4}L${n + 30} ${s + 4}" stroke="#c0182b" stroke-width="1.6"/>`; },
    fb_cnose(c) { const g = c.g, n = g.nose, s = g.sill; const t = g.ny + 30; return `<path d="M${n + 1} ${s + 2}L${n + 1} ${t}Q${n - 34} ${t - 10} ${n - 96} ${s - 18}L${n - 112} ${s + 2}Z" fill="${c.m}"/><rect x="${n - 62}" y="${s - 26}" width="48" height="13" rx="4" fill="#0b0b0d"/><path d="M${n + 1} ${t}Q${n - 34} ${t - 10} ${n - 96} ${s - 18}" fill="none" stroke="#c8ff2e" stroke-width="1.6"/>`; },
    /* rear bumpers — anchored at the tail */
    rb_diff(c) { const t = c.g.tail, s = c.g.sill; let f = ''; for (let i = 0; i < 4; i++) f += `<path d="M${t + 8 + i * 9} ${s - 12}v14" stroke="#2c2f36" stroke-width="1.8"/>`; return `<path d="M${t - 2} ${s - 14}L${t - 8} ${s + 3}L${t + 52} ${s + 3}L${t + 52} ${s - 12}Z" fill="${c.m}"/>${f}`; },
    rb_track(c) { const t = c.g.tail, s = c.g.sill; let f = ''; for (let i = 0; i < 6; i++) f += `<path d="M${t + 6 + i * 10} ${s - 20}v22" stroke="#34373f" stroke-width="2"/>`; return `<path d="M${t - 2} ${s - 26}L${t - 16} ${s + 4}L${t + 70} ${s + 4}L${t + 70} ${s - 22}Z" fill="${c.m}"/>${f}<path d="M${t - 16} ${s + 4}h86" stroke="#c0182b" stroke-width="1.6"/>`; },
    rb_carbon(c) { const t = c.g.tail, s = c.g.sill; return `<path d="M${t - 2} ${s - 26}L${t - 14} ${s + 4}L${t + 76} ${s + 4}L${t + 76} ${s - 22}Z" fill="${c.m}"/><circle cx="${t + 14}" cy="${s - 9}" r="6" fill="#0b0b0d" stroke="#aeb4bd" stroke-width="1.6"/><circle cx="${t + 32}" cy="${s - 9}" r="6" fill="#0b0b0d" stroke="#aeb4bd" stroke-width="1.6"/><path d="M${t - 14} ${s + 4}h90" stroke="#c8ff2e" stroke-width="1.4"/>`; },
    /* spoilers — anchored on (sx,sy), wing extends rearwards (smaller x) */
    sp_lip(c) { const x = c.sx, y = c.sy; return `<path d="M${x + 6} ${y + 1}L${x - 18} ${y - 4}Q${x - 28} ${y - 6} ${x - 32} ${y + 1}Z" fill="${c.m}"/>`; },
    sp_duck(c) { const x = c.sx, y = c.sy; return `<path d="M${x + 36} ${y + 1}Q${x + 6} ${y - 5} ${x - 20} ${y - 18}L${x - 30} ${y - 14}Q${x - 22} ${y + 0} ${x - 10} ${y + 3}Z" fill="${c.m}"/>`; },
    sp_gt(c) { const x = c.sx, y = c.sy; return `<rect x="${x - 6}" y="${y - 30}" width="7" height="31" fill="#4a4e58"/><rect x="${x + 18}" y="${y - 30}" width="6" height="30" fill="#3a3d45"/><path d="M${x - 40} ${y - 42}L${x + 30} ${y - 36}L${x + 28} ${y - 31}L${x - 39} ${y - 36}Z" fill="${c.m}"/><path d="M${x - 40} ${y - 56}L${x - 24} ${y - 56}L${x - 18} ${y - 32}L${x - 40} ${y - 37}Z" fill="${c.m}" stroke="#34373f" stroke-width="1"/>`; },
    sp_big(c) { const x = c.sx, y = c.sy; return `<rect x="${x - 4}" y="${y - 44}" width="8" height="45" fill="#4a4e58"/><rect x="${x + 22}" y="${y - 44}" width="7" height="44" fill="#3a3d45"/><path d="M${x - 52} ${y - 60}L${x + 40} ${y - 52}L${x + 38} ${y - 46}L${x - 51} ${y - 54}Z" fill="${c.m}"/><path d="M${x - 52} ${y - 80}L${x - 30} ${y - 80}L${x - 22} ${y - 50}L${x - 52} ${y - 55}Z" fill="${c.m}" stroke="#34373f" stroke-width="1"/><path d="M${x - 50} ${y - 58}L${x + 38} ${y - 50}" stroke="#c0182b" stroke-width="1.4"/>`; },
    sp_swan(c) { const x = c.sx, y = c.sy; return `<path d="M${x + 14} ${y + 1}C${x + 14} ${y - 30} ${x} ${y - 52} ${x - 28} ${y - 54}" fill="none" stroke="#6b6f78" stroke-width="6" stroke-linecap="round"/><path d="M${x - 50} ${y - 62}L${x + 26} ${y - 54}L${x + 24} ${y - 48}L${x - 49} ${y - 56}Z" fill="${c.m}"/><path d="M${x - 50} ${y - 72}L${x - 32} ${y - 72}L${x - 26} ${y - 52}L${x - 50} ${y - 57}Z" fill="${c.m}" stroke="#34373f" stroke-width="1"/>`; },
    sp_gilded(c) { return PARTS.sp_swan(c); },
    /* hoods */
    hd_vent(c) { let s = ''; for (let i = 0; i < 4; i++) { const p = c.G.hp(0.3 + i * 0.12); s += `<path d="M${N(p[0])} ${N(p[1] + 4)}l16 -1.5v4.5l-16 1.5z" fill="#0b0b0d" stroke="#3a3d45" stroke-width=".8"/>`; } return s; },
    hd_scoop(c) { const a = c.G.hp(0.2), b = c.G.hp(0.7), u = 16; return `<path d="M${N(a[0])} ${N(a[1] + 2)}L${N(a[0] + 8)} ${N(a[1] - u)}L${N(b[0] - 6)} ${N(b[1] - u + 7)}L${N(b[0] + 6)} ${N(b[1] + 3)}Z" fill="${c.m}" stroke="rgba(0,0,0,.35)" stroke-width="1"/><path d="M${N(b[0] - 6)} ${N(b[1] - u + 7)}L${N(b[0] + 6)} ${N(b[1] + 3)}L${N(b[0] - 2)} ${N(b[1] + 3)}L${N(b[0] - 12)} ${N(b[1] - u + 10)}Z" fill="#0b0b0d"/>`; },
    hd_carbon(c) { const a = c.G.hp(0.02), b = c.G.hp(0.97); return `<path d="M${N(a[0])} ${N(a[1])}L${N(b[0])} ${N(b[1])}L${N(b[0])} ${N(b[1] + 11)}L${N(a[0])} ${N(a[1] + 11)}Z" fill="${c.m}"/><path d="M${N(a[0])} ${N(a[1] + 11)}L${N(b[0])} ${N(b[1] + 11)}" stroke="#c8ff2e" stroke-width="1.3"/>`; },
    /* skirts */
    sk_street(c) { const g = c.g, x1 = g.rw + g.r + 3, x2 = g.fw - g.r - 3, s = g.sill; return `<path d="M${x1 - 4} ${s + 3}L${x1} ${s - 9}L${x2} ${s - 9}L${x2 + 4} ${s + 3}Z" fill="${c.m}" stroke="rgba(0,0,0,.35)" stroke-width="1"/>`; },
    sk_aero(c) { const g = c.g, x1 = g.rw + g.r + 3, x2 = g.fw - g.r - 3, s = g.sill; return `<path d="M${x1 - 6} ${s + 6}L${x1} ${s - 11}L${x2} ${s - 11}L${x2 + 6} ${s + 6}Z" fill="${c.m}"/><path d="M${x1 + 6} ${s - 3}H${x2 - 6}M${x1 + 6} ${s + 1}H${x2 - 6}" stroke="#34373f" stroke-width="1.2"/><path d="M${x1 - 6} ${s + 6}H${x2 + 6}" stroke="#c0182b" stroke-width="1.4"/>`; },
    sk_carbon(c) { const g = c.g, x1 = g.rw + g.r + 3, x2 = g.fw - g.r - 3, s = g.sill; return `<path d="M${x1 - 5} ${s + 5}L${x1} ${s - 11}L${x2} ${s - 11}L${x2 + 5} ${s + 5}Z" fill="${c.m}"/><path d="M${x1 - 5} ${s + 5}H${x2 + 5}" stroke="#c8ff2e" stroke-width="1.5"/>`; },
    /* arch flares (drawn around both wheels) */
    fl_wide(c) { return flare(c, 10, 8, false); },
    fl_rivet(c) { return flare(c, 12, 9, true); },
    /* mirrors */
    mr_sport(c) { return mirror(c, 'M0 0L24 2Q28 10 20 14L0 12Z'); },
    mr_carbon(c) { return mirror(c, 'M0 0L26 2Q30 11 20 15L0 12Z'); },
  };

  function flare(c, gap, th, rivets) {
    const g = c.g; let s = '';
    [g.rw, g.fw].forEach((cx) => {
      const cy = 222 - g.r, r1 = g.r + gap, r2 = r1 + th, a0 = (-18 * Math.PI) / 180, a1 = (-162 * Math.PI) / 180;
      const P = (r, a) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
      const o0 = P(r2, a0), o1 = P(r2, a1), i1 = P(r1, a1), i0 = P(r1, a0);
      s += `<path d="M${N(o0[0])} ${N(o0[1])}A${r2} ${r2} 0 0 0 ${N(o1[0])} ${N(o1[1])}L${N(i1[0])} ${N(i1[1])}A${r1} ${r1} 0 0 1 ${N(i0[0])} ${N(i0[1])}Z" fill="${c.m}" stroke="rgba(0,0,0,.4)" stroke-width="1"/>`;
      if (rivets) for (let i = 0; i < 9; i++) { const a = a0 + ((a1 - a0) * (i + 0.5)) / 9, p = P((r1 + r2) / 2, a); s += `<circle cx="${N(p[0])}" cy="${N(p[1])}" r="1.6" fill="#aeb4bd"/>`; }
    });
    return s;
  }
  function mirror(c, shape) {
    const g = c.g, x = g.cw - 6, y = g.hy - 9;
    return `<path d="M${x + 2} ${y + 12}L${x + 10} ${y + 6}" stroke="#16171a" stroke-width="3"/><path transform="translate(${x} ${y}) scale(1.25)" d="${shape}" fill="${c.m}" stroke="rgba(0,0,0,.4)" stroke-width="1"/>`;
  }

  /* ------------------------------------------------------------------ DECALS */
  const LIV = {
    twin(c, v) { return `<path d="${topLine(c.g, 7)}" fill="none" stroke="${v.cols[0]}" stroke-width="7"/><path d="${topLine(c.g, 17)}" fill="none" stroke="${v.cols[1] || v.cols[0]}" stroke-width="2.5"/>`; },
    side(c, v) { return `<path d="M${c.g.tail - 10} ${c.G.sy - 2}H${c.g.nose + 10}" stroke="${v.cols[0]}" stroke-width="9"/><path d="M${c.g.tail - 10} ${c.G.sy + 9}H${c.g.nose + 10}" stroke="${v.cols[0]}" stroke-width="2.5"/>`; },
    rally(c, v) { const g = c.g, sy = c.G.sy; return `<path d="M${g.tail - 10} ${g.sill + 12}L${g.tail - 10} ${sy + 12}L${g.nose + 10} ${sy}L${g.nose + 10} ${g.sill + 12}Z" fill="${v.cols[0]}"/><path d="M${g.tail - 10} ${sy + 12}L${g.nose + 10} ${sy}" stroke="${v.cols[1]}" stroke-width="5"/><path d="M${g.tail - 10} ${sy + 22}L${g.nose + 10} ${sy + 10}" stroke="${v.cols[1]}" stroke-width="1.6"/>`; },
    powder(c, v) { return `<path d="${topLine(c.g, 8)}" fill="none" stroke="${v.cols[0]}" stroke-width="9"/><path d="${topLine(c.g, 16)}" fill="none" stroke="${v.cols[2]}" stroke-width="2"/><path d="${topLine(c.g, 22)}" fill="none" stroke="${v.cols[1]}" stroke-width="7"/><path d="M${c.g.tail - 10} ${c.g.sill - 6}H${c.g.nose + 10}" stroke="${v.cols[1]}" stroke-width="4"/>`; },
    checker(c, v) { const g = c.g; return `<path d="M${g.tail - 10} ${g.sill - 18}L${g.nose + 10} ${g.sill - 22}V${g.sill + 6}H${g.tail - 10}Z" fill="url(#${c.uid}ck)"/>`; },
    grid(c, v) { const g = c.g, sy = c.G.sy; return `<rect x="${g.tail - 10}" y="${sy + 3}" width="${g.nose - g.tail + 20}" height="${g.sill - sy + 6}" fill="url(#${c.uid}gr)"/><path d="M${g.tail - 10} ${sy + 3}H${g.nose + 10}" stroke="${v.cols[1]}" stroke-width="2"/>`; },
    sakura(c, v) {
      const g = c.g, sy = c.G.sy; let s = `<path d="M${g.tail - 10} ${g.sill + 8}V${sy + 18}Q${g.rw + 20} ${sy - 6} ${g.cw - 40} ${sy + 14}T${g.nose + 10} ${sy + 6}V${g.sill + 8}Z" fill="${v.cols[0]}" opacity=".85"/>`;
      const pos = [[0.1, 0.55], [0.18, 0.3], [0.27, 0.62], [0.36, 0.38], [0.45, 0.58], [0.55, 0.3], [0.64, 0.55], [0.74, 0.35], [0.84, 0.6]];
      pos.forEach((p, i) => { const x = g.tail + (g.nose - g.tail) * p[0], y = sy + 6 + (g.sill - sy) * p[1]; s += `<ellipse cx="${N(x)}" cy="${N(y)}" rx="6" ry="3.2" transform="rotate(${i * 37} ${N(x)} ${N(y)})" fill="${v.cols[1]}" opacity=".92"/><circle cx="${N(x)}" cy="${N(y)}" r="1.2" fill="${v.cols[0]}"/>`; });
      return s;
    },
    tri(c, v) { const g = c.g, sy = c.G.sy; return [0, 1, 2].map((i) => `<path d="M${g.tail - 10} ${sy + i * 6}H${g.nose + 10}v6H${g.tail - 10}Z" fill="${v.cols[i]}"/>`).join(''); },
    tiger(c, v) { const g = c.g, sy = c.G.sy; let s = ''; for (let i = 0; i < 4; i++) { const x0 = g.tail + 20 + i * 42; s += `<path d="M${x0} ${g.sill + 6}L${x0 + 18} ${g.sill + 6}L${x0 + 52} ${sy - 18}L${x0 + 32} ${sy - 18}Z" fill="${v.cols[0]}"/><path d="M${x0 + 22} ${g.sill + 6}L${x0 + 30} ${g.sill + 6}L${x0 + 62} ${sy - 18}L${x0 + 54} ${sy - 18}Z" fill="${v.cols[1]}"/>`; } return s; },
    scale(c, v) { const g = c.g, sy = c.G.sy; return `<rect x="${g.tail - 10}" y="${sy - 14}" width="${g.nose - g.tail + 20}" height="${g.sill - sy + 26}" fill="url(#${c.uid}sc)" mask="url(#${c.uid}scm)"/>`; },
  };
  const STK = {
    number(c, v) { const x = c.G.dx, y = c.G.dy; return `<circle cx="${N(x)}" cy="${N(y)}" r="17" fill="${v.cols[0]}" stroke="${v.cols[1]}" stroke-width="2"/><text x="${N(x)}" y="${N(y + 8)}" text-anchor="middle" font-family="'Big Shoulders Display','Arial Narrow',sans-serif" font-weight="800" font-size="23" fill="${v.cols[1]}">${U.esc(v.text || '27')}</text>`; },
    star(c, v) { const x = c.G.dx, y = c.G.dy, p = []; for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.2832 - 1.5708, r = i % 2 ? 6 : 13; p.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } return `<circle cx="${N(x)}" cy="${N(y)}" r="17" fill="${v.cols[0]}"/><polygon points="${A.poly(p)}" fill="${v.cols[1]}"/>`; },
    circle(c, v) { const x = c.G.dx, y = c.G.dy; return `<circle cx="${N(x)}" cy="${N(y)}" r="19" fill="${v.cols[1]}" opacity=".95"/><circle cx="${N(x)}" cy="${N(y)}" r="14" fill="${v.cols[0]}"/>`; },
    flame(c, v) { const x = c.g.fw, y = c.G.sy; return `<path d="M${x + 40} ${y + 26}C${x + 20} ${y + 6} ${x - 8} ${y + 14} ${x - 30} ${y + 2}C${x - 16} ${y + 16} ${x - 20} ${y + 22} ${x - 54} ${y + 20}C${x - 36} ${y + 26} ${x - 36} ${y + 30} ${x - 62} ${y + 34}C${x - 20} ${y + 36} ${x + 10} ${y + 40} ${x + 40} ${y + 38}Z" fill="${v.cols[0]}"/><path d="M${x + 36} ${y + 34}C${x + 18} ${y + 22} ${x - 4} ${y + 26} ${x - 26} ${y + 18}C${x - 14} ${y + 28} ${x - 18} ${y + 32} ${x - 40} ${y + 32}C${x - 10} ${y + 36} ${x + 14} ${y + 38} ${x + 36} ${y + 38}Z" fill="${v.cols[1]}"/>`; },
    bolt(c, v) { const x = c.G.dx, y = c.G.dy; const p = [[7, -20], [-10, 3], [-1, 3], [-7, 20], [10, -4], [1, -4], [9, -20]].map((q) => [x + q[0], y + q[1]]); return `<polygon points="${A.poly(p)}" fill="${v.cols[0]}" stroke="${v.cols[1]}" stroke-width="2" stroke-linejoin="round"/>`; },
    skull(c, v) { const x = c.G.dx, y = c.G.dy; return `<path d="M${x - 24} ${y + 16}L${x + 24} ${y - 8}M${x - 24} ${y - 8}L${x + 24} ${y + 16}" stroke="${v.cols[0]}" stroke-width="3" stroke-linecap="round"/><circle cx="${N(x)}" cy="${N(y - 3)}" r="12" fill="${v.cols[0]}" stroke="${v.cols[1]}" stroke-width="1.5"/><rect x="${N(x - 6)}" y="${N(y + 5)}" width="12" height="8" rx="2" fill="${v.cols[0]}" stroke="${v.cols[1]}" stroke-width="1.5"/><circle cx="${N(x - 4.5)}" cy="${N(y - 4)}" r="3" fill="${v.cols[1]}"/><circle cx="${N(x + 4.5)}" cy="${N(y - 4)}" r="3" fill="${v.cols[1]}"/>`; },
    crest(c, v) { const x = c.G.dx, y = c.G.dy; return `<path d="M${x - 14} ${y - 17}H${x + 14}V${y + 3}Q${x + 14} ${y + 14} ${x} ${y + 19}Q${x - 14} ${y + 14} ${x - 14} ${y + 3}Z" fill="${v.cols[1]}" stroke="${v.cols[0]}" stroke-width="2.2"/><path d="M${x - 7} ${y - 9}L${x} ${y + 8}L${x + 7} ${y - 9}" fill="none" stroke="${v.cols[0]}" stroke-width="3" stroke-linejoin="round"/>`; },
  };

  /* ------------------------------------------------------------------ EFFECTS */
  function effectBack(c, e) {
    const g = c.g, mid = (g.tail + g.nose) / 2;
    if (e.vis.style === 'aura') return `<ellipse cx="${mid}" cy="150" rx="${(g.nose - g.tail) / 2 + 60}" ry="104" fill="url(#${c.uid}au)"/>`;
    if (e.vis.style === 'speed') {
      let s = ''; const ys = [g.ty + 4, g.ty + 22, g.sill - 34, g.sill - 16, g.sill + 2];
      ys.forEach((y, i) => { s += `<path d="M${g.tail - 20 - (i % 3) * 14} ${y}h${-70 - ((i * 37) % 60)}" stroke="url(#${c.uid}sp)" stroke-width="${i % 2 ? 2 : 3}" stroke-linecap="round"/>`; });
      return s;
    }
    return '';
  }
  function effectFront(c, e) {
    const g = c.g, st = e.vis.style, cls = c.fx ? ' class="fx-flick"' : '';
    if (st === 'smoke') {
      let s = '', cx = g.rw - 6, cy = 214; for (let i = 0; i < 7; i++) s += `<circle cx="${cx - i * 15 - 6}" cy="${cy - (i % 3) * 5 - i * 1.5}" r="${11 + i * 2.6}" fill="#c9ced6" opacity="${N(0.55 - i * 0.07)}"/>`;
      return `<g${cls}>${s}</g>`;
    }
    if (st === 'sparks') {
      let s = ''; for (let i = 0; i < 9; i++) { const x = g.tail + 2 - i * 9 - (i % 2) * 4, y = g.sill + 4 + ((i * 7) % 12) - 6; s += `<path d="M${x} ${y}l${-7 - (i % 3) * 2} ${(i % 2 ? 2 : -3)}" stroke="${i % 2 ? '#ffd45a' : '#ff8a1f'}" stroke-width="2" stroke-linecap="round"/><circle cx="${x - 10}" cy="${y + (i % 2 ? 4 : -4)}" r="1.4" fill="#fff0b0"/>`; }
      return `<g${cls}>${s}</g>`;
    }
    if (st === 'flames') {
      const x = g.tail + 6, y = g.sill - 8;
      return `<g${cls}><path d="M${x} ${y - 7}Q${x - 38} ${y - 18} ${x - 74} ${y - 4}Q${x - 40} ${y - 2} ${x - 52} ${y + 8}Q${x - 24} ${y + 4} ${x} ${y + 7}Z" fill="#ff8a1f"/><path d="M${x} ${y - 4}Q${x - 24} ${y - 9} ${x - 44} ${y - 1}Q${x - 24} ${y + 0} ${x - 30} ${y + 5}Q${x - 12} ${y + 3} ${x} ${y + 5}Z" fill="#7fb6ff"/></g>`;
    }
    return '';
  }

  /* ------------------------------------------------------------------ ACCESSORIES */
  const ACC = {
    antenna(c) { const g = c.g, x = g.rr + 10, y = g.roof + 2; return `<path d="M${x} ${y}L${x - 3} ${y - 40}" stroke="#1a1b1f" stroke-width="1.8"/><path d="M${x - 3} ${y - 40}l-14 3l12 5z" fill="#d7263d"/>`; },
    rack(c) { const g = c.g, x1 = g.rr + 16, x2 = g.rf - 16, y = g.roof - 7; let s = `<rect x="${x1}" y="${y}" width="${x2 - x1}" height="3" rx="1.5" fill="#1a1b1f"/>`; for (let i = 0; i < 4; i++) { const x = x1 + 6 + ((x2 - x1 - 12) * i) / 3; s += `<rect x="${N(x)}" y="${y - 3}" width="3" height="9" fill="#2a2c32"/><rect x="${N(x - 1)}" y="${y - 4}" width="5" height="2" fill="#2a2c32"/>`; } return s; },
    tow(c) { const g = c.g, x = g.nose, y = g.sill; return `<path d="M${x - 4} ${y - 12}q18 4 12 24q-16 6 -22 -10" fill="none" stroke="#d7263d" stroke-width="4" stroke-linecap="round"/><circle cx="${x - 5}" cy="${y - 12}" r="3" fill="#aeb4bd"/>`; },
    surf(c) { const g = c.g, x1 = g.rr + 12, x2 = g.rf - 10, y = g.roof - 7, mid = (x1 + x2) / 2; return ACC.rack(c) + `<path d="M${N(mid - 80)} ${y - 12}Q${N(mid - 90)} ${y - 18} ${N(mid - 74)} ${y - 22}L${N(mid + 78)} ${y - 18}Q${N(mid + 96)} ${y - 14} ${N(mid + 78)} ${y - 9}Z" fill="#ffcf33" stroke="#e08a00" stroke-width="1.2"/><path d="M${N(mid - 70)} ${y - 16}L${N(mid + 76)} ${y - 14}" stroke="#d7263d" stroke-width="2"/>`; },
    scoop(c) { const g = c.g, x = (g.rr + g.rf) / 2 + 6, y = g.roof; return `<path d="M${N(x - 22)} ${y + 1}L${N(x - 12)} ${y - 13}L${N(x + 22)} ${y - 13}L${N(x + 24)} ${y + 1}Z" fill="${c.mat('carbon')}" stroke="#34373f" stroke-width="1"/><path d="M${N(x + 8)} ${y - 11}L${N(x + 21)} ${y - 11}L${N(x + 22)} ${y - 1}L${N(x + 9)} ${y - 1}Z" fill="#0b0b0d"/>`; },
  };

  /* ------------------------------------------------------------------ MAIN */
  let counter = 0;
  const cache = {};
  A.sideSVG = function (carItem, build, o) {
    o = o || {};
    const R = A.resolve(carItem, build);
    const key = 'S' + carItem.id + '|' + JSON.stringify(build || {}) + '|' + (o.fx !== false ? 1 : 0) + (o.vb || '') + (o.night ? 'n' : '');
    if (cache[key]) return cache[key];
    const g = carItem.car.g, G = geo(g);
    const uid = 'c' + U.hashHex(key) + '_';
    const fx = o.fx !== false;
    const P = R.parts;
    const pd = A.paintDef(uid + 'pf', R.paint, g, fx);
    const c = { g, G, uid, fx, car: carItem, mat: (m) => A.matFill(m, uid), m: null, sx: 0, sy: 0 };
    let defs = '', back = '', body = '', over = '', glass = '', front = '';
    defs += pd.def + A.carbonDef(uid + 'cf') + A.goldDef(uid + 'gd');
    defs += `<linearGradient id="${uid}sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".26"/><stop offset=".3" stop-color="#fff" stop-opacity="0"/><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".42"/></linearGradient>`;
    defs += `<clipPath id="${uid}bc"><path d="${G.body}"/></clipPath>`;
    defs += `<radialGradient id="${uid}sd"><stop offset="0" stop-color="#000" stop-opacity=".7"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`;
    defs += `<pattern id="${uid}spk" width="13" height="11" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r=".7" fill="#fff"/><circle cx="8" cy="6" r=".6" fill="#fff"/><circle cx="11" cy="1.5" r=".5" fill="#fff"/><circle cx="5" cy="9" r=".6" fill="#fff"/></pattern>`;

    /* ground shadow + stance */
    const mid = (g.tail + g.nose) / 2, half = (g.nose - g.tail) / 2;
    back += `<ellipse cx="${mid}" cy="223" rx="${half + 26}" ry="12" fill="url(#${uid}sd)"/>`;

    /* effects (behind) */
    const ef = P.effect;
    if (ef) {
      if (ef.vis.style === 'aura') defs += `<radialGradient id="${uid}au"><stop offset=".45" stop-color="#ffd45a" stop-opacity=".0"/><stop offset=".7" stop-color="#ffb627" stop-opacity=".34"/><stop offset="1" stop-color="#ffb627" stop-opacity="0"/></radialGradient>`;
      if (ef.vis.style === 'speed') defs += `<linearGradient id="${uid}sp" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`;
      back += effectBack({ g, uid }, ef);
    }
    /* underglow */
    const nn = P.neon;
    if (nn) {
      const col = nn.vis.col, an = nn.vis.anim && fx ? '<animate attributeName="fill" values="#ff2e88;#22e4ff;#c8ff2e;#ff2e88" dur="5s" repeatCount="indefinite"/>' : '';
      defs += `<radialGradient id="${uid}ng"><stop offset="0" stop-color="${col}" stop-opacity=".85"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient>`;
      back += `<ellipse cx="${mid}" cy="219" rx="${half + 34}" ry="17" fill="url(#${uid}ng)"/>`;
      back += `<rect x="${g.tail + 24}" y="${g.sill + 2}" width="${g.nose - g.tail - 48}" height="3.4" rx="1.7" fill="${col}">${an}</rect>`;
    }
    /* underbody */
    back += `<rect x="${g.tail + 12}" y="${g.sill - 2}" width="${g.nose - g.tail - 24}" height="10" rx="3" fill="#08090b"/>`;

    /* spoiler anchor */
    c.sx = g.sx; c.sy = g.sy;
    if (c.sy === 0) { c.sx = g.rr; c.sy = g.roof; }

    /* wing behind body */
    const sp = P.spoiler;
    let spoilerSvg = '';
    if (sp) { c.m = A.matFill(sp.vis.mat, uid); const fn = PARTS[sp.vis.style === 'sp_gt' ? 'sp_gt' : sp.vis.style]; if (fn) spoilerSvg = `<g transform="translate(${c.sx} ${c.sy}) scale(1.1) translate(${-c.sx} ${-c.sy})" stroke="rgba(150,160,180,.4)" stroke-width=".9">${fn(c)}</g>`; }

    /* body */
    body += `<path d="${G.body}" fill="url(#${uid}pf)"/>`;
    if (R.paint.finish === 'metallic' || R.paint.finish === 'pearl' || R.paint.finish === 'flip' || R.paint.finish === 'holo') body += `<g clip-path="url(#${uid}bc)"><rect x="${g.tail}" y="${g.roof - 4}" width="${g.nose - g.tail}" height="${g.sill - g.roof + 8}" fill="url(#${uid}spk)" opacity="${R.paint.finish === 'metallic' ? 0.2 : 0.12}"/></g>`;

    /* decals (clipped to body) */
    let dec = '';
    const lv = P.livery, st = P.sticker;
    if (lv) {
      const s = lv.vis.style;
      if (s === 'checker') defs += `<pattern id="${uid}ck" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="${lv.vis.cols[0]}"/><rect width="6" height="6" fill="${lv.vis.cols[1]}"/><rect x="6" y="6" width="6" height="6" fill="${lv.vis.cols[1]}"/></pattern>`;
      if (s === 'grid') defs += `<pattern id="${uid}gr" width="16" height="12" patternUnits="userSpaceOnUse"><path d="M0 0H16M0 0V12" stroke="${lv.vis.cols[0]}" stroke-width="1.4" fill="none" opacity=".9"/></pattern>`;
      if (s === 'scale') defs += `<pattern id="${uid}sc" width="16" height="12" patternUnits="userSpaceOnUse"><rect width="16" height="12" fill="${lv.vis.cols[1]}"/><path d="M0 12Q8 -2 16 12" fill="${lv.vis.cols[0]}" stroke="#4a1010" stroke-width="1"/></pattern><linearGradient id="${uid}scg" x1="0" y1="0" x2="0" y2="1"><stop offset=".1" stop-color="#000"/><stop offset=".55" stop-color="#fff"/></linearGradient><mask id="${uid}scm" maskUnits="userSpaceOnUse" x="0" y="0" width="600" height="260"><rect x="0" y="${G.sy - 14}" width="600" height="${g.sill - G.sy + 26}" fill="url(#${uid}scg)"/></mask>`;
      if (LIV[s]) dec += LIV[s](c, lv.vis);
    }
    if (st && STK[st.vis.style]) dec += STK[st.vis.style](c, st.vis);
    if (dec) body += `<g clip-path="url(#${uid}bc)">${dec}</g>`;

    /* shading */
    const hiOp = pd.hi;
    body += `<path d="${G.body}" fill="url(#${uid}sh)" opacity="${R.paint.finish === 'matte' ? 0.55 : 1}"/>`;
    if (hiOp > 0) body += `<g clip-path="url(#${uid}bc)"><path d="${topLine(g, 4)}" fill="none" stroke="#fff" stroke-opacity="${hiOp * 0.7}" stroke-width="2.2"/></g>`;
    /* panel lines */
    const sy = G.sy;
    body += `<g clip-path="url(#${uid}bc)" fill="none" stroke="rgba(0,0,0,.34)" stroke-width="1.1">`;
    body += `<path d="M${g.tail} ${sy}H${g.nose}" stroke="rgba(255,255,255,.18)"/><path d="M${g.tail} ${sy + 1.6}H${g.nose}"/>`;
    body += `<path d="M${G.doorF} ${G.belt}Q${G.doorF + 4} ${g.sill - 24} ${G.doorF - 2} ${g.sill - 6}M${G.doorR} ${G.belt}Q${G.doorR - 2} ${g.sill - 24} ${G.doorR + 2} ${g.sill - 6}"/>`;
    if (g.doors === 2) body += `<path d="M${N(G.dx)} ${G.belt}V${g.sill - 6}"/>`;
    const hp0 = G.hp(0.04), hp1 = G.hp(0.9);
    body += `<path d="M${N(hp0[0])} ${N(hp0[1] + 3)}L${N(hp1[0])} ${N(hp1[1] + 4)}"/>`;
    body += `</g><rect x="${N(G.doorR + 14)}" y="${G.belt + 8}" width="14" height="3.2" rx="1.6" fill="rgba(0,0,0,.5)"/>`;
    if (g.doors === 2) body += `<rect x="${N(G.dx + 10)}" y="${G.belt + 8}" width="14" height="3.2" rx="1.6" fill="rgba(0,0,0,.5)"/>`;

    /* default lower plastics: rocker strip, bumper corners, side intake */
    body += `<g clip-path="url(#${uid}bc)"><path d="M${g.rw + g.r} ${g.sill - 8}H${g.fw - g.r}V${g.sill + 4}H${g.rw + g.r}Z" fill="#0c0d10" opacity=".55"/><path d="M${g.nose - 64} ${g.sill + 4}Q${g.nose - 40} ${g.sill - 11} ${g.nose + 4} ${g.sill - 13}V${g.sill + 4}Z" fill="#0c0d10" opacity=".6"/><path d="M${g.tail - 4} ${g.sill - 13}Q${g.tail + 30} ${g.sill - 10} ${g.tail + 48} ${g.sill + 4}H${g.tail - 4}Z" fill="#0c0d10" opacity=".6"/></g>`;
    if (carItem.car.cls === 'super') { const ix1 = g.rw + g.r + 12, ix2 = G.doorR - 8; body += `<path d="M${ix1} ${G.belt + 8}L${ix2} ${G.belt + 20}L${ix2} ${g.sill - 20}L${ix1} ${g.sill - 14}Z" fill="#0b0b0d" opacity=".8" clip-path="url(#${uid}bc)"/><path d="M${ix1 + 4} ${G.belt + 20}L${ix2 - 3} ${G.belt + 28}M${ix1 + 4} ${G.belt + 28}L${ix2 - 3} ${G.belt + 36}M${ix1 + 4} ${G.belt + 36}L${ix2 - 3} ${G.belt + 44}" stroke="#2c2f36" stroke-width="1.2" fill="none" clip-path="url(#${uid}bc)"/>`; }
    if (carItem.car.cls === 'muscle') body += `<path d="M${N(G.hp(0.15)[0])} ${N(G.hp(0.15)[1] + 1)}l40 -3l6 6l-44 3z" fill="#000" opacity=".28"/>`;

    /* body parts (over paint) */
    let parts = '';
    const order = ['skirts', 'rbumper', 'fbumper', 'hood'];
    order.forEach((slot) => {
      const it = P[slot]; if (!it) return;
      c.m = A.matFill(it.vis.mat, uid);
      const fn = PARTS[it.vis.style];
      if (fn) parts += `<g stroke="rgba(150,160,180,.38)" stroke-width=".9">${fn(c)}</g>`;
    });
    /* arch + flares + wheels */
    let wheels = '';
    const cy = 222 - g.r;
    [g.rw, g.fw].forEach((cx) => { wheels += `<circle cx="${cx}" cy="${cy}" r="${g.r + 7}" fill="#07080a"/>`; });
    if (P.flares) { c.m = A.matFill(P.flares.vis.mat, uid); wheels += PARTS[P.flares.vis.style](c); }
    const wv = R.wheel ? R.wheel.vis : null;
    const wDef = wv || { style: 'steel', n: 6, col: '#8b9098' };
    [g.rw, g.fw].forEach((cx) => { wheels += A.wheel(wDef, cx, cy, g.r, R.wheelCol, uid); });

    /* glass */
    const tint = P.tint ? P.tint.vis : { op: 0.5 };
    const gTop = tint.mirror ? '#7ea0ff' : U.mix('#8fb0c8', '#05070a', Math.min(1, tint.op));
    const gBot = tint.mirror ? '#13204a' : U.mix('#15222d', '#030405', Math.min(1, tint.op));
    defs += `<linearGradient id="${uid}gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${gTop}"/><stop offset="1" stop-color="${gBot}"/></linearGradient><clipPath id="${uid}wc"><path d="${G.winPath}"/></clipPath>`;
    glass += `<path d="${G.winPath}" fill="url(#${uid}gl)" stroke="rgba(0,0,0,.55)" stroke-width="1.6"/>`;
    const w = G.win, wmid = (w[1][0] + w[2][0]) / 2;
    glass += `<g clip-path="url(#${uid}wc)"><path d="M${N(wmid - 34)} ${w[1][1]}L${N(wmid + 10)} ${w[1][1]}L${N(wmid - 22)} ${G.belt}L${N(wmid - 66)} ${G.belt}Z" fill="#fff" opacity="${tint.op > 0.95 ? 0.05 : 0.13}"/>`;
    if (g.doors === 2) glass += `<rect x="${N(G.dx - 3)}" y="${w[1][1] - 2}" width="6" height="${G.belt - w[1][1] + 4}" fill="#101113"/>`;
    glass += `<path d="M${N(w[0][0] + 6)} ${G.belt - 4}Q${N(wmid)} ${G.belt - 12} ${N(w[3][0] - 8)} ${G.belt - 4}" stroke="rgba(0,0,0,.4)" stroke-width="10" fill="none"/></g>`;

    /* lights */
    const hl = P.headlight, hcol = hl ? hl.vis.col : '#f3f6ff';
    const hs = carItem.car.hl, lh = Math.min(14, (g.sill - g.ny) * 0.55);
    const fy = g.ny + 6, nx = g.nose;
    let lamp = '';
    if (hs === 'round') lamp = `<circle cx="${nx - 22}" cy="${fy + 9}" r="9.5" fill="#15171a"/><circle cx="${nx - 22}" cy="${fy + 9}" r="7" fill="${hcol}"/>`;
    else if (hs === 'slit') lamp = `<path d="M${nx - 1} ${fy + 2}L${nx - 46} ${fy - 1}Q${nx - 50} ${fy + 3} ${nx - 44} ${fy + 8}L${nx - 3} ${fy + lh}Z" fill="#15171a"/><path d="M${nx - 4} ${fy + 4}L${nx - 42} ${fy + 2}L${nx - 41} ${fy + 6}L${nx - 5} ${fy + lh - 3}Z" fill="${hcol}"/>`;
    else if (hs === 'wide') lamp = `<rect x="${nx - 44}" y="${fy}" width="42" height="${lh + 2}" rx="5" fill="#15171a"/><rect x="${nx - 41}" y="${fy + 3}" width="36" height="${lh - 4}" rx="3" fill="${hcol}"/>`;
    else if (hs === 'pop') lamp = `<rect x="${nx - 38}" y="${fy - 4}" width="24" height="${lh + 3}" rx="8" fill="#15171a"/><circle cx="${nx - 26}" cy="${fy + lh / 2}" r="6.5" fill="${hcol}"/>`;
    else lamp = `<rect x="${nx - 32}" y="${fy}" width="26" height="${lh + 1}" rx="3" fill="#15171a"/><rect x="${nx - 29}" y="${fy + 3}" width="20" height="${lh - 5}" rx="2" fill="${hcol}"/>`;
    let beam = '';
    if (hl) {
      defs += `<linearGradient id="${uid}bm" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${hcol}" stop-opacity=".55"/><stop offset="1" stop-color="${hcol}" stop-opacity="0"/></linearGradient>`;
      beam = `<polygon points="${nx - 10},${fy + 2} ${nx + 130},${fy - 18} ${nx + 130},${fy + 34} ${nx - 10},${fy + lh}" fill="url(#${uid}bm)"/>`;
    }
    const ts = carItem.car.tl; let tail = '';
    if (ts === 'bar') tail = `<rect x="${g.tail - 1}" y="${g.ty + 5}" width="26" height="7" rx="2" fill="#a01020"/><rect x="${g.tail + 1}" y="${g.ty + 7}" width="20" height="3" rx="1" fill="#ff4d5e"/>`;
    else if (ts === 'round') tail = `<circle cx="${g.tail + 8}" cy="${g.ty + 14}" r="7.5" fill="#a01020"/><circle cx="${g.tail + 8}" cy="${g.ty + 14}" r="4.5" fill="#ff4d5e"/>`;
    else tail = `<rect x="${g.tail - 1}" y="${g.ty + 5}" width="9" height="20" rx="2" fill="#a01020"/><rect x="${g.tail + 1}" y="${g.ty + 8}" width="5" height="14" rx="1" fill="#ff4d5e"/>`;
    /* intake + stock mirror */
    const intake = `<rect x="${nx - 62}" y="${g.sill - 24}" width="48" height="11" rx="4" fill="#0b0b0d" opacity=".82"/><path d="M${nx - 60} ${g.sill - 20}h44M${nx - 60} ${g.sill - 17}h44" stroke="#2c2f36" stroke-width="1"/>`;
    let mir = '';
    if (!P.mirrors) { c.m = `url(#${uid}pf)`; mir = mirror(c, 'M0 0L22 2Q26 9 18 13L0 11Z'); }
    else { c.m = A.matFill(P.mirrors.vis.mat, uid); mir = PARTS[P.mirrors.vis.style](c); }
    if (P.flares) { /* flares sit under the wheel group already */ }

    /* light accessories + extras */
    let acc = '';
    const lb = P.lightbar;
    if (lb) {
      const col = lb.vis.col;
      if (lb.vis.style === 'roof') { const x = (g.rr + g.rf) / 2 - 36, y = g.roof - 11; acc += `<rect x="${N(x)}" y="${y}" width="72" height="9" rx="2.5" fill="#121315"/><rect x="${N(x + 4)}" y="${y + 2}" width="64" height="4.5" rx="1.5" fill="${col}"/><ellipse cx="${N(x + 36)}" cy="${y + 4}" rx="48" ry="9" fill="${col}" opacity=".18"/>`; }
      else { const x = nx - 20, y = g.sill - 12; acc += `<circle cx="${x}" cy="${y}" r="13" fill="${col}" opacity=".22"/><circle cx="${x}" cy="${y}" r="7.5" fill="#0b0b0d" stroke="#3a3d45"/><circle cx="${x}" cy="${y}" r="5" fill="${col}"/>`; }
    }
    if (P.accessory && ACC[P.accessory.vis.style]) acc += ACC[P.accessory.vis.style](c);
    if (P.effect) front += effectFront(c, P.effect);

    const vb = o.vb || '0 0 600 260';
    const svg = `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" class="art-svg" role="img" aria-label="${U.esc(carItem.name)}"><defs>${defs}</defs>${back}${spoilerSvg}${body}${parts}${glass}${intake}${tail}${lamp}${beam}${mir}${wheels}${acc}${front}</svg>`;
    cache[key] = svg;
    return svg;
  };
})();
