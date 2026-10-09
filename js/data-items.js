/* STREET VAULT — data-items.js : the whole item catalogue.
   Add a new item by adding one line to the matching table. Nothing else needs to change:
   drop pools, collections, inventory and tuning all read from D.ITEMS. */
(function () {
  'use strict';
  const SV = (window.SV = window.SV || {});
  const D = SV.data;
  const R = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythic: 5, secret: 6 };
  const TH = { s: 'street', j: 'jdm', e: 'euro', m: 'midnight', t: 'track', c: 'carbon', L: 'legend' };
  const th = (code) => (code || '').split('').map((c) => TH[c]).filter(Boolean);

  const ITEMS = [];
  const seen = {};
  function add(o) {
    if (seen[o.id]) { console.error('[catalogue] duplicate item id ignored:', o.id); return; }
    seen[o.id] = true;
    ITEMS.push(o);
  }

  /* ---------- compat helpers ---------- */
  const ALL = null;
  const cls = (...c) => ({ cls: c });
  const NOT = (...bad) => ({ cls: ['kei', 'hatch', 'sedan', 'wagon', 'coupe', 'muscle', 'super', 'pickup'].filter((x) => bad.indexOf(x) < 0) });
  const ROOFY = cls('hatch', 'wagon', 'pickup', 'kei');

  /* =========================================================
     CARS — base silhouettes per class + per-car tweaks.
     g = side geometry (viewBox 600x260, ground y=222, car faces right).
     ========================================================= */
  const CG = {
    kei:    { tail: 150, nose: 470, rw: 196, fw: 408, r: 27, sill: 201, ty: 112, hy: 150, ny: 168, roof: 72, rg: 156, rr: 164, rf: 336, cw: 396, doors: 1, sx: 164, sy: 74, rad: [8, 10, 6, 22, 22, 10, 20, 8] },
    hatch:  { tail: 98,  nose: 515, rw: 172, fw: 430, r: 32, sill: 200, ty: 138, hy: 152, ny: 170, roof: 90, rg: 104, rr: 170, rf: 320, cw: 392, doors: 1, sx: 168, sy: 92, rad: [8, 14, 6, 38, 34, 12, 24, 10] },
    sedan:  { tail: 62,  nose: 545, rw: 150, fw: 445, r: 32, sill: 200, ty: 138, hy: 148, ny: 168, roof: 90, rg: 130, rr: 202, rf: 334, cw: 398, doors: 2, sx: 84, sy: 138, rad: [8, 12, 6, 34, 30, 12, 24, 10] },
    wagon:  { tail: 66,  nose: 540, rw: 150, fw: 442, r: 32, sill: 200, ty: 128, hy: 148, ny: 168, roof: 88, rg: 74, rr: 98, rf: 342, cw: 402, doors: 2, sx: 104, sy: 90, rad: [8, 12, 8, 14, 30, 12, 24, 10] },
    coupe:  { tail: 70,  nose: 548, rw: 152, fw: 448, r: 32, sill: 203, ty: 140, hy: 152, ny: 174, roof: 100, rg: 150, rr: 228, rf: 312, cw: 394, doors: 1, sx: 92, sy: 140, rad: [8, 14, 6, 44, 36, 12, 28, 10] },
    muscle: { tail: 56,  nose: 558, rw: 150, fw: 462, r: 34, sill: 204, ty: 138, hy: 146, ny: 164, roof: 94, rg: 168, rr: 240, rf: 324, cw: 400, doors: 1, sx: 78, sy: 138, rad: [8, 12, 6, 40, 30, 10, 20, 10] },
    super:  { tail: 58,  nose: 556, rw: 160, fw: 458, r: 31, sill: 208, ty: 150, hy: 166, ny: 190, roof: 112, rg: 150, rr: 252, rf: 322, cw: 430, doors: 1, sx: 84, sy: 150, rad: [8, 16, 10, 56, 44, 12, 34, 10] },
    pickup: { tail: 58,  nose: 540, rw: 146, fw: 446, r: 36, sill: 197, ty: 128, hy: 134, ny: 156, roof: 72, rg: 250, rr: 254, rf: 340, cw: 400, doors: 1, sx: 0, sy: 0, rad: [8, 8, 4, 16, 22, 8, 16, 10] },
  };
  /* front/rear-view proportions per class: body width, roof y, roof width, cowl y */
  const FV = {
    kei:    { bw: 204, roofY: 80,  roofW: 160, hoodY: 146 },
    hatch:  { bw: 246, roofY: 104, roofW: 176, hoodY: 152 },
    sedan:  { bw: 254, roofY: 106, roofW: 170, hoodY: 152 },
    wagon:  { bw: 254, roofY: 100, roofW: 190, hoodY: 152 },
    coupe:  { bw: 262, roofY: 114, roofW: 162, hoodY: 160 },
    muscle: { bw: 278, roofY: 112, roofW: 172, hoodY: 156 },
    super:  { bw: 286, roofY: 130, roofW: 148, hoodY: 168 },
    pickup: { bw: 272, roofY: 92,  roofW: 192, hoodY: 142 },
  };

  /* id, name, brand, rarity, themes, class, factory colour, headlight style, tail style, description, geometry overrides */
  const CARS = [
    ['kei_run',   'Kei-Run',          'Hoshi',    'common',    'sj',  'kei',    '#e8c33a', 'round', 'box',  'A boxy kei van with far more attitude than engine.', {}],
    ['sprint',    'Sprint GT',        'Kazan',    'common',    'sj',  'hatch',  '#e9ecef', 'round', 'bar',  'Lightweight hot hatch. Everyone’s first project.', {}],
    ['metro',     'Metro 1.2',        'Orbit',    'common',    's',   'hatch',  '#5d7fa6', 'box',   'box',  'Honest city runabout, begging for a wide body.', { roof: 86, rf: 326, nose: 508, ny: 172, rg: 110 }],
    ['ranger',    'Ranger 4x4',       'Dust',     'uncommon',  's',   'pickup', '#7a8f5a', 'box',   'box',  'Work truck with a lift kit and a coat of dirt.', {}],
    ['kombi',     'Kombi 2.0',        'Brenner',  'uncommon',  'e',   'wagon',  '#2f4f6f', 'wide',  'bar',  'Long roof, longer motorway legs.', {}],
    ['berlina',   'Berlina S',        'Aurelian', 'uncommon',  'e',   'sedan',  '#6b1e2a', 'wide',  'bar',  'Four-door elegance with a firm ride.', {}],
    ['rei86',     'Rei-86',           'Tatsu',    'rare',      'j',   'coupe',  '#f4f4f2', 'pop',   'bar',  'Rear-drive coupe that lives sideways.', { roof: 104, rr: 222 }],
    ['vanta',     'Muscle V8',        'Vanta',    'rare',      's',   'muscle', '#1d3557', 'round', 'bar',  'Big engine, bigger hood, no subtlety.', {}],
    ['raiden',    'Raiden Turbo',     'Kazan',    'rare',      'jt',  'hatch',  '#2563eb', 'slit',  'box',  'Rally-bred hatch with a hood scoop and bad manners.', { roof: 94, rf: 326, rr: 174, cw: 396, nose: 520 }],
    ['nordhaus',  'Nordhaus GT-4',    'Nordhaus', 'rare',      'e',   'coupe',  '#a8b0ba', 'wide',  'bar',  'Grand tourer, quiet inside and loud outside.', { roof: 98, nose: 552, hy: 150 }],
    ['orochi',    'Orochi RX',        'Hoshi',    'epic',      'jm',  'coupe',  '#6d28d9', 'pop',   'round', 'Rotary-powered wide-body that screams past 9,000 rpm.', { tail: 64, roof: 104, rg: 142, rr: 222, rf: 306, sill: 205, ny: 178 }],
    ['fulmine',   'Fulmine',          'Strada',   'epic',      'e',   'super',  '#dc2626', 'slit',  'bar',  'Wedge-shaped Italian-style exotic. Dramatic from every angle.', { roof: 114, rr: 258, rf: 326 }],
    ['apex',      'Apex GT',          'Volt',     'epic',      't',   'super',  '#facc15', 'slit',  'bar',  'Track weapon with homologation-special aero.', { roof: 118, cw: 434, ny: 192, rr: 262, tail: 54, rf: 330 }],
    ['phantom',   'Phantom',          'Kage',     'legendary', 'mL',  'coupe',  '#0b0b10', 'slit',  'bar',  'Midnight-run legend. Nobody has seen it in daylight.', { tail: 60, nose: 556, roof: 106, rr: 232, rf: 318, sill: 206, ny: 180, hy: 154 }],
    ['rennen',    'Typ-Rennen RS',    'Brenner',  'legendary', 'etL', 'coupe',  '#e5e7eb', 'round', 'round', 'Flat-six, ducktail, zero compromises.', { roof: 102, nose: 540, tail: 74, rg: 156, rr: 232, rf: 308 }],
    ['ryujin',    'Ryujin GT-R',      'Tatsu',    'mythic',    'jL',  'super',  '#2b6cff', 'slit',  'round', 'Twin-turbo dragon. Holds the touge record forever.', { roof: 112, nose: 560, tail: 56, rr: 250, ny: 188 }],
    ['spectre',   'Carbon Spectre',   'Spectre',  'mythic',    'cL',  'super',  '#2a2d33', 'slit',  'bar',  'Hand-laid carbon hypercar. Weighs less than its wing.', { roof: 108, rr: 246, rf: 320, nose: 562, ny: 192, sill: 210, cw: 436 }],
    ['vaultzero', 'Vault Zero',       'Vault',    'secret',    'ctL', 'super',  '#101114', 'slit',  'bar',  'One of one. The car that was never supposed to be in the vault.', { roof: 106, nose: 566, tail: 52, rr: 244, rf: 318, ny: 194, sill: 211, r: 32, cw: 440 }],
  ];
  CARS.forEach((c) => {
    const base = CG[c[5]];
    const g = Object.assign({}, base, c[10] || {});
    if (c[10] && (c[10].rr != null || c[10].roof != null) && c[5] !== 'pickup') { g.sx = c[10].sx != null ? c[10].sx : g.sx; }
    add({
      id: c[0], name: c[1], brand: c[2], cat: 'car', slot: null, rar: R[c[3]], th: th(c[4]),
      desc: c[9], compat: ALL,
      car: { cls: c[5], color: c[6], g: g, fv: FV[c[5]], hl: c[7], tl: c[8] },
    });
  });

  /* =========================================================
     PAINTS  id, name, rarity, themes, finish, c1, c2, c3, description
     finishes: gloss | metallic | matte | pearl | chrome | flip | holo | void
     ========================================================= */
  const PAINTS = [
    ['p_white',    'Signal White',    'common',    's',   'gloss',    '#f1f3f4', null, null, 'Clean factory white.'],
    ['p_black',    'Jet Black',       'common',    'sm',  'gloss',    '#121214', null, null, 'Deep gloss black.'],
    ['p_red',      'Racing Red',      'common',    'sj',  'gloss',    '#d7263d', null, null, 'Classic red that never goes out of style.'],
    ['p_blue',     'Harbor Blue',     'common',    'se',  'gloss',    '#1e56c8', null, null, 'Saturated mid-blue gloss.'],
    ['p_yellow',   'Taxi Yellow',     'common',    'st',  'gloss',    '#f2c500', null, null, 'Impossible to miss.'],
    ['p_gunmetal', 'Gunmetal',        'uncommon',  'se',  'metallic', '#5b6370', null, null, 'Grey metallic with a fine flake.'],
    ['p_brg',      'Racing Green',    'uncommon',  'e',   'metallic', '#0f5a3c', null, null, 'Deep green metallic with old-school roots.'],
    ['p_orange',   'Sunset Orange',   'uncommon',  'sj',  'gloss',    '#f26a1b', null, null, 'Hot orange gloss.'],
    ['p_olive',    'Army Matte',      'uncommon',  'st',  'matte',    '#55603f', null, null, 'Flat olive drab.'],
    ['p_silver',   'Sterling',        'uncommon',  'e',   'metallic', '#b9c0c8', null, null, 'Bright silver metallic.'],
    ['p_stealth',  'Stealth Matte',   'rare',      'mt',  'matte',    '#17181b', null, null, 'Black with no shine at all.'],
    ['p_cement',   'Cement Matte',    'rare',      'te',  'matte',    '#8f949a', null, null, 'Flat concrete grey.'],
    ['p_moon',     'Pearl Moon',      'rare',      'je',  'pearl',    '#f5f1ff', '#cdd8ff', null, 'White pearl with a blue shift.'],
    ['p_merlot',   'Merlot',          'rare',      'e',   'metallic', '#6a1030', null, null, 'Dark red metallic.'],
    ['p_lagoon',   'Lagoon',          'rare',      'jm',  'metallic', '#00a5a8', null, null, 'Teal metallic.'],
    ['p_violet',   'Violet Drift',    'epic',      'jm',  'pearl',    '#6d28d9', '#22d3ee', null, 'Purple to cyan pearl.'],
    ['p_candy',    'Candy Apple',     'epic',      'sj',  'metallic', '#c00020', '#ff4d5e', null, 'Deep candy red with a bright core.'],
    ['p_mirror',   'Mirror Silver',   'epic',      'ct',  'chrome',   '#cfd6dd', null, null, 'Full chrome wrap.'],
    ['p_gold',     'Liquid Gold',     'legendary', 'cL',  'chrome',   '#e2b53c', null, null, 'Gold chrome. Heavy on the eyes.'],
    ['p_flip',     'Midnight Flip',   'legendary', 'mL',  'flip',     '#2a0a5e', '#0ea5a5', '#ff2e88', 'Shifts between violet, teal and pink.'],
    ['p_holo',     'Prism Holo',      'mythic',    'mcL', 'holo',     '#22d3ee', '#a855f7', '#f97316', 'Holographic wrap that moves with the light.'],
    ['p_void',     'Singularity',     'secret',    'mcL', 'void',     '#050507', '#7c5cff', '#22e4ff', 'Black so deep it bends the colours around it.'],
  ];
  PAINTS.forEach((p) => add({
    id: p[0], name: p[1], cat: 'paint', slot: 'paint', rar: R[p[2]], th: th(p[3]), desc: p[8], compat: ALL,
    vis: { finish: p[4], c1: p[5], c2: p[6], c3: p[7] },
  }));

  /* =========================================================
     WHEELS  id, name, rarity, themes, vis, description
     style: steel classic spoke twin mesh disc turbo star deep split hex ring web
     ========================================================= */
  const WHEELS = [
    ['w_steel',   'Steelie 14',         'common',    's',    { style: 'steel',   n: 6,  col: '#8b9098' }, 'Plain steel wheels. Honest and cheap.'],
    ['w_hubcap',  'Hubcap Classic',     'common',    'se',   { style: 'classic', n: 12, col: '#b7bcc4' }, 'Chrome hubcaps over steel.'],
    ['w_sprint5', 'Sprint 5',           'common',    'sj',   { style: 'spoke',   n: 5,  col: '#c4c9d0', w: 7 }, 'Five-spoke cast alloy.'],
    ['w_sprint6', 'Sprint 6',           'common',    'sjt',  { style: 'spoke',   n: 6,  col: '#aeb4bd', w: 5 }, 'Six thinner spokes.'],
    ['w_mesh',    'Mesh 14',            'uncommon',  'e',    { style: 'mesh',    n: 10, col: '#d5d9de' }, 'Cross-spoke mesh in polished alloy.'],
    ['w_twin5',   'Twin-5 Alloy',       'uncommon',  'j',    { style: 'twin',    n: 5,  col: '#c9ced6' }, 'Five paired spokes.'],
    ['w_turbo8',  'Turbo Fan 8',        'uncommon',  'jt',   { style: 'turbo',   n: 8,  col: '#b9c0c9' }, 'Curved blades that look fast standing still.'],
    ['w_disc',    'Aero Disc',          'uncommon',  't',    { style: 'disc',    n: 0,  col: '#9aa1ab' }, 'Smooth disc for low drag.'],
    ['w_star5',   'Star 5',             'uncommon',  'se',   { style: 'star',    n: 5,  col: '#c8cdd4' }, 'Pointed five-star design.'],
    ['w_twin7',   'Twin-7 Forged',      'rare',      'j',    { style: 'twin',    n: 7,  col: '#2b2e34', lip: '#c4c9d0' }, 'Seven paired spokes on a silver lip.'],
    ['w_blade10', 'Blade 10',           'rare',      'jt',   { style: 'spoke',   n: 10, col: '#1a1c20', w: 4 }, 'Ten fine blades in satin black.'],
    ['w_split5',  'Split-5',            'rare',      'e',    { style: 'split',   n: 5,  col: '#c4c9d0' }, 'Each spoke splits into a Y.'],
    ['w_deep5',   'Deep Dish 5',        'rare',      'se',   { style: 'deep',    n: 5,  col: '#d8dce2' }, 'Chrome deep-dish with exposed bolts.'],
    ['w_hex',     'Hex Bolt',           'rare',      'mt',   { style: 'hex',     n: 6,  col: '#2a2c31' }, 'Hex-pattern rim with lug bolts.'],
    ['w_turbo12', 'Turbo Fan 12',       'rare',      'm',    { style: 'turbo',   n: 12, col: '#20222a' }, 'Dense twelve-blade fan.'],
    ['w_bronze',  'Bronze Mesh',        'epic',      'ej',   { style: 'mesh',    n: 14, col: '#8a5a2b', lip: '#d9a21b' }, 'Bronze cross-spoke with a gold lip.'],
    ['w_split6',  'Split-6 Gold',       'epic',      'e',    { style: 'split',   n: 6,  col: '#d9a21b' }, 'Gold six-split spokes.'],
    ['w_star8',   'Razor Star',         'epic',      'mt',   { style: 'star',    n: 8,  col: '#2b2e34', lip: '#d7263d' }, 'Eight sharp points with a red lip.'],
    ['w_drilled', 'Drilled Disc',       'epic',      't',    { style: 'disc',    n: 10, col: '#1a1c20' }, 'Disc face drilled for brake cooling.'],
    ['w_dish6',   'Gold Deep Dish 6',   'epic',      'ejm',  { style: 'deep',    n: 6,  col: '#d9a21b' }, 'Gold six-spoke deep-dish.'],
    ['w_carbon5', 'Carbon-5',           'legendary', 'ctL',  { style: 'spoke',   n: 5,  col: '#17181b', w: 8, carbon: 1, lip: '#9fb4c9' }, 'Carbon fibre five-spoke.'],
    ['w_forged3', 'Forged 3-Piece',     'legendary', 'jeL',  { style: 'spoke',   n: 8,  col: '#2b2e34', w: 5, lip: '#d9a21b', deepLip: 1 }, 'Three-piece forged with a gold barrel.'],
    ['w_neonring','Neon Ring',          'legendary', 'mL',   { style: 'ring',    n: 6,  col: '#101018', glow: '#22e4ff' }, 'Rim with a glowing light ring.'],
    ['w_spider',  'Spiderweb',          'mythic',    'sejL', { style: 'web',     n: 16, col: '#e7eaee', lip: '#e7eaee' }, 'Sixteen-strand spiderweb in polished steel.'],
    ['w_event',   'Event Horizon',      'secret',    'sjL',  { style: 'ring',    n: 5,  col: '#050507', glow: '#a855f7', fixed: 1 }, 'A rim that swallows light. Cannot be recoloured.'],
  ];
  WHEELS.forEach((w) => add({
    id: w[0], name: w[1], cat: 'wheels', slot: 'wheels', rar: R[w[2]], th: th(w[3]), desc: w[5], compat: ALL, vis: w[4],
  }));

  /* =========================================================
     BODY  id, name, slot, rarity, themes, material, compat, description
     ========================================================= */
  const BODY = [
    ['b_fb_lip',   'Street Lip',          'fbumper', 'common',    's',   'dark',   ALL,                         'Small front lip.'],
    ['b_fb_split', 'Sport Splitter',      'fbumper', 'uncommon',  'sj',  'dark',   NOT('pickup'),               'Splitter with a cooling intake.'],
    ['b_fb_track', 'Track Splitter',      'fbumper', 'rare',      't',   'dark',   NOT('pickup', 'kei'),        'Flat race splitter with canards.'],
    ['b_fb_cnose', 'Carbon Aero Nose',    'fbumper', 'epic',      'c',   'carbon', cls('coupe', 'super', 'muscle', 'sedan', 'hatch'), 'Full carbon front end.'],
    ['b_rb_diff',  'Street Diffuser',     'rbumper', 'common',    's',   'dark',   NOT('pickup', 'kei'),        'Finned rear diffuser.'],
    ['b_rb_track', 'Track Diffuser',      'rbumper', 'rare',      't',   'dark',   NOT('pickup', 'kei'),        'Tall-fin race diffuser.'],
    ['b_rb_carbon','Carbon Diffuser',     'rbumper', 'epic',      'c',   'carbon', cls('coupe', 'super', 'sedan', 'hatch', 'muscle'), 'Carbon diffuser with twin exhaust cut-outs.'],
    ['b_sp_lip',   'Trunk Lip',           'spoiler', 'common',    's',   'body',   NOT('pickup'),               'Subtle lip spoiler.'],
    ['b_sp_duck',  'Ducktail',            'spoiler', 'uncommon',  'je',  'body',   cls('coupe', 'muscle', 'sedan', 'super', 'hatch'), 'Retro ducktail kick.'],
    ['b_sp_gt',    'GT Wing',             'spoiler', 'rare',      't',   'dark',   cls('coupe', 'sedan', 'hatch', 'muscle', 'super', 'wagon'), 'Upright-mounted GT wing.'],
    ['b_sp_big',   'Time-Attack Wing',    'spoiler', 'epic',      'jt',  'dark',   cls('coupe', 'sedan', 'hatch', 'super', 'muscle'), 'Oversized wing with endplates.'],
    ['b_sp_swan',  'Swan-Neck Wing',      'spoiler', 'legendary', 'cL',  'carbon', cls('coupe', 'sedan', 'super', 'muscle', 'hatch'), 'Swan-neck mounted carbon wing.'],
    ['b_sp_gilded','Gilded Wing',         'spoiler', 'mythic',    'tcL', 'gold',   cls('coupe', 'sedan', 'super', 'muscle', 'hatch'), 'Gold-plated swan-neck wing.'],
    ['b_hd_vent',  'Vented Hood',         'hood',    'uncommon',  'sj',  'dark',   ALL,                         'Heat-extractor hood vents.'],
    ['b_hd_scoop', 'Scoop Hood',          'hood',    'rare',      'jt',  'body',   NOT('super'),                'Raised hood with a big intake.'],
    ['b_hd_carbon','Carbon Hood',         'hood',    'epic',      'c',   'carbon', ALL,                         'Lightweight carbon hood.'],
    ['b_sk_street','Side Skirts',         'skirts',  'common',    's',   'body',   ALL,                         'Colour-matched side skirts.'],
    ['b_sk_aero',  'Aero Skirts',         'skirts',  'rare',      'jt',  'dark',   NOT('pickup'),               'Ground-effect skirts with fins.'],
    ['b_sk_carbon','Carbon Sills',        'skirts',  'epic',      'c',   'carbon', NOT('pickup'),               'Carbon sills with an accent line.'],
    ['b_fl_wide',  'Wide Arches',         'flares',  'rare',      'jm',  'body',   ALL,                         'Wide-body fender flares.'],
    ['b_fl_rivet', 'Riveted Flares',      'flares',  'epic',      'tm',  'dark',   ALL,                         'Bolt-on race flares with rivets.'],
    ['b_mr_sport', 'Sport Mirrors',       'mirrors', 'uncommon',  'sj',  'dark',   ALL,                         'Slim sport mirrors.'],
    ['b_mr_carbon','Carbon Mirrors',      'mirrors', 'rare',      'c',   'carbon', ALL,                         'Carbon mirror caps.'],
  ];
  BODY.forEach((b) => add({
    id: b[0], name: b[1], cat: 'body', slot: b[2], rar: R[b[3]], th: th(b[4]), desc: b[7], compat: b[6],
    vis: { style: b[0].replace(/^b_/, ''), mat: b[5] },
  }));

  /* =========================================================
     LIGHTS
     ========================================================= */
  const LIGHTS = [
    ['l_h_white',  'Xenon White',       'headlight', 'common',    'se', { col: '#f7fbff' }, 'Crisp white headlights.'],
    ['l_h_ice',    'Ice Blue HID',      'headlight', 'uncommon',  'e',  { col: '#a6dcff' }, 'Cool blue-white beam.'],
    ['l_h_amber',  'Rally Amber',       'headlight', 'uncommon',  'jt', { col: '#ffb347' }, 'Warm amber rally lamps.'],
    ['l_h_toxic',  'Toxic Green',       'headlight', 'rare',      'm',  { col: '#7dff3a' }, 'Radioactive green beams.'],
    ['l_h_violet', 'Violet Beam',       'headlight', 'epic',      'm',  { col: '#c08cff' }, 'Purple projector lights.'],
    ['l_n_cyan',   'Cyan Underglow',    'neon',      'rare',      'sm', { col: '#22e4ff' }, 'Cyan neon under the car.'],
    ['l_n_pink',   'Pink Underglow',    'neon',      'rare',      'm',  { col: '#ff4fa3' }, 'Hot pink neon.'],
    ['l_n_acid',   'Acid Underglow',    'neon',      'epic',      'sm', { col: '#c8ff2e' }, 'Acid-green neon.'],
    ['l_n_rgb',    'RGB Cycle',         'neon',      'legendary', 'mL', { col: '#ff2e88', anim: 1 }, 'Underglow that cycles through colours.'],
    ['l_lb_roof',  'Roof Light Bar',    'lightbar',  'rare',      'st', { style: 'roof', col: '#fff3c4' }, 'Off-road light bar on the roof.'],
    ['l_lb_pods',  'Grille Light Pods', 'lightbar',  'epic',      'jt', { style: 'pods', col: '#fff3c4' }, 'Auxiliary rally pods on the front end.'],
  ];
  LIGHTS.forEach((l) => add({
    id: l[0], name: l[1], cat: 'lights', slot: l[2], rar: R[l[3]], th: th(l[4]), desc: l[6], compat: ALL, vis: l[5],
  }));

  /* =========================================================
     DECALS
     ========================================================= */
  const DECALS = [
    ['d_stripe_tw',  'Twin Racing Stripes', 'livery',  'common',    'st', { style: 'twin',   cols: ['#f2f4f5'] }, ALL, 'Two stripes over the roof and hood.'],
    ['d_stripe_side','Side Stripe',         'livery',  'common',    'sj', { style: 'side',   cols: ['#f2f4f5'] }, ALL, 'Waist-line side stripe.'],
    ['d_lv_rally',   'Rally Livery',        'livery',  'uncommon',  'jt', { style: 'rally',  cols: ['#1e56c8', '#f2c500'] }, ALL, 'Blue lower half with yellow accents.'],
    ['d_lv_powder',  'Powder Racing',       'livery',  'rare',      'jt', { style: 'powder', cols: ['#7fc4ff', '#ff8a1f', '#f2f4f5'] }, ALL, 'Light blue and orange endurance stripes.'],
    ['d_lv_checker', 'Checker Flow',        'livery',  'rare',      't',  { style: 'checker',cols: ['#f2f4f5', '#0e0f11'] }, ALL, 'Chequered flag sweeping along the sills.'],
    ['d_lv_grid',    'Neon Grid',           'livery',  'epic',      'm',  { style: 'grid',   cols: ['#22e4ff', '#ff2e88'] }, ALL, 'Synthwave grid across the lower body.'],
    ['d_lv_sakura',  'Sakura Wave',         'livery',  'epic',      'j',  { style: 'sakura', cols: ['#ffb3d1', '#ffffff'] }, ALL, 'Cherry blossom petals on a pink wave.'],
    ['d_lv_tri',     'Tricolor Heritage',   'livery',  'epic',      'e',  { style: 'tri',    cols: ['#1d4ed8', '#f8fafc', '#dc2626'] }, ALL, 'Three-band heritage stripe.'],
    ['d_lv_tiger',   'Tiger Slash',         'livery',  'legendary', 'tL', { style: 'tiger',  cols: ['#ff7a00', '#0e0f11'] }, ALL, 'Aggressive diagonal slashes.'],
    ['d_lv_dragon',  'Dragon Scale',        'livery',  'mythic',    'jL', { style: 'scale',  cols: ['#d9a21b', '#9b1c1c'] }, cls('coupe', 'super', 'muscle'), 'Gold and crimson scales that climb the doors.'],
    ['d_st_number',  'Race Number',         'sticker', 'common',    't',  { style: 'number', cols: ['#f2f4f5', '#0e0f11'], text: '27' }, ALL, 'Door roundel with a race number.'],
    ['d_st_star',    'Star Roundel',        'sticker', 'common',    'sj', { style: 'star',   cols: ['#f2f4f5', '#1d4ed8'] }, ALL, 'Star in a circle.'],
    ['d_st_circle',  'Rising Circle',       'sticker', 'uncommon',  'j',  { style: 'circle', cols: ['#d7263d', '#f2f4f5'] }, ALL, 'Bold red circle on the door.'],
    ['d_st_flame',   'Fender Flames',       'sticker', 'uncommon',  's',  { style: 'flame',  cols: ['#ff7a00', '#ffd400'] }, ALL, 'Flames licking back from the front wheel.'],
    ['d_st_bolt',    'Lightning Bolt',      'sticker', 'rare',      'sm', { style: 'bolt',   cols: ['#ffd400', '#0e0f11'] }, ALL, 'Yellow bolt on the door.'],
    ['d_st_skull',   'Vault Skull',         'sticker', 'epic',      'm',  { style: 'skull',  cols: ['#f2f4f5', '#0e0f11'] }, ALL, 'Skull with crossed wrenches.'],
    ['d_st_crest',   'Vault Crest',         'sticker', 'legendary', 'cL', { style: 'crest',  cols: ['#c8ff2e', '#0e0f11'] }, ALL, 'Shield crest of the Vault.'],
  ];
  DECALS.forEach((d) => add({
    id: d[0], name: d[1], cat: 'decal', slot: d[2], rar: R[d[3]], th: th(d[4]), desc: d[7], compat: d[6], vis: d[5],
  }));

  /* =========================================================
     PLATES
     ========================================================= */
  const PLATES = [
    ['pl_std',    'Standard White',  'common',    's',   { bg: '#f4f4f0', fg: '#16171a', frame: null,     style: 'std' },   'The usual white plate.'],
    ['pl_amber',  'Amber Plate',     'common',    'se',  { bg: '#e5b83a', fg: '#16171a', frame: null,     style: 'std' },   'Classic amber plate.'],
    ['pl_black',  'Black Plate',     'uncommon',  'sm',  { bg: '#121214', fg: '#e9e9e9', frame: null,     style: 'std' },   'Black plate with white text.'],
    ['pl_green',  'Greenline',       'uncommon',  'j',   { bg: '#1f7a4a', fg: '#ffffff', frame: null,     style: 'std' },   'Green commercial-style plate.'],
    ['pl_euro',   'Euro Stripe',     'uncommon',  'e',   { bg: '#f4f4f0', fg: '#16171a', frame: null,     style: 'euro' },  'Plate with a blue side strip.'],
    ['pl_chrome', 'Chrome Frame',    'rare',      'et',  { bg: '#f4f4f0', fg: '#16171a', frame: '#dfe3e8', style: 'std' },  'Polished chrome frame.'],
    ['pl_carbon', 'Carbon Frame',    'rare',      'c',   { bg: '#0f1013', fg: '#c8ff2e', frame: 'carbon', style: 'std' },   'Carbon frame with lime text.'],
    ['pl_neon',   'Neon Edge',       'epic',      'm',   { bg: '#0b0b14', fg: '#22e4ff', frame: '#22e4ff', glow: 1, style: 'std' }, 'Glowing neon plate.'],
    ['pl_gold',   'Gold Frame',      'legendary', 'seL', { bg: '#f4f4f0', fg: '#16171a', frame: '#d9a21b', style: 'std' },  'Gold-plated frame.'],
    ['pl_holo',   'Holo Plate',      'mythic',    'cL',  { bg: '#c8d6ff', fg: '#16171a', frame: '#e7eaee', style: 'holo' },  'Holographic plate that shimmers.'],
    ['pl_vault',  'VAULT-0',         'secret',    'eL',  { bg: '#050507', fg: '#c8ff2e', frame: '#c8ff2e', text: 'VAULT-0', style: 'std' }, 'Reserved plate, issued to no one.'],
  ];
  PLATES.forEach((p) => add({
    id: p[0], name: p[1], cat: 'plate', slot: 'plate', rar: R[p[2]], th: th(p[3]), desc: p[5], compat: ALL, vis: p[4],
  }));

  /* =========================================================
     EXTRAS
     ========================================================= */
  const EXTRAS = [
    ['e_tint_light', 'Light Tint',        'tint',      'common',    's',  { op: 0.72 }, ALL, 'Light window film.'],
    ['e_tint_dark',  'Dark Tint',        'tint',      'uncommon',  'sm', { op: 0.9 },  ALL, 'Dark window film.'],
    ['e_tint_black', 'Blackout Tint',    'tint',      'rare',      'm',  { op: 0.985 }, ALL, 'You cannot see anything inside.'],
    ['e_tint_blue',  'Blue Chrome Tint', 'tint',      'epic',      'mc', { op: 0.9, tone: '#2a5bff', mirror: 1 }, ALL, 'Mirror-blue reflective film.'],
    ['e_fx_speed',   'Speed Lines',      'effect',    'uncommon',  'st', { style: 'speed' },  ALL, 'Motion lines trailing the car.'],
    ['e_fx_smoke',   'Burnout Smoke',    'effect',    'rare',      'sm', { style: 'smoke' },  ALL, 'Tyre smoke from the rear wheel.'],
    ['e_fx_sparks',  'Exhaust Sparks',   'effect',    'rare',      't',  { style: 'sparks' }, ALL, 'Sparks from the rear underbody.'],
    ['e_fx_flames',  'Exhaust Flames',   'effect',    'epic',      'jt', { style: 'flames' }, ALL, 'Blue and orange exhaust flames.'],
    ['e_fx_aura',    'Vault Aura',       'effect',    'legendary', 'L',  { style: 'aura' },   ALL, 'A glow around the whole car.'],
    ['e_ac_antenna', 'Antenna Flag',     'accessory', 'common',    's',  { style: 'antenna' }, ALL, 'Whip antenna with a small flag.'],
    ['e_ac_rack',    'Roof Rack',        'accessory', 'common',    's',  { style: 'rack' },    ROOFY, 'Utility roof rack.'],
    ['e_ac_tow',     'Tow Strap',        'accessory', 'uncommon',  'tj', { style: 'tow' },     ALL, 'Red tow strap on the front bumper.'],
    ['e_ac_surf',    'Surfboard Rack',   'accessory', 'rare',      's',  { style: 'surf' },    ROOFY, 'Roof rack with a surfboard.'],
    ['e_ac_scoop',   'Roof Scoop',       'accessory', 'rare',      'tc', { style: 'scoop' },   cls('coupe', 'super', 'sedan', 'muscle', 'hatch'), 'Roof-mounted air scoop.'],
  ];
  EXTRAS.forEach((e) => add({
    id: e[0], name: e[1], cat: 'extra', slot: e[2], rar: R[e[3]], th: th(e[4]), desc: e[7], compat: e[6], vis: e[5],
  }));

  /* =========================================================
     EXCLUSIVE collection rewards (no container drops them)
     ========================================================= */
  add({ id: 'x_jdm_plate', name: 'Legends Badge Plate', cat: 'plate', slot: 'plate', rar: R.epic, th: [], excl: true,
        desc: 'Awarded for completing JDM LEGENDS.', compat: ALL,
        vis: { bg: '#f4f4f0', fg: '#d7263d', frame: '#d7263d', style: 'std', text: 'LEGEND' } });
  add({ id: 'x_euro_wheels', name: 'Concours Wire', cat: 'wheels', slot: 'wheels', rar: R.epic, th: [], excl: true,
        desc: 'Awarded for completing EURO CLASSICS.', compat: ALL,
        vis: { style: 'web', n: 20, col: '#d6b46a', lip: '#d6b46a' } });
  add({ id: 'x_street_livery', name: 'Icon Hood Stripe', cat: 'decal', slot: 'livery', rar: R.epic, th: [], excl: true,
        desc: 'Awarded for completing STREET ICONS.', compat: ALL,
        vis: { style: 'twin', cols: ['#c8ff2e', '#0e0f11'] } });
  add({ id: 'x_midnight_neon', name: 'Cult Underglow', cat: 'lights', slot: 'neon', rar: R.epic, th: [], excl: true,
        desc: 'Awarded for completing MIDNIGHT CULT.', compat: ALL,
        vis: { col: '#b46bff' } });
  add({ id: 'x_track_wing', name: 'Division Wing', cat: 'body', slot: 'spoiler', rar: R.legendary, th: [], excl: true,
        desc: 'Awarded for completing TRACK DIVISION.', compat: cls('coupe', 'sedan', 'hatch', 'muscle', 'super', 'wagon'),
        vis: { style: 'sp_gt', mat: 'carbon' } });
  add({ id: 'x_carbon_paint', name: 'Vault Master', cat: 'paint', slot: 'paint', rar: R.legendary, th: [], excl: true,
        desc: 'Awarded for completing CARBON VAULT.', compat: ALL,
        vis: { finish: 'chrome', c1: '#1b1d22' } });

  /* Extra theme tags (union with the tags above): widens thin pools so every container
     has variety at every rarity, and fills the Legendary Drop short-list. */
  const MORE_THEMES = {
    p_white: 'set', p_blue: 'm', l_h_white: 'm', pl_std: 'mt', e_tint_light: 'mt', b_fb_lip: 't', b_sk_street: 't',
    w_steel: 't', w_sprint6: 'm', d_stripe_tw: 'm',
    p_gunmetal: 'mc', p_silver: 'c', w_disc: 'c', w_star5: 'm', b_mr_sport: 'mc', b_hd_vent: 'mc', l_h_ice: 'mc', e_fx_speed: 'm', l_h_amber: 'c',
    rei86: 'L', nordhaus: 'L', raiden: 'L', vanta: 'L', w_twin7: 'L', p_moon: 'L', d_lv_powder: 'L', l_n_cyan: 'L', b_sp_gt: 'L', pl_carbon: 'L', e_fx_smoke: 'L',
    orochi: 'L', fulmine: 'L', apex: 'L', p_violet: 'L', p_candy: 'L', p_mirror: 'L', w_star8: 'L', w_bronze: 'L', d_lv_sakura: 'L',
    d_lv_tri: 'L', e_fx_aura: 'sj', d_lv_tiger: 'sj', l_n_acid: 'L', pl_neon: 'L', e_fx_flames: 'L', b_fb_cnose: 'L',
  };
  ITEMS.forEach((it) => {
    if (MORE_THEMES[it.id]) it.th = Array.from(new Set(it.th.concat(th(MORE_THEMES[it.id]))));
  });

  /* =========================================================
     DERIVED FIELDS (value, sell price, fragments, craft cost)
     ========================================================= */
  ITEMS.forEach((it) => {
    const rar = D.RARITIES[it.rar], cat = D.CATEGORIES[it.cat];
    it.rid = rar.id;
    it.value = Math.max(5, Math.round((rar.base * cat.mult) / 5) * 5);
    it.sell = Math.max(1, Math.floor(it.value * cat.sell));
    it.frag = rar.frag;
    it.craft = it.excl ? 0 : rar.craft;      // 0 = cannot be crafted
    it.canSell = true;
    it.canEquip = it.cat !== 'car';
  });

  D.ITEMS = ITEMS;
  D.ITEM = {};
  ITEMS.forEach((it) => { D.ITEM[it.id] = it; });
  D.CARS = ITEMS.filter((i) => i.cat === 'car');
  D.START_CAR = 'sprint';

  /* ---------- compatibility ---------- */
  D.compatible = function (item, carId) {
    if (!item || !item.canEquip) return false;
    const c = D.ITEM[carId];
    if (!c || !c.car) return false;
    if (!item.compat) return true;
    if (item.compat.cars) return item.compat.cars.indexOf(carId) >= 0;
    if (item.compat.cls) return item.compat.cls.indexOf(c.car.cls) >= 0;
    return true;
  };

  /* ---------- drop pools (derived once, from data) ---------- */
  D.POOL = {};          // containerId -> array(7) of arrays of items
  D.CONTAINERS.forEach((cn) => {
    const pool = [[], [], [], [], [], [], []];
    ITEMS.forEach((it) => {
      if (it.excl) return;
      if (it.th.some((t) => cn.themes.indexOf(t) >= 0)) pool[it.rar].push(it);
    });
    D.POOL[cn.id] = pool;
  });
  D.itemContainers = function (it) {
    return D.CONTAINERS.filter((cn) => D.POOL[cn.id][it.rar].indexOf(it) >= 0 && cn.table[it.rar] > 0);
  };
  ITEMS.forEach((it) => { it.containers = it.excl ? [] : D.itemContainers(it).map((c) => c.id); });

  /* collections: item membership is derived from the item's theme tags */
  D.COLLECTIONS.forEach((col) => {
    col.items = ITEMS.filter((it) => !it.excl && it.rar !== 6 && it.th.indexOf(col.theme) >= 0).map((it) => it.id);
  });

  /* ---------- self-check (runs at load; failures are loud but non-fatal) ---------- */
  D.validate = function () {
    const errs = [];
    D.CONTAINERS.forEach((cn) => {
      const sum = cn.table.reduce((a, b) => a + b, 0);
      if (cn.table.length !== 7) errs.push(cn.id + ': table length');
      if (sum !== 1000) errs.push(cn.id + ': probabilities sum to ' + sum / 10 + '%');
      cn.table.forEach((w, i) => { if (w > 0 && !D.POOL[cn.id][i].length) errs.push(cn.id + ': empty pool for ' + D.RARITIES[i].id); });
    });
    ITEMS.forEach((it) => {
      if (!it.excl && !it.containers.length) errs.push(it.id + ': never drops');
      if (it.cat !== 'car' && !D.SLOTS[it.slot]) errs.push(it.id + ': unknown slot');
      if (it.cat !== 'car' && D.SLOTS[it.slot].cat !== it.cat) errs.push(it.id + ': slot/category mismatch');
    });
    D.COLLECTIONS.forEach((col) => { if (!D.ITEM[col.reward.item]) errs.push(col.id + ': reward item missing'); });
    return errs;
  };
  const errs = D.validate();
  if (errs.length) console.error('[catalogue] problems:\n' + errs.join('\n'));
  D.catalogueErrors = errs;
})();
