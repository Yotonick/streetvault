/* STREET VAULT — store.js : save format, validation, migration, localStorage access.
   The save is an envelope { app, v, savedAt, state }. v is the structure version. */
(function () {
  'use strict';
  const SV = (window.SV = window.SV || {});
  const U = SV.util, D = SV.data;
  const Store = (SV.store = {});
  const KEY = D.SAVE_KEY, BAK = D.SAVE_KEY + '.bak';
  const MAXC = 1e9;

  /* ---- storage access (falls back to memory when blocked) ---- */
  let mem = {};
  Store.available = (function () {
    try { const k = '__sv_probe'; window.localStorage.setItem(k, '1'); window.localStorage.removeItem(k); return true; } catch (e) { return false; }
  })();
  const rd = (k) => { try { return Store.available ? window.localStorage.getItem(k) : mem[k] || null; } catch (e) { return mem[k] || null; } };
  const wr = (k, v) => { if (!Store.available) { mem[k] = v; return; } window.localStorage.setItem(k, v); };
  const rm = (k) => { try { if (Store.available) window.localStorage.removeItem(k); } catch (e) { /* ignore */ } delete mem[k]; };

  /* ---- fresh state ---- */
  Store.fresh = function () {
    const now = Date.now();
    const st = {
      created: now, updated: now,
      cur: { credits: D.ECON.startCredits, tokens: D.ECON.startTokens, fragments: 0 },
      xp: 0, level: 1,
      inv: {}, found: {}, boxes: {},
      active: D.START_CAR, builds: {}, projects: [],
      stats: {}, ach: {}, col: {}, quests: {},
      daily: { date: '', ids: [], base: {}, claimed: {} },
      settings: U.clone(D.SETTINGS_DEFAULT),
    };
    st.inv[D.START_CAR] = 1;
    st.found[D.START_CAR] = now;
    st.builds[D.START_CAR] = Store.emptyBuild();
    Object.keys(D.ECON.startBoxes).forEach((k) => { st.boxes[k] = D.ECON.startBoxes[k]; });
    return st;
  };
  Store.emptyBuild = () => ({ wheelColor: null, plateText: null });

  /* ---- build sanitising: only known slots, valid compatible items ---- */
  Store.sanitizeBuild = function (carId, b) {
    const out = Store.emptyBuild();
    if (!U.isObj(b)) return out;
    D.SLOT_KEYS.forEach((slot) => {
      const id = b[slot];
      if (typeof id !== 'string') return;
      const it = D.ITEM[id];
      if (it && it.slot === slot && D.compatible(it, carId)) out[slot] = id;
    });
    if (U.isHex(b.wheelColor)) out.wheelColor = b.wheelColor.toLowerCase();
    if (typeof b.plateText === 'string') {
      const t = b.plateText.toUpperCase().replace(/[^A-Z0-9 \-]/g, '').slice(0, D.ECON.maxPlateText);
      out.plateText = t || null;
    }
    return out;
  };

  const num = (v, d, lo, hi) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.floor(v))) : d);

  /* ---- soft sanitising (used on load): repairs what it can, reports issues ---- */
  Store.sanitize = function (raw) {
    const issues = [];
    const st = Store.fresh();
    st.inv = {}; st.found = {}; st.boxes = {}; st.builds = {}; st.projects = [];
    if (!U.isObj(raw)) throw new Error('state is not an object');
    st.created = num(raw.created, st.created, 0, 4e12);
    st.updated = num(raw.updated, st.updated, 0, 4e12);
    const c = U.isObj(raw.cur) ? raw.cur : {};
    st.cur = { credits: num(c.credits, 0, 0, MAXC), tokens: num(c.tokens, 0, 0, MAXC), fragments: num(c.fragments, 0, 0, MAXC) };
    st.xp = num(raw.xp, 0, 0, MAXC);
    st.level = num(raw.level, 1, 1, D.XP.maxLevel);
    if (U.isObj(raw.inv)) Object.keys(raw.inv).forEach((id) => {
      const n = raw.inv[id];
      if (!D.ITEM[id]) { issues.push('Unknown item removed: ' + id); return; }
      if (U.isInt(n) && n > 0) st.inv[id] = Math.min(n, 9999);
    });
    if (U.isObj(raw.found)) Object.keys(raw.found).forEach((id) => { if (D.ITEM[id]) st.found[id] = num(raw.found[id], Date.now(), 0, 4e12); });
    Object.keys(st.inv).forEach((id) => { if (!st.found[id]) st.found[id] = Date.now(); });
    if (U.isObj(raw.boxes)) Object.keys(raw.boxes).forEach((id) => { if (D.CONT[id] && U.isInt(raw.boxes[id]) && raw.boxes[id] > 0) st.boxes[id] = Math.min(raw.boxes[id], 9999); });
    /* cars / builds */
    D.CARS.forEach((car) => {
      if (st.inv[car.id]) st.builds[car.id] = Store.sanitizeBuild(car.id, U.isObj(raw.builds) ? raw.builds[car.id] : null);
    });
    if (!D.CARS.some((car) => st.inv[car.id])) { st.inv[D.START_CAR] = 1; st.found[D.START_CAR] = Date.now(); st.builds[D.START_CAR] = Store.emptyBuild(); issues.push('No car found: starter car restored.'); }
    st.active = typeof raw.active === 'string' && st.inv[raw.active] && D.ITEM[raw.active].cat === 'car' ? raw.active : D.CARS.find((car) => st.inv[car.id]).id;
    /* a copy of an item can only be on one car: drop excess uses */
    const seen = {};
    Object.keys(st.builds).forEach((cid) => {
      D.SLOT_KEYS.forEach((slot) => {
        const id = st.builds[cid][slot];
        if (!id) return;
        seen[id] = (seen[id] || 0) + 1;
        if (seen[id] > (st.inv[id] || 0)) { st.builds[cid][slot] = null; issues.push('Removed an installed part you no longer own: ' + D.ITEM[id].name); }
      });
    });
    /* projects */
    if (Array.isArray(raw.projects)) raw.projects.slice(0, 60).forEach((p) => {
      if (!U.isObj(p) || typeof p.id !== 'string' || !D.ITEM[p.carId] || D.ITEM[p.carId].cat !== 'car') return;
      st.projects.push({ id: p.id.slice(0, 40), carId: p.carId, name: String(p.name || 'Build').replace(/[<>]/g, '').slice(0, 24) || 'Build', build: Store.sanitizeBuild(p.carId, p.build), ts: num(p.ts, Date.now(), 0, 4e12) });
    });
    /* counters */
    if (U.isObj(raw.stats)) Object.keys(raw.stats).forEach((k) => { if (/^[a-zA-Z]{1,24}$/.test(k)) st.stats[k] = num(raw.stats[k], 0, 0, MAXC); });
    if (U.isObj(raw.ach)) Object.keys(raw.ach).forEach((id) => { if (D.ACHIEVEMENTS.some((a) => a.id === id)) st.ach[id] = num(raw.ach[id], Date.now(), 0, 4e12); });
    if (U.isObj(raw.col)) Object.keys(raw.col).forEach((id) => { if (D.COL[id]) st.col[id] = num(raw.col[id], Date.now(), 0, 4e12); });
    if (U.isObj(raw.quests)) Object.keys(raw.quests).forEach((id) => { if (D.CAREER.some((q) => q.id === id)) st.quests[id] = num(raw.quests[id], Date.now(), 0, 4e12); });
    if (U.isObj(raw.daily)) {
      const d = raw.daily;
      st.daily = { date: typeof d.date === 'string' ? d.date.slice(0, 10) : '', ids: Array.isArray(d.ids) ? d.ids.filter((x) => D.DAILY.some((q) => q.id === x)).slice(0, 3) : [], base: {}, claimed: {} };
      if (U.isObj(d.base)) D.DAILY_COUNTERS.forEach((k) => { st.daily.base[k] = num(d.base[k], 0, 0, MAXC); });
      if (U.isObj(d.claimed)) Object.keys(d.claimed).forEach((id) => { if (st.daily.ids.indexOf(id) >= 0) st.daily.claimed[id] = num(d.claimed[id], Date.now(), 0, 4e12); });
    }
    if (U.isObj(raw.settings)) {
      const s = raw.settings, ds = D.SETTINGS_DEFAULT;
      st.settings = {
        sound: typeof s.sound === 'boolean' ? s.sound : ds.sound,
        volume: num(s.volume, ds.volume, 0, 100),
        skipAnim: typeof s.skipAnim === 'boolean' ? s.skipAnim : ds.skipAnim,
        fx: s.fx === 'low' ? 'low' : 'high',
      };
    }
    return { state: st, issues: issues };
  };

  /* ---- strict validation (used on import): rejects structurally wrong files ---- */
  Store.validateStrict = function (state) {
    const e = [];
    if (!U.isObj(state)) return ['Save data is not an object.'];
    ['cur', 'inv', 'builds', 'stats', 'settings'].forEach((k) => { if (!U.isObj(state[k])) e.push('Missing section: ' + k); });
    if (!Array.isArray(state.projects)) e.push('Missing section: projects');
    if (e.length) return e;
    ['credits', 'tokens', 'fragments'].forEach((k) => {
      const v = state.cur[k];
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > MAXC || Math.floor(v) !== v) e.push('Invalid ' + k + ' balance.');
    });
    if (typeof state.xp !== 'number' || !(state.xp >= 0)) e.push('Invalid XP value.');
    Object.keys(state.inv).forEach((id) => { const n = state.inv[id]; if (!U.isInt(n) || n < 0 || n > 9999) e.push('Invalid item count for ' + id); });
    if (typeof state.active !== 'string') e.push('Missing active car.');
    return e;
  };

  /* ---- migrations: add functions keyed by the version they upgrade FROM ---- */
  const MIGRATIONS = {
    /* 1: (state) => { ...mutate...; return state; }  // example for v1 -> v2 */
  };
  Store.migrate = function (env) {
    let v = env.v, st = env.state;
    while (v < D.SAVE_VERSION) {
      const fn = MIGRATIONS[v];
      if (fn) st = fn(st);
      v++;
    }
    return st;
  };

  /* ---- envelope parse ---- */
  Store.parseEnvelope = function (text) {
    let env;
    try { env = JSON.parse(text); } catch (e) { return { error: 'The file is not valid JSON.' }; }
    if (!U.isObj(env) || env.app !== 'street-vault') return { error: 'This is not a STREET VAULT save.' };
    if (!U.isInt(env.v) || env.v < 1) return { error: 'Missing save version.' };
    if (env.v > D.SAVE_VERSION) return { error: 'This save comes from a newer version of the game.' };
    if (!U.isObj(env.state)) return { error: 'Save data is missing.' };
    return { env: env };
  };

  /* ---- load: returns { state, status: 'new'|'ok'|'repaired'|'corrupt', issues, backupOk } ---- */
  Store.load = function () {
    const text = rd(KEY);
    if (!text) return { state: Store.fresh(), status: 'new', issues: [] };
    const tryParse = (t) => {
      const p = Store.parseEnvelope(t);
      if (p.error) return { error: p.error };
      try { const st = Store.migrate(p.env); const r = Store.sanitize(st); return { state: r.state, issues: r.issues }; } catch (e) { return { error: String(e.message || e) }; }
    };
    const a = tryParse(text);
    if (!a.error) return { state: a.state, status: a.issues.length ? 'repaired' : 'ok', issues: a.issues };
    const bak = rd(BAK);
    const b = bak ? tryParse(bak) : { error: 'no backup' };
    return { state: Store.fresh(), status: 'corrupt', issues: [a.error], backup: b.error ? null : b.state, backupText: bak };
  };

  Store.envelope = (state) => JSON.stringify({ app: 'street-vault', v: D.SAVE_VERSION, savedAt: Date.now(), state: state });

  /* ---- save: keeps the previous good save as a backup. Returns {ok, error} ---- */
  Store.save = function (state) {
    try {
      state.updated = Date.now();
      const prev = rd(KEY);
      const text = Store.envelope(state);
      if (prev && Store.parseEnvelope(prev).env) { try { wr(BAK, prev); } catch (e) { /* backup is best-effort */ } }
      wr(KEY, text);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String((e && e.name) || e) };
    }
  };
  Store.wipe = function () { rm(KEY); rm(BAK); };

  /* ---- import: strict check first, then soft sanitise ---- */
  Store.importText = function (text) {
    const p = Store.parseEnvelope(text);
    if (p.error) return { ok: false, error: p.error };
    let st;
    try { st = Store.migrate(p.env); } catch (e) { return { ok: false, error: 'Migration failed.' }; }
    const errs = Store.validateStrict(st);
    if (errs.length) return { ok: false, error: errs.slice(0, 3).join(' ') };
    try { const r = Store.sanitize(st); return { ok: true, state: r.state, issues: r.issues }; } catch (e) { return { ok: false, error: String(e.message || e) }; }
  };
})();
