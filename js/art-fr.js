/* STREET VAULT — art-fr.js : front / rear views, plates, thumbnails, container crates, dispatcher */
(function () {
  'use strict';
  const SV = (window.SV = window.SV || {});
  const U = SV.util, D = SV.data, A = SV.art;
  const N = A.N;

  /* ---------------------------------------------------------------- PLATE */
  A.plate = function (vis, text, x, y, w, h, uid) {
    const t = U.esc(text || vis.text || 'VAULT');
    let s = '';
    const fr = vis.frame;
    if (vis.glow) s += `<rect x="${x - 3}" y="${y - 3}" width="${w + 6}" height="${h + 6}" rx="5" fill="${vis.frame}" opacity=".3"/>`;
    if (fr === 'carbon') s += `<rect x="${x - 3}" y="${y - 3}" width="${w + 6}" height="${h + 6}" rx="4" fill="url(#${uid}cf)"/>`;
    else if (fr) s += `<rect x="${x - 3}" y="${y - 3}" width="${w + 6}" height="${h + 6}" rx="4" fill="${fr}"/>`;
    if (vis.style === 'holo') s += `<linearGradient id="${uid}pg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9fe8ff"/><stop offset=".35" stop-color="#e9b6ff"/><stop offset=".7" stop-color="#ffe6a0"/><stop offset="1" stop-color="#a7ffd0"/></linearGradient><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="url(#${uid}pg)"/>`;
    else s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${vis.bg}" stroke="rgba(0,0,0,.35)" stroke-width="1"/>`;
    let tx = x + w / 2;
    if (vis.style === 'euro') { s += `<rect x="${x}" y="${y}" width="${N(w * 0.13)}" height="${h}" rx="3" fill="#1d4ed8"/><circle cx="${N(x + w * 0.065)}" cy="${N(y + h / 2)}" r="${N(h * 0.17)}" fill="none" stroke="#ffd400" stroke-width="1.2" stroke-dasharray="1.6 1.6"/>`; tx += w * 0.06; }
    const fs = Math.min(h * 0.68, (w * 0.84) / Math.max(4, t.length) * 1.55);
    s += `<text x="${N(tx)}" y="${N(y + h * 0.5 + fs * 0.35)}" text-anchor="middle" font-family="'Barlow Condensed','Arial Narrow',sans-serif" font-weight="700" font-size="${N(fs)}" letter-spacing=".6" fill="${vis.style === 'holo' ? '#20232a' : vis.fg}">${t}</text>`;
    return s;
  };
  A.plateSVG = function (item, text) {
    const uid = 'pl' + U.hashHex(item.id + (text || '')) + '_';
    return `<svg viewBox="0 0 200 110" xmlns="http://www.w3.org/2000/svg" class="art-svg"><defs>${A.carbonDef(uid + 'cf')}</defs>${A.plate(item.vis, text || item.vis.text || 'STREET', 20, 30, 160, 48, uid)}</svg>`;
  };

  /* ---------------------------------------------------------------- FRONT / REAR */
  const cache = {};
  function frSVG(carItem, build, rear, o) {
    o = o || {};
    const key = (rear ? 'R' : 'F') + carItem.id + '|' + JSON.stringify(build || {}) + '|' + (o.fx !== false ? 1 : 0);
    if (cache[key]) return cache[key];
    const R = A.resolve(carItem, build), P = R.parts, g = carItem.car.g, fv = carItem.car.fv;
    const uid = 'f' + U.hashHex(key) + '_', fx = o.fx !== false;
    const cx = 300, bw = fv.bw, x0 = cx - bw / 2, x1 = cx + bw / 2, roofY = fv.roofY, hoodY = fv.hoodY, rw = fv.roofW, sill = 207;
    const flare = P.flares ? 9 : 0;
    const gg = { tail: x0, nose: x1, roof: roofY, sill: sill, rad: g.rad };
    const pd = A.paintDef(uid + 'pf', R.paint, { tail: x0, nose: x1, roof: roofY, sill: sill }, fx);
    let defs = pd.def + A.carbonDef(uid + 'cf') + A.goldDef(uid + 'gd'), s = '';
    defs += `<linearGradient id="${uid}sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".24"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".4"/></linearGradient><radialGradient id="${uid}sd"><stop offset="0" stop-color="#000" stop-opacity=".7"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>`;
    const mat = (m) => A.matFill(m, uid);
    /* ground + effects behind */
    s += `<ellipse cx="${cx}" cy="223" rx="${bw / 2 + 30}" ry="12" fill="url(#${uid}sd)"/>`;
    if (P.effect && P.effect.vis.style === 'aura') { defs += `<radialGradient id="${uid}au"><stop offset=".5" stop-color="#ffb627" stop-opacity="0"/><stop offset=".75" stop-color="#ffb627" stop-opacity=".32"/><stop offset="1" stop-color="#ffb627" stop-opacity="0"/></radialGradient>`; s += `<ellipse cx="${cx}" cy="150" rx="${bw / 2 + 70}" ry="110" fill="url(#${uid}au)"/>`; }
    if (P.neon) { const col = P.neon.vis.col; defs += `<radialGradient id="${uid}ng"><stop offset="0" stop-color="${col}" stop-opacity=".85"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient>`; s += `<ellipse cx="${cx}" cy="219" rx="${bw / 2 + 36}" ry="16" fill="url(#${uid}ng)"/><rect x="${x0 + 18}" y="${sill + 1}" width="${bw - 36}" height="3.4" rx="1.7" fill="${col}">${P.neon.vis.anim && fx ? '<animate attributeName="fill" values="#ff2e88;#22e4ff;#c8ff2e;#ff2e88" dur="5s" repeatCount="indefinite"/>' : ''}</rect>`; }
    /* wheels (tyre sliver + rim edge) */
    const wc = R.wheelCol || (R.wheel ? R.wheel.vis.col : '#8b9098');
    [[x0 - flare + 2, -1], [x1 + flare - 34, 1]].forEach((t) => { s += `<rect x="${t[0]}" y="168" width="32" height="54" rx="6" fill="#0c0d0f"/><rect x="${t[1] < 0 ? t[0] + 20 : t[0] + 2}" y="176" width="10" height="38" rx="3" fill="${wc}" opacity=".9"/>`; });
    /* rear wing (above everything for rear view, behind roof in front view) */
    const sp = P.spoiler;
    if (rear && sp && sp.vis.style !== 'sp_lip') {
      const big = sp.vis.style === 'sp_big' ? 1 : 0;
      const wy = roofY + (big ? 22 : 38), ww = bw * (big ? 0.96 : 0.8);
      s += `<rect x="${cx - 36}" y="${wy + 6}" width="7" height="40" fill="#4a4e58"/><rect x="${cx + 29}" y="${wy + 6}" width="7" height="40" fill="#4a4e58"/>`;
      s += `<rect x="${cx - ww / 2}" y="${wy}" width="${ww}" height="${big ? 14 : 10}" rx="3" fill="${mat(sp.vis.mat)}" stroke="rgba(150,160,180,.45)"/><rect x="${cx - ww / 2 - 3}" y="${wy - 8}" width="6" height="${big ? 30 : 22}" rx="2" fill="${mat(sp.vis.mat)}" stroke="rgba(150,160,180,.45)"/><rect x="${cx + ww / 2 - 3}" y="${wy - 8}" width="6" height="${big ? 30 : 22}" rx="2" fill="${mat(sp.vis.mat)}" stroke="rgba(150,160,180,.45)"/>`;
    }
    /* body */
    const pts = [[x0, sill], [x0, hoodY + 18], [x0 + 12, hoodY], [cx - rw / 2, roofY], [cx + rw / 2, roofY], [x1 - 12, hoodY], [x1, hoodY + 18], [x1, sill]];
    const bodyD = A.roundedPoly(pts, [6, 12, 10, 18, 18, 10, 12, 6]);
    defs += `<clipPath id="${uid}bc"><path d="${bodyD}"/></clipPath>`;
    s += `<path d="${bodyD}" fill="url(#${uid}pf)"/>`;
    /* livery stripes (centre line) */
    const lv = P.livery;
    let dec = '';
    if (lv) {
      const c0 = lv.vis.cols[0], c1 = lv.vis.cols[1] || c0, st = lv.vis.style;
      if (st === 'twin' || st === 'powder' || st === 'checker') dec += `<rect x="${cx - 16}" y="${roofY - 4}" width="12" height="${sill - roofY}" fill="${c0}"/><rect x="${cx + 4}" y="${roofY - 4}" width="12" height="${sill - roofY}" fill="${c1 === c0 ? c0 : (st === 'powder' ? lv.vis.cols[1] : c1)}"/>`;
      else if (st === 'tri') dec += lv.vis.cols.map((c, i) => `<rect x="${cx - 18 + i * 12}" y="${roofY - 4}" width="12" height="${sill - roofY}" fill="${c}"/>`).join('');
      else if (st === 'side' || st === 'rally') dec += `<rect x="${x0}" y="${sill - 36}" width="${bw}" height="36" fill="${c0}" opacity=".9"/><rect x="${x0}" y="${sill - 38}" width="${bw}" height="3" fill="${c1}"/>`;
      else if (st === 'grid') dec += `<rect x="${x0}" y="${sill - 40}" width="${bw}" height="40" fill="${c0}" opacity=".28"/><path d="M${x0} ${sill - 40}H${x1}" stroke="${c1}" stroke-width="2"/>`;
      else if (st === 'sakura') dec += `<path d="M${x0} ${sill}V${sill - 26}Q${cx} ${sill - 44} ${x1} ${sill - 26}V${sill}Z" fill="${c0}" opacity=".85"/>` + [0.2, 0.38, 0.55, 0.72].map((p, i) => `<ellipse cx="${N(x0 + bw * p)}" cy="${sill - 14 - (i % 2) * 6}" rx="6" ry="3.2" transform="rotate(${i * 40} ${N(x0 + bw * p)} ${sill - 14 - (i % 2) * 6})" fill="${c1}"/>`).join('');
      else if (st === 'tiger') dec += [0, 1, 2, 3, 4].map((i) => `<path d="M${x0 + 12 + i * 52} ${sill}l14 0l22 -46l-14 0z" fill="${i % 2 ? c1 : c0}"/>`).join('');
      else if (st === 'scale') dec += `<rect x="${x0}" y="${sill - 44}" width="${bw}" height="44" fill="${c0}" opacity=".7"/><path d="M${x0} ${sill - 44}h${bw}" stroke="${c1}" stroke-width="3"/>`;
    }
    if (dec) s += `<g clip-path="url(#${uid}bc)">${dec}</g>`;
    s += `<path d="${bodyD}" fill="url(#${uid}sh)"/>`;
    /* glass */
    const tint = P.tint ? P.tint.vis : { op: 0.5 };
    const gTop = tint.mirror ? '#7ea0ff' : U.mix('#8fb0c8', '#05070a', Math.min(1, tint.op)), gBot = tint.mirror ? '#13204a' : U.mix('#15222d', '#030405', Math.min(1, tint.op));
    defs += `<linearGradient id="${uid}gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${gTop}"/><stop offset="1" stop-color="${gBot}"/></linearGradient>`;
    const gw = [[x0 + 24, hoodY - 3], [cx - rw / 2 + 12, roofY + 10], [cx + rw / 2 - 12, roofY + 10], [x1 - 24, hoodY - 3]];
    s += `<path d="${A.roundedPoly(gw, [4, 10, 10, 4])}" fill="url(#${uid}gl)" stroke="rgba(0,0,0,.5)" stroke-width="1.4"/>`;
    s += `<path d="M${cx - 40} ${roofY + 10}L${cx - 6} ${roofY + 10}L${cx - 34} ${hoodY - 3}L${cx - 70} ${hoodY - 3}Z" fill="#fff" opacity="${tint.op > 0.95 ? 0.04 : 0.12}"/>`;
    /* hood panel */
    const hp = P.hood;
    s += `<path d="M${x0 + 14} ${hoodY + 2}H${x1 - 14}L${x1 - 6} ${hoodY + 22}H${x0 + 6}Z" fill="${hp && hp.vis.mat === 'carbon' ? mat('carbon') : 'rgba(0,0,0,.14)'}"/>`;
    if (hp && hp.vis.style === 'hd_vent') s += [0, 1, 2].map((i) => `<rect x="${cx - 44 + i * 6}" y="${hoodY + 5}" width="3" height="14" fill="#0b0b0d"/><rect x="${cx + 28 + i * 6}" y="${hoodY + 5}" width="3" height="14" fill="#0b0b0d"/>`).join('');
    if (hp && hp.vis.style === 'hd_scoop') s += `<path d="M${cx - 34} ${hoodY + 20}L${cx - 24} ${hoodY + 4}H${cx + 24}L${cx + 34} ${hoodY + 20}Z" fill="${mat('body')}" stroke="rgba(0,0,0,.4)"/><rect x="${cx - 22}" y="${hoodY + 8}" width="44" height="9" fill="#0b0b0d"/>`;
    /* lower fascia + lights/tails */
    const fy = hoodY + 24;
    s += `<rect x="${x0 + 2}" y="${fy}" width="${bw - 4}" height="${sill - fy}" rx="8" fill="#101114" opacity=".78"/>`;
    const hl = P.headlight, hcol = hl && !rear ? hl.vis.col : '#f3f6ff';
    const style = carItem.car[rear ? 'tl' : 'hl'];
    const lamps = (xx, dir) => {
      const lw = rear ? 52 : 46, lh = rear ? 9 : 15;
      if (rear) return `<rect x="${xx}" y="${hoodY + 26}" width="${lw}" height="${lh}" rx="3" fill="#a01020"/><rect x="${xx + 3}" y="${hoodY + 29}" width="${lw - 6}" height="${lh - 6}" rx="2" fill="#ff4d5e"/>`;
      if (style === 'round') return `<circle cx="${xx + (dir < 0 ? 16 : 30)}" cy="${hoodY + 30}" r="14" fill="#15171a"/><circle cx="${xx + (dir < 0 ? 16 : 30)}" cy="${hoodY + 30}" r="10" fill="${hcol}"/>`;
      if (style === 'slit') return `<rect x="${xx}" y="${hoodY + 24}" width="${lw}" height="9" rx="4" fill="#15171a"/><rect x="${xx + 3}" y="${hoodY + 26}" width="${lw - 6}" height="4.5" rx="2" fill="${hcol}"/>`;
      return `<rect x="${xx}" y="${hoodY + 24}" width="${lw}" height="${lh + 2}" rx="5" fill="#15171a"/><rect x="${xx + 4}" y="${hoodY + 28}" width="${lw - 8}" height="${lh - 6}" rx="3" fill="${hcol}"/>`;
    };
    s += lamps(x0 + 8, -1) + lamps(x1 - 8 - (rear ? 52 : 46), 1);
    if (hl && !rear) s += `<ellipse cx="${x0 + 30}" cy="${hoodY + 31}" rx="30" ry="14" fill="${hcol}" opacity=".18"/><ellipse cx="${x1 - 30}" cy="${hoodY + 31}" rx="30" ry="14" fill="${hcol}" opacity=".18"/>`;
    /* grille / exhaust */
    if (!rear) s += `<rect x="${cx - 52}" y="${fy + 2}" width="104" height="22" rx="5" fill="#08090b"/><path d="M${cx - 48} ${fy + 8}h96M${cx - 48} ${fy + 14}h96M${cx - 48} ${fy + 20}h96" stroke="#2c2f36" stroke-width="1.4"/>`;
    else s += `<circle cx="${cx - 58}" cy="${sill - 12}" r="8" fill="#08090b" stroke="#aeb4bd" stroke-width="2"/><circle cx="${cx + 58}" cy="${sill - 12}" r="8" fill="#08090b" stroke="#aeb4bd" stroke-width="2"/>`;
    /* plate */
    const pv = P.plate ? P.plate.vis : { bg: '#f4f4f0', fg: '#16171a', frame: null, style: 'std' };
    s += A.plate(pv, R.plateText || (P.plate && P.plate.vis.text) || 'VAULT', cx - 31, fy + 28, 62, 17, uid);
    /* bumper parts */
    const fb = !rear ? P.fbumper : P.rbumper;
    if (fb) {
      const m = mat(fb.vis.mat), st = fb.vis.style;
      if (st === 'fb_lip' || st === 'rb_diff') s += `<rect x="${x0 + 10}" y="${sill - 5}" width="${bw - 20}" height="8" rx="3" fill="${m}"/>`;
      else if (st === 'fb_split') s += `<rect x="${x0 + 4}" y="${sill - 6}" width="${bw - 8}" height="10" rx="3" fill="${m}"/><rect x="${cx - 70}" y="${sill - 20}" width="140" height="10" rx="3" fill="#08090b"/>`;
      else if (st === 'fb_track') s += `<rect x="${x0 - 4}" y="${sill - 5}" width="${bw + 8}" height="10" rx="2" fill="${m}"/><path d="M${x0 + 2} ${sill - 6}l-8 -22l16 22zM${x1 - 2} ${sill - 6}l8 -22l-16 22z" fill="${m}"/>`;
      else if (st === 'fb_cnose') s += `<path d="M${x0 + 2} ${sill + 2}V${fy + 14}Q${cx} ${fy + 6} ${x1 - 2} ${fy + 14}V${sill + 2}Z" fill="${m}"/><rect x="${cx - 62}" y="${fy + 22}" width="124" height="14" rx="4" fill="#08090b"/><path d="M${x0 + 2} ${fy + 14}Q${cx} ${fy + 6} ${x1 - 2} ${fy + 14}" stroke="#c8ff2e" stroke-width="1.6" fill="none"/>`;
      else if (st === 'rb_track' || st === 'rb_carbon') { let f = ''; for (let i = 0; i < 10; i++) f += `<path d="M${x0 + 16 + i * ((bw - 32) / 9)} ${sill - 22}v26" stroke="#34373f" stroke-width="2"/>`; s += `<path d="M${x0 + 6} ${sill - 22}H${x1 - 6}V${sill + 4}H${x0 + 6}Z" fill="${m}"/>${f}<circle cx="${cx - 58}" cy="${sill - 12}" r="8" fill="#08090b" stroke="#aeb4bd" stroke-width="2"/><circle cx="${cx + 58}" cy="${sill - 12}" r="8" fill="#08090b" stroke="#aeb4bd" stroke-width="2"/>`; }
    }
    /* side bits: flares, mirrors, skirts shadow */
    if (P.flares) { const m = mat(P.flares.vis.mat); s += `<path d="M${x0} ${sill - 2}Q${x0 - flare - 2} ${sill - 22} ${x0 - flare} ${hoodY + 22}L${x0 + 2} ${hoodY + 30}Z" fill="${m}" stroke="rgba(0,0,0,.4)"/><path d="M${x1} ${sill - 2}Q${x1 + flare + 2} ${sill - 22} ${x1 + flare} ${hoodY + 22}L${x1 - 2} ${hoodY + 30}Z" fill="${m}" stroke="rgba(0,0,0,.4)"/>`; }
    const mm = P.mirrors ? mat(P.mirrors.vis.mat) : `url(#${uid}pf)`;
    s += `<rect x="${x0 - 15 - flare / 2}" y="${hoodY - 12}" width="18" height="12" rx="4" fill="${mm}" stroke="rgba(0,0,0,.4)"/><rect x="${x1 - 3 + flare / 2}" y="${hoodY - 12}" width="18" height="12" rx="4" fill="${mm}" stroke="rgba(0,0,0,.4)"/>`;
    /* roof accessories + light bars */
    const ac = P.accessory;
    if (ac && (ac.vis.style === 'rack' || ac.vis.style === 'surf')) { s += `<rect x="${cx - rw / 2 + 8}" y="${roofY - 6}" width="${rw - 16}" height="4" rx="2" fill="#1a1b1f"/>`; if (ac.vis.style === 'surf') s += `<rect x="${cx - 18}" y="${roofY - 40}" width="36" height="36" rx="16" fill="#ffcf33" stroke="#e08a00"/>`; }
    if (ac && ac.vis.style === 'scoop') s += `<rect x="${cx - 18}" y="${roofY - 10}" width="36" height="10" rx="2" fill="${mat('carbon')}"/>`;
    if (ac && ac.vis.style === 'antenna') s += `<path d="M${cx + rw / 2 - 12} ${roofY + 2}l-2 -34" stroke="#1a1b1f" stroke-width="2"/><path d="M${cx + rw / 2 - 14} ${roofY - 32}l-12 3l11 5z" fill="#d7263d"/>`;
    if (ac && ac.vis.style === 'tow' && !rear) s += `<path d="M${cx + 70} ${sill - 8}q16 4 10 22q-14 4 -18 -8" fill="none" stroke="#d7263d" stroke-width="4" stroke-linecap="round"/>`;
    const lb = P.lightbar;
    if (lb && lb.vis.style === 'roof') s += `<rect x="${cx - 52}" y="${roofY - 12}" width="104" height="10" rx="3" fill="#121315"/><rect x="${cx - 48}" y="${roofY - 10}" width="96" height="5" rx="2" fill="${lb.vis.col}"/>`;
    if (lb && lb.vis.style === 'pods' && !rear) s += [-72, 72].map((dx) => `<circle cx="${cx + dx}" cy="${sill - 14}" r="12" fill="${lb.vis.col}" opacity=".22"/><circle cx="${cx + dx}" cy="${sill - 14}" r="7.5" fill="#0b0b0d" stroke="#3a3d45"/><circle cx="${cx + dx}" cy="${sill - 14}" r="5" fill="${lb.vis.col}"/>`).join('');
    /* spoiler lip in front view is hidden; lip on rear */
    if (rear && sp && sp.vis.style === 'sp_lip') s += `<rect x="${cx - bw * 0.36}" y="${hoodY + 6}" width="${bw * 0.72}" height="5" rx="2" fill="${mat('body')}" stroke="rgba(0,0,0,.4)"/>`;
    /* effects in front */
    const ef = P.effect;
    if (ef && rear && ef.vis.style === 'flames') s += `<path d="M${cx - 58} ${sill - 12}l-6 40l12 -4z" fill="#ff8a1f" class="${fx ? 'fx-flick' : ''}"/><path d="M${cx + 58} ${sill - 12}l-6 40l12 -4z" fill="#ff8a1f" class="${fx ? 'fx-flick' : ''}"/>`;
    if (ef && ef.vis.style === 'smoke') s += [0, 1, 2, 3].map((i) => `<circle cx="${cx - 90 + i * 60}" cy="${212 - i % 2 * 6}" r="${16 + i * 3}" fill="#c9ced6" opacity=".35"/>`).join('');
    const svg = `<svg viewBox="0 0 600 260" xmlns="http://www.w3.org/2000/svg" class="art-svg" role="img" aria-label="${U.esc(carItem.name)}"><defs>${defs}</defs>${s}</svg>`;
    cache[key] = svg;
    return svg;
  }

  /* ---------------------------------------------------------------- DISPATCH */
  A.carSVG = function (carItem, build, o) {
    o = o || {};
    if (o.view === 'front') return frSVG(carItem, build, false, o);
    if (o.view === 'rear') return frSVG(carItem, build, true, o);
    return A.sideSVG(carItem, build, o);
  };

  /* ---------------------------------------------------------------- THUMBNAILS */
  const REFS = ['rei86', 'sprint', 'kombi', 'nordhaus', 'kei_run', 'ranger'];
  const tcache = {};
  A.thumb = function (item, o) {
    o = o || {};
    const key = item.id + (o.fx === false ? '0' : '1');
    if (tcache[key]) return tcache[key];
    let svg;
    if (item.cat === 'car') svg = A.sideSVG(item, {}, { vb: '34 30 532 200', fx: o.fx });
    else if (item.cat === 'wheels') svg = A.wheelSVG(item);
    else if (item.cat === 'plate') svg = A.plateSVG(item);
    else {
      const refId = REFS.find((r) => D.compatible(item, r)) || 'rei86';
      const car = D.ITEM[refId], g = car.car.g, b = {};
      b[item.slot] = item.id;
      const crop = (x, y) => [N(x), N(y), 260, 195].join(' ');
      let vb = '34 30 532 200';
      switch (item.slot) {
        case 'spoiler': vb = crop(g.tail - 80, Math.min(g.sy || g.roof, g.roof + 40) - 128); break;
        case 'fbumper': case 'headlight': case 'hood': vb = crop(g.nose - 240, g.hy - 70); break;
        case 'rbumper': vb = crop(g.tail - 30, g.sill - 150); break;
        case 'flares': vb = crop(g.rw - 120, g.sill - 150); break;
        case 'mirrors': vb = crop(g.cw - 170, g.hy - 110); break;
        case 'tint': vb = crop(g.rr - 40, g.roof - 40); break;
        case 'accessory': vb = item.vis.style === 'tow' ? crop(g.nose - 240, g.sill - 150) : crop((g.rr + g.rf) / 2 - 130, g.roof - 100); break;
        case 'lightbar': vb = item.vis.style === 'roof' ? crop((g.rr + g.rf) / 2 - 130, g.roof - 100) : crop(g.nose - 240, g.sill - 150); break;
        default: break;
      }
      svg = A.sideSVG(car, b, { vb: vb, fx: o.fx });
    }
    tcache[key] = svg;
    return svg;
  };

  /* ---------------------------------------------------------------- CRATES */
  function boxParts(id, pal) {
    const a = pal.a, b = pal.b, c = pal.c;
    const W = { x: 36, w: 168, top: 96, bot: 186 };
    const wood = `<rect x="${W.x}" y="${W.top}" width="${W.w}" height="${W.bot - W.top}" rx="6" fill="${b}"/>`;
    let body = '', lid = '';
    switch (id) {
      case 'street':
        body = wood + `<rect x="${W.x}" y="${W.top}" width="${W.w}" height="14" fill="${a}" opacity=".9"/><path d="M${W.x + 14} ${W.top + 24}V${W.bot - 6}M${W.x + W.w - 14} ${W.top + 24}V${W.bot - 6}" stroke="#3a3e46" stroke-width="6"/><circle cx="120" cy="146" r="26" fill="#101114" stroke="${a}" stroke-width="4"/><circle cx="120" cy="146" r="12" fill="none" stroke="${a}" stroke-width="3"/><path d="M120 120v-6M120 178v6M94 146h-6M146 146h6" stroke="${a}" stroke-width="3"/><path d="M${W.x} ${W.bot - 8}h${W.w}" stroke="${c}" stroke-width="3" stroke-dasharray="10 8"/>`;
        lid = `<rect x="${W.x - 6}" y="64" width="${W.w + 12}" height="34" rx="6" fill="#2d3037" stroke="${a}" stroke-width="3"/><path d="M${W.x + 4} 74H${W.x + W.w}" stroke="#3a3e46" stroke-width="3"/>`; break;
      case 'jdm':
        body = `<rect x="${W.x}" y="${W.top}" width="${W.w}" height="${W.bot - W.top}" rx="6" fill="${b}"/><circle cx="120" cy="142" r="30" fill="${a}"/><path d="M${W.x} ${W.top + 14}H${W.x + W.w}M${W.x} ${W.bot - 14}H${W.x + W.w}" stroke="${c}" stroke-width="7"/><path d="M${W.x + 20} ${W.top}v${W.bot - W.top}M${W.x + W.w - 20} ${W.top}v${W.bot - W.top}" stroke="${c}" stroke-width="3" opacity=".8"/>`;
        lid = `<rect x="${W.x - 6}" y="64" width="${W.w + 12}" height="34" rx="6" fill="${a}"/><path d="M${W.x + 10} 81H${W.x + W.w - 4}" stroke="${b}" stroke-width="4"/><path d="M${W.x + 70} 64l16 34M${W.x + 100} 64l-16 34" stroke="${b}" stroke-width="3" opacity=".5"/>`; break;
      case 'euro':
        body = wood + `<rect x="${W.x + 6}" y="${W.top + 6}" width="${W.w - 12}" height="${W.bot - W.top - 12}" rx="4" fill="none" stroke="${a}" stroke-width="2"/><path d="M120 128l20 12v22l-20 12l-20 -12v-22z" fill="none" stroke="${a}" stroke-width="3"/><circle cx="120" cy="151" r="7" fill="${a}"/><path d="M${W.x} 120H${W.x + W.w}" stroke="${a}" stroke-width="1.5" opacity=".6"/>`;
        lid = `<rect x="${W.x - 6}" y="64" width="${W.w + 12}" height="34" rx="8" fill="#23242a" stroke="${a}" stroke-width="3"/><rect x="${W.x + 4}" y="70" width="${W.w - 8}" height="22" rx="4" fill="none" stroke="${a}" stroke-width="1.5"/><rect x="110" y="88" width="20" height="14" rx="3" fill="${a}"/>`; break;
      case 'midnight':
        body = `<rect x="${W.x}" y="${W.top}" width="${W.w}" height="${W.bot - W.top}" rx="6" fill="${b}" stroke="${c}" stroke-width="2.5"/><path d="M${W.x + 10} ${W.bot - 12}H${W.x + W.w - 10}" stroke="${a}" stroke-width="3"/><path d="M128 124a22 22 0 1 0 0 44a17 17 0 1 1 0 -44z" fill="${a}"/><circle cx="76" cy="124" r="2" fill="${c}"/><circle cx="168" cy="118" r="2.4" fill="${c}"/><circle cx="160" cy="170" r="1.6" fill="${c}"/><circle cx="82" cy="160" r="1.6" fill="#fff"/>`;
        lid = `<rect x="${W.x - 6}" y="64" width="${W.w + 12}" height="34" rx="6" fill="#171833" stroke="${c}" stroke-width="2.5"/><path d="M${W.x + 6} 81H${W.x + W.w}" stroke="${a}" stroke-width="3"/>`; break;
      case 'track':
        body = `<rect x="${W.x}" y="${W.top}" width="${W.w}" height="${W.bot - W.top}" rx="6" fill="${b}"/><path d="${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `M${W.x + i * 24 - 6} ${W.bot}l16 -${W.bot - W.top}h12l-16 ${W.bot - W.top}z`).join('')}" fill="${a}" opacity=".95" clip-path="url(#crateclip)"/><rect x="${W.x + 40}" y="${W.top + 24}" width="88" height="40" rx="4" fill="#fff"/><text x="${W.x + 84}" y="${W.top + 55}" text-anchor="middle" font-family="'Big Shoulders Display','Arial Narrow',sans-serif" font-weight="900" font-size="38" fill="#111">07</text>`;
        lid = `<rect x="${W.x - 6}" y="64" width="${W.w + 12}" height="34" rx="6" fill="#1b1c20"/>${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => `<rect x="${W.x - 4 + i * 16}" y="${i % 2 ? 80 : 68}" width="16" height="13" fill="#fff"/><rect x="${W.x - 4 + i * 16}" y="${i % 2 ? 68 : 80}" width="16" height="13" fill="#111"/>`).join('')}<rect x="${W.x - 6}" y="64" width="${W.w + 12}" height="34" rx="6" fill="none" stroke="${a}" stroke-width="3"/>`; break;
      case 'carbon':
        body = `<rect x="${W.x}" y="${W.top}" width="${W.w}" height="${W.bot - W.top}" rx="6" fill="url(#cratecf)" stroke="${a}" stroke-width="2"/><path d="M${W.x} ${W.top + 10}H${W.x + W.w}" stroke="${c}" stroke-width="2.4"/><rect x="${W.x}" y="${W.top + 30}" width="16" height="16" fill="${a}"/><rect x="${W.x + W.w - 16}" y="${W.top + 30}" width="16" height="16" fill="${a}"/><rect x="${W.x + 40}" y="${W.bot - 38}" width="88" height="10" rx="5" fill="#0b0c0e" stroke="${c}"/><rect x="${W.x + 44}" y="${W.bot - 35}" width="50" height="4" rx="2" fill="${c}"/>`;
        lid = `<rect x="${W.x - 6}" y="64" width="${W.w + 12}" height="34" rx="6" fill="url(#cratecf)" stroke="${a}" stroke-width="2.4"/><path d="M${W.x + 4} 92H${W.x + W.w}" stroke="${c}" stroke-width="2"/>`; break;
      default: /* legend */
        body = `<rect x="${W.x}" y="${W.top}" width="${W.w}" height="${W.bot - W.top}" rx="8" fill="${b}" stroke="${a}" stroke-width="4"/><path d="M${W.x + 24} ${W.top}v${W.bot - W.top}M${W.x + W.w - 24} ${W.top}v${W.bot - W.top}" stroke="${a}" stroke-width="7"/><circle cx="120" cy="140" r="20" fill="${a}"/><path d="M120 130a7 7 0 1 1 0 14v14" stroke="${b}" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="${W.x + 8}" cy="${W.top + 10}" r="3" fill="${c}"/><circle cx="${W.x + W.w - 8}" cy="${W.top + 10}" r="3" fill="${c}"/><circle cx="${W.x + 8}" cy="${W.bot - 10}" r="3" fill="${c}"/><circle cx="${W.x + W.w - 8}" cy="${W.bot - 10}" r="3" fill="${c}"/>`;
        lid = `<path d="M${W.x - 8} 98V82Q${W.x - 8} 58 120 56Q${W.x + W.w + 8} 58 ${W.x + W.w + 8} 82V98Z" fill="${b}" stroke="${a}" stroke-width="4"/><path d="M${W.x + 24} 98V64M${W.x + W.w - 24} 98V64" stroke="${a}" stroke-width="7"/><path d="M${W.x + 40} 70Q120 58 ${W.x + W.w - 40} 70" stroke="${c}" stroke-width="2" fill="none"/>`;
    }
    return { body: body, lid: lid };
  }
  /* c.open: false/true — the lid group is animated with CSS (class "lid"), light beam is class "beam" */
  A.crate = function (id, o) {
    o = o || {};
    const cn = D.CONT[id] || D.CONTAINERS[0];
    const p = boxParts(cn.id, cn.pal);
    const uid = 'cr' + cn.id;
    const rays = `<g class="beam" opacity="${o.open ? 1 : 0}"><path d="M120 96L40 -20H200Z" fill="url(#${uid}rg)"/><ellipse cx="120" cy="96" rx="70" ry="12" fill="${cn.pal.a}" opacity=".55"/></g>`;
    return `<svg viewBox="0 0 240 200" xmlns="http://www.w3.org/2000/svg" class="art-svg crate-svg" aria-hidden="true"><defs><clipPath id="crateclip"><rect x="36" y="96" width="168" height="90" rx="6"/></clipPath>${A.carbonDef('cratecf')}<linearGradient id="${uid}rg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${cn.pal.a}" stop-opacity=".85"/><stop offset="1" stop-color="${cn.pal.a}" stop-opacity="0"/></linearGradient><radialGradient id="${uid}sd"><stop offset="0" stop-color="#000" stop-opacity=".6"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>${rays}<ellipse cx="120" cy="190" rx="92" ry="9" fill="url(#${uid}sd)"/><g class="crate-body">${p.body}</g><g class="lid">${p.lid}</g></svg>`;
  };
})();
