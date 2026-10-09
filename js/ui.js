/* STREET VAULT — ui.js : toasts, modals, sound, particles, shared components. */
(function () {
  'use strict';
  const SV = (window.SV = window.SV || {});
  const U = SV.util, D = SV.data, G = SV.game, A = SV.art, bus = SV.bus;
  const UI = (SV.ui = {});
  const { esc, fmt, $ } = U;
  const el = (UI.h = function (tag, attrs, text) {
    const n = document.createElement(tag);
    Object.keys(attrs || {}).forEach((k) => n.setAttribute(k, attrs[k]));
    if (text != null) n.textContent = text;
    return n;
  });

  UI.rc = (it) => D.RARITIES[it.rar];
  UI.fx = () => (G.get() ? G.get().settings.fx : 'high');
  UI.thumb = (it) => A.thumb(it, { fx: UI.fx() !== 'low' });

  /* ---------------- toasts ---------------- */
  UI.toast = function (title, text, type) {
    const box = $('#toasts');
    while (box.children.length >= 4) box.removeChild(box.firstChild);
    const t = el('div', { class: 'toast ' + (type || '') });
    t.innerHTML = '<b>' + esc(title) + '</b>' + (text ? '<span>' + esc(text) + '</span>' : '');
    box.appendChild(t);
    const kill = () => { t.classList.add('out'); setTimeout(() => t.remove(), 260); };
    t.addEventListener('click', kill);
    setTimeout(kill, 3800);
  };
  bus.on('toast', (o) => UI.toast(o.title || (o.type === 'bad' ? 'ERROR' : 'INFO'), o.text, o.type));

  /* ---------------- modals ---------------- */
  const stack = [];
  UI.modal = function (o) {
    const back = el('div', { class: 'mback' });
    const m = el('div', { class: 'modal ' + (o.cls || ''), role: 'dialog', 'aria-modal': 'true' });
    m.innerHTML = '<div class="mh"><h2>' + esc(o.title || '') + '</h2>' + (o.nox ? '' : '<button class="xbtn" data-x aria-label="Close">×</button>') + '</div><div class="mb"></div>' + (o.foot ? '<div class="mf"></div>' : '');
    const body = m.querySelector('.mb');
    if (typeof o.body === 'string') body.innerHTML = o.body; else if (o.body) body.appendChild(o.body);
    const foot = m.querySelector('.mf');
    const api = { el: m, body: body, foot: foot, close: close };
    (o.foot || []).forEach((b) => {
      const btn = el('button', { class: 'btn ' + (b.cls || ''), type: 'button' }, b.label);
      btn.addEventListener('click', () => { const r = b.fn ? b.fn(api) : undefined; if (r !== false && !b.keep) close(); });
      foot.appendChild(btn);
    });
    function close() {
      const i = stack.indexOf(api); if (i < 0) return;
      stack.splice(i, 1); back.remove(); if (o.onClose) o.onClose();
    }
    const x = m.querySelector('[data-x]'); if (x) x.addEventListener('click', close);
    back.addEventListener('mousedown', (e) => { if (e.target === back && !o.nox) close(); });
    back.appendChild(m); $('#modals').appendChild(back);
    stack.push(api); o.nox || (api.closable = true);
    const f = m.querySelector('[autofocus]') || m.querySelector('.btn'); if (f) setTimeout(() => f.focus(), 30);
    return api;
  };
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && stack.length) { const top = stack[stack.length - 1]; if (top.closable) { e.preventDefault(); top.close(); } }
  });
  UI.closeAll = () => stack.slice().forEach((m) => m.close());
  UI.confirm = function (title, text, okLabel, danger) {
    return new Promise((res) => {
      let done = false; const fin = (v) => { if (!done) { done = true; res(v); } };
      UI.modal({ title: title, body: '<p>' + text + '</p>', onClose: () => fin(false), foot: [
        { label: 'Cancel', cls: 'ghost', fn: () => fin(false) },
        { label: okLabel || 'Confirm', cls: danger ? 'danger' : '', fn: () => fin(true) }] });
    });
  };
  UI.info = (title, html) => UI.modal({ title: title, body: html, foot: [{ label: 'OK' }] });

  /* ---------------- sound (WebAudio, real) ---------------- */
  let ac = null;
  function ctx() {
    if (!ac) { try { const C = window.AudioContext || window.webkitAudioContext; if (C) ac = new C(); } catch (e) { ac = null; } }
    if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  }
  UI.soundOn = () => { const s = G.get().settings; return s.sound && s.volume > 0; };
  UI.beep = function (freq, dur, type, vol, when, slide) {
    if (!UI.soundOn()) return; const c = ctx(); if (!c) return;
    const t = c.currentTime + (when || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
    const v = (vol == null ? 0.2 : vol) * (G.get().settings.volume / 100);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  };
  UI.sfx = function (name, rar) {
    try {
      if (name === 'click') UI.beep(520, 0.05, 'square', 0.08);
      else if (name === 'buy') { UI.beep(660, 0.08, 'triangle', 0.18); UI.beep(990, 0.12, 'triangle', 0.18, 0.07); }
      else if (name === 'bad') UI.beep(180, 0.18, 'sawtooth', 0.14);
      else if (name === 'shake') for (let i = 0; i < 6; i++) UI.beep(90 + i * 12, 0.08, 'square', 0.12, i * 0.09);
      else if (name === 'reveal') {
        const n = 3 + (rar || 0);
        for (let i = 0; i < n; i++) UI.beep(440 * Math.pow(1.26, i), 0.22, rar >= 4 ? 'sawtooth' : 'triangle', 0.15, i * 0.07);
        if (rar >= 5) UI.beep(120, 0.8, 'sine', 0.3, 0, 40);
      } else if (name === 'ok') { UI.beep(740, 0.08, 'triangle', 0.15); UI.beep(1100, 0.14, 'triangle', 0.15, 0.08); }
    } catch (e) { /* audio is optional */ }
  };
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('button') && G.get()) UI.sfx('click'); }, true);

  /* ---------------- particles ---------------- */
  UI.burst = function (canvas, color, count) {
    if (UI.fx() === 'low' || G.get().settings.skipAnim) return () => {};
    const w = (canvas.width = canvas.clientWidth), h = (canvas.height = canvas.clientHeight), c = canvas.getContext('2d');
    const ps = []; for (let i = 0; i < count; i++) { const a = Math.random() * 6.283, s = 2 + Math.random() * 7; ps.push({ x: w / 2, y: h / 2, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, r: 2 + Math.random() * 3, l: 1 }); }
    let raf = 0, alive = true;
    (function step() {
      if (!alive) return;
      c.clearRect(0, 0, w, h); let any = false;
      ps.forEach((p) => { p.x += p.vx; p.y += p.vy; p.vy += 0.16; p.vx *= 0.99; p.l -= 0.011; if (p.l > 0) { any = true; c.globalAlpha = Math.max(0, p.l); c.fillStyle = color; c.fillRect(p.x, p.y, p.r, p.r); } });
      if (any) raf = requestAnimationFrame(step); else c.clearRect(0, 0, w, h);
    })();
    return () => { alive = false; cancelAnimationFrame(raf); c.clearRect(0, 0, w, h); };
  };

  /* ---------------- settings classes ---------------- */
  UI.applySettings = function () {
    const s = G.get().settings, b = document.body;
    b.classList.toggle('fx-low', s.fx === 'low'); b.classList.toggle('fx-high', s.fx !== 'low'); b.classList.toggle('no-anim', !!s.skipAnim);
  };

  /* ---------------- components ---------------- */
  UI.catLabel = (it) => (D.CATEGORIES[it.cat] || {}).label || it.cat;
  UI.cur = (c) => '<span class="cost' + (c === 'tokens' ? ' tok' : '') + '"><i></i></span>';
  UI.costHTML = (cost) => '<span class="cost' + (cost.cur === 'tokens' ? ' tok' : '') + '"><i></i>' + fmt(cost.amt) + (cost.cur === 'tokens' ? ' TOKENS' : ' CR') + '</span>';
  /* item card. o: {count, tag, tagUse, locked, sel, tagNew} */
  UI.icard = function (it, o) {
    o = o || {};
    const r = D.RARITIES[it.rar];
    const b = el('button', { class: 'icard r-' + r.id + (o.locked ? ' locked' : '') + (o.sel ? ' sel' : ''), type: 'button', style: '--rc:' + r.color, title: o.locked ? 'Not found yet' : it.name });
    b.innerHTML = '<div class="th">' + UI.thumb(it) + '</div>' +
      (o.count > 1 ? '<span class="cnt">×' + o.count + '</span>' : '') +
      (o.tag ? '<span class="tag' + (o.tagUse ? ' use' : '') + '">' + esc(o.tag) + '</span>' : '') +
      '<div class="meta"><div class="nm">' + (o.locked ? '???' : esc(it.name)) + '</div><div class="sub">' + r.name + ' · ' + UI.catLabel(it) + '</div></div>';
    return b;
  };
  UI.rarPill = (it) => '<span class="pill" style="--rc:' + D.RARITIES[it.rar].color + '">' + D.RARITIES[it.rar].name + '</span>';
  UI.oddsHTML = function (cn) {
    return '<div class="odds">' + cn.table.map((p, i) => {
      const r = D.RARITIES[i];
      return '<div class="o' + (p ? '' : ' zero') + '" style="--rc:' + r.color + '"><b>' + r.name + '</b><div class="bar"><span style="width:' + (p / 10) + '%"></span></div><em>' + (p / 10).toFixed(1) + '%</em></div>';
    }).join('') + '</div>';
  };
  UI.iconSVG = {
    garage: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 10l9-6 9 6v10H3z"/><path d="M7 20v-6h10v6M7 17h10"/></svg>',
    open: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 9h18v11H3zM3 9l2-5h14l2 5M12 9v11M9 14h6"/></svg>',
    inv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/></svg>',
    col: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>',
    store: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 4h3l2.5 11h10L21 7H7"/><circle cx="9" cy="19.5" r="1.5"/><circle cx="18" cy="19.5" r="1.5"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>',
  };

  /* ---------------- item details modal ---------------- */
  UI.itemModal = function (id, opts) {
    opts = opts || {};
    const it = D.ITEM[id], r = D.RARITIES[it.rar], st = G.get();
    const have = G.owned(id), use = G.usage(id);
    const kv = [['Rarity', r.name], ['Type', UI.catLabel(it) + (it.slot && it.cat !== 'car' ? ' · ' + D.SLOTS[it.slot].label : '')], ['Value', fmt(it.value) + ' CR'], ['Sell price', it.canSell ? fmt(it.sell) + ' CR' : '—'], ['Dismantle', it.canSell ? it.frag + ' fragments' : '—'], ['Owned', String(have)]];
    if (use.length) kv.push(['Installed on', use.map((u) => D.ITEM[u.carId].name).join(', ')]);
    const cont = (it.containers || []).map((c) => D.CONT[c].name).join(', ');
    kv.push(['Found in', it.excl ? 'Collection reward' : cont || '—']);
    if (it.cat !== 'car') kv.push(['Fits', it.compat && it.compat.cls ? it.compat.cls.join(', ') : it.compat && it.compat.cars ? it.compat.cars.length + ' cars' : 'All cars']);
    const body = el('div', { class: 'idet', style: '--rc:' + r.color });
    body.innerHTML = '<div class="pic">' + UI.thumb(it) + '</div><div style="display:grid;gap:10px;align-content:start"><div>' + UI.rarPill(it) + '</div><p class="note">' + esc(it.desc || '') + '</p><div class="kv">' + kv.map((k) => '<div><span>' + k[0] + '</span><b>' + esc(k[1]) + '</b></div>').join('') + '</div></div>';
    const foot = [{ label: 'Close', cls: 'ghost' }];
    if (have && opts.actions !== false) {
      if (it.canSell) {
        foot.unshift({ label: 'Dismantle', cls: 'ghost', keep: true, fn: (m) => { m.close(); UI.disposeModal(id, 'dismantle'); } });
        foot.unshift({ label: 'Sell', cls: 'ghost', keep: true, fn: (m) => { m.close(); UI.disposeModal(id, 'sell'); } });
      }
      if (it.cat === 'car') foot.unshift({ label: st.active === id ? 'Active car' : 'Set active', cls: st.active === id ? 'off' : '', keep: true, fn: (m) => { G.setActive(id); UI.toast('ACTIVE CAR', it.name); m.close(); } });
    }
    return UI.modal({ title: it.name, cls: 'mid', body: body, foot: foot });
  };

  /* sell / dismantle with quantity + confirmation flow */
  UI.disposeModal = function (id, kind) {
    const it = D.ITEM[id], have = G.owned(id);
    if (!have) return;
    const word = kind === 'sell' ? 'Sell' : 'Dismantle';
    const per = kind === 'sell' ? it.sell : it.frag, unit = kind === 'sell' ? ' CR' : ' FRAG';
    const maxQ = it.cat === 'car' ? have - 1 : have;
    if (maxQ < 1) { UI.toast('CANNOT ' + word.toUpperCase(), 'You need to keep at least one car.', 'warn'); return; }
    const body = el('div');
    body.innerHTML = '<p>' + word + ' <b>' + esc(it.name) + '</b> — you have ' + have + '.</p><div class="frow"><label class="lbl" for="dq">Quantity</label><input id="dq" class="field num" type="number" min="1" max="' + maxQ + '" value="1" style="width:90px"><button class="btn sm ghost" type="button" data-all>All</button></div><p class="note" id="dnote"></p><p class="warn" id="dwarn"></p>';
    const q = body.querySelector('#dq'), note = body.querySelector('#dnote');
    const getQ = () => Math.max(1, Math.min(maxQ, Math.floor(Number(q.value) || 1)));
    const upd = () => { const n = getQ(); note.textContent = 'You get ' + fmt(per * n) + unit; };
    q.addEventListener('input', upd); body.querySelector('[data-all]').addEventListener('click', () => { q.value = maxQ; upd(); }); upd();
    UI.modal({ title: word + ' item', body: body, foot: [{ label: 'Cancel', cls: 'ghost' }, { label: word, cls: 'danger', keep: true, fn: (m) => {
      const n = getQ(); q.value = n;
      const fnc = kind === 'sell' ? G.sell : G.dismantle;
      let r = fnc(id, n);
      if (r.need === 'confirm') {
        const parts = [];
        if (r.unequip) parts.push('It will be removed from: ' + r.cars.map(esc).join(', ') + '.');
        if (r.last) parts.push('This is your last copy — it will leave your collection inventory (the collection progress stays).');
        m.close();
        UI.confirm(word + ' ' + esc(it.name) + '?', parts.join(' '), word, true).then((ok) => {
          if (!ok) return;
          const r2 = fnc(id, n, { confirmed: true });
          if (r2.ok) { UI.sfx('buy'); UI.toast(kind === 'sell' ? 'SOLD' : 'DISMANTLED', r2.qty + '× ' + it.name + ' → ' + fmt(r2.gain) + unit.replace(' FRAG', ' fragments'), 'gold'); }
          else UI.toast('FAILED', 'Could not ' + word.toLowerCase() + '.', 'bad');
        });
        return false;
      }
      if (r.ok) { m.close(); UI.sfx('buy'); UI.toast(kind === 'sell' ? 'SOLD' : 'DISMANTLED', r.qty + '× ' + it.name + ' → ' + fmt(r.gain) + unit.replace(' FRAG', ' fragments'), 'gold'); return; }
      UI.toast('FAILED', r.reason === 'lastcar' ? 'Keep at least one copy of the car.' : 'Could not ' + word.toLowerCase() + '.', 'bad');
    } }] });
  };

  /* ---------------- notes from commit (collection / achievement / level / items) ---------------- */
  bus.on('notes', (notes) => {
    notes.forEach((n) => {
      if (n.t === 'ach') { const a = D.ACHIEVEMENTS.find((x) => x.id === n.id); UI.toast('ACHIEVEMENT', a.name + ' — ' + G.rewardText(a.reward), 'gold'); UI.sfx('ok'); }
      else if (n.t === 'level') { UI.toast('LEVEL ' + n.level, 'Reward: ' + fmt(D.XP.levelCredits(n.level)) + ' CR' + (n.level % D.XP.levelTokenEvery === 0 ? ' + 1 TOKEN' : ''), 'gold'); }
      else if (n.t === 'col') {
        const c = D.COL[n.id];
        setTimeout(() => UI.modal({ title: 'Collection complete', body: '<p class="disp" style="font-size:34px;color:var(--accent)">' + esc(c.name) + '</p><p>You found every item. Reward: <b>' + esc(G.rewardText(c.reward)) + '</b>.</p>', foot: [{ label: 'Nice' }] }), 900);
      }
    });
  });
  bus.on('saveerror', (e) => UI.toast('SAVE FAILED', 'Progress is kept in memory only. Export your save from Settings. ' + (e || ''), 'bad'));
  bus.on('settings', UI.applySettings);
})();
