/* STREET VAULT — main.js : boot, router, HUD. */
(function () {
  'use strict';
  const SV = (window.SV = window.SV || {});
  const U = SV.util, D = SV.data, G = SV.game, UI = SV.ui, bus = SV.bus, V = SV.views;
  const { esc, fmt, $ } = U;
  const M = (SV.main = {});
  const SECTIONS = [['garage', 'GARAGE', 'garage'], ['open', 'OPEN', 'open'], ['inventory', 'INVENTORY', 'inv'], ['collections', 'COLLECTIONS', 'col'], ['store', 'STORE', 'store']];
  let cur = 'garage', pending = 0;

  function drawNav() {
    const nav = $('#nav'); nav.innerHTML = '';
    SECTIONS.forEach((s) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = s[0] === cur ? 'on' : ''; b.dataset.s = s[0]; b.setAttribute('aria-label', s[1]);
      if (s[0] === cur) b.setAttribute('aria-current', 'page');
      b.innerHTML = UI.iconSVG[s[2]] + '<span>' + s[1] + '</span>' + (s[0] === 'open' && Object.keys(G.get().boxes).length ? '<i class="badge">' + Object.values(G.get().boxes).reduce((a, b) => a + b, 0) + '</i>' : '');
      b.addEventListener('click', () => { if (V[s[0]].reset) V[s[0]].reset(); M.go(s[0]); });
      nav.appendChild(b);
    });
  }
  function drawHud() {
    const S = G.get(), li = G.levelInfo(S.xp), cl = G.claimable();
    $('#hud').innerHTML = '<div class="chip" title="Credits"><i></i><span class="num">' + fmt(S.cur.credits) + '</span><small>CR</small></div>' +
      '<div class="chip" title="Tokens"><i style="--c:#6ee7ff"></i><span class="num">' + fmt(S.cur.tokens) + '</span><small>TOK</small></div>' +
      '<div class="chip fr" title="Fragments"><i style="--c:#ff9d4a"></i><span class="num">' + fmt(S.cur.fragments) + '</span><small>FRAG</small></div>' +
      '<button class="chip lvl" id="lvl" type="button" aria-label="Level, tasks and achievements"><span>LVL ' + li.level + '</span><span class="xp"><span style="width:' + (li.need ? Math.floor(100 * li.into / li.need) : 100) + '%"></span></span>' + (cl ? '<i class="dot"></i>' : '') + '</button>' +
      '<button class="iconbtn" id="gear" type="button" aria-label="Settings">' + UI.iconSVG.gear + '</button>';
    $('#lvl').addEventListener('click', () => V.profile());
    $('#gear').addEventListener('click', () => V.settings());
  }
  M.render = function () {
    const root = $('#view'), keep = root.dataset.v === cur ? root.scrollTop : 0;
    if (V.isCustomizing && V.isCustomizing() && root.dataset.v === cur) { drawHud(); drawNav(); return; }
    root.innerHTML = ''; root.dataset.v = cur;
    try { V[cur].render(root); } catch (e) { console.error(e); root.innerHTML = '<div class="empty"><b>Something broke</b>This screen failed to load. Try another section.</div>'; }
    root.scrollTop = keep; drawNav(); drawHud();
  };
  M.go = function (s) {
    if (!V[s]) return;
    if (s !== cur) { const root = $('#view'); root.dataset.v = ''; }
    cur = s; UI.closeAll(); M.render(); $('#view').scrollTop = 0;
  };
  function schedule() { if (pending) return; pending = requestAnimationFrame(() => { pending = 0; M.render(); }); }

  function boot() {
    const r = G.init();
    UI.applySettings();
    bus.on('change', schedule);
    bus.on('settings', schedule);
    M.render();
    if (!SV.store.available) setTimeout(() => UI.toast('PROGRESS NOT SAVED', 'This browser blocks local storage, so progress lasts only until you close the tab. Use Settings → Export.', 'warn'), 600);
    if (r.status === 'corrupt') V.recovery();
    else if (r.status === 'repaired') setTimeout(() => UI.toast('SAVE REPAIRED', 'Some damaged values were fixed.', 'warn'), 500);
    window.addEventListener('beforeunload', () => {});
  }
  window.addEventListener('error', (e) => console.error('[error]', e.message));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
