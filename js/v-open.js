/* STREET VAULT — v-open.js : container list, detail, opening animation. */
(function () {
  'use strict';
  const SV = (window.SV = window.SV || {});
  const U = SV.util, D = SV.data, G = SV.game, A = SV.art, UI = SV.ui;
  const { esc, fmt } = U, h = UI.h;
  const V = (SV.views = SV.views || {});
  let sel = null;

  const sampleFor = (cn) => {
    const out = [];
    for (let r = D.RARITIES.length - 1; r >= 0 && out.length < 6; r--) {
      const pool = D.POOL[cn.id][r];
      if (cn.table[r] > 0 && pool && pool.length) out.push(pool[(U.hash(cn.id + r)) % pool.length]);
    }
    return out;
  };

  function buy(cid, qty) {
    const r = G.buyBox(cid, qty);
    if (r.ok) { UI.sfx('buy'); UI.toast('PURCHASED', qty + '× ' + D.CONT[cid].name + ' — ' + fmt(r.total) + (D.CONT[cid].cost.cur === 'tokens' ? ' tokens' : ' CR'), 'gold'); }
    else if (r.reason === 'funds') { UI.sfx('bad'); UI.toast('NOT ENOUGH ' + (r.cur === 'tokens' ? 'TOKENS' : 'CREDITS'), 'You need ' + fmt(r.need) + ' more.', 'warn'); }
    else UI.toast('FAILED', 'Purchase failed.', 'bad');
    return r;
  }
  V.buyBox = buy;
  V.openOddsModal = (cid) => { const cn = D.CONT[cid]; UI.modal({ title: cn.name + ' odds', body: UI.oddsHTML(cn) + '<p class="note">Each open rolls one item. Chances are exact and add up to 100%.</p>', foot: [{ label: 'Close' }] }); };

  V.open = {
    title: 'OPEN',
    go: (cid) => { sel = cid; },
    reset: () => { sel = null; },
    render: function (root) {
      const wrap = h('div', { class: 'view' });
      root.appendChild(wrap);
      if (sel && D.CONT[sel]) return detail(wrap, D.CONT[sel]);
      wrap.innerHTML = '<div class="vhead"><div><h1>Open</h1><p>Pick a container. Chances are shown before you open anything.</p></div></div><div class="crates" id="cr"></div>';
      const g = wrap.querySelector('#cr');
      D.CONTAINERS.forEach((cn) => {
        const n = G.boxCount(cn.id);
        const b = h('button', { class: 'ccard', type: 'button', style: '--a:' + cn.pal.a });
        b.innerHTML = (n ? '<span class="own">×' + n + ' OWNED</span>' : '') + '<div class="art">' + A.crate(cn.id) + '</div><div class="nm">' + esc(cn.name) + '</div><div class="rbar">' +
          cn.table.map((p, i) => p ? '<span style="--rc:' + D.RARITIES[i].color + ';flex:' + p + '"></span>' : '').join('') + '</div><div class="row">' + UI.costHTML(cn.cost) + '<span class="lbl">' + (n ? 'Ready to open' : 'View') + '</span></div>';
        b.addEventListener('click', () => { sel = cn.id; V.refresh(); });
        g.appendChild(b);
      });
    },
  };

  function detail(wrap, cn) {
    const n = G.boxCount(cn.id), S = G.get();
    wrap.innerHTML = '<div class="vhead"><div><h1>' + esc(cn.name) + '</h1><p>' + esc(cn.desc || '') + '</p></div><button class="btn ghost" id="back" type="button">← Back</button></div>' +
      '<div class="cdetail" style="--a:' + cn.pal.a + '"><div class="big">' + A.crate(cn.id) + '</div><div style="display:grid;gap:14px">' +
      '<div class="panel pad"><div class="sect" style="margin-top:0"><h2>Drop chances</h2></div>' + UI.oddsHTML(cn) + '</div>' +
      '<div class="panel pad"><div class="sect" style="margin-top:0"><h2>Possible drops</h2></div><div class="sample" id="smp"></div></div>' +
      '<div class="panel pad" style="display:grid;gap:10px"><div class="frow"><span class="lbl">Price</span>' + UI.costHTML(cn.cost) + '<span class="sum">Owned: <b class="num">' + n + '</b></span></div><div class="btns">' +
      '<button class="btn" id="bopen" type="button"' + (n ? '' : ' disabled') + '>Open (' + n + ')</button>' +
      D.ECON.buyQuantities.map((q) => '<button class="btn ghost" data-buy="' + q + '" type="button">Buy ×' + q + '</button>').join('') + '</div>' +
      '<p class="note">Buying a container does not open it. Contents are decided only when you press Open.</p></div></div></div>';
    wrap.querySelector('#back').addEventListener('click', () => { sel = null; V.refresh(); });
    const smp = wrap.querySelector('#smp');
    sampleFor(cn).forEach((it) => { const k = UI.icard(it, {}); k.addEventListener('click', () => UI.itemModal(it.id, { actions: false })); smp.appendChild(k); });
    wrap.querySelectorAll('[data-buy]').forEach((b) => b.addEventListener('click', () => buy(cn.id, Number(b.dataset.buy))));
    wrap.querySelector('#bopen').addEventListener('click', () => V.openBox(cn.id));
  }

  /* ================================================================ opening animation */
  let skipFn = null;
  V.openBox = async function (cid) {
    if (G.isOpening()) return;
    const cn = D.CONT[cid];
    const res = G.openBox(cid);
    if (!res.ok) { if (res.reason === 'nobox') UI.toast('NO CONTAINER', 'Buy one in the Store or here.', 'warn'); return; }
    const it = res.item, r = D.RARITIES[it.rar], S = G.get();
    const fxEl = document.getElementById('openfx');
    fxEl.className = 'on';
    fxEl.innerHTML = '';
    const o = h('div', { class: 'ofx' + (it.rar >= 5 ? ' big' : ''), style: '--rc:' + cn.pal.a });
    o.innerHTML = '<canvas></canvas><div class="rays"></div><div class="ring"></div><div class="flash"></div><button class="btn sm ghost skip" type="button">Skip</button><div class="stagebox"><div class="crate">' + A.crate(cid) + '</div><div class="lbl pulse" id="otxt">Opening…</div></div>';
    fxEl.appendChild(o);
    const skipBtn = o.querySelector('.skip');
    let stopBurst = () => {}, skipped = false, finished = false, wake = null;
    const wait = (ms) => new Promise((rs) => { const t = setTimeout(rs, ms); wake = () => { clearTimeout(t); rs(); }; });
    skipFn = () => { skipped = true; if (wake) wake(); };
    skipBtn.addEventListener('click', () => skipFn());
    const instant = S.settings.skipAnim;
    skipBtn.style.display = instant ? 'none' : '';
    if (!instant) {
      UI.sfx('shake'); o.classList.add('shake');
      await wait(700 + it.rar * 160);
      if (!skipped) { o.classList.add('open'); o.classList.add('shk'); await wait(450 + it.rar * 90); }
      if (!skipped && it.rar >= 3) { o.querySelector('#otxt').textContent = r.name + '…'; o.style.setProperty('--rc', r.color); await wait(300 + it.rar * 120); }
    }
    finished = true; skipBtn.remove();
    o.classList.remove('shake', 'shk'); o.style.setProperty('--rc', r.color);
    o.classList.add('flashing', 'reveal');
    UI.sfx('reveal', it.rar);
    stopBurst = UI.burst(o.querySelector('canvas'), r.color, 20 + it.rar * 26);
    o.querySelector('.stagebox').remove();
    const boxes = G.boxCount(cid);
    const res2 = h('div', { class: 'stagebox' });
    res2.innerHTML = '<div class="result"><div class="rar">' + r.name + '</div><div class="rcard"><div class="pic">' + UI.thumb(it) + '</div><div class="nfo"><b>' + esc(it.name) + '</b><div class="frow">' + (res.isNew ? '<span class="pill new">NEW</span>' : '<span class="pill plain">DUPLICATE ×' + res.copies + '</span>') + '<span class="pill plain">' + UI.catLabel(it) + '</span><span class="note">Value ' + fmt(it.value) + ' CR</span></div></div></div>' +
      '<div class="acts"><button class="btn sm ghost" data-a="det" type="button">Details</button>' + (it.cat === 'car' || it.canEquip ? '<button class="btn sm ghost" data-a="gar" type="button">To garage</button>' : '') + '<button class="btn sm ghost" data-a="col" type="button">Collections</button>' +
      (boxes ? '<button class="btn sm" data-a="again" type="button">Open another (' + boxes + ')</button>' : '') + '<button class="btn sm ghost" data-a="close" type="button" autofocus>Close</button></div></div>';
    o.appendChild(res2);
    G.endOpen();
    const end = () => { stopBurst(); fxEl.className = ''; fxEl.innerHTML = ''; skipFn = null; };
    res2.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => {
      const a = b.dataset.a; end();
      if (a === 'det') UI.itemModal(it.id);
      else if (a === 'gar') SV.main.go('garage');
      else if (a === 'col') SV.main.go('collections');
      else if (a === 'again') V.openBox(cid);
    }));
    const cb = res2.querySelector('[data-a=close]'); if (cb) cb.focus();
  };
})();
