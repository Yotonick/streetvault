/* STREET VAULT — v-inventory.js : inventory + collections. */
(function () {
  'use strict';
  const SV = (window.SV = window.SV || {});
  const U = SV.util, D = SV.data, G = SV.game, UI = SV.ui;
  const { esc, fmt } = U, h = UI.h;
  const V = (SV.views = SV.views || {});
  const F = { q: '', cat: 'all', rar: 'all', sort: 'rar', dupes: false };

  const SORTS = { rar: 'Rarity', name: 'Name', value: 'Value', count: 'Copies', cat: 'Category', recent: 'Newest' };
  function sorter(S) {
    return {
      rar: (a, b) => b.rar - a.rar || a.name.localeCompare(b.name),
      name: (a, b) => a.name.localeCompare(b.name),
      value: (a, b) => b.value - a.value || a.name.localeCompare(b.name),
      count: (a, b) => G.owned(b.id) - G.owned(a.id) || b.rar - a.rar,
      cat: (a, b) => a.cat.localeCompare(b.cat) || b.rar - a.rar,
      recent: (a, b) => (S.found[b.id] || 0) - (S.found[a.id] || 0),
    }[F.sort];
  }

  V.inventory = {
    title: 'INVENTORY',
    render: function (root) {
      const S = G.get();
      const all = D.ITEMS.filter((i) => G.owned(i.id) > 0);
      const wrap = h('div', { class: 'view' });
      wrap.innerHTML = '<div class="vhead"><div><h1>Inventory</h1><p>Everything you own. Sell extras for credits or dismantle them into fragments.</p></div></div>' +
        '<div class="filters"><div class="frow"><input class="field search" id="q" type="search" placeholder="Search by name…" aria-label="Search" value="' + esc(F.q) + '">' +
        '<select class="field" id="srt" aria-label="Sort">' + Object.keys(SORTS).map((k) => '<option value="' + k + '"' + (F.sort === k ? ' selected' : '') + '>Sort: ' + SORTS[k] + '</option>').join('') + '</select>' +
        '<button class="fchip' + (F.dupes ? ' on' : '') + '" id="dup" type="button">Duplicates only</button></div>' +
        '<div class="frow" id="fc"></div><div class="frow" id="fr"></div></div><div class="frow" style="margin-bottom:10px"><span class="sum" id="sum" style="margin-left:0"></span><span style="margin-left:auto" class="btns"><button class="btn sm ghost" id="sdup" type="button">Sell all duplicates</button></span></div><div class="igrid" id="grid"></div>';
      root.appendChild(wrap);
      const $ = (s) => wrap.querySelector(s);
      const cats = [['all', 'All']].concat(Object.keys(D.CATEGORIES).map((k) => [k, D.CATEGORIES[k].label]));
      cats.forEach((c) => { const b = h('button', { type: 'button', class: 'fchip' + (F.cat === c[0] ? ' on' : '') }, c[1]); b.addEventListener('click', () => { F.cat = c[0]; V.refresh(); }); $('#fc').appendChild(b); });
      [['all', 'Any rarity']].concat(D.RARITIES.map((r) => [r.id, r.name])).forEach((c) => {
        const col = c[0] === 'all' ? '' : 'style="--rc:' + D.RAR[c[0]].color + '"';
        const b = h('button', { type: 'button', class: 'fchip r' + (F.rar === c[0] ? ' on' : ''), style: c[0] === 'all' ? '' : '--rc:' + D.RAR[c[0]].color }, c[1]);
        b.addEventListener('click', () => { F.rar = c[0]; V.refresh(); }); $('#fr').appendChild(b);
      });
      const q = $('#q');
      q.addEventListener('input', () => { F.q = q.value; drawGrid(); });
      $('#srt').addEventListener('change', (e) => { F.sort = e.target.value; V.refresh(); });
      $('#dup').addEventListener('click', () => { F.dupes = !F.dupes; V.refresh(); });
      $('#sdup').addEventListener('click', sellDupes);

      function list() {
        const t = F.q.trim().toLowerCase();
        return all.filter((i) => (F.cat === 'all' || i.cat === F.cat) && (F.rar === 'all' || i.rid === F.rar) && (!t || i.name.toLowerCase().indexOf(t) >= 0) && (!F.dupes || G.dupes(i.id) > 0)).sort(sorter(S));
      }
      function drawGrid() {
        const g = $('#grid'); g.innerHTML = '';
        const l = list();
        $('#sum').textContent = l.length + ' of ' + all.length + ' item types · ' + all.reduce((n, i) => n + G.owned(i.id), 0) + ' total';
        if (!l.length) {
          g.style.display = 'block';
          g.innerHTML = all.length ? '<div class="empty"><b>Nothing matches</b>Change the filters or the search text.</div>' : '<div class="empty"><b>Inventory empty</b>Open a container to get items.</div>';
          return;
        }
        g.style.display = '';
        l.forEach((it) => {
          const use = G.usage(it.id).length;
          const k = UI.icard(it, { count: G.owned(it.id), tag: use ? 'INSTALLED' : (S.active === it.id ? 'ACTIVE' : ''), tagUse: !!use });
          k.addEventListener('click', () => UI.itemModal(it.id));
          g.appendChild(k);
        });
      }
      drawGrid();
    },
  };

  function sellDupes() {
    const S = G.get();
    const list = D.ITEMS.filter((i) => i.canSell && G.dupes(i.id) > 0);
    const total = list.reduce((n, i) => n + G.dupes(i.id) * i.sell, 0), count = list.reduce((n, i) => n + G.dupes(i.id), 0);
    if (!count) { UI.toast('NO DUPLICATES', 'You have no spare copies (installed parts are kept).', 'warn'); return; }
    UI.confirm('Sell all duplicates?', 'Sell <b>' + count + '</b> spare copies for <b>' + fmt(total) + ' CR</b>. One copy of each item and all installed parts stay.', 'Sell', true).then((ok) => {
      if (!ok) return;
      let gain = 0, n = 0;
      list.forEach((i) => { const q = G.dupes(i.id); if (q > 0) { const r = G.sell(i.id, q); if (r.ok) { gain += r.gain; n += r.qty; } } });
      UI.sfx('buy'); UI.toast('SOLD', n + ' duplicates → ' + fmt(gain) + ' CR', 'gold');
    });
  }

  /* ================================================================ collections */
  let colSel = null;
  V.collections = {
    title: 'COLLECTIONS',
    render: function (root) {
      const S = G.get(), wrap = h('div', { class: 'view' });
      root.appendChild(wrap);
      if (colSel) return detail(wrap, colSel);
      wrap.innerHTML = '<div class="vhead"><div><h1>Collections</h1><p>Find every item of a set to claim a one-time reward.</p></div></div><div class="colgrid" id="cg"></div>';
      D.COLLECTIONS.forEach((c) => {
        const info = G.collectionInfo(c.id);
        const b = h('button', { class: 'colcard', type: 'button' });
        const prev = info.items.slice().sort((a, b) => b.rar - a.rar).slice(0, 4);
        b.innerHTML = '<div class="frow" style="justify-content:space-between"><span class="disp" style="font-size:26px">' + esc(c.name) + '</span>' + (info.done ? '<span class="pill new">COMPLETE</span>' : '<span class="num lbl">' + info.have + '/' + info.total + '</span>') + '</div>' +
          '<div class="imgs">' + prev.map((i) => '<div class="' + (S.found[i.id] ? '' : 'lk') + '">' + UI.thumb(i) + '</div>').join('') + '</div>' +
          '<div class="prog' + (info.done ? ' done' : '') + '"><span style="width:' + info.pct + '%"></span></div><div class="rew"><span>Reward</span><b>' + esc(G.rewardText(c.reward)) + '</b></div>';
        b.addEventListener('click', () => { colSel = c.id; V.refresh(); });
        wrap.querySelector('#cg').appendChild(b);
      });
    },
  };
  function detail(wrap, id) {
    const S = G.get(), info = G.collectionInfo(id), c = info.col;
    wrap.innerHTML = '<div class="vhead"><div><h1>' + esc(c.name) + '</h1><p>' + esc(c.desc) + '</p></div><button class="btn ghost" id="back" type="button">← Back</button></div>' +
      '<div class="panel pad" style="margin-bottom:14px;display:grid;gap:8px"><div class="frow"><b class="num">' + info.have + ' / ' + info.total + ' found</b><span class="sum">' + (info.done ? 'Reward claimed' : 'Reward: ' + esc(G.rewardText(c.reward))) + '</span></div><div class="prog' + (info.done ? ' done' : '') + '"><span style="width:' + info.pct + '%"></span></div></div><div class="igrid" id="g"></div>';
    wrap.querySelector('#back').addEventListener('click', () => { colSel = null; V.refresh(); });
    const g = wrap.querySelector('#g');
    info.items.slice().sort((a, b) => b.rar - a.rar || a.name.localeCompare(b.name)).forEach((it) => {
      const f = !!S.found[it.id];
      const k = UI.icard(it, { locked: !f, count: G.owned(it.id), tag: f && !G.owned(it.id) ? 'FOUND' : '' });
      k.addEventListener('click', () => { if (f) UI.itemModal(it.id); else UI.toast('NOT FOUND YET', 'Look in: ' + ((it.containers || []).map((x) => D.CONT[x].name).join(', ') || '—'), 'warn'); });
      g.appendChild(k);
    });
    const rw = D.ITEM[c.reward.item];
    if (rw) { const n = h('p', { class: 'note', style: 'margin-top:12px' }); n.innerHTML = 'Exclusive reward item: <b>' + esc(rw.name) + '</b> (' + D.RARITIES[rw.rar].name + ').'; wrap.appendChild(n); }
  }
  V.collections.reset = () => { colSel = null; };
})();
