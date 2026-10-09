/* STREET VAULT — v-garage.js : garage view, car picker, projects, customize overlay. */
(function () {
  'use strict';
  const SV = (window.SV = window.SV || {});
  const U = SV.util, D = SV.data, G = SV.game, A = SV.art, UI = SV.ui, Store = SV.store;
  const { esc, fmt } = U, h = UI.h;
  const V = (SV.views = SV.views || {});
  let viewAngle = 'side';

  const ownedCars = () => D.CARS.filter((c) => G.owned(c.id) > 0).sort((a, b) => b.rar - a.rar || a.name.localeCompare(b.name));

  V.garage = {
    title: 'GARAGE',
    render: function (root) {
      const S = G.get(), car = D.ITEM[S.active], b = G.activeBuild(S.active), r = D.RARITIES[car.rar];
      const wrap = h('div', { class: 'view' });
      wrap.innerHTML = '<div class="vhead"><div><h1>Garage</h1><p>Your active car and its current build. Tune it, save projects, swap rides.</p></div></div>' +
        '<div class="garage"><div class="stage" style="--rc:' + r.color + '"><i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>' +
        '<div class="tag"><span class="pill" style="--rc:' + r.color + '">' + r.name + '</span><div class="disp">' + esc(car.name) + '</div></div>' +
        '<div class="vt seg" id="vt">' + ['side', 'front', 'rear'].map((v) => '<button type="button" data-v="' + v + '" class="' + (v === viewAngle ? 'on' : '') + '">' + v.toUpperCase() + '</button>').join('') + '</div>' +
        '<div class="car" id="carsvg"></div></div>' +
        '<div class="side"><div class="statrow"><div class="stat"><span class="lbl">Build score</span><b>' + fmt(G.buildScore(car.id)) + '</b></div><div class="stat"><span class="lbl">Value</span><b>' + fmt(G.buildValue(car.id)) + '</b></div><div class="stat"><span class="lbl">Class</span><b style="font-size:20px;padding-top:6px">' + esc(((car.car && car.car.cls) || '').toUpperCase() || '—') + '</b></div></div>' +
        '<div class="gbtns"><button class="btn" type="button" id="bCust">Customize</button><button class="btn ghost" type="button" id="bChange">Change car</button><button class="btn ghost" type="button" id="bSave">Save build</button></div>' +
        '<div class="panel pad"><div class="sect" style="margin-top:0"><h2>Installed parts</h2></div><div class="plist" id="plist"></div></div>' +
        '<div class="panel pad"><div class="sect" style="margin-top:0"><h2>Saved projects</h2><span class="note" id="pcnt"></span></div><div class="projs" id="projs"></div></div></div></div>' +
        '<div class="sect"><h2>Your cars (' + ownedCars().length + '/' + D.CARS.length + ')</h2></div><div class="strip" id="strip"></div>';
      root.appendChild(wrap);
      const $ = (s) => wrap.querySelector(s);
      $('#carsvg').innerHTML = A.carSVG(car, b, { view: viewAngle, fx: UI.fx() !== 'low' });
      wrap.querySelectorAll('#vt button').forEach((x) => x.addEventListener('click', () => { viewAngle = x.dataset.v; V.refresh(); }));
      /* installed parts */
      const pl = $('#plist');
      D.SLOT_KEYS.forEach((slot) => {
        const id = b[slot], it = id && D.ITEM[id];
        const row = h('div', { class: 'prow' });
        row.innerHTML = '<span class="lbl">' + D.SLOTS[slot].label + '</span><span class="v' + (it ? '' : ' stock') + '"' + (it ? ' style="--rc:' + D.RARITIES[it.rar].color + '"' : '') + '>' + (it ? '<i></i>' + esc(it.name) : 'Stock') + '</span>';
        pl.appendChild(row);
      });
      if (b.wheelColor) { const row = h('div', { class: 'prow' }); row.innerHTML = '<span class="lbl">Wheel colour</span><span class="v">' + esc((D.WHEEL_COLORS.find((c) => c.hex === b.wheelColor) || { name: b.wheelColor }).name) + '</span>'; pl.appendChild(row); }
      if (b.plateText) { const row = h('div', { class: 'prow' }); row.innerHTML = '<span class="lbl">Plate text</span><span class="v">' + esc(b.plateText) + '</span>'; pl.appendChild(row); }
      /* projects */
      const pj = G.projectsFor(car.id);
      $('#pcnt').textContent = pj.length + '/' + D.ECON.maxProjectsPerCar;
      const pw = $('#projs');
      if (!pj.length) pw.innerHTML = '<span class="note">No saved builds for this car yet. Press SAVE BUILD.</span>';
      pj.forEach((p) => {
        const d = h('div', { class: 'pj' });
        const a = h('button', { type: 'button', title: 'Load this project' }, p.name);
        const x = h('button', { type: 'button', class: 'x', 'aria-label': 'Delete project ' + p.name, title: 'Delete' }, '×');
        a.addEventListener('click', () => loadProject(car.id, p));
        x.addEventListener('click', () => UI.confirm('Delete project?', 'Delete project <b>' + esc(p.name) + '</b>? The parts stay in your inventory.', 'Delete', true).then((ok) => { if (ok) { G.deleteProject(p.id); UI.toast('PROJECT DELETED', p.name); } }));
        d.appendChild(a); d.appendChild(x); pw.appendChild(d);
      });
      $('#bCust').addEventListener('click', () => V.customize(car.id));
      $('#bChange').addEventListener('click', () => carPicker());
      $('#bSave').addEventListener('click', () => saveProjectModal(car.id));
      /* strip */
      const strip = $('#strip');
      ownedCars().forEach((c) => {
        const k = UI.icard(c, { sel: c.id === S.active, tag: c.id === S.active ? 'ACTIVE' : '', tagUse: false });
        k.addEventListener('click', () => { if (c.id !== S.active) { G.setActive(c.id); UI.toast('ACTIVE CAR', c.name); } });
        strip.appendChild(k);
      });
    },
  };
  V.refresh = () => SV.main && SV.main.render();

  function carPicker() {
    const body = h('div'); const g = h('div', { class: 'igrid' }); body.appendChild(g);
    const S = G.get();
    const lockedCount = D.CARS.length - ownedCars().length;
    ownedCars().forEach((c) => {
      const k = UI.icard(c, { sel: c.id === S.active, tag: c.id === S.active ? 'ACTIVE' : '', count: G.owned(c.id) });
      k.addEventListener('click', () => { G.setActive(c.id); UI.toast('ACTIVE CAR', c.name); m.close(); });
      g.appendChild(k);
    });
    const n = h('p', { class: 'note' }, lockedCount ? lockedCount + ' more cars to find in containers.' : 'You own every car.'); body.appendChild(n);
    const m = UI.modal({ title: 'Change car', cls: 'wide', body: body, foot: [{ label: 'Close', cls: 'ghost' }] });
  }

  function saveProjectModal(carId) {
    const car = D.ITEM[carId], n = G.projectsFor(carId).length;
    if (n >= D.ECON.maxProjectsPerCar) { UI.toast('LIMIT REACHED', 'Delete a project to save a new one (max ' + D.ECON.maxProjectsPerCar + ' per car).', 'warn'); return; }
    const body = h('div');
    body.innerHTML = '<p>Save the current build of <b>' + esc(car.name) + '</b> as a project. You can load it back at any time.</p><input class="field" id="pname" maxlength="24" placeholder="Project name" autofocus value="Build ' + (n + 1) + '">';
    const inp = body.querySelector('#pname');
    const doSave = (m) => {
      const r = G.saveProject(carId, inp.value);
      if (r.ok) { UI.sfx('ok'); UI.toast('PROJECT SAVED', r.name, 'gold'); return true; }
      UI.toast('CANNOT SAVE', r.reason === 'name' ? 'Enter a name.' : 'Project limit reached.', 'warn'); return false;
    };
    const m = UI.modal({ title: 'Save build', body: body, foot: [{ label: 'Cancel', cls: 'ghost' }, { label: 'Save', fn: doSave }] });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && doSave()) m.close(); });
    inp.select();
  }

  function loadProject(carId, p) {
    const plan = G.planBuild(carId, p.build);
    const lines = [];
    if (plan.missing.length) lines.push('Missing parts (skipped): ' + plan.missing.map((i) => esc(D.ITEM[i].name)).join(', '));
    if (plan.transfers.length) lines.push('Taken from other cars: ' + plan.transfers.map((t) => esc(D.ITEM[t.id].name) + ' (' + esc(D.ITEM[t.from].name) + ')').join(', '));
    const go = () => { const r = G.applyBuild(carId, p.build); if (r.ok) { UI.sfx('ok'); UI.toast('PROJECT LOADED', p.name, 'gold'); } };
    if (!lines.length) { go(); return; }
    UI.confirm('Load "' + esc(p.name) + '"?', lines.join('<br>'), 'Load anyway').then((ok) => { if (ok) go(); });
  }

  /* ================================================================ CUSTOMIZE */
  let czOpen = false;
  V.isCustomizing = () => czOpen;
  V.customize = function (carId) {
    if (czOpen) return;
    czOpen = true;
    const car = D.ITEM[carId];
    const orig = U.clone(Store.sanitizeBuild(carId, G.activeBuild(carId)));
    let draft = U.clone(orig), tab = 'paint', slotF = null, angle = 'side';
    const cz = h('div', { class: 'cz', role: 'dialog', 'aria-label': 'Customize ' + car.name });
    cz.innerHTML = '<div class="czh"><h1>Customize</h1><span class="lbl">' + esc(car.name) + '</span><span class="dirty" id="dirty"></span><button class="xbtn" style="margin-left:auto" id="czx" aria-label="Close">×</button></div>' +
      '<div class="czb"><div class="czs"><div class="stage"><i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i><div class="vt seg" id="czvt">' +
      ['side', 'front', 'rear'].map((v) => '<button type="button" data-v="' + v + '" class="' + (v === 'side' ? 'on' : '') + '">' + v.toUpperCase() + '</button>').join('') + '</div><div class="car" id="czcar"></div></div></div>' +
      '<div class="czp"><div class="czt" id="czt"></div><div class="czsl" id="czsl"></div><div class="czl" id="czl"></div></div></div>' +
      '<div class="czf"><div class="l"><span class="note" id="czinfo"></span></div><div class="r"><button class="btn ghost" id="czrev" type="button">Revert</button><button class="btn ghost" id="czcan" type="button">Cancel</button><button class="btn" id="czapp" type="button">Apply</button></div></div>';
    document.body.appendChild(cz);
    const $ = (s) => cz.querySelector(s);
    const dirty = () => JSON.stringify(Store.sanitizeBuild(carId, draft)) !== JSON.stringify(orig);

    function drawCar() { $('#czcar').innerHTML = A.carSVG(car, draft, { view: angle, fx: UI.fx() !== 'low' }); $('#dirty').textContent = dirty() ? '● UNSAVED CHANGES' : ''; }
    function items(cat) {
      return D.ITEMS.filter((i) => i.cat === cat && G.owned(i.id) > 0 && D.compatible(i, carId)).sort((a, b) => b.rar - a.rar || a.name.localeCompare(b.name));
    }
    function drawTabs() {
      const t = $('#czt'); t.innerHTML = '';
      D.TABS.forEach((x) => { const b = h('button', { type: 'button', class: x.id === tab ? 'on' : '' }, x.label); b.addEventListener('click', () => { tab = x.id; slotF = null; drawTabs(); drawList(); }); t.appendChild(b); });
    }
    function drawList() {
      const T = D.TABS.find((x) => x.id === tab), cat = T.cat;
      const slots = D.SLOT_KEYS.filter((s) => D.SLOTS[s].cat === cat);
      const sl = $('#czsl'); sl.innerHTML = '';
      if (slots.length > 1) {
        const all = h('button', { type: 'button', class: 'fchip' + (!slotF ? ' on' : '') }, 'All'); all.addEventListener('click', () => { slotF = null; drawList(); }); sl.appendChild(all);
        slots.forEach((s) => { const b = h('button', { type: 'button', class: 'fchip' + (slotF === s ? ' on' : '') }, D.SLOTS[s].label + (draft[s] ? ' ●' : '')); b.addEventListener('click', () => { slotF = s; drawList(); }); sl.appendChild(b); });
      }
      const l = $('#czl'); l.innerHTML = '';
      const single = slots.length === 1 ? slots[0] : slotF;
      if (cat === 'wheels') {
        const sw = h('div', { class: 'swatches' });
        D.WHEEL_COLORS.forEach((c) => {
          const b = h('button', { type: 'button', class: 'sw' + (c.hex ? '' : ' stock') + ((draft.wheelColor || null) === c.hex ? ' on' : ''), title: c.name, 'aria-label': 'Wheel colour ' + c.name });
          if (c.hex) b.style.setProperty('--c', c.hex);
          b.addEventListener('click', () => { draft.wheelColor = c.hex; drawCar(); drawList(); });
          sw.appendChild(b);
        });
        l.appendChild(h('p', { class: 'hint' }, 'Wheel colour is free and applies to any wheels.')); l.appendChild(sw);
      }
      if (cat === 'plate') {
        const row = h('div', { class: 'frow', style: 'margin-bottom:12px' });
        row.innerHTML = '<label class="lbl" for="ptxt">Plate text</label><input class="field" id="ptxt" maxlength="' + D.ECON.maxPlateText + '" placeholder="STOCK" style="text-transform:uppercase;width:150px" value="' + esc(draft.plateText || '') + '">';
        row.querySelector('input').addEventListener('input', (e) => { const v = e.target.value.toUpperCase().replace(/[^A-Z0-9 \-]/g, '').slice(0, D.ECON.maxPlateText); e.target.value = v; draft.plateText = v.trim() ? v : null; drawCar(); });
        l.appendChild(row);
      }
      const list = items(cat).filter((i) => !single || i.slot === single);
      const g = h('div', { class: 'igrid' });
      if (single) {
        const none = h('button', { class: 'icard' + (!draft[single] ? ' sel' : ''), type: 'button' });
        none.innerHTML = '<div class="th" style="font-family:var(--f-display);font-weight:900;font-size:22px;color:var(--mute)">STOCK</div><div class="meta"><div class="nm">Factory ' + esc(D.SLOTS[single].label.toLowerCase()) + '</div><div class="sub">Remove part</div></div>';
        none.addEventListener('click', () => { draft[single] = null; drawCar(); drawList(); });
        g.appendChild(none);
      }
      list.forEach((it) => {
        const eq = draft[it.slot] === it.id;
        const others = G.usage(it.id, carId);
        const away = !eq && others.length >= G.owned(it.id);
        const k = UI.icard(it, { sel: eq, count: G.owned(it.id), tag: eq ? 'EQUIPPED' : away ? 'ON ' + D.ITEM[others[0].carId].name.slice(0, 12).toUpperCase() : '', tagUse: away });
        k.addEventListener('click', () => { draft[it.slot] = eq ? null : it.id; drawCar(); drawList(); });
        g.appendChild(k);
      });
      l.appendChild(g);
      if (!list.length) l.appendChild(h('div', { class: 'empty' }, 'Nothing here yet — open containers to find ' + T.label.toLowerCase() + ' parts that fit ' + car.name + '.'));
      $('#czinfo').textContent = list.length + ' compatible item' + (list.length === 1 ? '' : 's') + ' owned';
    }
    function close() { czOpen = false; cz.remove(); document.removeEventListener('keydown', esc_); V.refresh(); }
    function esc_(e) { if (e.key === 'Escape' && !e.defaultPrevented && !document.querySelector('.mback')) cancel(); }
    function cancel() {
      if (!dirty()) return close();
      UI.confirm('Discard changes?', 'Your unapplied tuning will be lost.', 'Discard', true).then((ok) => { if (ok) close(); });
    }
    document.addEventListener('keydown', esc_);
    $('#czx').addEventListener('click', cancel); $('#czcan').addEventListener('click', cancel);
    $('#czrev').addEventListener('click', () => { draft = U.clone(orig); drawCar(); drawList(); UI.toast('REVERTED', 'Back to the installed build.'); });
    cz.querySelectorAll('#czvt button').forEach((b) => b.addEventListener('click', () => { angle = b.dataset.v; cz.querySelectorAll('#czvt button').forEach((x) => x.classList.toggle('on', x === b)); drawCar(); }));
    $('#czapp').addEventListener('click', () => {
      if (!dirty()) { UI.toast('NOTHING TO APPLY', 'No changes made.', 'warn'); return; }
      const plan = G.planBuild(carId, draft);
      const go = () => {
        const r = G.applyBuild(carId, draft);
        if (r.ok) { UI.sfx('ok'); UI.toast('BUILD APPLIED', car.name, 'gold'); close(); } else UI.toast('FAILED', 'Could not apply build.', 'bad');
      };
      if (plan.transfers.length || plan.missing.length) {
        const lines = [];
        if (plan.transfers.length) lines.push('These parts are installed on another car and will be moved:<br>' + plan.transfers.map((t) => '• ' + esc(D.ITEM[t.id].name) + ' (from ' + esc(D.ITEM[t.from].name) + ')').join('<br>'));
        if (plan.missing.length) lines.push('Not owned any more and skipped: ' + plan.missing.map((i) => esc(D.ITEM[i].name)).join(', '));
        UI.confirm('Apply build?', lines.join('<br><br>'), 'Apply').then((ok) => { if (ok) go(); });
      } else go();
    });
    drawTabs(); drawList(); drawCar();
  };
})();
