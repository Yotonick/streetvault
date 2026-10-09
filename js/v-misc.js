/* STREET VAULT — v-misc.js : store, forge, profile, settings, recovery. */
(function () {
  'use strict';
  const SV = (window.SV = window.SV || {});
  const U = SV.util, D = SV.data, G = SV.game, A = SV.art, UI = SV.ui, bus = SV.bus;
  const { esc, fmt } = U, h = UI.h;
  const V = (SV.views = SV.views || {});
  let tab = 'boxes', fcat = 'all';

  V.store = {
    title: 'STORE',
    render: function (root) {
      const S = G.get(), wrap = h('div', { class: 'view' });
      wrap.innerHTML = '<div class="vhead"><div><h1>Store</h1><p>Buy containers with credits or tokens, or use fragments in the Forge.</p></div></div><div class="tabs" id="tb"><button type="button" data-t="boxes" class="' + (tab === 'boxes' ? 'on' : '') + '">CONTAINERS</button><button type="button" data-t="forge" class="' + (tab === 'forge' ? 'on' : '') + '">FORGE</button></div><div id="body"></div>';
      root.appendChild(wrap);
      wrap.querySelectorAll('#tb button').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.t; V.refresh(); }));
      const body = wrap.querySelector('#body');
      if (tab === 'boxes') boxes(body); else forge(body);
    },
  };

  function boxes(body) {
    const g = h('div', { class: 'shop' }); body.appendChild(g);
    D.CONTAINERS.forEach((cn) => {
      const n = G.boxCount(cn.id), c = h('div', { class: 'scard', style: '--a:' + cn.pal.a });
      c.innerHTML = '<div class="art">' + A.crate(cn.id) + '</div><div class="info"><div class="nm">' + esc(cn.name) + '</div><div class="note">' + esc(cn.desc) + '</div><div class="rbar">' +
        cn.table.map((p, i) => p ? '<span style="--rc:' + D.RARITIES[i].color + ';flex:' + p + '"></span>' : '').join('') + '</div><div class="frow">' + UI.costHTML(cn.cost) + '<span class="sum">Owned ×' + n + '</span></div><div class="acts"></div></div>';
      const acts = c.querySelector('.acts');
      D.ECON.buyQuantities.forEach((q) => {
        const b = h('button', { class: 'btn sm' + (G.canPay({ cur: cn.cost.cur, amt: cn.cost.amt * q }) ? '' : ' ghost'), type: 'button' }, 'Buy ×' + q);
        b.addEventListener('click', () => V.buyBox(cn.id, q)); acts.appendChild(b);
      });
      const od = h('button', { class: 'btn sm ghost', type: 'button' }, 'Odds'); od.addEventListener('click', () => V.openOddsModal(cn.id));
      const op = h('button', { class: 'btn sm ghost', type: 'button' }, n ? 'Open' : 'Details');
      op.addEventListener('click', () => { V.open.go(cn.id); SV.main.go('open'); });
      acts.appendChild(od); acts.appendChild(op); g.appendChild(c);
    });
  }

  function forge(body) {
    const S = G.get();
    body.innerHTML = '<div class="sect" style="margin-top:0"><h2>Exchange fragments</h2><span class="sum">You have <b class="num">' + fmt(S.cur.fragments) + '</b> fragments</span></div><div class="forge" id="fx"></div><div class="sect"><h2>Craft missing items</h2></div><div class="filters"><div class="frow" id="fcc"></div></div><div class="igrid" id="cg"></div>';
    D.ECON.exchange.forEach((fx) => {
      const c = h('div', { class: 'fx' }), can = S.cur.fragments >= fx.give.fragments;
      c.innerHTML = '<span class="lbl">' + esc(fx.label) + '</span><div class="big">' + fx.give.fragments + ' FRAG → ' + (fx.get.credits ? fmt(fx.get.credits) + ' CR' : fx.get.tokens + ' TOKEN') + '</div>';
      const b = h('button', { class: 'btn sm' + (can ? '' : ' ghost'), type: 'button' }, 'Exchange');
      b.addEventListener('click', () => { const r = G.exchange(fx.id); if (r.ok) { UI.sfx('buy'); UI.toast('EXCHANGED', fx.label, 'gold'); } else { UI.sfx('bad'); UI.toast('NOT ENOUGH FRAGMENTS', 'Need ' + fx.give.fragments + '. Dismantle spare items to get more.', 'warn'); } });
      c.appendChild(b); body.querySelector('#fx').appendChild(c);
    });
    [['all', 'All']].concat(Object.keys(D.CATEGORIES).map((k) => [k, D.CATEGORIES[k].label])).forEach((c) => {
      const b = h('button', { type: 'button', class: 'fchip' + (fcat === c[0] ? ' on' : '') }, c[1]); b.addEventListener('click', () => { fcat = c[0]; V.refresh(); }); body.querySelector('#fcc').appendChild(b);
    });
    const list = D.ITEMS.filter((i) => G.craftable(i) && (fcat === 'all' || i.cat === fcat)).sort((a, b) => a.craft - b.craft || a.name.localeCompare(b.name));
    const g = body.querySelector('#cg');
    if (!list.length) { g.style.display = 'block'; g.innerHTML = '<div class="empty"><b>Nothing to craft</b>You already own every craftable item in this category.</div>'; return; }
    list.forEach((it) => {
      const k = UI.icard(it, { tag: it.craft + ' FRAG', tagUse: S.cur.fragments < it.craft });
      k.addEventListener('click', () => UI.confirm('Craft ' + esc(it.name) + '?', 'Spend <b>' + it.craft + ' fragments</b> to craft this ' + D.RARITIES[it.rar].name.toLowerCase() + ' item. You have ' + fmt(S.cur.fragments) + '.', 'Craft').then((ok) => {
        if (!ok) return;
        const r = G.craft(it.id);
        if (r.ok) { UI.sfx('ok'); UI.toast('CRAFTED', it.name, 'gold'); } else { UI.sfx('bad'); UI.toast('CANNOT CRAFT', r.reason === 'funds' ? 'Need ' + fmt(r.need) + ' more fragments.' : 'Item unavailable.', 'warn'); }
      }));
      g.appendChild(k);
    });
  }

  /* ================================================================ profile */
  V.profile = function (startTab) {
    let t = startTab || 'daily';
    const body = h('div');
    const draw = () => {
      const S = G.get(), li = G.levelInfo(S.xp);
      body.innerHTML = '<div class="panel pad" style="display:grid;gap:8px"><div class="frow" style="justify-content:space-between"><span class="disp" style="font-size:34px">Level ' + li.level + '</span><span class="num sum">' + (li.need ? li.into + ' / ' + li.need + ' XP' : 'MAX LEVEL') + '</span></div><div class="prog"><span style="width:' + (li.need ? Math.floor(100 * li.into / li.need) : 100) + '%"></span></div><div class="note">Next level reward: ' + (li.need ? fmt(D.XP.levelCredits(li.level + 1)) + ' CR' + ((li.level + 1) % D.XP.levelTokenEvery === 0 ? ' + 1 TOKEN' : '') : '—') + ' · Cars owned ' + G.metric('carsOwned') + '/' + D.CARS.length + ' · Items found ' + G.metric('found') + '/' + D.ITEMS.length + '</div></div>' +
        '<div class="tabs">' + [['daily', 'DAILY'], ['career', 'CAREER'], ['ach', 'ACHIEVEMENTS']].map((x) => '<button type="button" data-t="' + x[0] + '" class="' + (t === x[0] ? 'on' : '') + '">' + x[1] + '</button>').join('') + '</div><div class="qlist" id="ql"></div>';
      body.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => { t = b.dataset.t; draw(); }));
      const ql = body.querySelector('#ql');
      const qrow = (kind, e) => {
        const q = e.q, pct = Math.floor(100 * e.progress / q.target);
        const r = h('div', { class: 'qrow' + (e.done ? ' done' : '') + (e.claimed ? ' claimed' : '') });
        r.innerHTML = '<div><div class="t">' + esc(q.title) + '</div><div class="r">' + esc(G.rewardText(q.reward)) + '</div><div class="p"><div class="prog"><span style="width:' + pct + '%"></span></div><span class="num">' + e.progress + '/' + q.target + '</span></div></div>';
        const b = h('button', { class: 'btn sm' + (e.done && !e.claimed ? '' : ' off'), type: 'button' }, e.claimed ? 'Claimed' : e.done ? 'Claim' : 'In progress');
        if (e.done && !e.claimed) b.addEventListener('click', () => { const x = G.claimQuest(kind, q.id); if (x.ok) { UI.sfx('ok'); UI.toast('REWARD CLAIMED', G.rewardText(x.reward), 'gold'); } });
        r.appendChild(b); ql.appendChild(r);
      };
      if (t === 'daily') { ql.appendChild(h('p', { class: 'note' }, 'Three new tasks every day. Progress counts from the start of the day.')); G.dailyList().forEach((e) => qrow('daily', e)); }
      else if (t === 'career') G.careerList().forEach((e) => qrow('career', e));
      else G.achievementList().forEach((e) => {
        const a = e.a, r = h('div', { class: 'qrow arow' + (e.done ? ' done' : '') });
        r.innerHTML = '<div class="mark">' + (e.done ? '✓' : '•') + '</div><div><div class="t">' + esc(a.name) + '</div><div class="note">' + esc(a.desc) + '</div><div class="r">' + esc(G.rewardText(a.reward)) + '</div></div><span class="num lbl">' + e.progress + '/' + a.target + '</span>';
        ql.appendChild(r);
      });
    };
    draw();
    const off = bus.on('change', draw);
    UI.modal({ title: 'Profile & tasks', cls: 'mid', body: body, foot: [{ label: 'Close', cls: 'ghost' }], onClose: () => off() });
  };

  /* ================================================================ settings */
  V.settings = function () {
    const S = G.get(), st = S.settings;
    const body = h('div');
    body.innerHTML = '<div class="frow" style="justify-content:space-between"><label for="sSound">Sound effects</label><input type="checkbox" id="sSound"' + (st.sound ? ' checked' : '') + '></div>' +
      '<div class="frow" style="justify-content:space-between"><label for="sVol">Volume</label><input type="range" id="sVol" min="0" max="100" value="' + st.volume + '" style="width:55%"></div>' +
      '<div class="frow" style="justify-content:space-between"><label for="sSkip">Skip opening animations</label><input type="checkbox" id="sSkip"' + (st.skipAnim ? ' checked' : '') + '></div>' +
      '<div class="frow" style="justify-content:space-between"><label for="sFx">Effects quality</label><select class="field" id="sFx"><option value="high"' + (st.fx !== 'low' ? ' selected' : '') + '>High</option><option value="low"' + (st.fx === 'low' ? ' selected' : '') + '>Low (fewer effects)</option></select></div>' +
      '<hr style="border:0;border-top:1px solid var(--line);width:100%"><div class="sect" style="margin:0"><h2>Save data</h2></div><p class="note">Progress is stored in this browser (localStorage). Export a backup to move it to another device.</p>' +
      '<div class="btns"><button class="btn sm ghost" id="bExp" type="button">Export</button><button class="btn sm ghost" id="bImp" type="button">Import</button><button class="btn sm danger" id="bRes" type="button">Reset progress</button></div><div id="io" style="display:grid;gap:8px"></div>';
    const $ = (s) => body.querySelector(s);
    $('#sSound').addEventListener('change', (e) => { G.setSetting('sound', e.target.checked); if (e.target.checked) UI.sfx('ok'); });
    $('#sVol').addEventListener('input', (e) => G.setSetting('volume', Number(e.target.value)));
    $('#sVol').addEventListener('change', () => UI.sfx('ok'));
    $('#sSkip').addEventListener('change', (e) => G.setSetting('skipAnim', e.target.checked));
    $('#sFx').addEventListener('change', (e) => { G.setSetting('fx', e.target.value); V.refresh(); });
    const io = $('#io');
    $('#bExp').addEventListener('click', () => {
      const text = G.exportJSON();
      io.innerHTML = '<textarea class="field" id="exTa" readonly aria-label="Save JSON"></textarea><div class="btns"><button class="btn sm" id="exCopy" type="button">Copy JSON</button><button class="btn sm ghost" id="exDl" type="button">Download file</button></div><p class="note">If the download does not start in your browser, use Copy JSON and paste it into a text file.</p>';
      const ta = io.querySelector('#exTa'); ta.value = text;
      io.querySelector('#exCopy').addEventListener('click', () => {
        const done = () => UI.toast('COPIED', 'Save JSON copied to clipboard.');
        const fb = () => { ta.select(); try { document.execCommand('copy') ? done() : UI.toast('SELECTED', 'Press Ctrl+C to copy.', 'warn'); } catch (e) { UI.toast('SELECTED', 'Press Ctrl+C to copy.', 'warn'); } };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fb); else fb();
      });
      io.querySelector('#exDl').addEventListener('click', () => {
        try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = 'street-vault-save.json'; document.body.appendChild(a); a.click(); a.remove(); UI.toast('EXPORT', 'Download requested. If nothing appears, use Copy JSON.'); }
        catch (e) { UI.toast('DOWNLOAD BLOCKED', 'Use Copy JSON instead.', 'warn'); }
      });
    });
    $('#bImp').addEventListener('click', () => {
      io.innerHTML = '<textarea class="field" id="imTa" placeholder="Paste save JSON here…" aria-label="Import JSON"></textarea><div class="btns"><button class="btn sm" id="imGo" type="button">Import pasted JSON</button><button class="btn sm ghost" id="imFile" type="button">Choose file…</button><input type="file" id="imInp" accept=".json,application/json" hidden></div><p class="note warn" id="imErr"></p>';
      const ta = io.querySelector('#imTa'), err = io.querySelector('#imErr');
      const run = (text) => {
        UI.confirm('Replace progress?', 'Importing will replace your current progress with the imported save.', 'Import', true).then((ok) => {
          if (!ok) return;
          const r = G.importJSON(text);
          if (r.ok) { UI.closeAll(); UI.sfx('ok'); UI.toast('IMPORTED', 'Save loaded' + (r.issues && r.issues.length ? ' (' + r.issues.length + ' values repaired)' : '') + '.', 'gold'); }
          else { err.textContent = 'Import failed: ' + r.error; UI.toast('IMPORT FAILED', String(r.error).slice(0, 90), 'bad'); }
        });
      };
      io.querySelector('#imGo').addEventListener('click', () => { if (!ta.value.trim()) { err.textContent = 'Paste the save JSON first.'; return; } err.textContent = ''; run(ta.value); });
      const inp = io.querySelector('#imInp');
      io.querySelector('#imFile').addEventListener('click', () => inp.click());
      inp.addEventListener('change', () => {
        const f = inp.files && inp.files[0]; if (!f) return;
        if (f.size > 5e6) { err.textContent = 'File is too large.'; return; }
        const fr = new FileReader(); fr.onload = () => { ta.value = String(fr.result); err.textContent = ''; run(ta.value); }; fr.onerror = () => { err.textContent = 'Could not read the file.'; }; fr.readAsText(f);
      });
    });
    $('#bRes').addEventListener('click', () => {
      UI.confirm('Reset all progress?', 'This deletes your cars, items, credits and achievements and starts a new game. This cannot be undone — export a backup first if unsure.', 'Reset everything', true).then((ok) => {
        if (!ok) return; G.reset(); UI.closeAll(); SV.main.go('garage'); UI.toast('PROGRESS RESET', 'A fresh garage is ready.');
      });
    });
    UI.modal({ title: 'Settings', body: body, foot: [{ label: 'Close', cls: 'ghost' }] });
  };

  /* ================================================================ corrupt save recovery */
  V.recovery = function () {
    const rec = G.recovery; if (!rec) return;
    const body = h('div');
    body.innerHTML = '<p>Your saved progress could not be read (' + esc((rec.issues && rec.issues[0]) || 'data damaged') + '). Nothing was overwritten yet — choose what to do.</p>' + (rec.backup ? '<p class="note">An automatic backup from your previous session is available.</p>' : '<p class="note">No usable backup was found.</p>') + '<textarea class="field" id="imTa" placeholder="Or paste a save JSON here…"></textarea><p class="note warn" id="imErr"></p>';
    const foot = [];
    if (rec.backup) foot.push({ label: 'Restore backup', keep: true, fn: (m) => { if (G.recoverFromBackup()) { m.close(); UI.toast('RESTORED', 'Backup loaded.', 'gold'); } } });
    foot.push({ label: 'Import pasted JSON', cls: 'ghost', keep: true, fn: (m) => { const r = G.importJSON(body.querySelector('#imTa').value); if (r.ok) { m.close(); UI.toast('IMPORTED', 'Save loaded.', 'gold'); } else body.querySelector('#imErr').textContent = 'Import failed: ' + r.error; } });
    foot.push({ label: 'Start fresh', cls: 'danger', keep: true, fn: (m) => { G.startFresh(); m.close(); UI.toast('NEW GAME', 'Started a fresh save.'); } });
    UI.modal({ title: 'Save problem', body: body, foot: foot, nox: true });
  };
})();
