/* STREET VAULT — data-tasks.js : daily tasks, career quests, achievements.
   Every entry reads a real counter ("key") maintained by game.js (see metric()). */
(function () {
  'use strict';
  const SV = (window.SV = window.SV || {});
  const D = SV.data;

  /* key -> short label used by the UI progress text */
  D.METRIC_LABEL = {
    opened: 'containers opened', newItems: 'new items', itemsDrop: 'items pulled', rareFound: 'Rare+ pulled',
    legendFound: 'Legendary+ pulled', secretFound: 'Secret pulled', carsDrop: 'cars pulled', carsOwned: 'cars owned',
    wheelsChanged: 'wheel changes', paintChanged: 'paint changes', partsInstalled: 'parts installed',
    sold: 'items sold', dismantled: 'items dismantled', projectsSaved: 'projects saved', crafted: 'items crafted',
    found: 'items found', colDone: 'collections complete', colBest: '% of best collection', jdmCars: 'JDM cars', level: 'level',
  };
  /* keys that are counted from a day-start baseline for daily tasks */
  D.DAILY_COUNTERS = ['opened', 'itemsDrop', 'rareFound', 'wheelsChanged', 'paintChanged', 'projectsSaved', 'sold', 'dismantled', 'partsInstalled'];

  /* DAILY pool: 3 are picked per calendar day (seeded by date) */
  D.DAILY = [
    { id: 'd_open2',   title: 'Open 2 containers',            key: 'opened',         target: 2, reward: { credits: 250, xp: 30 } },
    { id: 'd_open4',   title: 'Open 4 containers',            key: 'opened',         target: 4, reward: { credits: 450, xp: 50 } },
    { id: 'd_items',   title: 'Pull 6 items from containers', key: 'itemsDrop',      target: 6, reward: { credits: 300, xp: 35 } },
    { id: 'd_rare',    title: 'Pull a Rare or better item',   key: 'rareFound',      target: 1, reward: { credits: 400, tokens: 1, xp: 60 } },
    { id: 'd_wheels',  title: 'Change your wheels',           key: 'wheelsChanged',  target: 1, reward: { credits: 200, xp: 25 } },
    { id: 'd_paint',   title: 'Repaint a car',                key: 'paintChanged',   target: 1, reward: { credits: 200, xp: 25 } },
    { id: 'd_project', title: 'Save a build project',         key: 'projectsSaved',  target: 1, reward: { credits: 250, xp: 30 } },
    { id: 'd_sell',    title: 'Sell 3 items',                 key: 'sold',           target: 3, reward: { credits: 150, xp: 20 } },
    { id: 'd_break',   title: 'Dismantle 2 items',            key: 'dismantled',     target: 2, reward: { credits: 150, xp: 20 } },
    { id: 'd_parts',   title: 'Install 3 parts',              key: 'partsInstalled', target: 3, reward: { credits: 250, xp: 30 } },
  ];

  /* CAREER: one-time quests */
  D.CAREER = [
    { id: 'q_open3',   title: 'Open three containers',        key: 'opened',         target: 3,  reward: { credits: 400, xp: 60 } },
    { id: 'q_new5',    title: 'Get five new items',           key: 'newItems',       target: 5,  reward: { credits: 400, xp: 60 } },
    { id: 'q_cars3',   title: 'Own three cars',               key: 'carsOwned',      target: 3,  reward: { credits: 600, tokens: 1, xp: 80 } },
    { id: 'q_wheels',  title: 'Install new wheels',           key: 'wheelsChanged',  target: 1,  reward: { credits: 250, xp: 30 } },
    { id: 'q_paint',   title: 'Change a car’s colour',   key: 'paintChanged',   target: 1,  reward: { credits: 250, xp: 30 } },
    { id: 'q_rare',    title: 'Pull a Rare or better item',   key: 'rareFound',      target: 1,  reward: { credits: 500, tokens: 1, xp: 80 } },
    { id: 'q_project', title: 'Save a build project',         key: 'projectsSaved',  target: 1,  reward: { credits: 300, xp: 40 } },
    { id: 'q_col',     title: 'Complete half of a collection', key: 'colBest',       target: 50, reward: { credits: 800, tokens: 2, xp: 150 } },
    { id: 'q_sell5',   title: 'Sell five items',              key: 'sold',           target: 5,  reward: { credits: 300, xp: 40 } },
    { id: 'q_break3',  title: 'Dismantle three items',        key: 'dismantled',     target: 3,  reward: { credits: 300, fragments: 10, xp: 40 } },
    { id: 'q_craft',   title: 'Craft an item in the Forge',   key: 'crafted',        target: 1,  reward: { credits: 300, xp: 50 } },
    { id: 'q_open10',  title: 'Open ten containers',          key: 'opened',         target: 10, reward: { credits: 1000, tokens: 2, xp: 150 } },
    { id: 'q_lvl5',    title: 'Reach level 5',                key: 'level',          target: 5,  reward: { credits: 600, xp: 0 } },
  ];

  /* ACHIEVEMENTS: unlocked automatically, reward granted once */
  D.ACHIEVEMENTS = [
    { id: 'a_first_drop', name: 'First Drop',        desc: 'Open your first container.',                   key: 'opened',      target: 1,  reward: { credits: 300 } },
    { id: 'a_first_car',  name: 'First Car',         desc: 'Pull a car out of a container.',               key: 'carsDrop',    target: 1,  reward: { tokens: 1 } },
    { id: 'a_collector',  name: 'Collector',         desc: 'Find 30 different items.',                     key: 'found',       target: 30, reward: { credits: 1000, tokens: 2 } },
    { id: 'a_rare',       name: 'Rare Hunter',       desc: 'Pull 10 items of Rare or better.',            key: 'rareFound',   target: 10, reward: { credits: 1200, tokens: 2 } },
    { id: 'a_builder',    name: 'Garage Builder',    desc: 'Save 3 build projects.',                       key: 'projectsSaved', target: 3, reward: { credits: 600, item: 'd_stripe_side' } },
    { id: 'a_jdm',        name: 'JDM Enthusiast',    desc: 'Own 5 different JDM cars.',                    key: 'jdmCars',     target: 5,  reward: { tokens: 3 } },
    { id: 'a_legend',     name: 'Legendary Find',    desc: 'Pull a Legendary or better item.',            key: 'legendFound', target: 1,  reward: { credits: 2000, tokens: 3 } },
    { id: 'a_full',       name: 'Full Collection',   desc: 'Complete any collection.',                     key: 'colDone',     target: 1,  reward: { credits: 2500, tokens: 5 } },
    { id: 'a_opener',     name: 'Vault Opener',      desc: 'Open 50 containers.',                          key: 'opened',      target: 50, reward: { credits: 2000, tokens: 3 } },
    { id: 'a_secret',     name: 'Secret Seeker',     desc: 'Pull a Secret item.',                          key: 'secretFound', target: 1,  reward: { tokens: 10 } },
  ];
})();
