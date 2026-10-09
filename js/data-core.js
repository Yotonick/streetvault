/* STREET VAULT — data-core.js : rarities, economy, slots, containers, collections.
   Everything the game balances on lives in the data files (no numbers hidden in logic). */
(function () {
  'use strict';
  const SV = (window.SV = window.SV || {});
  const D = (SV.data = SV.data || {});

  /* ---------- RARITIES ---------- */
  D.RARITIES = [
    { id: 'common',    name: 'COMMON',    color: '#9aa4b2', base: 30,    frag: 1,   craft: 8,    xp: 2,   score: 1,  carScore: 10  },
    { id: 'uncommon',  name: 'UNCOMMON',  color: '#34d6c1', base: 90,    frag: 3,   craft: 24,   xp: 5,   score: 2,  carScore: 20  },
    { id: 'rare',      name: 'RARE',      color: '#4aa3ff', base: 260,   frag: 8,   craft: 70,   xp: 12,  score: 4,  carScore: 40  },
    { id: 'epic',      name: 'EPIC',      color: '#a66bff', base: 800,   frag: 20,  craft: 200,  xp: 30,  score: 8,  carScore: 80  },
    { id: 'legendary', name: 'LEGENDARY', color: '#ffb627', base: 2200,  frag: 60,  craft: 550,  xp: 80,  score: 16, carScore: 160 },
    { id: 'mythic',    name: 'MYTHIC',    color: '#ff3b6b', base: 6000,  frag: 180, craft: 1600, xp: 200, score: 32, carScore: 320 },
    { id: 'secret',    name: 'SECRET',    color: '#f5f7ff', base: 15000, frag: 500, craft: 0,    xp: 500, score: 64, carScore: 640 },
  ];
  D.RAR = {};
  D.RARITIES.forEach((r, i) => { r.idx = i; D.RAR[r.id] = r; });

  /* ---------- ECONOMY ---------- */
  D.ECON = {
    startCredits: 3000,
    startTokens: 6,
    startBoxes: { street: 1 },
    exchange: [
      { id: 'fx_credits', label: 'Scrap to credits', give: { fragments: 25 }, get: { credits: 250 } },
      { id: 'fx_token',   label: 'Forge a token',    give: { fragments: 50 }, get: { tokens: 1 } },
    ],
    buyQuantities: [1, 5],
    maxProjectsPerCar: 6,
    maxPlateText: 8,
  };

  /* ---------- CATEGORIES (item category -> value multiplier, sell fraction) ---------- */
  D.CATEGORIES = {
    car:    { label: 'CARS',    mult: 5,   sell: 0.5 },
    paint:  { label: 'PAINT',   mult: 1,   sell: 0.35 },
    wheels: { label: 'WHEELS',  mult: 1.4, sell: 0.4 },
    body:   { label: 'BODY',    mult: 1.3, sell: 0.4 },
    lights: { label: 'LIGHTS',  mult: 1,   sell: 0.35 },
    decal:  { label: 'DECALS',  mult: 0.9, sell: 0.35 },
    plate:  { label: 'PLATES',  mult: 0.8, sell: 0.35 },
    extra:  { label: 'EXTRAS',  mult: 1.1, sell: 0.35 },
  };

  /* ---------- SLOTS (where a cosmetic item is installed on a build) ---------- */
  D.SLOTS = {
    paint:     { cat: 'paint',  label: 'Paint' },
    wheels:    { cat: 'wheels', label: 'Wheels' },
    fbumper:   { cat: 'body',   label: 'Front bumper' },
    rbumper:   { cat: 'body',   label: 'Rear bumper' },
    spoiler:   { cat: 'body',   label: 'Spoiler' },
    hood:      { cat: 'body',   label: 'Hood' },
    skirts:    { cat: 'body',   label: 'Side skirts' },
    flares:    { cat: 'body',   label: 'Arch flares' },
    mirrors:   { cat: 'body',   label: 'Mirrors' },
    headlight: { cat: 'lights', label: 'Headlights' },
    neon:      { cat: 'lights', label: 'Underglow' },
    lightbar:  { cat: 'lights', label: 'Light pods' },
    livery:    { cat: 'decal',  label: 'Livery' },
    sticker:   { cat: 'decal',  label: 'Sticker' },
    plate:     { cat: 'plate',  label: 'Plate' },
    tint:      { cat: 'extra',  label: 'Window tint' },
    effect:    { cat: 'extra',  label: 'Effect' },
    accessory: { cat: 'extra',  label: 'Accessory' },
  };
  D.SLOT_KEYS = Object.keys(D.SLOTS);

  /* Customize tabs -> categories */
  D.TABS = [
    { id: 'paint',  label: 'PAINT',  cat: 'paint' },
    { id: 'wheels', label: 'WHEELS', cat: 'wheels' },
    { id: 'body',   label: 'BODY',   cat: 'body' },
    { id: 'lights', label: 'LIGHTS', cat: 'lights' },
    { id: 'decal',  label: 'DECALS', cat: 'decal' },
    { id: 'plate',  label: 'PLATES', cat: 'plate' },
    { id: 'extra',  label: 'EXTRAS', cat: 'extra' },
  ];

  /* Free wheel colours (any owned wheel can be recoloured with these) */
  D.WHEEL_COLORS = [
    { id: 'stock',    name: 'Stock',    hex: null },
    { id: 'graphite', name: 'Graphite', hex: '#2b2e34' },
    { id: 'silver',   name: 'Silver',   hex: '#c4c9d0' },
    { id: 'white',    name: 'White',    hex: '#f2f4f5' },
    { id: 'black',    name: 'Black',    hex: '#0e0f11' },
    { id: 'gold',     name: 'Gold',     hex: '#d9a21b' },
    { id: 'bronze',   name: 'Bronze',   hex: '#8a5a2b' },
    { id: 'red',      name: 'Red',      hex: '#d7263d' },
    { id: 'blue',     name: 'Blue',     hex: '#1e56c8' },
    { id: 'lime',     name: 'Lime',     hex: '#c8ff2e' },
    { id: 'pink',     name: 'Pink',     hex: '#ff4fa3' },
  ];

  /* ---------- XP / LEVELS ---------- */
  D.XP = {
    maxLevel: 50,
    perLevel: (lvl) => 100 + 50 * (lvl - 1),   // xp needed to go from lvl to lvl+1
    open: 25,         // per container opened
    newItem: 10,      // per new item
    levelCredits: (lvl) => 100 + lvl * 20,
    levelTokenEvery: 5,
  };

  /* ---------- CONTAINERS ----------
     table: probability in tenths of a percent (permille) per rarity, MUST sum to 1000.
     themes: item.th tags that make an item part of this container's pool. */
  D.CONTAINERS = [
    { id: 'street',   name: 'STREET PACK',    tag: 'Entry crate',
      desc: 'Everyday builds and cheap cosmetics. The place every garage starts.',
      cost: { cur: 'credits', amt: 300 },  themes: ['street'],
      table: [520, 280, 130, 50, 15, 4, 1],  pal: { a: '#c8ff2e', b: '#23262c', c: '#ffb627' } },
    { id: 'jdm',      name: 'JDM LEGENDS',    tag: 'Japan import',
      desc: 'Imports, sport body kits, forged wheels and rally liveries from the touge scene.',
      cost: { cur: 'credits', amt: 800 },  themes: ['jdm'],
      table: [400, 280, 170, 90, 40, 18, 2], pal: { a: '#ff3b4d', b: '#f4f4f2', c: '#16171a' } },
    { id: 'euro',     name: 'EURO STYLE',     tag: 'Continental',
      desc: 'Refined sedans and coupes, classic wheels, deep metallic paints and clean body parts.',
      cost: { cur: 'credits', amt: 800 },  themes: ['euro'],
      table: [450, 270, 160, 70, 35, 13, 2], pal: { a: '#d6b46a', b: '#1a1b1f', c: '#6f8fbf' } },
    { id: 'midnight', name: 'MIDNIGHT PACK',  tag: 'After dark',
      desc: 'Dark paints, underglow and night-run liveries. Looks best with the lights off.',
      cost: { cur: 'credits', amt: 1000 }, themes: ['midnight'],
      table: [380, 260, 190, 100, 45, 20, 5], pal: { a: '#b46bff', b: '#10101c', c: '#22e4ff' } },
    { id: 'track',    name: 'TRACK EDITION',  tag: 'Race spec',
      desc: 'Splitters, wings, diffusers and race liveries. Built for lap times, shown at meets.',
      cost: { cur: 'credits', amt: 1000 }, themes: ['track'],
      table: [390, 270, 180, 95, 45, 17, 3], pal: { a: '#ffd400', b: '#1b1c20', c: '#f5f5f5' } },
    { id: 'carbon',   name: 'CARBON VAULT',   tag: 'Premium',
      desc: 'Carbon parts, premium paints and rare wheels. No commons inside.',
      cost: { cur: 'tokens', amt: 6 },      themes: ['carbon'],
      table: [0, 300, 330, 200, 110, 45, 15], pal: { a: '#9fb4c9', b: '#0f1114', c: '#c8ff2e' } },
    { id: 'legend',   name: 'LEGENDARY DROP', tag: 'Limited pool',
      desc: 'A short list of hand-picked prizes. Rare or better, every time.',
      cost: { cur: 'tokens', amt: 15 },     themes: ['legend'],
      table: [0, 0, 400, 330, 180, 70, 20],  pal: { a: '#ffb627', b: '#17130a', c: '#fff1c2' } },
  ];
  D.CONT = {};
  D.CONTAINERS.forEach((c) => { D.CONT[c.id] = c; });

  /* ---------- COLLECTIONS ---------- */
  D.COLLECTIONS = [
    { id: 'jdm',      name: 'JDM LEGENDS',   theme: 'jdm',      desc: 'Imports, turbo hatches and touge-spec parts.',
      reward: { credits: 1500, tokens: 3, xp: 300, item: 'x_jdm_plate' } },
    { id: 'euro',     name: 'EURO CLASSICS', theme: 'euro',     desc: 'Sedans, wagons and coupes with continental taste.',
      reward: { credits: 1500, tokens: 3, xp: 300, item: 'x_euro_wheels' } },
    { id: 'street',   name: 'STREET ICONS',  theme: 'street',   desc: 'The cars and parts that built the scene.',
      reward: { credits: 1200, tokens: 2, xp: 250, item: 'x_street_livery' } },
    { id: 'midnight', name: 'MIDNIGHT CULT', theme: 'midnight', desc: 'Dark paints, neon and night-only liveries.',
      reward: { credits: 2000, tokens: 4, xp: 400, item: 'x_midnight_neon' } },
    { id: 'track',    name: 'TRACK DIVISION', theme: 'track',   desc: 'Wings, splitters and race-day liveries.',
      reward: { credits: 2000, tokens: 4, xp: 400, item: 'x_track_wing' } },
    { id: 'carbon',   name: 'CARBON VAULT',  theme: 'carbon',   desc: 'Carbon fibre, chrome and exclusive finishes.',
      reward: { credits: 3000, tokens: 8, xp: 600, item: 'x_carbon_paint' } },
  ];
  D.COL = {};
  D.COLLECTIONS.forEach((c) => { D.COL[c.id] = c; });

  D.SETTINGS_DEFAULT = { sound: true, volume: 70, skipAnim: false, fx: 'high' };
  D.SAVE_KEY = 'streetvault.save';
  D.SAVE_VERSION = 1;
})();
