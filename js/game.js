/* STREET VAULT — game.js : all game rules. No DOM access here.
   Every state change goes through commit(): it works on the live state, rolls back on any exception,
   runs progress checks (collections, achievements, level) and saves once. */
(function () {
  'use strict';
  const SV = (window.SV = window.SV || {});
  const U = SV.util, D = SV.data, Store = SV.store, bus = SV.bus;
  const G = (SV.game = {});
  let S = null;
  let saveBlocked = false;           // true while a corrupt save awaits a decision
  G.get = () => S;
  G.recovery = null;                 // { backup, issues } when load found a corrupt save

  /* ================================================================ helpers */
  const owned = (st, id) => st.inv[id] || 0;
  G.owned = (id) => owned(S, id);
  function usageList(st, id, exceptCar) {
    const out = [];
    Object.keys(st.builds).forEach((cid) => {
      if (cid === exceptCar) return;
      D.SLOT_KEYS.forEach((slot) => { if (st.builds[cid][slot] === id) out.push({ carId: cid, slot: slot }); });
    });
    return out;
  }
  G.usage = (id, exceptCar) => usageList(S, id, exceptCar);
  G.freeCount = (id) => owned(S, id) - usageList(S, id).length;
  G.activeBuild = (carId) => S.builds[carId || S.active] || Store.emptyBuild();
  G.todayKey = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

  G.levelInfo = function (xp) {
    let lvl = 1, rem = xp;
    while (lvl < D.XP.maxLevel && rem >= D.XP.perLevel(lvl)) { rem -= D.XP.perLevel(lvl); lvl++; }
    return { level: lvl, into: rem, need: lvl >= D.XP.maxLevel ? 0 : D.XP.perLevel(lvl) };
  };

  /* progress counters shared by quests and achievements */
  function metric(st, key) {
    switch (key) {
      case 'carsOwned': return D.CARS.filter((c) => owned(st, c.id) > 0).length;
      case 'jdmCars': return D.CARS.filter((c) => owned(st, c.id) > 0 && c.th.indexOf('jdm') >= 0).length;
      case 'found': return Object.keys(st.found).length;
      case 'colDone': return Object.keys(st.col).length;
      case 'colBest': return Math.max.apply(null, D.COLLECTIONS.map((c) => Math.floor((100 * c.items.filter((i) => st.found[i]).length) / c.items.length)));
      case 'level': return st.level;
      default: return st.stats[key] || 0;
    }
  }
  G.metric = (key) => metric(S, key);

  function bump(st, key, n) { st.stats[key] = (st.stats[key] || 0) + (n == null ? 1 : n); }

  /* ================================================================ rewards */
  function addXp(st, n) { if (n > 0) st.xp += n; }
  function grantItem(st, id, n, notes, src) {
    const it = D.ITEM[id];
    const isNew = !st.found[id];
    st.inv[id] = Math.min(9999, owned(st, id) + (n || 1));
    if (isNew) st.found[id] = Date.now();
    if (it.cat === 'car' && !st.builds[id]) st.builds[id] = Store.emptyBuild();
    return isNew;
  }
  function give(st, r, notes) {
    if (r.credits) st.cur.credits += r.credits;
    if (r.tokens) st.cur.tokens += r.tokens;
    if (r.fragments) st.cur.fragments += r.fragments;
    if (r.xp) addXp(st, r.xp);
    if (r.item) { grantItem(st, r.item, 1, notes, 'reward'); if (notes) notes.push({ t: 'item', id: r.item }); }
  }
  G.rewardText = function (r) {
    const p = [];
    if (r.credits) p.push(U.fmt(r.credits) + ' CR');
    if (r.tokens) p.push(r.tokens + ' TOKEN' + (r.tokens > 1 ? 'S' : ''));
    if (r.fragments) p.push(r.fragments + ' FRAG');
    if (r.xp) p.push(r.xp + ' XP');
    if (r.item) p.push(D.ITEM[r.item].name);
    return p.join(' · ');
  };

  /* Checks everything that depends on state after any action. Loops because rewards can trigger more rewards. */
  function afterAction(st, notes) {
    for (let guard = 0; guard < 6; guard++) {
      let changed = false;
      D.COLLECTIONS.forEach((col) => {
        if (st.col[col.id]) return;
        if (col.items.every((i) => st.found[i])) {
          st.col[col.id] = Date.now(); changed = true;
          give(st, col.reward, notes);
          notes.push({ t: 'col', id: col.id });
        }
      });
      D.ACHIEVEMENTS.forEach((a) => {
        if (st.ach[a.id]) return;
        if (metric(st, a.key) >= a.target) { st.ach[a.id] = Date.now(); changed = true; give(st, a.reward, notes); notes.push({ t: 'ach', id: a.id }); }
      });
      const li = G.levelInfo(st.xp);
      if (li.level > st.level) {
        for (let l = st.level + 1; l <= li.level; l++) {
          st.cur.credits += D.XP.levelCredits(l);
          if (l % D.XP.levelTokenEvery === 0) st.cur.tokens += 1;
          notes.push({ t: 'level', level: l });
        }
        st.level = li.level; changed = true;
      }
      if (!changed) break;
    }
  }

  /* ================================================================ daily */
  function ensureDaily(st) {
    const today = G.todayKey();
    if (st.daily.date === today && st.daily.ids.length === 3) return false;
    const rng = U.mulberry(U.hash('sv-daily-' + today));
    const pool = D.DAILY.slice(), ids = [];
    while (ids.length < 3 && pool.length) ids.push(pool.splice(Math.floor(rng() * pool.length), 1)[0].id);
    const base = {};
    D.DAILY_COUNTERS.forEach((k) => { base[k] = st.stats[k] || 0; });
    st.daily = { date: today, ids: ids, base: base, claimed: {} };
    return true;
  }
  G.dailyList = function () {
    return S.daily.ids.map((id) => {
      const q = D.DAILY.find((x) => x.id === id);
      const p = Math.min(q.target, metric(S, q.key) - (S.daily.base[q.key] || 0));
      return { q: q, progress: Math.max(0, p), done: p >= q.target, claimed: !!S.daily.claimed[id] };
    });
  };
  G.careerList = function () {
    return D.CAREER.map((q) => {
      const p = Math.min(q.target, metric(S, q.key));
      return { q: q, progress: p, done: p >= q.target, claimed: !!S.quests[q.id] };
    });
  };
  G.achievementList = function () {
    return D.ACHIEVEMENTS.map((a) => ({ a: a, progress: Math.min(a.target, metric(S, a.key)), done: !!S.ach[a.id], at: S.ach[a.id] || 0 }));
  };
  G.claimable = function () {
    return G.dailyList().filter((x) => x.done && !x.claimed).length + G.careerList().filter((x) => x.done && !x.claimed).length;
  };

  /* ================================================================ commit */
  function persist() {
    if (saveBlocked) return;
    const r = Store.save(S);
    if (!r.ok) bus.emit('saveerror', r.error);
  }
  /* fn(st, notes) mutates st and returns a result object. Returning {ok:false} means "nothing changed". */
  G.commit = function (fn) {
    const backup = JSON.stringify(S);
    const notes = [];
    try {
      ensureDaily(S);
      const res = fn(S, notes);
      if (res && res.ok === false) { return res; }
      afterAction(S, notes);
      persist();
      bus.emit('change', res);
      if (notes.length) bus.emit('notes', notes);
      return res || { ok: true };
    } catch (e) {
      console.error('[commit] rolled back', e);
      S = JSON.parse(backup);
      bus.emit('change', null);
      bus.emit('toast', { type: 'bad', text: 'Something went wrong. Your last action was undone.' });
      return { ok: false, reason: 'error' };
    }
  };

  /* ================================================================ init / reset / import / export */
  G.init = function () {
    const r = Store.load();
    S = r.state;
    if (r.status === 'corrupt') { saveBlocked = true; G.recovery = { backup: r.backup, backupText: r.backupText, issues: r.issues }; }
    ensureDaily(S);
    if (!saveBlocked) { const notes = []; afterAction(S, notes); persist(); }
    return { status: r.status, issues: r.issues };
  };
  G.recoverFromBackup = function () {
    if (!G.recovery || !G.recovery.backup) return false;
    S = G.recovery.backup; G.recovery = null; saveBlocked = false; persist(); bus.emit('change'); return true;
  };
  G.startFresh = function () { Store.wipe(); S = Store.fresh(); G.recovery = null; saveBlocked = false; ensureDaily(S); persist(); bus.emit('change'); };
  G.reset = G.startFresh;
  G.exportJSON = () => Store.envelope(S);
  G.importJSON = function (text) {
    const r = Store.importText(text);
    if (!r.ok) return r;
    S = r.state; G.recovery = null; saveBlocked = false; ensureDaily(S);
    const notes = []; afterAction(S, notes); persist(); bus.emit('change');
    return { ok: true, issues: r.issues };
  };
  G.setSetting = function (k, v) {
    if (!(k in D.SETTINGS_DEFAULT)) return;
    S.settings[k] = v; persist(); bus.emit('settings');
  };
  G.saveBlocked = () => saveBlocked;

  /* ================================================================ containers */
  G.boxCount = (cid) => S.boxes[cid] || 0;
  G.canPay = (cost) => (cost.cur === 'tokens' ? S.cur.tokens : S.cur.credits) >= cost.amt;

  G.buyBox = function (cid, qty) {
    qty = Math.floor(qty);
    const cn = D.CONT[cid];
    if (!cn || !(qty >= 1 && qty <= 50)) return { ok: false, reason: 'invalid' };
    return G.commit((st) => {
      const total = cn.cost.amt * qty;
      const bal = cn.cost.cur === 'tokens' ? st.cur.tokens : st.cur.credits;
      if (bal < total) return { ok: false, reason: 'funds', need: total - bal, cur: cn.cost.cur };
      if (cn.cost.cur === 'tokens') st.cur.tokens -= total; else st.cur.credits -= total;
      st.boxes[cid] = (st.boxes[cid] || 0) + qty;
      bump(st, 'bought', qty);
      return { ok: true, qty: qty, total: total };
    });
  };

  /* probability roll. Uses the same table the UI displays (tenths of a percent). */
  G.roll = function (cid, rnd) {
    rnd = rnd || U.rand;
    const cn = D.CONT[cid];
    const r = Math.floor(rnd() * 1000);
    let acc = 0, ri = cn.table.length - 1;
    for (let i = 0; i < cn.table.length; i++) { acc += cn.table[i]; if (r < acc) { ri = i; break; } }
    let pool = D.POOL[cid][ri];
    while ((!pool || !pool.length) && ri > 0) { ri--; pool = D.POOL[cid][ri]; }   // safety only; validate() guarantees pools
    return pool[Math.floor(rnd() * pool.length)];
  };

  let openLock = false, lockTimer = 0;
  G.isOpening = () => openLock;
  G.endOpen = function () { openLock = false; clearTimeout(lockTimer); };
  G.openBox = function (cid) {
    if (openLock) return { ok: false, reason: 'busy' };
    if (!D.CONT[cid]) return { ok: false, reason: 'invalid' };
    openLock = true;
    clearTimeout(lockTimer);
    lockTimer = setTimeout(() => { openLock = false; }, 12000);     // never lock the UI forever
    const res = G.commit((st, notes) => {
      if ((st.boxes[cid] || 0) < 1) return { ok: false, reason: 'nobox' };
      st.boxes[cid] -= 1;
      if (!st.boxes[cid]) delete st.boxes[cid];
      const item = G.roll(cid);
      const had = owned(st, item.id);
      const isNew = grantItem(st, item.id, 1, notes, 'drop');
      bump(st, 'opened'); bump(st, 'itemsDrop');
      if (isNew) bump(st, 'newItems');
      if (item.cat === 'car') bump(st, 'carsDrop');
      if (item.rar >= 2) bump(st, 'rareFound');
      if (item.rar >= 4) bump(st, 'legendFound');
      if (item.rar >= 6) bump(st, 'secretFound');
      addXp(st, D.XP.open + (isNew ? D.XP.newItem : 0) + D.RARITIES[item.rar].xp);
      return { ok: true, item: item, isNew: isNew, copies: had + 1, cid: cid };
    });
    if (!res.ok) G.endOpen();
    return res;
  };

  /* ================================================================ garage */
  G.setActive = function (carId) {
    if (!owned(S, carId) || D.ITEM[carId].cat !== 'car') return { ok: false };
    return G.commit((st) => { st.active = carId; return { ok: true }; });
  };

  /* Preview of what applying a build would do. Never mutates. */
  G.planBuild = function (carId, nb) {
    const clean = Store.sanitizeBuild(carId, nb);
    const old = S.builds[carId] || Store.emptyBuild();
    const transfers = [], missing = [], changes = [];
    D.SLOT_KEYS.forEach((slot) => {
      const id = clean[slot];
      if (id) {
        const n = owned(S, id);
        const others = usageList(S, id, carId);
        if (n <= 0) { missing.push(id); clean[slot] = null; }
        else if (n - others.length <= 0) transfers.push({ id: id, from: others[0].carId, slot: others[0].slot });
      }
      if ((old[slot] || null) !== (clean[slot] || null)) changes.push({ slot: slot, from: old[slot] || null, to: clean[slot] || null });
    });
    if (old.wheelColor !== clean.wheelColor) changes.push({ slot: 'wheelColor', from: old.wheelColor, to: clean.wheelColor });
    if (old.plateText !== clean.plateText) changes.push({ slot: 'plateText', from: old.plateText, to: clean.plateText });
    return { build: clean, transfers: transfers, missing: missing, changes: changes };
  };

  G.applyBuild = function (carId, nb) {
    if (!owned(S, carId) || D.ITEM[carId].cat !== 'car') return { ok: false };
    return G.commit((st) => {
      /* re-plan against the live state inside the transaction */
      const live = G.planBuildOn(st, carId, nb);
      live.transfers.forEach((t) => { st.builds[t.from][t.slot] = null; });
      st.builds[carId] = live.build;
      live.changes.forEach((c) => {
        if (c.slot === 'wheelColor') bump(st, 'wheelsChanged');
        else if (c.slot === 'plateText') { /* cosmetic only */ }
        else {
          if (c.to) bump(st, 'partsInstalled');
          if (c.slot === 'wheels' && c.to) bump(st, 'wheelsChanged');
          if (c.slot === 'paint' && c.to) bump(st, 'paintChanged');
        }
      });
      if (live.changes.some((c) => c.slot === 'wheels' && !c.to)) { /* removed wheels: not counted */ }
      return { ok: true, plan: live };
    });
  };
  G.planBuildOn = function (st, carId, nb) {
    const prev = S; S = st;
    try { return G.planBuild(carId, nb); } finally { S = prev; }
  };

  /* Score & value of a car with its installed parts */
  G.buildScore = function (carId) {
    const car = D.ITEM[carId], b = S.builds[carId] || {};
    let s = D.RARITIES[car.rar].carScore;
    D.SLOT_KEYS.forEach((slot) => { if (b[slot]) s += D.RARITIES[D.ITEM[b[slot]].rar].score; });
    return s;
  };
  G.buildValue = function (carId) {
    const b = S.builds[carId] || {};
    let v = D.ITEM[carId].value;
    D.SLOT_KEYS.forEach((slot) => { if (b[slot]) v += D.ITEM[b[slot]].value; });
    return v;
  };

  /* ---------------- projects ---------------- */
  G.projectsFor = (carId) => S.projects.filter((p) => p.carId === carId);
  G.saveProject = function (carId, name) {
    name = String(name || '').replace(/[<>]/g, '').trim().slice(0, 24);
    if (!name) return { ok: false, reason: 'name' };
    if (!owned(S, carId)) return { ok: false, reason: 'car' };
    if (G.projectsFor(carId).length >= D.ECON.maxProjectsPerCar) return { ok: false, reason: 'limit' };
    return G.commit((st) => {
      const id = 'p' + Date.now().toString(36) + Math.floor(U.rand() * 1e6).toString(36);
      st.projects.push({ id: id, carId: carId, name: name, build: Store.sanitizeBuild(carId, st.builds[carId]), ts: Date.now() });
      bump(st, 'projectsSaved');
      return { ok: true, id: id, name: name };
    });
  };
  G.deleteProject = function (id) {
    if (!S.projects.some((p) => p.id === id)) return { ok: false };
    return G.commit((st) => { st.projects = st.projects.filter((p) => p.id !== id); return { ok: true }; });
  };
  G.renameProject = function (id, name) {
    name = String(name || '').replace(/[<>]/g, '').trim().slice(0, 24);
    if (!name) return { ok: false };
    return G.commit((st) => { const p = st.projects.find((x) => x.id === id); if (!p) return { ok: false }; p.name = name; return { ok: true }; });
  };

  /* ================================================================ selling / dismantling */
  /* Returns {ok:false,need:'confirm',...} when the action would touch an installed part or the last copy. */
  function disposeCheck(st, id, qty, opts) {
    const it = D.ITEM[id];
    if (!it || !it.canSell) return { ok: false, reason: 'invalid' };
    qty = Math.floor(qty);
    const have = owned(st, id);
    if (!(qty >= 1) || qty > have) return { ok: false, reason: 'qty' };
    if (it.cat === 'car' && have - qty < 1) return { ok: false, reason: 'lastcar' };
    const free = have - usageList(st, id).length;
    const unequip = Math.max(0, qty - free);
    const last = have - qty === 0;
    if ((unequip > 0 || last) && !(opts && opts.confirmed)) {
      const cars = usageList(st, id).slice(0, unequip).map((u) => D.ITEM[u.carId].name);
      return { ok: false, need: 'confirm', unequip: unequip, last: last, cars: cars };
    }
    return { ok: true, qty: qty, unequip: unequip };
  }
  G.checkDispose = (id, qty, opts) => disposeCheck(S, id, qty, opts);
  function removeCopies(st, id, qty, unequip) {
    if (unequip > 0) {
      const uses = usageList(st, id);
      for (let i = 0; i < unequip; i++) { const u = uses[uses.length - 1 - i]; if (u) st.builds[u.carId][u.slot] = null; }
    }
    st.inv[id] -= qty;
    if (st.inv[id] <= 0) delete st.inv[id];
  }
  G.sell = function (id, qty, opts) {
    const c = disposeCheck(S, id, qty, opts);
    if (!c.ok) return c;
    return G.commit((st) => {
      const it = D.ITEM[id];
      removeCopies(st, id, c.qty, c.unequip);
      const gain = it.sell * c.qty;
      st.cur.credits += gain;
      bump(st, 'sold', c.qty);
      return { ok: true, gain: gain, qty: c.qty, item: it };
    });
  };
  G.dismantle = function (id, qty, opts) {
    const c = disposeCheck(S, id, qty, opts);
    if (!c.ok) return c;
    return G.commit((st) => {
      const it = D.ITEM[id];
      removeCopies(st, id, c.qty, c.unequip);
      const gain = it.frag * c.qty;
      st.cur.fragments += gain;
      bump(st, 'dismantled', c.qty);
      return { ok: true, gain: gain, qty: c.qty, item: it };
    });
  };
  /* extra copies that can go without confirmation (keeps one, never installed ones) */
  G.dupes = function (id) { return Math.max(0, Math.min(owned(S, id) - 1, G.freeCount(id))); };

  /* ================================================================ forge */
  G.exchange = function (fxId) {
    const fx = D.ECON.exchange.find((x) => x.id === fxId);
    if (!fx) return { ok: false };
    return G.commit((st) => {
      if (st.cur.fragments < fx.give.fragments) return { ok: false, reason: 'funds' };
      st.cur.fragments -= fx.give.fragments;
      if (fx.get.credits) st.cur.credits += fx.get.credits;
      if (fx.get.tokens) st.cur.tokens += fx.get.tokens;
      return { ok: true, fx: fx };
    });
  };
  G.craftable = (it) => !it.excl && it.craft > 0 && !S.inv[it.id];
  G.craft = function (id) {
    const it = D.ITEM[id];
    if (!it || !G.craftable(it)) return { ok: false, reason: 'invalid' };
    return G.commit((st, notes) => {
      if (st.cur.fragments < it.craft) return { ok: false, reason: 'funds', need: it.craft - st.cur.fragments };
      if (owned(st, id)) return { ok: false, reason: 'owned' };
      st.cur.fragments -= it.craft;
      const isNew = grantItem(st, id, 1, notes, 'craft');
      bump(st, 'crafted');
      if (isNew) { bump(st, 'newItems'); addXp(st, D.XP.newItem); }
      return { ok: true, item: it, isNew: isNew };
    });
  };

  /* ================================================================ quests */
  G.claimQuest = function (kind, id) {
    return G.commit((st) => {
      if (kind === 'daily') {
        const q = D.DAILY.find((x) => x.id === id);
        if (!q || st.daily.ids.indexOf(id) < 0 || st.daily.claimed[id]) return { ok: false };
        if (metric(st, q.key) - (st.daily.base[q.key] || 0) < q.target) return { ok: false };
        st.daily.claimed[id] = Date.now(); give(st, q.reward); return { ok: true, reward: q.reward, title: q.title };
      }
      const q = D.CAREER.find((x) => x.id === id);
      if (!q || st.quests[id]) return { ok: false };
      if (metric(st, q.key) < q.target) return { ok: false };
      st.quests[id] = Date.now(); give(st, q.reward); return { ok: true, reward: q.reward, title: q.title };
    });
  };

  /* ================================================================ collections view model */
  G.collectionInfo = function (id) {
    const col = D.COL[id];
    const items = col.items.map((i) => D.ITEM[i]);
    const have = items.filter((i) => S.found[i.id]).length;
    return { col: col, items: items, have: have, total: items.length, pct: Math.floor((100 * have) / items.length), done: !!S.col[id] };
  };

  /* test hook (used by the automated checks only) */
  G._set = (st) => { S = st; };
})();
